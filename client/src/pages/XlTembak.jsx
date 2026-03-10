import { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, ubahKe62 } from '../utils/helpers';
import { Card, PageTitle, StatusBadge, LoadingSpinner } from '../components/UI';
import Modal from '../components/Modal';
import { FiZap, FiShoppingCart } from 'react-icons/fi';

export default function XlTembak() {
  const { refreshUser } = useAuth();
  const [number, setNumber] = useState('');
  const [verified, setVerified] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buyModal, setBuyModal] = useState(null);
  const [resultModal, setResultModal] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [buying, setBuying] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const data = await api.post('/api/xl/check-session', { number });
      if (data.success) {
        setVerified(true);
        fetchProducts();
      } else setMessage({ type: 'error', text: 'Nomor belum login. Silakan login di XL Auth.' });
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setLoading(false);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.post('/api/xl/get-products', { number: ubahKe62(number) });
      if (data.success) setProducts(data.data?.products || []);
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setLoading(false);
  };

  const handleBuy = async (product) => {
    setBuying(true);
    try {
      const data = await api.post('/api/xl/buy-package', {
        number: ubahKe62(number),
        code: product.code,
        payment: buyModal.payment || 'SALDO',
      });
      setBuyModal(null);
      if (data.success) {
        setResultModal(data.data);
        refreshUser();
        if (data.data?.status === 'pending' || data.data?.status === 'processing') {
          startPolling(data.data.ref_id);
        }
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setBuying(false);
  };

  const startPolling = (refId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/api/transaction/status/${refId}`);
        if (data.status === 'success' || data.status === 'failed' || data.status === 'gagal') {
          clearInterval(pollingRef.current);
          setResultModal((prev) => ({ ...prev, status: data.status, message: data.message }));
          if (data.status === 'failed' || data.status === 'gagal') refreshUser();
        }
      } catch {}
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <PageTitle icon={FiZap}>XL Tembak Paket</PageTitle>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {message.text}
        </div>
      )}

      {!verified ? (
        <Card className="p-6 max-w-lg">
          <h2 className="font-semibold text-dark-800 mb-4">Verifikasi Nomor</h2>
          <div className="space-y-3">
            <input type="tel" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
            <button onClick={handleVerify} disabled={loading} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </button>
          </div>
        </Card>
      ) : (
        <>
          {loading ? <LoadingSpinner /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p, i) => (
                <Card key={i} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setBuyModal({ ...p, payment: 'SALDO' })}>
                  <h3 className="font-medium text-dark-800 text-sm mb-1">{p.name}</h3>
                  <p className="text-xs text-dark-400 mb-3">{p.description || p.code}</p>
                  <p className="text-primary-600 font-bold">{formatRupiah(p.final_price || p.fee)}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Buy Modal */}
      <Modal isOpen={!!buyModal} onClose={() => setBuyModal(null)} title="Konfirmasi Pembelian">
        {buyModal && (
          <div className="space-y-4">
            <div className="bg-dark-50 p-4 rounded-xl space-y-2">
              <p className="text-sm"><span className="text-dark-400">Produk:</span> <span className="font-medium">{buyModal.name}</span></p>
              <p className="text-sm"><span className="text-dark-400">Nomor:</span> <span className="font-medium">{number}</span></p>
              <p className="text-sm"><span className="text-dark-400">Harga:</span> <span className="font-bold text-primary-600">{formatRupiah(buyModal.final_price || buyModal.fee)}</span></p>
            </div>
            <div>
              <label className="block text-sm text-dark-600 mb-1">Metode Pembayaran</label>
              <select value={buyModal.payment} onChange={(e) => setBuyModal({ ...buyModal, payment: e.target.value })} className="w-full px-4 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="SALDO">Saldo</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBuyModal(null)} className="flex-1 py-2.5 border border-dark-200 text-dark-600 rounded-xl hover:bg-dark-50 transition-colors text-sm">Batal</button>
              <button onClick={() => handleBuy(buyModal)} disabled={buying} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors text-sm disabled:opacity-50">
                {buying ? 'Memproses...' : 'Beli'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Result Modal */}
      <Modal isOpen={!!resultModal} onClose={() => { setResultModal(null); clearInterval(pollingRef.current); }} title="Detail Transaksi">
        {resultModal && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <StatusBadge status={resultModal.status} />
              <p className="text-sm text-dark-500 mt-2">{resultModal.message}</p>
            </div>
            {[['Ref ID', resultModal.ref_id], ['Tujuan', resultModal.destination], ['SN', resultModal.serial_number]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-dark-100">
                <span className="text-sm text-dark-500">{l}</span>
                <span className="text-sm font-medium text-dark-800">{v || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
