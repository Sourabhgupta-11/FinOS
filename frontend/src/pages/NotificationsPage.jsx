import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    checkPushStatus();
  }, []);

  async function loadNotifications() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch { } finally { setLoading(false); }
  }

  function checkPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
    ).catch(() => {});
  }

  async function enablePush() {
    setPushLoading(true);
    try {
      if (!('serviceWorker' in navigator)) {
        alert('Push notifications not supported in this browser.');
        return;
      }

      const vapidRes = await api.get('/notifications/vapid-key');
      const vapidKey = vapidRes.data.publicKey;
      if (!vapidKey) { alert('Push notifications not configured on server.'); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('Please allow notifications in browser settings.'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await api.post('/notifications/subscribe', {
        endpoint: sub.endpoint,
        keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
                auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))) },
        deviceLabel: navigator.userAgent.split(' ').slice(-1)[0],
      });

      setPushEnabled(true);
      await api.post('/notifications/test');
      alert('Push notifications enabled! You\'ll get SIP reminders and budget alerts.');
    } catch (err) {
      alert('Could not enable push: ' + err.message);
    } finally { setPushLoading(false); }
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

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  const TYPE_COLORS = {
    sip_reminder: 'bg-blue-50 text-blue-600',
    budget_alert: 'bg-yellow-50 text-yellow-600',
    subscription: 'bg-green-50 text-green-600',
    test: 'bg-gray-50 text-gray-600',
    general: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-gray-400 text-sm mt-0.5">SIP reminders, budget alerts, and updates</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm py-2 flex items-center gap-2">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Push toggle */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
            {pushEnabled ? <Bell size={18} className="text-blue-600" /> : <BellOff size={18} className="text-gray-400" />}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Push notifications</div>
            <div className="text-xs text-gray-400">
              {pushEnabled ? 'SIP reminders & budget alerts enabled' : 'Enable to get SIP reminders on SIP dates'}
            </div>
          </div>
        </div>
        <button
          onClick={pushEnabled ? disablePush : enablePush}
          disabled={pushLoading}
          className={pushEnabled ? 'btn-secondary text-sm py-2' : 'btn-primary text-sm py-2'}
        >
          {pushLoading ? 'Loading…' : pushEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={32} className="text-gray-200 mx-auto mb-3" />
          <div className="text-gray-500 text-sm">No notifications yet</div>
          <div className="text-gray-400 text-xs mt-1">Enable push to get SIP reminders and budget alerts</div>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {notifications.map(n => (
            <div key={n.id} className={`py-3 first:pt-0 last:pb-0 flex items-start gap-3 ${!n.is_read ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 mt-0.5 ${TYPE_COLORS[n.type] || TYPE_COLORS.general}`}>
                {n.type?.replace('_', ' ') || 'alert'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{n.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>
                <div className="text-xs text-gray-300 mt-1">
                  {new Date(n.sent_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
