import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiSave, FiTag } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';

export default function BrandMaster() {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    categoryId: '',
    categoryName: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [brandRes, catRes] = await Promise.all([
        api.get('/brands'),
        api.get('/categories')
      ]);
      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      toast.error('Failed to load brand data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error('Brand name is required');
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        barcode: formData.barcode ? formData.barcode.trim() : undefined,
        categoryId: formData.categoryId || null,
        categoryName: formData.categoryName || null
      };

      if (editingId) {
        await api.put(`/brands/${editingId}`, payload);
        toast.success('Brand updated successfully');
      } else {
        await api.post('/brands', payload);
        toast.success('Brand created successfully');
      }
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await api.delete(`/brands/${id}`);
      toast.success('Brand deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete brand');
    }
  };

  const openModal = (brand = null) => {
    if (brand) {
      setEditingId(brand.id);
      setFormData({
        name: brand.name || '',
        barcode: brand.barcode || '',
        categoryId: brand.categoryId ? String(brand.categoryId) : '',
        categoryName: brand.categoryName || brand.category?.name || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        barcode: '',
        categoryId: '',
        categoryName: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      barcode: '',
      categoryId: '',
      categoryName: ''
    });
  };

  const handleCategoryChange = (val) => {
    const selected = categories.find(c => String(c.id) === String(val));
    setFormData(prev => ({
      ...prev,
      categoryId: val || '',
      categoryName: selected ? selected.name : ''
    }));
  };

  const filteredBrands = brands.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    (b.categoryName && b.categoryName.toLowerCase().includes(search.toLowerCase())) ||
    (b.category?.name && b.category.name.toLowerCase().includes(search.toLowerCase())) ||
    (b.barcode && b.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <FiTag className="text-primary" /> Brand Master
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage brand master catalog and category linkages ({filteredBrands.length} brands)</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-dark transition-all shadow-sm w-full md:w-auto justify-center whitespace-nowrap"
        >
          <FiPlus size={16} /> Add New Brand
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by brand name, category, or barcode..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card shadow-md border border-slate-200">
        <div className="table-container lg:no-scrollbar">
          <table className="table-modern">
            <thead>
              <tr className="whitespace-nowrap">
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '35%' }}>Brand Name</th>
                <th style={{ width: '30%' }}>Category</th>
                <th className="text-center" style={{ width: '15%' }}>Barcode</th>
                <th className="text-center" style={{ width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-slate-400">Loading brands...</td></tr>
              ) : filteredBrands.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-slate-400">No brands found.</td></tr>
              ) : (
                filteredBrands.map((brand, index) => {
                  const catName = brand.category?.name || brand.categoryName || 'All Categories';
                  return (
                    <tr key={brand.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="text-slate-500">{index + 1}</td>
                      <td className="font-semibold text-slate-800">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded-md text-xs font-bold border border-amber-200">
                          {brand.name}
                        </span>
                      </td>
                      <td>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium border border-indigo-100">
                          {catName}
                        </span>
                      </td>
                      <td className="text-center font-mono text-xs text-slate-600">
                        {brand.barcode ? (
                          <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {brand.barcode}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openModal(brand)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Brand"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(brand.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Brand"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50 border-t border-slate-300 px-4 py-2 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{filteredBrands.length}</span> brands
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[50000] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingId ? 'Edit Brand' : 'Add New Brand'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Nike, Adidas, Puma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Category (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { label: 'All Categories (Global Brand)', value: '' },
                    ...categories.map(c => ({ label: c.name, value: c.id }))
                  ]}
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  placeholder="Select Category..."
                  zIndex={100005}
                />
                <p className="text-[11px] text-slate-400 mt-1">If selected, this brand will appear when selecting this Category in Product Modal.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                  value={formData.barcode}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Auto-generated if left empty"
                />
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
                  <FiSave size={16} /> {editingId ? 'Update Brand' : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
