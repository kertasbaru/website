import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">WUZZSTORE</h1>
          <p className="text-primary-300 mt-2">Lupa Password</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <p className="text-white mb-2">Link reset password telah dikirim!</p>
              <p className="text-white/60 text-sm mb-6">Periksa inbox email Anda.</p>
              <Link to="/login" className="text-accent-300 hover:text-accent-200 text-sm">
                Kembali ke Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-danger-500/20 text-danger-50 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email Anda"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                </button>
              </form>
              <p className="text-center text-white/60 text-sm mt-6">
                <Link to="/login" className="text-accent-300 hover:text-accent-200">Kembali ke Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
