import { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';
import { Card, PageTitle, StatusBadge, LoadingSpinner } from '../components/UI';
import Modal from '../components/Modal';
import { FiGlobe } from 'react-icons/fi';

const PROVIDERS = [
  { id: 'telkomsel', label: 'Telkomsel', prefix: ['811','812','813','821','822','823','851','852','853'] },
  { id: 'indosat', label: 'Indosat', prefix: ['814','815','816','855','856','857','858'] },
  { id: 'xl', label: 'XL', prefix: ['817','818','819','859','877','878'] },
  { id: 'axis', label: 'Axis', prefix: ['831','832','833','838'] },
  { id: 'tri', label: 'Tri', prefix: ['895','896','897','898','899'] },
  { id: 'smartfren', label: 'Smartfren', prefix: ['881','882','883','884','885','886','887','888','889'] },
];

export default function NoOtp() {
  const { refreshUser } = useAuth();
  const [destination, setDestination] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('');
  const [buyModal, setBuyModal] = useState(null);
  const [buying, setBuying] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const pollingRef = useRef(null);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const detectProvider = (num) => {
    const cleaned = num.replace(/[\s+-]/g, '');
    let n = cleaned;
    if (n.startsWith('62')) n = '0' + n.substring(2);
    if (n.length < 4 || !n.startsWith('0')) return '';
    const prefix = n.substring(1, 4);
    for (const p of PROVIDERS) {
      if (p.prefix.includes(prefix)) return p.id;
    }
    return '';
  };

  const handleNumberChange = (val) => {
    setDestination(val);
    const provider = detectProvider(val);
    if (provider && provider !== selectedProvider) {
      setSelectedProvider(provider);
      fetchProducts(provider);
    }
  };

  const fetchProducts = async (provider) => {
    setLoading(true);
    try {
      const data = await api.post('/api/no-otp/products', { provider });
      if (data.success) {
        setProducts(data.data || []);
        const categories = [...new Set((data.data || []).map((p) => p.category))];
        if (categories.length) setTab(categories[0]);
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setLoading(false);
  };

  const categories = [...new Set(products.map((p) => p.category))];
  const filtered = products.filter((p) => p.category === tab);

  const handleBuy = async () => {
    if (!destination) return setMessage({ type: 'error', text: 'Masukkan nomor tujuan' });
    setBuying(true);
    try {
      const data = await api.post('/api/no-otp/order', { code: buyModal.product_id, destination });
      setBuyModal(null);
      if (data.success) {
        setResultModal(data.data);
        refreshUser();
        if (['pending', 'processing'].includes(data.data?.status)) startPolling(data.data.ref_id);
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
      <PageTitle icon={FiGlobe}>No OTP</PageTitle>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {message.text}
        </div>
      )}

      <Card className="p-6 max-w-lg">
        <label className="block text-sm text-dark-600 mb-1">Nomor Tujuan</label>
        <input type="tel" value={destination} onChange={(e) => handleNumberChange(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
        {selectedProvider && (
          <p className="text-xs text-primary-600 mt-1">Provider: {PROVIDERS.find((p) => p.id === selectedProvider)?.label}</p>
        )}
      </Card>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setTab(c)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === c ? 'bg-primary-600 text-white' : 'bg-white text-dark-600 border border-dark-200 hover:bg-dark-50'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setBuyModal(p)}>
              <h3 className="font-medium text-dark-800 text-sm mb-1">{p.product_name}</h3>
              <p className="text-xs text-dark-400 mb-2">{p.description}</p>
              <p className="text-primary-600 font-bold">{formatRupiah(p.final_price || p.amount)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!buyModal} onClose={() => setBuyModal(null)} title="Konfirmasi Order">
        {buyModal && (
          <div className="space-y-4">
            <div className="bg-dark-50 p-4 rounded-xl space-y-2">
              <p className="text-sm"><span className="text-dark-400">Produk:</span> <span className="font-medium">{buyModal.product_name}</span></p>
              <p className="text-sm"><span className="text-dark-400">Harga:</span> <span className="font-bold text-primary-600">{formatRupiah(buyModal.final_price || buyModal.amount)}</span></p>
              <p className="text-sm"><span className="text-dark-400">Tujuan:</span> <span className="font-medium">{destination}</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBuyModal(null)} className="flex-1 py-2.5 border border-dark-200 text-dark-600 rounded-xl hover:bg-dark-50 text-sm">Batal</button>
              <button onClick={handleBuy} disabled={buying} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm disabled:opacity-50">
                {buying ? 'Memproses...' : 'Order'}
              </button>
            </div>
          </div>
        )}
      </Modal>

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
