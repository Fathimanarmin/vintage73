import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiPlus, FiCheckCircle, FiCircle, FiCalendar, FiUser, FiLink, FiX } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';

export default function CRMTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState([]);
    const [deals, setDeals] = useState([]);
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', dueDate: '', priority: 'MEDIUM', description: '', leadId: '', dealId: '', assignedTo: '', status: 'PENDING' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchTasks();
        fetchLeads();
        fetchDeals();
        fetchUsers();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/crm/tasks');
            setTasks(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchLeads = async () => {
        try {
            const res = await api.get('/crm/leads');
            setLeads(res.data);
        } catch (err) { console.error(err); }
    }

    const fetchDeals = async () => {
        try {
            const res = await api.get('/crm/deals');
            setDeals(res.data);
        } catch (err) { console.error(err); }
    }

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) { console.error(err); }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/crm/tasks/${editingId}`, form);
                toast.success("Task updated");
            } else {
                await api.post('/crm/tasks', form);
                toast.success("Task created");
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ title: '', dueDate: '', priority: 'MEDIUM', description: '', leadId: '', dealId: '', assignedTo: '', status: 'PENDING' });
            fetchTasks();
        } catch (err) {
            toast.error("Failed to save task");
        }
    };

    const handleEdit = (task) => {
        setForm({
            title: task.title,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
            priority: task.priority,
            description: task.description || '',
            leadId: task.leadId || '',
            dealId: task.dealId || '',
            assignedTo: task.assignedTo || '',
            status: task.status
        });
        setEditingId(task.id);
        setShowModal(true);
    };

    const toggleStatus = async (task) => {
        try {
            const newStatus = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
            await api.put(`/crm/tasks/${task.id}`, { status: newStatus });
            toast.success(`Task marked as ${newStatus.toLowerCase()}`);
            fetchTasks();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const priorityColors = {
        'HIGH': 'text-red-600 bg-red-50 border-red-200',
        'MEDIUM': 'text-amber-600 bg-amber-50 border-amber-200',
        'LOW': 'text-primary bg-primary-light/10 border-primary/20'
    };

    return (
        <div className="p-4 md:p-8 w-full space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Activities & Tasks</h1>
                    <p className="text-slate-500 mt-1 font-medium uppercase tracking-widest text-[10px]">Manage your active scheduling and follow-ups</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setForm({ title: '', dueDate: '', priority: 'MEDIUM', description: '', leadId: '', dealId: '', assignedTo: '', status: 'PENDING' });
                        setShowModal(true);
                    }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition shadow-xl shadow-slate-900/10 active:scale-95 text-xs uppercase tracking-widest"
                >
                    <FiPlus className="text-lg" /> Add Task
                </button>
            </header>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {tasks.map(task => (
                    <div key={task.id} className={`p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 group ${task.status === 'COMPLETED' ? 'bg-slate-50/50' : ''}`}>
                        <button
                            onClick={() => toggleStatus(task)}
                            className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'COMPLETED'
                                ? 'bg-primary border-primary text-white'
                                : 'border-slate-300 text-transparent hover:border-primary'
                                }`}
                        >
                            <FiCheckCircle className="text-sm" />
                        </button>

                        <div className="flex-1 cursor-pointer" onClick={() => handleEdit(task)}>
                            <div className="flex justify-between items-start">
                                <h3 className={`font-semibold text-slate-800 ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}`}>{task.title}</h3>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border uppercase tracking-wider ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                </span>
                            </div>

                            {task.description && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{task.description}</p>}

                            <div className="flex gap-4 mt-3">
                                {task.dueDate && (
                                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-red-500' : 'text-slate-400'}`}>
                                        <FiCalendar /> {new Date(task.dueDate).toLocaleDateString()}
                                    </div>
                                )}

                                {(task.lead || task.deal) && (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        <FiLink />
                                        {task.lead ? `Lead: ${task.lead.name}` : `Deal: ${task.deal.title}`}
                                    </div>
                                )}

                                {task.assignedUser && (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-auto">
                                        <FiUser /> {task.assignedUser.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">No tasks found.</div>
                )}
            </div>

            {/* Modal */}
            {showModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col mx-auto">

                        {/* ── Header ── */}
                        <header className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2rem] flex-shrink-0">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{editingId ? 'Edit Task' : 'New Task'}</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Define activity details</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <FiX size={18} />
                            </button>
                        </header>

                        {/* ── Form ── */}
                        <form onSubmit={handleSubmit} className="px-6 py-5 sm:px-8 sm:py-7 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1 pb-2">

                            {/* Task Title */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Task Title</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold text-slate-800 text-sm placeholder:font-normal placeholder:text-slate-400"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Call Client"
                                />
                            </div>

                            {/* Due Date + Priority — always 2-col */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-3.5 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold text-slate-800 text-sm"
                                        value={form.dueDate}
                                        onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-3.5 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold text-slate-800 appearance-none text-sm"
                                        value={form.priority}
                                        onChange={e => setForm({ ...form, priority: e.target.value })}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>

                            {/* Related To */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Related To</label>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <SearchableSelect
                                        direction="down"
                                        placeholder="Select Lead"
                                        value={form.leadId}
                                        onChange={val => setForm({ ...form, leadId: val, dealId: '' })}
                                        options={[
                                            { value: '', label: 'Select Lead' },
                                            ...leads.map(l => ({ value: l.id, label: l.name }))
                                        ]}
                                        triggerClassName="min-h-[46px] !bg-slate-50 !shadow-none !border-slate-200 !rounded-xl"
                                    />
                                    <SearchableSelect
                                        direction="down"
                                        placeholder="Select Deal"
                                        value={form.dealId}
                                        onChange={val => setForm({ ...form, dealId: val, leadId: '' })}
                                        options={[
                                            { value: '', label: 'Select Deal' },
                                            ...deals.map(d => ({ value: d.id, label: d.title }))
                                        ]}
                                        triggerClassName="min-h-[46px] !bg-slate-50 !shadow-none !border-slate-200 !rounded-xl"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400/80 mt-1.5 font-medium italic">* Link to either a Lead or a Deal</p>
                            </div>

                            {/* Assigned To */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned To</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold text-slate-800 appearance-none text-sm"
                                    value={form.assignedTo}
                                    onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.username}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 text-sm min-h-[72px] sm:min-h-[96px] resize-none placeholder:text-slate-400"
                                    placeholder="Add task notes..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black active:scale-95 transition-all shadow-lg shadow-slate-900/15 text-[11px] uppercase tracking-widest"
                                >
                                    {editingId ? 'Update Task' : 'Create Task'}
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
