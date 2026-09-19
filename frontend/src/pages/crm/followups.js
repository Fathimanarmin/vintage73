import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { 
    FiCalendar, FiClock, FiCheckCircle, FiPhone, FiUser, 
    FiArrowRight, FiAlertCircle, FiMessageSquare, FiTrendingUp,
    FiX, FiHash, FiMoreVertical
} from 'react-icons/fi';
import Link from 'next/link';
import moment from 'moment';

export default function LeadFollowups() {
    const [sections, setSections] = useState({ overdue: [], today: [], upcoming: [] });
    const [loading, setLoading] = useState(true);
    const [selectedFollowUp, setSelectedFollowUp] = useState(null);
    const [showOutcomeModal, setShowOutcomeModal] = useState(false);
    const [outcomeForm, setOutcomeForm] = useState({ outcome: 'No Response', notes: '', nextFollowUpDate: '' });

    useEffect(() => {
        fetchFollowUps();
    }, []);

    const fetchFollowUps = async () => {
        try {
            const res = await api.get('/crm/followups');
            setSections(res.data);
        } catch (err) {
            toast.error("Failed to fetch follow-ups");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenOutcome = (fu) => {
        setSelectedFollowUp(fu);
        setOutcomeForm({ 
            outcome: 'No Response', 
            notes: fu.notes || '', 
            nextFollowUpDate: moment().add(1, 'days').format('YYYY-MM-DDTHH:mm') 
        });
        setShowOutcomeModal(true);
    };

    const handleSubmitOutcome = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/crm/followups/${selectedFollowUp.id}`, outcomeForm);
            toast.success("Follow-up updated successfully");
            setShowOutcomeModal(false);
            fetchFollowUps();
        } catch (err) {
            toast.error("Failed to update follow-up");
        }
    };

    const handleWhatsApp = (phone) => {
        if (!phone) return toast.error("Phone number missing");
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    };

    const handleCall = (phone) => {
        if (!phone) return toast.error("Phone number missing");
        window.location.href = `tel:${phone}`;
    };

    if (loading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse uppercase tracking-widest">Loading Follow-ups...</div>;

    return (
        <div className="p-4 md:p-8 space-y-8 w-full">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Follow-up Dashboard</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage your active leads and scheduled tasks</p>
                </div>
                <div className="w-full md:w-auto bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between md:justify-end gap-6">
                    <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Pending</p>
                        <p className="text-2xl font-black text-primary">
                            {sections.overdue.length + sections.today.length + sections.upcoming.length}
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Overdue */}
                <Section 
                    title="Overdue Follow-ups" 
                    icon={<FiAlertCircle />} 
                    color="red" 
                    items={sections.overdue} 
                    onAction={handleOpenOutcome} 
                    onCall={handleCall}
                    onWhatsApp={handleWhatsApp}
                />
                
                {/* Today */}
                <Section 
                    title="Today's Schedule" 
                    icon={<FiCalendar />} 
                    color="amber" 
                    items={sections.today} 
                    onAction={handleOpenOutcome} 
                    onCall={handleCall}
                    onWhatsApp={handleWhatsApp}
                />
                
                {/* Upcoming */}
                <Section 
                    title="Upcoming" 
                    icon={<FiClock />} 
                    color="emerald" 
                    items={sections.upcoming} 
                    onAction={handleOpenOutcome} 
                    onCall={handleCall}
                    onWhatsApp={handleWhatsApp}
                />
            </div>

            {/* Outcome Modal */}
            {showOutcomeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
                        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">Record Outcome</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Follow-up for {selectedFollowUp.lead.name}</p>
                            </div>
                            <button onClick={() => setShowOutcomeModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                                <FiX size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmitOutcome} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Action Outcome</label>
                                <select 
                                    required 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-slate-800 appearance-none" 
                                    value={outcomeForm.outcome} 
                                    onChange={e => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
                                >
                                    <option value="No Response">No Response</option>
                                    <option value="Interested">Interested</option>
                                    <option value="Not Interested">Not Interested</option>
                                    <option value="Call Later">Call Later</option>
                                    <option value="Quotation Sent">Quotation Sent</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Internal Notes</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800 min-h-[100px]" 
                                    placeholder="What happened during this follow-up?"
                                    value={outcomeForm.notes}
                                    onChange={e => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                                />
                            </div>

                            {outcomeForm.outcome !== 'Not Interested' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                                        Next Follow-up Date
                                        <span className="text-primary text-[8px] bg-primary-light/10 px-2 py-0.5 rounded-full tracking-wider">REQUIRED</span>
                                    </label>
                                    <input 
                                        required 
                                        type="datetime-local" 
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-slate-800" 
                                        value={outcomeForm.nextFollowUpDate} 
                                        onChange={e => setOutcomeForm({ ...outcomeForm, nextFollowUpDate: e.target.value })} 
                                    />
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowOutcomeModal(false)}
                                    className="flex-1 px-6 py-4 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg text-xs uppercase tracking-widest"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, icon, color, items, onAction, onCall, onWhatsApp }) {
    const colors = {
        red: 'bg-red-50 text-red-600 border-red-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };

    return (
        <div className="flex flex-col space-y-4">
            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${colors[color]}`}>
                <div className="text-xl">{icon}</div>
                <h2 className="text-xs font-semibold uppercase tracking-widest">{title} <span className="ml-2 bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span></h2>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 scrollbar-thin">
                {items.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 p-8 rounded-3xl text-center text-slate-300 font-medium italic text-sm">
                        No tasks found
                    </div>
                ) : (
                    items.map(fu => (
                        <div key={fu.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group border-l-4 ${
                            color === 'red' ? 'border-l-red-400' : color === 'amber' ? 'border-l-amber-400' : 'border-l-emerald-400'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-medium text-slate-800 text-sm tracking-tight">{fu.lead.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <FiTrendingUp size={10} className="text-primary" /> {fu.lead.status.replace('_', ' ')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Follow-up At</p>
                                    <p className="text-xs font-medium text-slate-700 mt-1">{moment(fu.date).format('DD MMM, hh:mm a')}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-3 mb-4">
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1 leading-none">Interested In</p>
                                <p className="text-xs font-medium text-slate-600 tracking-tight">{fu.lead.product?.name || 'Inquiry'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => onCall(fu.lead.phone)}
                                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                                >
                                    <FiPhone /> Call
                                </button>
                                <button 
                                    onClick={() => onWhatsApp(fu.lead.phone)}
                                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                                >
                                    <FiMessageSquare /> WhatsApp
                                </button>
                            </div>
                            
                            <div className="mt-2 flex gap-2">
                                <Link 
                                    href={`/crm/leads/${fu.leadId}`}
                                    className="flex-1 p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                                >
                                    Details <FiArrowRight />
                                </Link>
                                <button 
                                    onClick={() => onAction(fu)}
                                    className="flex-1 p-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-xs font-medium"
                                >
                                    <FiCheckCircle /> Mark Done
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
