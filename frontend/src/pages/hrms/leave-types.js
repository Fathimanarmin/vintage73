import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiTrash2, FiPlus, FiX } from 'react-icons/fi';

export default function LeaveTypes() {
    const [types, setTypes] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [form, setForm] = useState({ name: '', isPaid: true, monthlyLimit: 0, color: '#3B82F6' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const res = await api.get('/hrms/leave-types');
            setTypes(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingType) {
                await api.put(`/hrms/leave-types/${editingType.id}`, form);
                toast.success("Leave Type Updated");
            } else {
                await api.post('/hrms/leave-types', form);
                toast.success("Leave Type Created");
            }
            closeModal();
            fetchTypes();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save");
        }
    };

    const handleEdit = (type) => {
        setEditingType(type);
        setForm({
            name: type.name,
            isPaid: type.isPaid,
            monthlyLimit: type.monthlyLimit,
            color: type.color || '#3B82F6'
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingType(null);
        setForm({ name: '', isPaid: true, monthlyLimit: 0, color: '#3B82F6' });
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/hrms/leave-types/${id}`);
            toast.success("Deleted");
            fetchTypes();
        } catch (err) { toast.error("Failed to delete"); }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 w-full space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 leading-tight">Leave Types Master</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage leave categories and limits</p>
                </div>
                <button
                    onClick={() => {
                        setEditingType(null);
                        setForm({ name: '', isPaid: true, monthlyLimit: 0, color: '#3B82F6' });
                        setIsModalOpen(true);
                    }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-all shadow-sm hover:shadow-lg"
                >
                    <FiPlus /> Add New Type
                </button>
            </header>

            {/* List Table */}
            <div className="card shadow-md border border-slate-200">
                <div className="table-container scroll-line lg:no-scrollbar">
                    <table className="table-modern">
                        <thead>
                            <tr className="whitespace-nowrap">
                                <th style={{ width: '40%' }}>Name</th>
                                <th style={{ width: '20%' }}>Payment Status</th>
                                <th style={{ width: '20%' }}>Monthly Limit</th>
                                <th className="text-right" style={{ width: '20%' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map(t => (
                                <tr key={t.id}>
                                    <td className="font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: t.color || '#3B82F6' }}></div>
                                            {t.name}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${t.isPaid ? 'bg-primary-light/10 text-primary border-primary-light/20' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                            {t.isPaid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </td>
                                    <td className="text-slate-600">
                                        {t.monthlyLimit === 0 ? (
                                            <span className="text-slate-400 italic text-xs">Unlimited</span>
                                        ) : (
                                            <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700 text-xs">{t.monthlyLimit} days</span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(t)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {types.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-slate-400">
                                        <p>No leave types found.</p>
                                        <button onClick={() => setIsModalOpen(true)} className="text-primary hover:underline mt-2 font-semibold">Create one</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
                        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Configure leave policy and limits</p>
                            </div>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                                <FiX size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Type Name</label>
                                <input
                                    required
                                    autoFocus
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                                    placeholder="e.g. Casual Leave"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Monthly Limit (Days)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                                    min="0"
                                    placeholder="0 for unlimited"
                                    value={form.monthlyLimit}
                                    onChange={e => setForm({ ...form, monthlyLimit: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Set to 0 if there is no monthly cap for this leave type.</p>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Paid Leave Status</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id="isPaid"
                                        className="sr-only peer"
                                        checked={form.isPaid}
                                        onChange={e => setForm({ ...form, isPaid: e.target.checked })}
                                    />
                                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Color Label</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        className="h-12 w-20 rounded-xl cursor-pointer border border-slate-200 p-1 bg-white"
                                        value={form.color || '#3B82F6'}
                                        onChange={e => setForm({ ...form, color: e.target.value })}
                                    />
                                    <span className="text-sm text-slate-500 font-mono font-medium">{form.color || '#3B82F6'}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg text-xs uppercase tracking-widest"
                                >
                                    {editingType ? 'Update Type' : 'Create Type'}
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
