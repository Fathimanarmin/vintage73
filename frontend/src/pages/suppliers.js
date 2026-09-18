import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiPlus, FiTrash2, FiEdit2, FiTruck, FiMapPin, FiPhone, FiBox, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', contactPerson: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/suppliers/${currentId}`, formData);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added');
      }
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (err) {
      toast.error('Failed to delete supplier');
    }
  };

  const openEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      contactPerson: supplier.contactPerson || ''
    });
    setCurrentId(supplier.id);
    setIsEdit(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', gstNumber: '', contactPerson: '' });
    setIsEdit(false);
    setCurrentId(null);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.gstNumber && s.gstNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Suppliers</h1>
          <p className="text-slate-500 text-sm">Manage product vendors and supply chain</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search vendor, contact or GST..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus className="text-lg" /> Add Supplier
          </button>
        </div>
      </div>

      <div className="table-container card scroll-line lg:no-scrollbar">
        <table className="table-modern">
          <thead>
            <tr className="whitespace-nowrap">
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>GST Number</th>
              <th>Address</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map(supplier => (
              <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                <td className="font-medium text-slate-700">{supplier.name}</td>
                <td className="text-sm text-slate-600">{supplier.contactPerson || '-'}</td>
                <td className="text-sm text-slate-600">{supplier.phone}</td>
                <td className="text-sm text-slate-600">{supplier.gstNumber || '-'}</td>
                <td className="text-sm text-slate-500 truncate max-w-xs">{supplier.address}</td>
                <td className="text-right flex justify-end gap-2">
                  <button onClick={() => openEdit(supplier)} className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary-light"><FiEdit2 /></button>
                  <button onClick={() => handleDelete(supplier.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"><FiTrash2 /></button>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400 italic">
                  <FiSearch size={32} className="mx-auto mb-2 opacity-20" />
                  No suppliers found matching "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] flex flex-col mt-20 sm:my-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="col-span-1">
                  <label className="label text-xs sm:text-sm">Supplier Name</label>
                  <input required className="input py-2 sm:py-2.5" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="label text-xs sm:text-sm">Contact Person</label>
                    <input className="input py-2 sm:py-2.5" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs sm:text-sm">GST Number</label>
                    <input className="input py-2 sm:py-2.5" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="label text-xs sm:text-sm">Phone</label>
                    <input className="input py-2 sm:py-2.5" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-xs sm:text-sm">Email</label>
                    <input type="email" className="input py-2 sm:py-2.5" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="label text-xs sm:text-sm">Address</label>
                  <textarea className="input py-2 sm:py-2.5" rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pb-2">
                <button type="button" className="btn btn-secondary px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base">{isEdit ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
