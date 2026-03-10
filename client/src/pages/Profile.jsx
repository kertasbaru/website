import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Card, PageTitle } from '../components/UI';
import { FiSettings, FiSave, FiKey, FiRefreshCw, FiLink, FiLock } from 'react-icons/fi';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ username: '', phone: '', email: '', telegram: '' });
  const [webhook, setWebhook] = useState('');
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });
  const [saving, setSaving] = useState({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    if (user) {
      setForm({ username: user.username || '', phone: user.phone || '', email: user.email || '', telegram: user.telegram || '' });
      setWebhook(user.webhook_url || '');
    }
  }, [user]);

  const showMessage = (key, text, type = 'success') => {
    setMessages((prev) => ({ ...prev, [key]: { text, type } }));
    setTimeout(() => setMessages((prev) => ({ ...prev, [key]: null })), 4000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving((p) => ({ ...p, profile: true }));
    try {
      const data = await api.post('/api/profile/update', form);
      showMessage('profile', data.message);
      refreshUser();
    } catch (err) {
      showMessage('profile', err.message, 'error');
    } finally {
      setSaving((p) => ({ ...p, profile: false }));
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSaving((p) => ({ ...p, password: true }));
    try {
      const data = await api.post('/api/password/update', passwords);
      showMessage('password', data.message);
      setPasswords({ oldPassword: '', newPassword: '' });
    } catch (err) {
      showMessage('password', err.message, 'error');
    } finally {
      setSaving((p) => ({ ...p, password: false }));
    }
  };

  const handleWebhookSave = async () => {
    if (webhook && !webhook.startsWith('http')) {
      showMessage('webhook', 'URL harus diawali http:// atau https://', 'error');
      return;
    }
    setSaving((p) => ({ ...p, webhook: true }));
    try {
      const data = await api.post('/api/profile/update-webhook', { webhook });
      showMessage('webhook', data.message);
    } catch (err) {
      showMessage('webhook', err.message, 'error');
    } finally {
      setSaving((p) => ({ ...p, webhook: false }));
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!confirm('Yakin ingin ganti API Key? Key lama akan mati.')) return;
    try {
      const data = await api.post('/api/apikey/regenerate');
      if (data.newApiKey) {
        showMessage('apikey', 'API Key diperbarui!');
        refreshUser();
      }
    } catch (err) {
      showMessage('apikey', 'Gagal: ' + err.message, 'error');
    }
  };

  const MessageBox = ({ name }) => {
    const msg = messages[name];
    if (!msg) return null;
    return (
      <div className={`px-4 py-2.5 rounded-xl text-sm mb-3 ${msg.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
        {msg.text}
      </div>
    );
  };

  const inputClass = 'w-full px-4 py-2.5 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm';

  return (
    <div className="space-y-6 max-w-2xl">
      <PageTitle icon={FiSettings}>Pengaturan Profil</PageTitle>

      {/* Profile Form */}
      <Card className="p-6">
        <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
          <FiSettings className="text-primary-600" size={18} />
          Informasi Akun
        </h2>
        <MessageBox name="profile" />
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-600 mb-1">Username</label>
            <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-dark-600 mb-1">Nomor HP</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-dark-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-dark-600 mb-1">ID Telegram</label>
            <input type="number" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} className={inputClass} placeholder="123456789" />
          </div>
          <button type="submit" disabled={saving.profile} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
            <FiSave size={16} /> {saving.profile ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </Card>

      {/* API Key */}
      <Card className="p-6">
        <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
          <FiKey className="text-primary-600" size={18} />
          API Key
        </h2>
        <MessageBox name="apikey" />
        <div className="flex gap-2">
          <input type="text" value={user?.api_key || ''} readOnly className={`${inputClass} bg-dark-50 flex-1`} />
          <button onClick={handleRegenerateApiKey} className="px-4 py-2.5 bg-warning-500 hover:bg-warning-600 text-white rounded-xl transition-colors flex-shrink-0" title="Ganti API Key">
            <FiRefreshCw size={16} />
          </button>
        </div>
      </Card>

      {/* Webhook */}
      <Card className="p-6">
        <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
          <FiLink className="text-primary-600" size={18} />
          Webhook URL
        </h2>
        <MessageBox name="webhook" />
        <div className="flex gap-2">
          <input type="url" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://domain-anda.com/webhook" className={`${inputClass} flex-1`} />
          <button onClick={handleWebhookSave} disabled={saving.webhook} className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors flex-shrink-0">
            <FiSave size={16} />
          </button>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
          <FiLock className="text-primary-600" size={18} />
          Ubah Password
        </h2>
        <MessageBox name="password" />
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-600 mb-1">Password Lama</label>
            <input type="password" value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm text-dark-600 mb-1">Password Baru</label>
            <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className={inputClass} required />
          </div>
          <button type="submit" disabled={saving.password} className="flex items-center gap-2 px-5 py-2.5 bg-danger-600 hover:bg-danger-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
            <FiKey size={16} /> {saving.password ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </form>
      </Card>
    </div>
  );
}
