import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { formatRupiah } from '../utils/helpers';
import { Card, PageTitle } from '../components/UI';
import Modal from '../components/Modal';
import { FiHome, FiDollarSign, FiClock, FiVolume2 } from 'react-icons/fi';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [announcement, setAnnouncement] = useState('Memuat pengumuman...');
  const [editModal, setEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/announcement')
      .then((data) => setAnnouncement(data.announcement || 'Belum ada pengumuman.'))
      .catch(() => setAnnouncement('Gagal memuat pengumuman.'));
  }, []);

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/admin/update-announcement', { announcement: editText });
      setAnnouncement(editText);
      setEditModal(false);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle icon={FiHome}>Dashboard</PageTitle>

      {/* Announcement */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiVolume2 className="text-primary-600" size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-dark-800 mb-1">Pengumuman</h2>
              <p className="text-dark-500 text-sm whitespace-pre-wrap">{announcement}</p>
            </div>
          </div>
          {user?.isAdmin && (
            <button
              onClick={() => { setEditText(announcement); setEditModal(true); }}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex-shrink-0"
            >
              Edit
            </button>
          )}
        </div>
      </Card>

      {/* Welcome & Balance */}
      <Card className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 border-0 text-white">
        <h3 className="text-lg font-semibold mb-1">Selamat Datang, {user?.username}!</h3>
        <p className="text-primary-100 text-sm mb-4">Saldo Anda saat ini</p>
        <p className="text-3xl font-bold mb-6">{formatRupiah(user?.balance)}</p>
        <div className="flex gap-3">
          <Link to="/topup" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <FiDollarSign size={16} /> Top Up
          </Link>
          <Link to="/riwayat" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <FiClock size={16} /> Riwayat
          </Link>
        </div>
      </Card>

      {/* Edit Announcement Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Pengumuman">
        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Tulis pengumuman..."
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setEditModal(false)} className="px-5 py-2.5 text-sm text-dark-600 hover:bg-dark-100 rounded-xl transition-colors">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
