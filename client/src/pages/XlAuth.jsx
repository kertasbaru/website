import { useState } from 'react';
import { api } from '../utils/api';
import { ubahKe62 } from '../utils/helpers';
import { Card, PageTitle, LoadingSpinner } from '../components/UI';
import { FiSmartphone, FiSend, FiLogIn, FiCheckCircle, FiPackage } from 'react-icons/fi';

export default function XlAuth() {
  const [number, setNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('input'); // input, otp, loggedIn
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [quotas, setQuotas] = useState(null);

  const msg = (text, type = 'error') => setMessage({ type, text });

  const handleRequestOtp = async () => {
    if (!number) return msg('Nomor HP diperlukan');
    setLoading(true);
    try {
      const data = await api.post('/api/xl/request-otp', { number });
      msg(data.message || 'OTP berhasil dikirim', 'success');
      setStep('otp');
    } catch (err) { msg(err.message); }
    setLoading(false);
  };

  const handleLoginOtp = async () => {
    if (!otp || otp.length < 6) return msg('OTP harus 6 digit');
    setLoading(true);
    try {
      const data = await api.post('/api/xl/login-otp', { number, otp });
      if (data.success) {
        msg('Login berhasil!', 'success');
        setStep('loggedIn');
        handleCheckQuotas();
      } else msg(data.message || 'Login gagal');
    } catch (err) { msg(err.message); }
    setLoading(false);
  };

  const handleCheckSession = async () => {
    setLoading(true);
    try {
      const data = await api.post('/api/xl/check-session', { number });
      msg(data.success ? 'Sesi masih aktif!' : 'Sesi tidak aktif.', data.success ? 'success' : 'error');
    } catch (err) { msg(err.message); }
    setLoading(false);
  };

  const handleCheckQuotas = async () => {
    try {
      const data = await api.post('/api/xl/check-quotas', { number });
      if (data.success) setQuotas(data.data);
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageTitle icon={FiSmartphone}>XL Auth</PageTitle>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {message.text}
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-600 mb-1">Nomor XL/Axis</label>
            <input
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          {step === 'input' && (
            <button onClick={handleRequestOtp} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
              <FiSend size={16} /> {loading ? 'Mengirim...' : 'Request OTP'}
            </button>
          )}

          {step === 'otp' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-dark-600 mb-1">Kode OTP</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="6 digit OTP" className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-xl tracking-widest transition" />
              </div>
              <button onClick={handleLoginOtp} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-success-600 hover:bg-success-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                <FiLogIn size={16} /> {loading ? 'Memproses...' : 'Login OTP'}
              </button>
            </div>
          )}

          {step === 'loggedIn' && (
            <div className="flex gap-3">
              <button onClick={handleCheckSession} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                <FiCheckCircle size={16} /> Cek Sesi
              </button>
              <button onClick={handleCheckQuotas} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                <FiPackage size={16} /> Cek Kuota
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Quota Display */}
      {quotas && (
        <Card className="p-6">
          <h3 className="font-semibold text-dark-800 mb-4">Informasi Kuota</h3>
          <div className="space-y-3">
            {Array.isArray(quotas) && quotas.map((q, i) => (
              <div key={i} className="p-3 bg-dark-50 rounded-xl">
                <p className="font-medium text-sm text-dark-800">{q.name || q.packageName || 'Paket'}</p>
                <p className="text-xs text-dark-400 mt-1">{q.remaining || q.quota || '-'} / {q.total || '-'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
