import { useState } from 'react';
import { api } from '../utils/api';
import { ubahKe62 } from '../utils/helpers';
import { Card, PageTitle, LoadingSpinner } from '../components/UI';
import { FiPackage, FiSearch } from 'react-icons/fi';

export default function CekPaket() {
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!number) return setError('Nomor HP diperlukan');
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.post('/api/check-package', { number });
      if (data.success) setResult(data.data || data);
      else setError(data.message || 'Gagal mengambil data');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageTitle icon={FiPackage}>Cek Paket</PageTitle>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-600 mb-1">Nomor HP</label>
            <input
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
          <button onClick={handleCheck} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
            <FiSearch size={16} /> {loading ? 'Mengecek...' : 'Cek Paket'}
          </button>
        </div>
      </Card>

      {error && (
        <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {loading && <LoadingSpinner />}

      {result && (
        <Card className="p-6">
          <h3 className="font-semibold text-dark-800 mb-4">Hasil</h3>
          {result.subscriber && (
            <div className="bg-dark-50 p-4 rounded-xl mb-4 space-y-1">
              <p className="text-sm"><span className="text-dark-400">MSISDN:</span> <span className="font-medium">{result.subscriber.msisdn || '-'}</span></p>
              <p className="text-sm"><span className="text-dark-400">Operator:</span> <span className="font-medium">{result.subscriber.operator || '-'}</span></p>
            </div>
          )}
          {result.packages && result.packages.length > 0 ? (
            <div className="space-y-3">
              {result.packages.map((pkg, i) => (
                <div key={i} className="p-4 bg-dark-50 rounded-xl">
                  <h4 className="font-medium text-dark-800 text-sm mb-2">{pkg.name || pkg.packageName || 'Paket'}</h4>
                  {pkg.quotas && pkg.quotas.length > 0 && (
                    <div className="space-y-1">
                      {pkg.quotas.map((q, j) => (
                        <div key={j} className="flex justify-between text-xs">
                          <span className="text-dark-500">{q.type || q.name || 'Kuota'}</span>
                          <span className="text-dark-700 font-medium">{q.remaining || q.value || '-'} / {q.total || '-'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-400 text-sm text-center py-4">Tidak ada paket aktif.</p>
          )}
        </Card>
      )}
    </div>
  );
}
