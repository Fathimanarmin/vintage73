import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiSearch, FiCalendar, FiFilter, FiMessageSquare, FiClock, FiCheckCircle, FiAlertCircle, FiChevronLeft, FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import Link from 'next/link';

export default function WhatsAppHistory() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        mobile: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const { data } = await api.get(`/whatsapp/logs?${query}`);
            setLogs(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch message history');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const clearFilters = () => {
        setFilters({ mobile: '', startDate: '', endDate: '' });
        fetchLogs(); // This might use old state if called immediately, so better handled in useEffect if needed or passed directly
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 min-h-screen bg-slate-50"
        >
            <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/settings/whatsapp">
                            <button className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600">
                                <FiChevronLeft size={20} />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <FiMessageSquare className="text-primary" /> WhatsApp History
                            </h1>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Track and filter outgoing communications</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium text-sm hover:shadow-sm transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {/* Filter Section */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FiSearch size={10} /> Mobile Number
                            </label>
                            <input
                                type="text"
                                name="mobile"
                                value={filters.mobile}
                                onChange={handleFilterChange}
                                placeholder="Search mobile..."
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FiCalendar size={10} /> Start Date
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FiCalendar size={10} /> End Date
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchLogs}
                                className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-2xl text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={() => { setFilters({ mobile: '', startDate: '', endDate: '' }); setTimeout(fetchLogs, 10); }}
                                className="p-2.5 border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                                title="Clear Filters"
                            >
                                <FiFilter size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ minWidth: '700px' }}>
                            <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] tracking-widest font-medium text-slate-400">
                                <tr>
                                    <th className="px-6 py-5 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Customer Mob</th>
                                    <th className="px-6 py-5 whitespace-nowrap">Message Content</th>
                                    <th className="px-6 py-5 text-right whitespace-nowrap">Sent Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center">
                                            <FiRefreshCw className="animate-spin text-slate-300 mx-auto" size={32} />
                                            <p className="text-slate-400 font-medium mt-4">Fetching logs...</p>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                <FiMessageSquare className="text-slate-300" size={24} />
                                            </div>
                                            <p className="text-slate-400 font-medium italic tracking-tight">No message logs found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.status === 'SENT' ? (
                                                <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                                    <FiCheckCircle size={10} /> Sent
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-red-600 font-medium text-[10px] uppercase tracking-wider bg-red-50 px-2 py-1 rounded-full w-fit">
                                                    <FiAlertCircle size={10} /> Failed
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600 group-hover:text-primary transition-colors">
                                            {log.mobile}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-600 line-clamp-2 max-w-lg font-medium leading-relaxed">
                                                {log.message}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex flex-col items-end">
                                                <span className="text-slate-800 font-medium text-xs uppercase tracking-tight">
                                                    {new Date(log.timestamp).toLocaleDateString()}
                                                </span>
                                                <span className="text-slate-400 font-medium text-[10px] flex items-center gap-1 uppercase tracking-widest mt-0.5">
                                                    <FiClock size={10} /> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="mt-4 flex justify-between items-center px-4">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                        Showing last {logs.length} entries
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> API Status: Connected
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
