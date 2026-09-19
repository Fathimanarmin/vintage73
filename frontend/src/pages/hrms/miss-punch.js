import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiPlus, FiClock, FiCheck, FiX, FiCalendar } from 'react-icons/fi';

export default function MissPunchRequests() {
    const [requests, setRequests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        date: '',
        checkInTime: '',
        checkOutTime: '',
        reason: ''
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/hrms/miss-punch');
            setRequests(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 3-Day Rule Validation
        const requestDate = new Date(formData.date);
        requestDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffInMs = today.getTime() - requestDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays > 3) {
            toast.error('Miss Punch request cannot be applied after 3 days from the missed date');
            return;
        }

        if (requestDate > today) {
            toast.error('Miss Punch cannot be applied for future dates');
            return;
        }

        try {
            await api.post('/hrms/miss-punch', formData);
            toast.success('Miss punch request submitted successfully');
            setIsModalOpen(false);
            setFormData({ date: '', checkInTime: '', checkOutTime: '', reason: '' });
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to submit request');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/hrms/miss-punch/${id}/status`, { status });
            toast.success(`Request ${status.toLowerCase()} successfully`);
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
            APPROVED: 'bg-primary-light/10 text-primary border-primary/20',
            REJECTED: 'bg-red-50 text-red-700 border-red-200'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.PENDING}`}>
                {status}
            </span>
        );
    };

    const isAdmin = user?.role === 'admin';

    return (
        <div className="p-6 w-full space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 leading-tight">
                        <FiClock className="text-primary" />
                        Miss Punch Requests
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Request attendance corrections for missed punches</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-all shadow-sm hover:shadow-lg"
                >
                    <FiPlus /> Request Miss Punch
                </button>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 uppercase text-[10px] tracking-wider">
                            <tr className="whitespace-nowrap">
                                <th className="px-6 py-4 text-left">Employee</th>
                                <th className="px-6 py-4 text-left">Date</th>
                                <th className="px-6 py-4 text-left">Check-In</th>
                                <th className="px-6 py-4 text-left">Check-Out</th>
                                <th className="px-6 py-4 text-left">Reason</th>
                                <th className="px-6 py-4 text-left">Status</th>
                                <th className="px-6 py-4 text-left">Reviewed By</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={isAdmin ? "8" : "7"} className="p-8 text-center text-slate-400">Loading...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={isAdmin ? "8" : "7"} className="p-8 text-center text-slate-400">No requests found</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{req.user?.name}</div>
                                            <div className="text-xs text-slate-400">@{req.user?.username}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {new Date(req.date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {req.checkInTime || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {req.checkOutTime || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                            {req.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {req.reviewer ? (
                                                <div>
                                                    <div className="font-medium">{req.reviewer.name}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('en-GB') : ''}
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'PENDING' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                            className="p-2 text-primary hover:bg-primary-light/10 rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            <FiCheck size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <FiX size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Modal */}
            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <header className="px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Request Miss Punch</h3>
                                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">Submit attendance correction</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                                <FiX size={18} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Missed Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 text-sm sm:text-base"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                                <div className="mt-2.5 flex items-center gap-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                                    <FiCalendar className="text-amber-500 shrink-0" size={13} />
                                    <p className="text-[9px] sm:text-[10px] text-amber-700 font-bold uppercase tracking-tight">
                                        Limit: Within 3 days from missed date
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Check-In</label>
                                    <input
                                        type="time"
                                        className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 text-sm sm:text-base"
                                        value={formData.checkInTime}
                                        onChange={e => setFormData({ ...formData, checkInTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Check-Out</label>
                                    <input
                                        type="time"
                                        className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 text-sm sm:text-base"
                                        value={formData.checkOutTime}
                                        onChange={e => setFormData({ ...formData, checkOutTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Reason for Correction</label>
                                <textarea
                                    required
                                    rows="2"
                                    className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="e.g. Card machine failure / Forgot to punch"
                                />
                            </div>

                            <div className="pt-2 sm:pt-4 flex gap-3 sticky bottom-0 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg text-[10px] uppercase tracking-widest"
                                >
                                    Submit
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
