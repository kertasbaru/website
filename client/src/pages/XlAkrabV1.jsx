import { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, ubahKe0 } from '../utils/helpers';
import { Card, PageTitle, StatusBadge, LoadingSpinner } from '../components/UI';
import Modal from '../components/Modal';
import { FiUsers } from 'react-icons/fi';

export default function XlAkrabV1() {
  const { refreshUser } = useAuth();
  const [destination, setDestination] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('fresh');
  const [buyModal, setBuyModal] = useState(null);
  const [parentName, setParentName] = useState('');
  const [buying, setBuying] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchStock();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const data = await api.post('/api/xl/akrab-stock');
      if (data.success) setProducts(data.data || []);
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setLoading(false);
  };

  const filtered = products.filter((p) => {
    const code = (p.code || '').toLowerCase();
    return tab === 'fresh' ? code.includes('fresh') || !code.includes('bekas') : code.includes('bekas');
  });

  const handleBuy = async () => {
    if (!destination || !parentName) return setMessage({ type: 'error', text: 'Isi semua field' });
    setBuying(true);
    try {
      const data = await api.post('/api/xl/akrab/invite', { code: buyModal.code, parent_name: parentName, destination });
      setBuyModal(null);
      if (data.success || data.code === '000') {
        setResultModal(data.data);
        refreshUser();
        if (data.data?.status === 'pending' || data.data?.status === 'processing') startPolling(data.data.ref_id);
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setBuying(false);
  };

  const startPolling = (refId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/api/transaction/status/${refId}`);
        if (['success', 'failed', 'gagal'].includes(data.status)) {
          clearInterval(pollingRef.current);
          setResultModal((prev) => ({ ...prev, status: data.status, message: data.message }));
          refreshUser();
        }
      } catch {}
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <PageTitle icon={FiUsers}>XL Akrab V1</PageTitle>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {message.text}
        </div>
      )}

      <Card className="p-6 max-w-lg">
        <label className="block text-sm text-dark-600 mb-1">Nomor XL Tujuan</label>
        <input type="tel" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        {['fresh', 'bekas'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-primary-600 text-white' : 'bg-white text-dark-600 border border-dark-200 hover:bg-dark-50'}`}>
            {t === 'fresh' ? 'Fresh' : 'Bekasan'}
          </button>
        ))}
      </div>

      {/* Products */}
      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setBuyModal(p); setParentName(''); }}>
              <h3 className="font-medium text-dark-800 text-sm mb-1">{p.name}</h3>
              <p className="text-xs text-dark-400 mb-2">Stok: {p.stock ?? '-'}</p>
              <p className="text-primary-600 font-bold">{formatRupiah(p.price)}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Buy Modal */}
      <Modal isOpen={!!buyModal} onClose={() => setBuyModal(null)} title="Konfirmasi Invite Akrab">
        {buyModal && (
          <div className="space-y-4">
            <div className="bg-dark-50 p-4 rounded-xl space-y-2">
              <p className="text-sm"><span className="text-dark-400">Produk:</span> <span className="font-medium">{buyModal.name}</span></p>
              <p className="text-sm"><span className="text-dark-400">Harga:</span> <span className="font-bold text-primary-600">{formatRupiah(buyModal.price)}</span></p>
              <p className="text-sm"><span className="text-dark-400">Tujuan:</span> <span className="font-medium">{destination}</span></p>
            </div>
            <div>
              <label className="block text-sm text-dark-600 mb-1">Nama Parent</label>
              <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Nama pemilik group" className="w-full px-4 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBuyModal(null)} className="flex-1 py-2.5 border border-dark-200 text-dark-600 rounded-xl hover:bg-dark-50 transition-colors text-sm">Batal</button>
              <button onClick={handleBuy} disabled={buying} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors text-sm disabled:opacity-50">
                {buying ? 'Memproses...' : 'Invite'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Result Modal */}
      <Modal isOpen={!!resultModal} onClose={() => { setResultModal(null); clearInterval(pollingRef.current); }} title="Detail Transaksi">
        {resultModal && (
          <div className="space-y-3 text-center">
            <StatusBadge status={resultModal.status} />
            <p className="text-sm text-dark-500 mt-2">{resultModal.message}</p>
            <p className="text-xs text-dark-400">Ref: {resultModal.ref_id}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
