import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Camera, Lock, Mail, User, Check, AlertCircle } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl
      ${isErr ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'}`}>
      {isErr ? <AlertCircle size={14} /> : <Check size={14} />}
      {msg}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const fileRef = useRef();

  const [avatar, setAvatar] = useState(() => localStorage.getItem('finos-avatar') || null);
  const [avatarPreview, setAvatarPreview] = useState(avatar);

  // Name
  const [name, setName] = useState(user?.name || '');
  const [nameStatus, setNameStatus] = useState({ type: '', msg: '' });
  const [savingName, setSavingName] = useState(false);

  // Email
  const [email, setEmail] = useState(user?.email || '');
  const [emailStatus, setEmailStatus] = useState({ type: '', msg: '' });
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState({ type: '', msg: '' });
  const [savingPw, setSavingPw] = useState(false);

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarPreview(dataUrl);
      setAvatar(dataUrl);
      localStorage.setItem('finos-avatar', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const saveName = async () => {
    if (!name.trim()) return;
    setSavingName(true); setNameStatus({ type: '', msg: '' });
    try {
      await api.put('/auth/profile', { name: name.trim() });
      setNameStatus({ type: 'success', msg: 'Name updated successfully' });
    } catch (err) {
      setNameStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to update name' });
    } finally { setSavingName(false); }
  };

  const saveEmail = async () => {
    if (!email.trim()) return;
    setSavingEmail(true); setEmailStatus({ type: '', msg: '' });
    try {
      await api.put('/auth/profile', { email: email.trim() });
      setEmailStatus({ type: 'success', msg: 'Email updated. Please verify your new email.' });
    } catch (err) {
      setEmailStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to update email' });
    } finally { setSavingEmail(false); }
  };

  const savePassword = async () => {
    if (!pw.current || !pw.newPw || !pw.confirm) {
      setPwStatus({ type: 'error', msg: 'All fields are required' }); return;
    }
    if (pw.newPw !== pw.confirm) {
      setPwStatus({ type: 'error', msg: 'New passwords do not match' }); return;
    }
    if (pw.newPw.length < 8) {
      setPwStatus({ type: 'error', msg: 'Password must be at least 8 characters' }); return;
    }
    setSavingPw(true); setPwStatus({ type: '', msg: '' });
    try {
      await api.put('/auth/password', { currentPassword: pw.current, newPassword: pw.newPw });
      setPwStatus({ type: 'success', msg: 'Password changed successfully' });
      setPw({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      setPwStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to change password' });
    } finally { setSavingPw(false); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Manage your account settings</p>
      </div>

      {/* Avatar */}
      <div className="card flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-white text-2xl font-bold">{initials}</span>
            }
          </div>
          <button
            onClick={() => fileRef.current.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center shadow-lg transition-colors">
            <Camera size={13} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{user?.name}</div>
          <div className="text-sm text-gray-400 dark:text-gray-500">{user?.email}</div>
          <button onClick={() => fileRef.current.click()}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
            Change photo
          </button>
        </div>
      </div>

      {/* Name */}
      <Section title="Display Name">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Full name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={saveName} disabled={savingName || name === user?.name}
              className="btn-primary text-sm py-2.5 px-4">
              {savingName ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <StatusMsg {...nameStatus} />
      </Section>

      {/* Email */}
      <Section title="Email Address">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={saveEmail} disabled={savingEmail || email === user?.email}
              className="btn-primary text-sm py-2.5 px-4">
              {savingEmail ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <StatusMsg {...emailStatus} />
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <div className="space-y-3">
          {[
            { key: 'current', label: 'Current password', placeholder: '••••••••' },
            { key: 'newPw',   label: 'New password (min 8 chars)', placeholder: '••••••••' },
            { key: 'confirm', label: 'Confirm new password', placeholder: '••••••••' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" type="password" placeholder={placeholder}
                  value={pw[key]} onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            </div>
          ))}
          <StatusMsg {...pwStatus} />
          <button onClick={savePassword} disabled={savingPw} className="btn-primary w-full text-sm">
            {savingPw ? 'Changing password…' : 'Change password'}
          </button>
        </div>
      </Section>

      {/* Danger zone */}
      <div className="card border-red-100 dark:border-red-900/40">
        <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-3">Danger zone</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Deleting your account is permanent. All data will be lost.
        </p>
        <button
          onClick={() => {
            if (confirm('Are you absolutely sure? This cannot be undone.')) {
              api.delete('/auth/account').then(() => { logout(); }).catch(() => alert('Failed to delete account'));
            }
          }}
          className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          Delete my account
        </button>
      </div>
    </div>
  );
}
