export function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex justify-center py-8">
      <div className={`animate-spin rounded-full border-3 border-primary-600 border-t-transparent ${sizes[size]}`} />
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  let cls = 'bg-dark-100 text-dark-600';
  let label = status || '-';
  if (s === 'success' || s === 'sukses') { cls = 'bg-success-50 text-success-700'; label = 'Sukses'; }
  else if (s === 'pending' || s === 'processing') { cls = 'bg-warning-50 text-warning-600'; label = 'Pending'; }
  else if (s === 'failed' || s === 'gagal') { cls = 'bg-danger-50 text-danger-700'; label = 'Gagal'; }
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-dark-200 ${className}`}>{children}</div>;
}

export function PageTitle({ children, icon: Icon }) {
  return (
    <h1 className="flex items-center gap-3 text-xl font-bold text-dark-800 mb-6">
      {Icon && <Icon className="text-primary-600" size={24} />}
      {children}
    </h1>
  );
}
