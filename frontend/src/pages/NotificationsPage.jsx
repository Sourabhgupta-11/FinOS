import { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Bell, BellOff, CheckCheck, Crown } from 'lucide-react';

const TYPE_CONFIG = {
  sip_reminder: { label: 'SIP', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  budget_alert:  { label: 'Budget', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  subscription:  { label: 'Subscription', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  test:          { label: 'Test', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  general:       { label: 'Info', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
};

export default function NotificationsPage() {
  const { isPremium: isPro, loading: premLoading } = usePremium();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!premLoading && isPro) {
      loadNotifications();
      checkPushStatus();
    } else if (!premLoading) {
      setLoading(false);
    }
  }, [premLoading, isPro]);

  async function loadNotifications() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread || 0);
    } catch { } finally { setLoading(false); }
  }

  function checkPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setPushEnabled(!!sub))
      .catch(() => {});
  }

  async function enablePush() {
    setPushLoading(true);
    try {
      if (!('Notification' in window)) { alert('Notifications not supported in this browser.'); return; }
      const vapidRes = await api.get('/notifications/vapid-key');
      const vapidKey = vapidRes.data.publicKey;
      if (!vapidKey) { alert('Push notifications not configured on server. Add VAPID keys to backend .env.'); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('Please allow notifications in your browser settings.'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
      const auth   = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));
      await api.post('/notifications/subscribe', { endpoint: sub.endpoint, keys: { p256dh, auth } });

      setPushEnabled(true);
      await api.post('/notifications/test');
      loadNotifications();
    } catch (err) { alert('Could not enable push: ' + err.message); }
    finally { setPushLoading(false); }
  }

  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setPushEnabled(false);
    } catch { }
  }

  async function markAllRead() {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    await api.post('/notifications/read', { ids });
    loadNotifications();
  }

  function urlBase64ToUint8Array(b64) {
    const padding = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  if (premLoading) return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;
  if (!isPro) return <PremiumGate requiredPlan="premium" feature="Notifications" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">SIP reminders, budget alerts, and updates</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm py-2 flex items-center gap-2">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Push toggle */}
      <div className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushEnabled ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {pushEnabled
              ? <Bell size={18} className="text-blue-600 dark:text-blue-400" />
              : <BellOff size={18} className="text-gray-400 dark:text-gray-500" />}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Push notifications</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {pushEnabled ? 'SIP reminders & budget alerts active' : 'Enable to get SIP date reminders'}
            </div>
          </div>
        </div>
        <button onClick={pushEnabled ? disablePush : enablePush} disabled={pushLoading}
          className={pushEnabled ? 'btn-secondary text-sm py-2' : 'btn-primary text-sm py-2'}>
          {pushLoading ? 'Loading…' : pushEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-gray-400 dark:text-gray-600 animate-pulse text-sm">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-14">
          <Bell size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">No notifications yet</div>
          <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">Enable push to get SIP reminders and budget alerts</div>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50 dark:divide-gray-800/60">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
            return (
              <div key={n.id} className={`py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 ${!n.is_read ? '' : 'opacity-60'}`}>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 mt-0.5 ${cfg.cls}`}>{cfg.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.body}</div>
                  <div className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                    {new Date(n.sent_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
