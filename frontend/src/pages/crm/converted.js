import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiShoppingCart, FiUser, FiArrowRight, FiDollarSign } from 'react-icons/fi';
import Link from 'next/link';

export default function WonLeads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWonLeads();
    }, []);

    const fetchWonLeads = async () => {
        try {
            const res = await api.get('/crm/leads?status=WON');
            setLeads(res.data);
        } catch (err) {
            toast.error("Failed to fetch won leads");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 w-full">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Won Leads (Converted)</h1>
                    <p className="text-slate-500 font-medium mt-1">Leads that successfully converted into customers and orders</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Converted</p>
                        <p className="text-2xl font-black text-emerald-600">{leads.length}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center p-12 text-slate-400 animate-pulse font-medium uppercase tracking-widest">Loading Won Leads...</div>
                ) : leads.length === 0 ? (
                    <div className="col-span-full card p-12 text-center text-slate-400 font-medium italic border-dashed border-2 border-slate-100">
                        No converted leads found yet. Keep up the high effort!
                    </div>
                ) : leads.map(lead => (
                    <div key={lead.id} className="card p-6 shadow-sm border-emerald-100 hover:shadow-lg transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm border border-emerald-100">
                                <FiShoppingCart />
                            </div>
                            <Link href={`/crm/leads/${lead.id}`} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors">
                                <FiArrowRight size={20} />
                            </Link>
                        </div>
                        <h3 className="font-medium text-lg text-slate-800">{lead.name}</h3>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-4 flex items-center gap-1">
                            <FiUser size={10} /> {lead.assignedUser?.name || 'Assigned Agent'}
                        </p>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Interested in</span>
                                <span className="text-xs font-medium text-slate-700">{lead.product?.name || 'Inquiry'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-xl">
                                <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest leading-none">Deal Value</span>
                                <span className="text-xs font-medium text-emerald-700">₹{lead.budget ? parseFloat(lead.budget).toLocaleString() : '1,00,000'}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 text-emerald-600">
                            <FiCheckCircle size={14} />
                            <span className="text-[10px] font-medium uppercase tracking-widest">Successfully Converted</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
