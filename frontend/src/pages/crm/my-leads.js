import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiTrendingUp, FiDollarSign, FiUser, FiArrowRight, FiCheckCircle, FiClock, FiSearch, FiFilter, FiX, FiInfo } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/router';
import moment from 'moment';
import SearchableSelect from '@/components/SearchableSelect';

export default function MyReferralLeads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchMyLeads();
    }, []);

    const fetchMyLeads = async () => {
        setLoading(true);
        try {
            const res = await api.get('/crm/my-leads');
            setLeads(res.data);
        } catch (err) {
            toast.error("Failed to fetch your referral leads");
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentHistory = async (leadId) => {
        setHistoryLoading(true);
        try {
            const res = await api.get(`/crm/leads/${leadId}/payments`);
            setPaymentHistory(res.data);
        } catch (err) {
            toast.error("Failed to fetch payment history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (l.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === '' || l.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: leads.length,
        won: leads.filter(l => l.status === 'WON').length,
        negotiation: leads.filter(l => l.status === 'NEGOTIATION').length,
        quotation: leads.filter(l => l.status === 'QUOTATION_SENT').length,
        lost: leads.filter(l => l.status === 'LOST').length,
        followup: leads.filter(l => l.status === 'FOLLOW_UP' || l.status === 'CONTACTED').length,
        totalEarning: leads.reduce((sum, l) => sum + Number(l.commissionAmount || 0), 0),
        totalPaid: leads.reduce((sum, l) => sum + Number(l.totalPaid || 0), 0),
        totalBalance: leads.reduce((sum, l) => sum + Number(l.balance || 0), 0),
        totalDealValue: leads.reduce((sum, l) => sum + Number(l.negotiationAmount || 0), 0)
    };

    const statusColors = {
        'NEW': 'bg-amber-50 text-amber-600 border-amber-100',
        'FOLLOW_UP': 'bg-blue-50 text-blue-600 border-blue-100',
        'CONTACTED': 'bg-blue-50 text-blue-600 border-blue-100',
        'QUALIFIED': 'bg-orange-50 text-orange-600 border-orange-100',
        'QUOTATION_SENT': 'bg-purple-50 text-purple-600 border-purple-100',
        'NEGOTIATION': 'bg-indigo-50 text-indigo-600 border-indigo-100',
        'WON': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'LOST': 'bg-red-50 text-red-600 border-red-100'
    };

    return (
        <div className="p-4 md:p-8 space-y-8 w-full pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-2xl"><FiTrendingUp /></div>
                        My Referral Leads
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px] font-medium">Track your referral earnings and status</p>
                </div>
            </header>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Earned', value: '₹' + stats.totalEarning.toLocaleString(), color: 'purple' },
                    { label: 'Paid', value: '₹' + stats.totalPaid.toLocaleString(), color: 'emerald' },
                    { label: 'Pending', value: '₹' + stats.totalBalance.toLocaleString(), color: 'amber' },
                    { label: 'Won Leads', value: stats.won, color: 'emerald', status: 'WON' },
                    { label: 'Negotiation', value: stats.negotiation, color: 'indigo', status: 'NEGOTIATION' },
                    { label: 'Quotation Sent', value: stats.quotation, color: 'purple', status: 'QUOTATION_SENT' }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center min-h-[100px]">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 truncate leading-none">{s.label}</p>
                        <h4 className={`text-xl font-black ${s.color === 'emerald' ? 'text-emerald-600' : s.color === 'purple' ? 'text-purple-600' : s.color === 'amber' ? 'text-amber-500' : 'text-slate-800'}`}>
                            {s.value}
                        </h4>
                    </div>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full md:max-w-md">
                    <FiSearch className="text-slate-400" />
                    <input 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" 
                        placeholder="Search lead name or details..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <FiFilter className="text-slate-400 mr-1" />
                    <div className="w-full md:w-48">
                        <SearchableSelect 
                            options={[
                                { label: 'Status', value: '' },
                                { label: 'New', value: 'NEW' },
                                { label: 'Follow-up', value: 'FOLLOW_UP' },
                                { label: 'Negotiation', value: 'NEGOTIATION' },
                                { label: 'Quotation Sent', value: 'QUOTATION_SENT' },
                                { label: 'Won', value: 'WON' },
                                { label: 'Lost', value: 'LOST' }
                            ]}
                            value={statusFilter} 
                            onChange={(val) => setStatusFilter(val)}
                            placeholder="Status"
                            direction="down"
                            triggerClassName="w-full bg-slate-50 border-slate-100 rounded-xl min-h-[40px] px-4 text-xs font-bold uppercase tracking-widest text-slate-700"
                        />
                    </div>
                </div>
            </div>

            {/* Referral Table */}
            <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto shadow-xl shadow-slate-200/40 border border-slate-100 rounded-[32px] bg-white">
                <table className="table-modern w-full">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr className="whitespace-nowrap">
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 px-8 text-left">Lead Name</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-left">Client</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-right">Deal Value</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-right text-purple-600">Earning</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-right text-emerald-600">Paid</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-right text-amber-500">Balance</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-center">Status</th>
                            <th className="text-[10px] font-black uppercase tracking-widest py-6 text-center">History</th>
                            {isAdmin && <th className="text-[10px] font-black uppercase tracking-widest py-6 px-8 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="8" className="p-24 text-center text-slate-400 font-semibold animate-pulse uppercase tracking-widest">Fetching referral data...</td></tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr><td colSpan="8" className="p-24 text-center text-slate-400 font-medium italic italic">No leads found matching the filters.</td></tr>
                        ) : filteredLeads.map(lead => (
                            <tr 
                                key={lead.id} 
                                className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                                onClick={() => router.push(`/crm/leads/${lead.id}`)}
                            >
                                <td className="py-5 px-8 font-semibold text-slate-700">
                                    {lead.product?.name || 'Inquiry'}
                                </td>
                                <td className="py-5">
                                    <div className="font-bold text-slate-800">{lead.name}</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{lead.email || lead.phone}</div>
                                </td>
                                <td className="text-right font-semibold text-slate-600">
                                    ₹{parseFloat(lead.negotiationAmount || 0).toLocaleString()}
                                </td>
                                <td className="text-right font-black text-purple-600">
                                    ₹{parseFloat(lead.commissionAmount || 0).toLocaleString()}
                                </td>
                                <td className="text-right font-black text-emerald-600">
                                    ₹{parseFloat(lead.totalPaid || 0).toLocaleString()}
                                </td>
                                <td className="text-right font-black text-amber-500">
                                    ₹{parseFloat(lead.balance || 0).toLocaleString()}
                                </td>
                                <td className="text-center">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusColors[lead.status] || 'bg-slate-50 text-slate-400'}`}>
                                        {lead.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => {
                                            setSelectedLead(lead);
                                            fetchPaymentHistory(lead.id);
                                            setShowHistoryModal(true);
                                        }}
                                        className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                                        title="View History"
                                    >
                                        <FiInfo />
                                    </button>
                                </td>
                                {isAdmin && (
                                    <td className="text-center px-8" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => router.push(`/crm/leads/${lead.id}`)}
                                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                                                title="View Details"
                                            >
                                                <FiArrowRight />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* History Modal - User Request: Remaining Balance after each payment */}
            {showHistoryModal && selectedLead && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300">
                        <header className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><FiTrendingUp className="text-xl" /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Payment History</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lead: {selectedLead.name} | Total Earning: ₹{parseFloat(selectedLead.commissionAmount || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><FiX className="text-xl" /></button>
                        </header>
                        
                        <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
                            {historyLoading ? (
                                <div className="p-20 text-center text-slate-400 font-semibold animate-pulse uppercase tracking-widest">Calculating balances...</div>
                            ) : paymentHistory.length === 0 ? (
                                <div className="p-20 text-center text-slate-300 italic flex flex-col items-center gap-4">
                                    <FiInfo className="text-4xl opacity-20" />
                                    <p className="text-sm font-medium">No payments recorded yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                                <th className="py-4 text-left">Date</th>
                                                <th className="py-4 text-left">Method</th>
                                                <th className="py-4 text-right">Paid Amount</th>
                                                <th className="py-4 text-right">Remaining Balance</th>
                                                <th className="py-4 text-right px-4">Ref #</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(() => {
                                                let runningTotal = 0;
                                                const totalEarning = Number(selectedLead.commissionAmount || 0);
                                                // Sort by date ascending to calculate running balance correctly
                                                const sortedHistory = [...paymentHistory].sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
                                                
                                                return sortedHistory.map((pay) => {
                                                    runningTotal += Number(pay.amountPaid);
                                                    const remaining = totalEarning - runningTotal;
                                                    
                                                    return (
                                                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-4 text-sm font-semibold text-slate-600">{moment(pay.paymentDate).format('DD MMM YYYY')}</td>
                                                            <td className="py-4 text-[10px] font-bold uppercase text-slate-400">{pay.paymentMethod}</td>
                                                            <td className="py-4 text-right font-black text-emerald-600">₹{parseFloat(pay.amountPaid).toLocaleString()}</td>
                                                            <td className="py-4 text-right font-black text-amber-500">₹{Math.max(0, remaining).toLocaleString()}</td>
                                                            <td className="py-4 text-right font-mono text-[10px] text-slate-400 px-4">{pay.transactionNumber || '-'}</td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <footer className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-6">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Earning</p>
                                <p className="text-xl font-black text-purple-600">₹{parseFloat(selectedLead.commissionAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                                <p className="text-xl font-black text-emerald-600">₹{parseFloat(selectedLead.totalPaid || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-amber-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-amber-600">Final Balance</p>
                                <p className="text-xl font-black text-amber-500">₹{parseFloat(selectedLead.balance || 0).toLocaleString()}</p>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}

