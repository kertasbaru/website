import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';
import { Card, PageTitle, StatusBadge, LoadingSpinner } from '../components/UI';
import Modal from '../components/Modal';
import { FiDollarSign, FiCopy, FiX } from 'react-icons/fi';

export default function TopUp() {
  const { refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [qrisModal, setQrisModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const pollingRef = useRef(null);

  const fetchPending = async () => {
    try {
      const data = await api.get('/api/deposits/pending');
      setPendingDeposits(data);
    } catch {}
  };

  useEffect(() => {
    fetchPending();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const startPolling = (topUpId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/api/deposit/status/${topUpId}`);
        if (data.status === 'SUCCESS') {
          clearInterval(pollingRef.current);
          setQrisModal(null);
          setTransferModal(null);
          refreshUser();
          fetchPending();
          setMessage({ type: 'success', text: `Deposit ${topUpId} berhasil!` });
        }
      } catch {}
    }, 3000);
  };

  const handleGenerateQris = async () => {
    if (!amount || amount < 10000) return setMessage({ type: 'error', text: 'Minimal top up Rp 10.000' });
    setLoading(true);
    try {
      const data = await api.post('/api/payment/generate-qris', { baseAmount: parseInt(amount) });
      setQrisModal(data);
      startPolling(data.topUpId);
      fetchPending();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTransfer = async () => {
    if (!amount || amount < 10000) return setMessage({ type: 'error', text: 'Minimal top up Rp 10.000' });
    setLoading(true);
    try {
      const data = await api.post('/api/payment/generate-topup', { baseAmount: parseInt(amount) });
      setTransferModal(data);
      startPolling(data.topUpId);
      fetchPending();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (topUpId) => {
    if (!confirm('Yakin ingin membatalkan deposit ini?')) return;
    try {
      await api.post(`/api/deposit/cancel/${topUpId}`);
      fetchPending();
      setMessage({ type: 'success', text: 'Deposit dibatalkan.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Berhasil disalin!' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageTitle icon={FiDollarSign}>Top Up Saldo</PageTitle>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {message.text}
        </div>
      )}

      {/* Amount Input */}
      <Card className="p-6">
        <h2 className="font-semibold text-dark-800 mb-4">Masukkan Nominal</h2>
        <div className="space-y-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Minimal Rp 10.000"
            min="10000"
            max="950000"
            className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-lg"
          />
          <div className="flex gap-3">
            <button onClick={handleGenerateQris} disabled={loading} className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Memproses...' : 'Bayar QRIS'}
            </button>
            <button onClick={handleGenerateTransfer} disabled={loading} className="flex-1 py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Memproses...' : 'Transfer Bank'}
            </button>
          </div>
        </div>
      </Card>

      {/* Pending Deposits */}
      {pendingDeposits.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-dark-800 mb-4">Deposit Menunggu Pembayaran</h2>
          <div className="space-y-3">
            {pendingDeposits.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between p-4 bg-dark-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-dark-800">{dep.id}</p>
                  <p className="text-primary-600 font-semibold">{formatRupiah(dep.amount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={dep.status} />
                  <button onClick={() => handleCancel(dep.id)} className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors">
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* QRIS Modal */}
      <Modal isOpen={!!qrisModal} onClose={() => { setQrisModal(null); clearInterval(pollingRef.current); }} title="Pembayaran QRIS">
        {qrisModal && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold text-primary-600">{formatRupiah(qrisModal.finalAmount)}</p>
            <p className="text-sm text-dark-500">ID: {qrisModal.topUpId}</p>
            <div className="bg-dark-50 p-4 rounded-xl">
              <p className="text-xs text-dark-400 mb-2">QRIS String</p>
              <p className="text-xs break-all text-dark-600 font-mono">{qrisModal.qrisString}</p>
              <button onClick={() => copy(qrisModal.qrisString)} className="mt-2 flex items-center gap-1 mx-auto text-sm text-primary-600 hover:text-primary-700">
                <FiCopy size={14} /> Salin
              </button>
            </div>
            <div className="animate-pulse text-sm text-accent-500 font-medium">⏳ Menunggu pembayaran...</div>
          </div>
        )}
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={!!transferModal} onClose={() => { setTransferModal(null); clearInterval(pollingRef.current); }} title="Transfer Bank">
        {transferModal && (
          <div className="space-y-4">
            <p className="text-center text-2xl font-bold text-primary-600">{formatRupiah(transferModal.finalAmount)}</p>
            <p className="text-center text-sm text-dark-500">ID: {transferModal.topUpId}</p>
            <div className="bg-dark-50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-dark-400">Bank Jago</p>
                  <p className="font-mono font-medium text-dark-800">{transferModal.norek}</p>
                </div>
                <button onClick={() => copy(transferModal.norek)} className="text-primary-600 hover:text-primary-700">
                  <FiCopy size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-dark-400">Jumlah Transfer</p>
                  <p className="font-semibold text-primary-600">{formatRupiah(transferModal.finalAmount)}</p>
                </div>
                <button onClick={() => copy(String(transferModal.finalAmount))} className="text-primary-600 hover:text-primary-700">
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
            <p className="text-xs text-danger-500 text-center">⚠️ Transfer HARUS sesuai nominal (termasuk digit unik)</p>
            <div className="animate-pulse text-sm text-accent-500 font-medium text-center">⏳ Menunggu pembayaran...</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
