export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'success' || s === 'sukses') return { color: 'bg-success-500', text: 'Sukses' };
  if (s === 'pending' || s === 'processing') return { color: 'bg-warning-500', text: 'Pending' };
  if (s === 'failed' || s === 'gagal') return { color: 'bg-danger-500', text: 'Gagal' };
  return { color: 'bg-dark-400', text: status || '-' };
}

export function ubahKe62(nomor) {
  const cleaned = String(nomor).replace(/[\s+-]/g, '');
  if (cleaned.startsWith('0')) return '62' + cleaned.substring(1);
  return cleaned;
}

export function ubahKe0(nomor) {
  const cleaned = String(nomor).replace(/[\s+-]/g, '');
  if (cleaned.startsWith('62')) return '0' + cleaned.substring(2);
  return cleaned;
}
