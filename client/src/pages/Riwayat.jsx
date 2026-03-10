import { useState } from 'react';
import { api } from '../utils/api';
import { formatRupiah, formatDate } from '../utils/helpers';
import { Card, PageTitle, StatusBadge, LoadingSpinner } from '../components/UI';
import Modal from '../components/Modal';
import { FiClock, FiSearch, FiChevronDown, FiChevronUp, FiCopy } from 'react-icons/fi';

export default function Riwayat() {
  const [topups, setTopups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [loadingTrx, setLoadingTrx] = useState(false);
  const [search, setSearch] = useState({ topup: '', trx: '' });
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const [openSection, setOpenSection] = useState('trx');
  const [detailModal, setDetailModal] = useState(null);
  const [loaded, setLoaded] = useState({ topup: false, trx: false });

  const fetchTopups = async () => {
    setLoadingTopups(true);
    try {
      const data = await api.post('/api/history/topups', { searchTerm: search.topup, ...dates });
      setTopups(data.data || []);
      setLoaded((p) => ({ ...p, topup: true }));
    } catch {}
    setLoadingTopups(false);
  };

  const fetchTransactions = async () => {
    setLoadingTrx(true);
    try {
      const data = await api.post('/api/history/transactions', { searchTerm: search.trx, ...dates });
      setTransactions(data.data || []);
      setLoaded((p) => ({ ...p, trx: true }));
    } catch {}
    setLoadingTrx(false);
  };

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? '' : section);
    if (section === 'topup' && !loaded.topup) fetchTopups();
    if (section === 'trx' && !loaded.trx) fetchTransactions();
  };

  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      <PageTitle icon={FiClock}>Riwayat</PageTitle>

      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" value={dates.startDate} onChange={(e) => setDates({ ...dates, startDate: e.target.value })} className="px-3 py-2 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <span className="text-dark-400">s/d</span>
          <input type="date" value={dates.endDate} onChange={(e) => setDates({ ...dates, endDate: e.target.value })} className="px-3 py-2 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <button onClick={() => { fetchTopups(); fetchTransactions(); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-xl transition-colors">
            Filter
          </button>
        </div>
      </Card>

      {/* Topup History */}
      <Card>
        <button onClick={() => toggleSection('topup')} className="w-full flex items-center justify-between p-5 text-left">
          <h2 className="font-semibold text-dark-800">Riwayat Top Up</h2>
          {openSection === 'topup' ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {openSection === 'topup' && (
          <div className="px-5 pb-5 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                <input type="text" value={search.topup} onChange={(e) => setSearch({ ...search, topup: e.target.value })} placeholder="Cari..." className="w-full pl-9 pr-3 py-2 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <button onClick={fetchTopups} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">Cari</button>
            </div>
            {loadingTopups ? <LoadingSpinner size="sm" /> : topups.length === 0 ? (
              <p className="text-center text-dark-400 py-6 text-sm">Belum ada riwayat top up.</p>
            ) : (
              <div className="space-y-2">
                {topups.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-dark-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-dark-800">{t.deposit_id}</p>
                      <p className="text-xs text-dark-400">{formatDate(t.updated_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-600">{formatRupiah(t.amount)}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Transaction History */}
      <Card>
        <button onClick={() => toggleSection('trx')} className="w-full flex items-center justify-between p-5 text-left">
          <h2 className="font-semibold text-dark-800">Riwayat Transaksi</h2>
          {openSection === 'trx' ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {openSection === 'trx' && (
          <div className="px-5 pb-5 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                <input type="text" value={search.trx} onChange={(e) => setSearch({ ...search, trx: e.target.value })} placeholder="Cari..." className="w-full pl-9 pr-3 py-2 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <button onClick={fetchTransactions} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">Cari</button>
            </div>
            {loadingTrx ? <LoadingSpinner size="sm" /> : transactions.length === 0 ? (
              <p className="text-center text-dark-400 py-6 text-sm">Belum ada riwayat transaksi.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((t, i) => (
                  <button key={i} onClick={() => setDetailModal(t)} className="w-full flex items-center justify-between p-3 bg-dark-50 rounded-xl text-left hover:bg-dark-100 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-dark-800 truncate">{t.product_name || t.ref_id}</p>
                      <p className="text-xs text-dark-400">{t.destination} · {formatDate(t.updated_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-primary-600">{formatRupiah(t.price)}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail Transaksi">
        {detailModal && (
          <div className="space-y-3">
            {[
              ['Ref ID', detailModal.ref_id],
              ['Produk', detailModal.product_name],
              ['Tujuan', detailModal.destination],
              ['Harga', formatRupiah(detailModal.price)],
              ['Metode', detailModal.payment_method],
              ['Status', detailModal.status],
              ['SN', detailModal.serial_number],
              ['Pesan', detailModal.message],
              ['Waktu', formatDate(detailModal.updated_at)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-dark-100 last:border-0">
                <span className="text-sm text-dark-500">{label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-dark-800 text-right">{val || '-'}</span>
                  {val && label === 'SN' && (
                    <button onClick={() => copy(val)} className="text-primary-600"><FiCopy size={13} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
