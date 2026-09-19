import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiUsers, FiDollarSign, FiBriefcase, FiTrendingUp } from 'react-icons/fi';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export default function CRMDashboard() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        newLeads: 0,
        totalPipelineValue: 0,
        dealStages: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/crm/dashboard');
            setStats(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    // Chart Data
    const stageData = {
        labels: Object.keys(stats.dealStages),
        datasets: [
            {
                label: '# of Deals',
                data: Object.values(stats.dealStages),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)', // Lost
                    'rgba(54, 162, 235, 0.5)', // Prospecting
                    'rgba(255, 206, 86, 0.5)', // Negotiation
                    'rgba(75, 192, 192, 0.5)', // Won
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="p-4 md:p-8 w-full space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">CRM Intelligence</h1>
                    <p className="text-slate-500 mt-1 font-medium">Real-time overview of your sales ecosystem</p>
                </div>
                <div className="w-full md:w-auto bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between md:justify-end gap-6">
                    <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pipeline Health</p>
                        <p className="text-2xl font-black text-primary">Stable</p>
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-4 hover:shadow-lg transition-all border-b-4 border-b-blue-500">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-sm">
                        <FiUsers />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Leads</p>
                        <h3 className="text-3xl font-black text-slate-800">{stats.totalLeads}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-4 hover:shadow-lg transition-all border-b-4 border-b-primary">
                    <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center text-xl shadow-sm">
                        <FiTrendingUp />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Leads</p>
                        <h3 className="text-3xl font-black text-slate-800">{stats.newLeads}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-4 hover:shadow-lg transition-all border-b-4 border-b-violet-500">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl shadow-sm">
                        <FiDollarSign />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pipeline Value</p>
                        <h3 className="text-2xl font-black text-slate-800 truncate w-full">{formatCurrency(stats.totalPipelineValue)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-4 hover:shadow-lg transition-all border-b-4 border-b-amber-500">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-sm">
                        <FiBriefcase />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Deals</p>
                        <h3 className="text-3xl font-black text-slate-800">
                            {Object.entries(stats.dealStages).reduce((acc, [k, v]) => k !== 'LOST' && k !== 'WON' ? acc + v : acc, 0)}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <header className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Deals by Stage</h3>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </header>
                    <div className="h-72 flex justify-center">
                        {loading ? <p className="animate-pulse text-slate-400 font-medium">Gathering Data...</p> : (
                            Object.keys(stats.dealStages).length > 0 ?
                                <Doughnut data={stageData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { weight: 'bold', size: 10 } } } } }} /> :
                                <p className="text-slate-400 self-center italic font-medium uppercase tracking-widest text-[10px]">No deals data available</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <header className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Intelligence & Actions</h3>
                        <div className="text-[10px] font-bold text-primary bg-primary-light/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended</div>
                    </header>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <a href="/crm/leads" className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-white hover:shadow-xl transition-all group cursor-pointer block">
                            <div className="w-10 h-10 rounded-xl bg-primary-light/20 text-primary flex items-center justify-center text-lg mb-4 group-hover:scale-110 transition-transform">
                                <FiUsers />
                            </div>
                            <div className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-1">Add New Lead</div>
                            <div className="text-[10px] text-slate-400 font-medium leading-relaxed">Capture a new potential client for the pipeline.</div>
                        </a>
                        <a href="/crm/deals" className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-300 hover:bg-white hover:shadow-xl transition-all group cursor-pointer block">
                            <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center text-lg mb-4 group-hover:scale-110 transition-transform">
                                <FiBriefcase />
                            </div>
                            <div className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-1">Create Deal</div>
                            <div className="text-[10px] text-slate-400 font-medium leading-relaxed">Transform an interest into a formal opportunity.</div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
