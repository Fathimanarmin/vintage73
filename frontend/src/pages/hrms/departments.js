import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiTrash2, FiPlus, FiX, FiLayers } from 'react-icons/fi';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/hrms/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/hrms/departments', form);
            toast.success("Department Created");
            setForm({ name: '' });
            setIsModalOpen(false);
            fetchDepartments();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this department?")) return;
        try {
            await api.delete(`/hrms/departments/${id}`);
            toast.success("Deleted");
            fetchDepartments();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2 leading-tight">
                        <FiLayers className="text-primary" />
                        Departments Master
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage organizational departments and teams</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-all shadow-sm hover:shadow-lg"
                >
                    <FiPlus /> Add New Department
                </button>
            </header>

            {/* List Table */}
            <div className="card shadow-md border border-slate-200">
                <div className="table-container scroll-line lg:no-scrollbar">
                    <table className="table-modern">
                        <thead>
                            <tr className="whitespace-nowrap">
                                <th style={{ width: '10%' }}>#</th>
                                <th style={{ width: '40%' }}>Department Name</th>
                                <th style={{ width: '30%' }}>Employees</th>
                                <th className="text-right" style={{ width: '20%' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((d, idx) => (
                                <tr key={d.id}>
                                    <td className="text-slate-500">
                                        {idx + 1}
                                    </td>
                                    <td className="font-semibold text-slate-800">
                                        {d.name}
                                    </td>
                                    <td className="text-slate-600">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            {d._count?.employees || 0} employees
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDelete(d.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {departments.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-slate-400">
                                        <p>No departments found.</p>
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
                                <h3 className="text-xl font-bold text-slate-900">Add Department</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Define a new organizational unit</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                                <FiX size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Department Name</label>
                                <input
                                    required
                                    autoFocus
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                                    placeholder="e.g. Sales & Marketing"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 font-medium">Use a descriptive name that clearly identifies the department's function.</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg text-xs uppercase tracking-widest"
                                >
                                    Create Dept
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
