import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiCheck, FiX } from 'react-icons/fi';

export default function BankMaster() {
    const [banks, setBanks] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
        address: '',
        isActive: true
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const { data } = await api.get('/banks');
            setBanks(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load banks');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/banks/${editingId}`, formData);
                toast.success('Bank updated successfully');
            } else {
                await api.post('/banks', formData);
                toast.success('Bank created successfully');
            }
            setIsModalOpen(false);
            resetForm();
            fetchBanks();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save bank');
        }
    };

    const handleEdit = (bank) => {
        setFormData({
            name: bank.name,
            accountNumber: bank.accountNumber || '',
            ifscCode: bank.ifscCode || '',
            branchName: bank.branchName || '',
            address: bank.address || '',
            isActive: bank.isActive
        });
        setEditingId(bank.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this bank?')) return;
        try {
            await api.delete(`/banks/${id}`);
            toast.success('Bank deleted successfully');
            fetchBanks();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete bank');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            accountNumber: '',
            ifscCode: '',
            branchName: '',
            address: '',
            isActive: true
        });
        setEditingId(null);
    };

    const filteredBanks = banks.filter(bank =>
        bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.ifscCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bank.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Bank Master</h1>
                    <p className="text-slate-500 text-sm mt-1">{filteredBanks.length} banks registered</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-dark transition-all shadow-sm w-full md:w-auto justify-center whitespace-nowrap"
                >
                    <FiPlus size={16} /> Add Bank
                </button>
            </div>

            <div className="mb-4">
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, IFSC or branch..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : (
                <div className="card shadow-md border border-slate-200">
                    <div className="table-container lg:no-scrollbar">
                        <table className="table-modern">
                            <thead>
                                <tr className="whitespace-nowrap">
                                    <th style={{ width: '5%' }}>#</th>
                                    <th style={{ width: '25%' }}>Bank Name</th>
                                    <th style={{ width: '15%' }}>A/C Number</th>
                                    <th style={{ width: '10%' }}>IFSC Code</th>
                                    <th style={{ width: '15%' }}>Branch</th>
                                    <th style={{ width: '15%' }}>Address</th>
                                    <th className="text-center" style={{ width: '10%' }}>Status</th>
                                    <th className="text-center" style={{ width: '5%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBanks.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-slate-400">
                                            No banks found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBanks.map((bank, index) => (
                                        <tr key={bank.id}>
                                            <td className="text-slate-500">{index + 1}</td>
                                            <td className="font-medium text-slate-800 uppercase tracking-tight">{bank.name}</td>
                                            <td className="font-mono text-slate-600 font-medium">{bank.accountNumber || '-'}</td>
                                            <td className="font-mono text-slate-600 uppercase text-xs">{bank.ifscCode || '-'}</td>
                                            <td className="text-slate-600">{bank.branchName || '-'}</td>
                                            <td className="text-slate-500 text-xs truncate max-w-[150px]">{bank.address || '-'}</td>
                                            <td className="text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-widest ${bank.isActive ? 'bg-primary-light/10 text-primary border border-primary-light/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                    {bank.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(bank)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(bank.id)}
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
                </div>
            )}

            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
                                {editingId ? 'Edit Bank' : 'Add New Bank'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Bank Name *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. HDFC Bank"
                                    className="input w-full bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-primary-light/30 transition-all py-2.5 text-sm"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Account Number</label>
                                <input
                                    type="text"
                                    placeholder="123456789012"
                                    className="input w-full bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-primary-light/30 transition-all py-2.5 text-sm font-mono"
                                    value={formData.accountNumber}
                                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">IFSC Code</label>
                                    <input
                                        type="text"
                                        placeholder="HDFC0001234"
                                        className="input w-full bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-primary-light/30 transition-all py-2.5 text-sm font-mono uppercase"
                                        value={formData.ifscCode}
                                        onChange={e => setFormData({ ...formData, ifscCode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Branch Name</label>
                                    <input
                                        type="text"
                                        placeholder="City Branch"
                                        className="input w-full bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-primary-light/30 transition-all py-2.5 text-sm"
                                        value={formData.branchName}
                                        onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Address</label>
                                <textarea
                                    rows="2"
                                    placeholder="Full street address..."
                                    className="input w-full bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-primary-light/30 transition-all py-2.5 text-sm resize-none"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">Set as Active</label>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-[10px] uppercase tracking-widest hover:bg-black hover:shadow-lg active:scale-95 transition-all"
                                >
                                    {editingId ? 'Update Bank' : 'Create Bank'}
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
