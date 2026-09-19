import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiSave } from 'react-icons/fi';

export default function StateMaster() {
  const [states, setStates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/states');
      setStates(res.data);
    } catch (err) {
      toast.error('Failed to load states');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/states/${editingId}`, formData);
        toast.success('State updated successfully');
      } else {
        await api.post('/states', formData);
        toast.success('State added successfully');
      }
      closeModal();
      fetchStates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this state?')) return;
    try {
      await api.delete(`/states/${id}`);
      toast.success('State deleted');
      fetchStates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const openModal = (state = null) => {
    if (state) {
      setEditingId(state.id);
      setFormData({ name: state.name, code: state.code || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', code: '' });
  };

  const filteredStates = states.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code && s.code.includes(search))
  );

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">State Master</h1>
          <p className="text-slate-500 text-sm mt-1">{filteredStates.length} states</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-dark transition-all shadow-sm w-full md:w-auto justify-center whitespace-nowrap"
        >
          <FiPlus size={16} /> Add State
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search states or GST codes..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card shadow-md border border-slate-200">
        <div className="table-container lg:no-scrollbar">
          <table className="table-modern">
            <thead>
              <tr className="whitespace-nowrap">
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '60%' }}>State Name</th>
                <th className="text-center" style={{ width: '20%' }}>GST Code</th>
                <th className="text-center" style={{ width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : filteredStates.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-slate-400">No states found</td></tr>
              ) : (
                filteredStates.map((state, index) => (
                  <tr key={state.id}>
                    <td className="text-slate-500">{index + 1}</td>
                    <td className="font-semibold text-slate-800">{state.name}</td>
                    <td className="text-center font-mono">
                      {state.code ? (
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs">
                          {state.code}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(state)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(state.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50 border-t border-slate-300 px-4 py-2 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{filteredStates.length}</span> states
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingId ? 'Edit State' : 'Add New State'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">State Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maharashtra"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">GST Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. 27"
                />
                <p className="text-[10px] text-slate-400 mt-1">First 2 digits of GSTIN</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-dark transition-all flex justify-center items-center gap-2"
                >
                  <FiSave size={16} /> {editingId ? 'Update State' : 'Create State'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
