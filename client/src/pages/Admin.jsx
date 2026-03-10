import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Card, PageTitle, LoadingSpinner } from '../components/UI';
import Modal from '../components/Modal';
import { FiShield, FiSearch, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

export default function Admin() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [primaryKey, setPrimaryKey] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ product_id: '', product_name: '', amount: '', category: '', provider: '', description: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/api/admin/tables').then((d) => setTables(d.tables || [])).catch(() => {});
  }, []);

  const fetchTableData = async (tableName, searchTerm = '') => {
    setLoading(true);
    try {
      const d = await api.post(`/api/admin/table-data/${tableName}`, { searchTerm });
      setColumns(d.columns || []);
      setData(d.data || []);
      setPrimaryKey(d.primaryKey || '');
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setLoading(false);
  };

  const handleSelectTable = (t) => {
    setSelectedTable(t);
    setSearch('');
    fetchTableData(t);
  };

  const handleSearch = () => {
    if (selectedTable) fetchTableData(selectedTable, search);
  };

  const handleEdit = (row) => {
    setEditData({ ...row });
    setEditModal(row);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.post('/api/admin/update-row', { tableName: selectedTable, primaryKeyColumn: primaryKey, primaryKeyValue: editModal[primaryKey], updatedData: editData });
      setEditModal(null);
      fetchTableData(selectedTable, search);
      setMessage({ type: 'success', text: 'Data berhasil diperbarui.' });
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setSaving(false);
  };

  const handleDelete = async (row) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.post('/api/admin/delete-row', { tableName: selectedTable, primaryKeyColumn: primaryKey, primaryKeyValue: row[primaryKey] });
      fetchTableData(selectedTable, search);
      setMessage({ type: 'success', text: 'Data berhasil dihapus.' });
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/admin/no-otp/add', addForm);
      setAddModal(false);
      setAddForm({ product_id: '', product_name: '', amount: '', category: '', provider: '', description: '' });
      setMessage({ type: 'success', text: 'Produk berhasil ditambahkan.' });
      if (selectedTable === 'products') fetchTableData('products');
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageTitle icon={FiShield}>Admin Panel</PageTitle>
        <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-success-600 hover:bg-success-700 text-white text-sm font-medium rounded-xl transition-colors">
          <FiPlus size={16} /> Tambah Produk
        </button>
      </div>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {message.text}
        </div>
      )}

      {/* Table Selector */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => (
            <button key={t} onClick={() => handleSelectTable(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedTable === t ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      {/* Search */}
      {selectedTable && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Cari data..." className="w-full pl-9 pr-3 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button onClick={handleSearch} className="px-5 py-2.5 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">Cari</button>
        </div>
      )}

      {/* Data Table */}
      {loading ? <LoadingSpinner /> : selectedTable && data.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-50 border-b border-dark-200">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-dark-600 whitespace-nowrap">{col}</th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-dark-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-dark-100 hover:bg-dark-50">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-dark-700 whitespace-nowrap max-w-xs truncate">{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}</td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(row)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(row)} className="p-1.5 text-danger-600 hover:bg-danger-50 rounded-lg"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Data" size="lg">
        {editModal && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {columns.map((col) => (
              <div key={col}>
                <label className="block text-xs text-dark-500 mb-1">{col}</label>
                <input
                  type="text"
                  value={typeof editData[col] === 'object' ? JSON.stringify(editData[col]) : String(editData[col] ?? '')}
                  onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
                  className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={col === primaryKey}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 border border-dark-200 text-dark-600 rounded-xl text-sm">Batal</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Tambah Produk No OTP">
        <form onSubmit={handleAddProduct} className="space-y-3">
          {['product_id', 'product_name', 'amount', 'category', 'provider', 'description'].map((field) => (
            <div key={field}>
              <label className="block text-xs text-dark-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
              <input
                type={field === 'amount' || field === 'product_id' ? 'number' : 'text'}
                value={addForm[field]}
                onChange={(e) => setAddForm({ ...addForm, [field]: e.target.value })}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required={['product_id', 'product_name', 'amount'].includes(field)}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="flex-1 py-2.5 border border-dark-200 text-dark-600 rounded-xl text-sm">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-success-600 text-white rounded-xl text-sm disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
