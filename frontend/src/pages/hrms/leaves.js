import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import SearchableSelect from '@/components/SearchableSelect';

export default function LeavesPage() {
    const [activeTab, setActiveTab] = useState('my-leaves');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user'));
        setUser(u);
    }, []);

    const isAdmin = user?.role === 'admin';

    return (
        <div className="p-6 w-full space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 leading-tight">Leaves Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Track and manage employee leave requests</p>
                </div>
                {isAdmin && (
                    <div className="flex bg-slate-100 rounded-xl p-1 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('my-leaves')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'my-leaves' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            My Leaves
                        </button>
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'manage' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Approve Requests
                        </button>
                    </div>
                )}
            </header>

            {activeTab === 'my-leaves' ? <MyLeaves user={user} /> : <ManageLeaves />}
        </div>
    );
}

function MyLeaves({ user }) {
    const [leaves, setLeaves] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '', leaveTypeId: '', isHalfDay: false });

    useEffect(() => {
        if (user) {
            fetchLeaves();
            fetchLeaveTypes();
        }
    }, [user]);

    const fetchLeaves = async () => {
        try {
            const res = await api.get(`/hrms/leaves?userId=${user.id}`);
            setLeaves(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchLeaveTypes = async () => {
        try {
            const res = await api.get('/hrms/leave-types');
            setLeaveTypes(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = { ...formData, userId: user.id };
            if (data.isHalfDay) {
                // Should we force end date = start date? Let's just pass it as is, backend handles it or we trust user.
                // Better UX: if half day, we can default end to start.
                if (data.startDate !== data.endDate) {
                    // toast.error("Half day leave should be for a single date");
                    // return;
                }
            }
            await api.post('/hrms/leaves/apply', data);
            toast.success("Leave Applied Successfully");
            setShowForm(false);
            setFormData({ startDate: '', endDate: '', reason: '', leaveTypeId: '', isHalfDay: false });
            fetchLeaves();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to apply for leave';
            toast.error(msg);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-all shadow-sm hover:shadow-lg"
                >
                    {showForm ? 'Cancel Request' : 'Apply for Leave'}
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl max-w-xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-slate-900">New Leave Request</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Please provide accurate details for approval</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Leave Type</label>
                            <SearchableSelect
                                options={leaveTypes.map(t => ({
                                    value: t.id,
                                    label: `${t.name} (${t.isPaid ? 'Paid' : 'Unpaid'})`
                                }))}
                                value={formData.leaveTypeId}
                                onChange={val => setFormData({ ...formData, leaveTypeId: val })}
                                placeholder="Select Leave Type"
                                className="w-full"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Half Day Request</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="halfDay"
                                    className="sr-only peer"
                                    checked={formData.isHalfDay}
                                    onChange={e => setFormData({ ...formData, isHalfDay: e.target.checked })}
                                />
                                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Start Date</label>
                                <input required type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                                    value={formData.startDate} onChange={e => {
                                        setFormData(prev => ({
                                            ...prev,
                                            startDate: e.target.value,
                                            endDate: prev.isHalfDay ? e.target.value : prev.endDate
                                        }))
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">End Date</label>
                                <input required type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={formData.endDate}
                                    min={formData.startDate || undefined}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    disabled={formData.isHalfDay}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Reason for Leave</label>
                            <textarea required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 min-h-[100px]" rows="3"
                                placeholder="e.g. Family function / Medical emergency"
                                value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            ></textarea>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg text-xs uppercase tracking-widest">Submit Request</button>
                    </form>
                </div>
            )}


            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="table-container scroll-line lg:no-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr className="whitespace-nowrap">
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Dates</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Applied On</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leaves.map(l => (
                            <tr key={l.id}>
                                <td className="px-6 py-3 font-medium text-slate-800">
                                    {l.leaveType ? l.leaveType.name : 'Other'}
                                    {l.isHalfDay && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium uppercase">Half Day</span>}
                                    {l.leaveType && <span className="text-xs text-slate-400 block">{l.leaveType.isPaid ? 'Paid' : 'Unpaid'}</span>}
                                </td>
                                <td className="px-6 py-3 text-slate-700">
                                    {new Date(l.startDate).toLocaleDateString('en-GB')}
                                    {!l.isHalfDay && l.startDate !== l.endDate && ` - ${new Date(l.endDate).toLocaleDateString('en-GB')}`}
                                </td>
                                <td className="px-6 py-3 text-slate-600">{l.reason}</td>
                                <td className="px-6 py-3">
                                    <StatusBadge status={l.status} />
                                </td>
                                <td className="px-6 py-3 text-slate-400 text-xs">
                                    {new Date(l.createdAt).toLocaleDateString('en-GB')}
                                </td>
                            </tr>
                        ))}
                        {leaves.length === 0 && <tr><td colSpan="5" className="p-4 text-center">No leaves found</td></tr>}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}

function ManageLeaves() {
    const [leaves, setLeaves] = useState([]);

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const res = await api.get(`/hrms/leaves`); // gets all
            setLeaves(res.data);
        } catch (err) { console.error(err); }
    };

    const updateStatus = async (id, status) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await api.put(`/hrms/leaves/${id}/status`, { status, approvedById: user.id });
            toast.success(`Request ${status}`);
            fetchLeaves();
        } catch (err) {
            toast.error("Failed to update");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="table-container scroll-line lg:no-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr className="whitespace-nowrap">
                            <th className="px-6 py-3">Employee</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Dates</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leaves.map(l => (
                            <tr key={l.id}>
                                <td className="px-6 py-3 font-medium text-slate-800">
                                    {l.user?.name || l.user?.username}
                                </td>
                                <td className="px-6 py-3">
                                    {l.leaveType ? (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${l.leaveType.isPaid ? 'bg-primary-light/10 text-primary border-primary-light/20' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                            {l.leaveType.name}
                                        </span>
                                    ) : <span className="text-slate-400 text-xs">Other</span>}
                                    {l.isHalfDay && <div className="mt-1"><span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] rounded font-medium uppercase">Half Day</span></div>}
                                </td>
                                <td className="px-6 py-3 text-slate-700">
                                    {new Date(l.startDate).toLocaleDateString('en-GB')}
                                    {!l.isHalfDay && l.startDate !== l.endDate && ` - ${new Date(l.endDate).toLocaleDateString('en-GB')}`}
                                </td>
                                <td className="px-6 py-3 text-slate-600">{l.reason}</td>
                                <td className="px-6 py-3">
                                    <StatusBadge status={l.status} />
                                </td>
                                <td className="px-6 py-3 space-x-2">
                                    {l.status === 'PENDING' && (
                                        <>
                                            <button onClick={() => updateStatus(l.id, 'APPROVED')} className="text-primary hover:text-primary-dark font-medium text-xs uppercase">Approve</button>
                                            <button onClick={() => updateStatus(l.id, 'REJECTED')} className="text-red-600 hover:text-red-700 font-medium text-xs uppercase">Reject</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const colors = {
        'PENDING': 'bg-amber-100 text-amber-700',
        'APPROVED': 'bg-primary-light/10 text-primary',
        'REJECTED': 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
}
