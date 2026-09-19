import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '@/lib/api';
import { MENU_STRUCTURE } from '@/lib/menuStructure';
import { FiPlus, FiTrash2, FiEdit2, FiUsers, FiMapPin, FiPhone, FiSearch, FiCheck, FiLoader, FiKey } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function Customers() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', gstin: '', partyType: 'B2C', username: '', password: '', accessPermissions: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingGST, setVerifyingGST] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const toggleModule = (module) => {
    setFormData(prev => {
      const current = prev.accessPermissions || [];
      if (current.includes(module)) {
        return { ...prev, accessPermissions: current.filter(m => m !== module) };
      } else {
        return { ...prev, accessPermissions: [...current, module] };
      }
    });
  };

  useEffect(() => {
    fetchCustomers();
    if (router.query.autoOpenAdd === 'true') {
      setShowModal(true);
    }
  }, [router.query]);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/customers/${currentId}`, formData);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer added');
      }
      setShowModal(false);
      resetForm();
      fetchCustomers();
      if (router.query.returnTo) {
        router.push(router.query.returnTo);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to delete customer');
    }
  };

  const openEdit = (customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      gstin: customer.gstin || '',
      partyType: customer.partyType || 'B2C',
      username: customer.username || '',
      password: '',
      accessPermissions: customer.accessPermissions || []
    });
    setCurrentId(customer.id);
    setIsEdit(true);
    setGstVerified(!!customer.gstin);
    setActiveTab('general');
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', gstin: '', partyType: 'B2C', username: '', password: '', accessPermissions: [] });
    setIsEdit(false);
    setCurrentId(null);
    setGstVerified(false);
    setActiveTab('general');
  };

  // Verify GSTIN and fetch details
  const verifyGSTIN = async () => {
    const gstin = formData.gstin.trim().toUpperCase();

    if (!gstin) {
      toast.error('Please enter a GSTIN number');
      return;
    }

    if (gstin.length !== 15) {
      toast.error('GSTIN must be 15 characters');
      return;
    }

    setVerifyingGST(true);
    try {
      const { data } = await api.get(`/gst/verify/${gstin}`);

      if (data.valid) {
        // Auto-fill form with fetched data
        setFormData(prev => ({
          ...prev,
          gstin: data.gstin,
          name: data.legalName || data.tradeName || prev.name,
          address: data.address || prev.address,
          city: data.city || prev.city,
          state: data.state || prev.state,
          pincode: data.pincode || prev.pincode,
          partyType: 'B2B'
        }));

        setGstVerified(true);

        if (data.manualEntry) {
          toast.success(`GSTIN verified! State: ${data.state}. Please enter other details manually.`);
        } else {
          toast.success(`GSTIN verified! ${data.legalName || data.tradeName}`);
        }
      } else {
        toast.error(data.error || 'Invalid GSTIN');
        setGstVerified(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to verify GSTIN');
      setGstVerified(false);
    } finally {
      setVerifyingGST(false);
    }
  };

  // Handle GSTIN change - reset verification status
  const handleGSTINChange = (value) => {
    setFormData({ ...formData, gstin: value.toUpperCase() });
    setGstVerified(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.gstin && c.gstin.includes(searchQuery.toUpperCase())) ||
    (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Customers</h1>
          <p className="text-slate-500 text-sm">Manage your directory and view customer history</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search name, phone, GSTIN..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus className="text-lg" /> Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${customer.partyType === 'B2B' ? 'bg-blue-50 text-blue-600' : 'bg-primary-light text-primary'}`}>
                  <FiUsers />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">{customer.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <FiPhone className="text-[10px]" /> {customer.phone || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <span className={`text-xs px-2 py-0.5 rounded ${customer.partyType === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                  {customer.partyType}
                </span>
                <button onClick={() => openEdit(customer)} className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-primary-light"><FiEdit2 /></button>
                <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"><FiTrash2 /></button>
              </div>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              {customer.gstin && (
                <p className="text-xs font-mono bg-slate-50 px-2 py-1 rounded">GSTIN: {customer.gstin}</p>
              )}
              {customer.address && <p className="flex items-start gap-2"><FiMapPin className="mt-0.5 text-slate-400" /> {customer.address}</p>}
              <div className="pt-3 mt-3 border-t border-slate-50 flex justify-between items-center text-[10px] uppercase tracking-wider font-medium">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <FiMapPin size={12} className="text-primary" />
                  <span>{customer.branch?.name || 'Global'}</span>
                </div>
                <div className="text-slate-400">{customer._count?.sales || 0} Orders</div>
              </div>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <FiSearch size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-sm">Try adjusting your search or add a new customer.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Sticky Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Please fill in the customer or business details below</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-semibold transition-colors">&times;</button>
            </div>
            
            {/* Form wrapping body and sticky footer */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Segmented Control Tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'general' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    General Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('access')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'access' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Customer Access
                  </button>
                </div>

                {/* General Tab */}
                <div className={activeTab === 'general' ? 'block space-y-5' : 'hidden'}>
                  {/* GSTIN Verification Section */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/70 rounded-2xl p-5 shadow-sm">
                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                      🔍 GST Number Lookup
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        className="input flex-1 font-mono uppercase text-sm"
                        placeholder="Enter 15-digit GSTIN"
                        value={formData.gstin}
                        onChange={e => handleGSTINChange(e.target.value)}
                        maxLength={15}
                      />
                      <button
                        type="button"
                        onClick={verifyGSTIN}
                        disabled={verifyingGST || formData.gstin.length !== 15}
                        className={`px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all w-full sm:w-auto shadow-md shadow-blue-500/10 ${gstVerified
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                      >
                        {verifyingGST ? (
                          <><FiLoader className="animate-spin" /> Verifying...</>
                        ) : gstVerified ? (
                          <><FiCheck /> Verified</>
                        ) : (
                          'Verify GST'
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-500 font-medium mt-2">
                      Enter GSTIN to auto-fill business name, address, and state details from GST portal.
                    </p>
                  </div>

                  {/* Fields Container */}
                  <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Business / Customer Name <span className="text-red-500">*</span></label>
                      <input
                        required
                        className="input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder={gstVerified ? 'Auto-filled from GST' : 'Enter name'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Phone</label>
                      <input className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter phone" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
                      <input type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Address</label>
                      <textarea className="input" rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Enter billing address"></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">City</label>
                      <input className="input" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Enter city" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">State</label>
                      <input className="input" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} placeholder="Enter state" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Pincode</label>
                      <input className="input" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} placeholder="Enter pincode" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Party Type</label>
                      <select className="input" value={formData.partyType} onChange={e => setFormData({ ...formData, partyType: e.target.value })}>
                        <option value="B2C">B2C (Consumer)</option>
                        <option value="B2B">B2B (Business)</option>
                        <option value="Unregistered">Unregistered</option>
                      </select>
                    </div>
                    
                    <div className="col-span-2 pt-4 border-t border-slate-100 mt-2">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
                        <FiKey className="text-primary" /> Login Credentials
                      </h3>
                      <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
                          <input className="input" placeholder="Optional" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{isEdit ? 'Set New Password' : 'Password'}</label>
                          <input type="password" placeholder={isEdit ? 'Leave blank to keep current' : 'Optional'} className="input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access Tab */}
                <div className={activeTab === 'access' ? 'block' : 'hidden'}>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-3.5 bg-primary rounded-full"></div>
                      Customer Module Permissions
                    </label>

                    {/* Dashboard separate */}
                    <div className="mb-4">
                      <label className="relative inline-flex items-center cursor-pointer p-3 rounded-xl border transition-all hover:bg-slate-100 border-slate-200 bg-white shadow-sm">
                        <input
                          type="checkbox"
                          checked={formData.accessPermissions?.includes('DASHBOARD')}
                          onChange={() => toggleModule('DASHBOARD')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                        <span className={`ml-3 text-[10px] font-bold tracking-tight uppercase ${formData.accessPermissions?.includes('DASHBOARD') ? 'text-primary-dark font-extrabold' : 'text-slate-500'}`}>DASHBOARD</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-2">
                      {MENU_STRUCTURE.map(group => (
                        <div key={group.title} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.accessPermissions?.includes(group.title)}
                                onChange={() => toggleModule(group.title)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                            </label>
                            <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wide">{group.title}</span>
                          </div>

                          <div className="space-y-1">
                            {group.items.map(item => {
                              const permissionKey = `${group.title}:${item.name}`;
                              const isParentSelected = formData.accessPermissions?.includes(group.title);
                              const isSelected = formData.accessPermissions?.includes(permissionKey);

                              return (
                                <label key={permissionKey} className={`flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-50 transition-colors ${isParentSelected ? 'opacity-50' : ''}`}>
                                  <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected || isParentSelected}
                                      onChange={() => toggleModule(permissionKey)}
                                      disabled={isParentSelected}
                                      className="sr-only peer"
                                    />
                                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                                  </div>
                                  <span className={`text-[11px] ${isSelected || isParentSelected ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{item.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button type="button" className="btn btn-secondary w-full sm:w-auto justify-center rounded-xl" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-full sm:w-auto justify-center rounded-xl shadow-lg shadow-primary/20">{isEdit ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
