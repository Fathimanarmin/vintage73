import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiPhone, FiMail, FiEye, FiFileText, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ProfessionalInvoice from '@/components/ProfessionalInvoice';
import { INVOICE_TEMPLATES, getDemoInvoiceData, getTemplateName } from '@/lib/invoiceTemplates';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    phone: '', 
    email: '', 
    isActive: true, 
    stockIncluded: true,
    invoiceTemplate: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState('modern');

  useEffect(() => {
    fetchBranches();
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    try {
      const { data } = await api.get('/company');
      if (data) setCompanyProfile(data);
    } catch (err) {
      console.error('Failed to fetch company profile', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (err) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/branches/${editingId}`, formData);
        toast.success('Branch updated');
      } else {
        await api.post('/branches', formData);
        toast.success('Branch created');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', address: '', phone: '', email: '', isActive: true, stockIncluded: true, invoiceTemplate: '' });
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branch');
    }
  };

  const openEditModal = (branch) => {
    setEditingId(branch.id);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive,
      stockIncluded: branch.stockIncluded !== undefined ? branch.stockIncluded : true,
      invoiceTemplate: branch.invoiceTemplate || branch.invoiceSettings?.template || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will fail if users are assigned to this branch.')) return;
    try {
      await api.delete(`/branches/${id}`);
      toast.success('Branch deleted');
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  const handleOpenPreview = (templateId) => {
    const targetTemplate = templateId || formData.invoiceTemplate || 'modern';
    setPreviewTemplate(targetTemplate);
    setShowPreviewModal(true);
  };

  // Build realistic demo preview data based on selected template and branch form
  const demoPrintData = getDemoInvoiceData(previewTemplate, formData, companyProfile);
  const previewProfile = {
    companyName: formData.name || companyProfile?.companyName || 'BOUTIQUE FASHION',
    address: formData.address || companyProfile?.address || 'Main Street, Fashion Boulevard',
    phone: formData.phone || companyProfile?.phone || '+971 4 345 6789',
    email: formData.email || companyProfile?.email || 'sales@boutique.ae',
    currencyCode: companyProfile?.currencyCode || 'AED',
    currencySymbol: companyProfile?.currencySymbol || 'AED ',
    logoUrl: companyProfile?.logoUrl || null
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Branches</h1>
          <p className="text-slate-500 text-sm mt-1">Manage multiple business locations</p>
        </div>
        <button 
          className="btn btn-primary w-full md:w-auto justify-center whitespace-nowrap" 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', address: '', phone: '', email: '', isActive: true, stockIncluded: true, invoiceTemplate: '' });
            setShowModal(true);
          }}
        >
          <FiPlus className="text-lg" /> Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map(branch => {
          const assignedTpl = branch.invoiceTemplate || branch.invoiceSettings?.template;
          return (
            <div key={branch.id} className="card p-6 border-0 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full transition-colors ${branch.isActive ? 'bg-primary-light/10' : 'bg-slate-50'} group-hover:scale-110`}></div>

              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${branch.isActive ? 'bg-primary-light/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${branch.stockIncluded ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    Stock: {branch.stockIncluded ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(branch)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary-light/10 rounded-lg transition-colors" title="Edit Branch">
                      <FiEdit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(branch.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Branch">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-slate-800 mb-4">{branch.name}</h3>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <FiMapPin className="text-slate-400 shrink-0" />
                    <span className="truncate">{branch.address || 'No address'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiPhone className="text-slate-400 shrink-0" />
                    <span>{branch.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiMail className="text-slate-400 shrink-0" />
                    <span className="truncate">{branch.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FiFileText className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">
                        Template: <strong className="text-slate-700 font-semibold">{assignedTpl ? getTemplateName(assignedTpl) : 'Not Assigned'}</strong>
                      </span>
                    </div>
                    {assignedTpl && (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(assignedTpl)}
                        className="text-[11px] text-[#009262] hover:text-[#047857] flex items-center gap-1 font-medium bg-[#009262]/5 hover:bg-[#009262]/10 px-2 py-0.5 rounded transition-colors shrink-0"
                        title="Preview Template"
                      >
                        <FiEye size={12} /> Preview
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">ID: BR-{branch.id.toString().padStart(3, '0')}</span>
                  <span className="text-xs text-slate-400">Created {new Date(branch.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
        {branches.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400">No branches added yet. Click 'Add Branch' to get started.</p>
          </div>
        )}
      </div>

      {/* Branch Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-semibold text-slate-800">{editingId ? 'Edit Branch' : 'Add New Branch'}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name *</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Downtown Branch"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Invoice Template Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Invoice Template <span className="text-red-500">*</span>
                  </label>
                  {formData.invoiceTemplate && (
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(formData.invoiceTemplate)}
                      className="text-xs text-[#009262] hover:text-[#047857] flex items-center gap-1 font-medium transition-colors"
                    >
                      <FiEye size={13} /> Preview Design
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    required
                    className="input flex-1"
                    value={formData.invoiceTemplate}
                    onChange={e => setFormData({ ...formData, invoiceTemplate: e.target.value })}
                  >
                    <option value="">Select Invoice Template</option>
                    {INVOICE_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!formData.invoiceTemplate}
                    onClick={() => handleOpenPreview(formData.invoiceTemplate)}
                    title="Preview selected invoice template"
                    className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
                      formData.invoiceTemplate 
                        ? 'border-[#009262] text-[#009262] bg-[#009262]/5 hover:bg-[#009262]/10 cursor-pointer' 
                        : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                    }`}
                  >
                    <FiEye size={14} />
                    <span>Preview</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This template determines the layout and design when printing invoices from this branch.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  className="input min-h-[70px]"
                  placeholder="Full address of the branch"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    className="input"
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="branch@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 py-2 mt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700">Active Status</span>
                </label>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="stockIncluded"
                    checked={formData.stockIncluded}
                    onChange={e => setFormData({ ...formData, stockIncluded: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-orange-500"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700">Stock Included (Strict Validation)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Branch' : 'Create Branch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Template Realistic Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="p-4 px-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#009262]/10 text-[#009262] flex items-center justify-center">
                  <FiFileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Template Preview: {getTemplateName(previewTemplate)}
                  </h3>
                  <p className="text-xs text-slate-500">Realistic demo rendering using your branch layout settings</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
                title="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-6 flex justify-center">
              <div className="bg-white shadow-md rounded-xl p-4 max-w-full overflow-x-auto border border-slate-200">
                <ProfessionalInvoice 
                  printData={demoPrintData} 
                  companyProfile={previewProfile} 
                  previewMode="Desktop" 
                />
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-200 bg-white flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Template ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">{previewTemplate}</code>
              </span>
              <button 
                type="button" 
                className="btn btn-primary text-xs px-4 py-2" 
                onClick={() => setShowPreviewModal(false)}
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
