import React, { useState } from 'react';
import api from '@/lib/api';
import {
    FiRefreshCw,
    FiCalendar,
    FiCheckCircle,
    FiAlertCircle,
    FiArrowLeft,
    FiPlay,
    FiCpu,
    FiActivity
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'react-toastify';

const BulkPosting = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const primaryColor = theme?.primaryColor || '#059669';
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('IDLE'); // IDLE, PROCESSING, COMPLETED, ERROR
    const [results, setResults] = useState(null);

    const handleSetToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
    };

    const handleSetThisMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        setFromDate(firstDay);
        setToDate(today);
    };

    const handleSetLast30Days = () => {
        const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        setFromDate(past);
        setToDate(today);
    };

    const handleStartSync = async () => {
        if (!fromDate || !toDate) {
            toast.warning('Please select date range');
            return;
        }

        setIsProcessing(true);
        setStatus('PROCESSING');
        setProgress(10); // Initial kick-off

        try {
            // Simulate real progress as we don't have a stream yet, 
            // but the backend handles it in one go. For better UX, we'll increment.
            const progressInterval = setInterval(() => {
                setProgress(prev => (prev < 90 ? prev + 5 : prev));
            }, 500);

            const res = await api.post('/accounting/bulk-post', {
                fromDate,
                toDate,
                transactionTypes: ['SALES', 'PURCHASE']
            });

            clearInterval(progressInterval);
            setProgress(100);
            setResults(res.data);
            setStatus('COMPLETED');
            toast.success('Sync completed successfully');
        } catch (err) {
            console.error('Sync error:', err);
            setStatus('ERROR');
            toast.error('Sync failed: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const totalProcessed = results ? ((results.sales?.processed || 0) + (results.purchases?.processed || 0)) : 0;
    const totalItems = results ? ((results.sales?.total || 0) + (results.purchases?.total || 0)) : 0;
    const totalErrors = results ? ((results.sales?.errors?.length || 0) + (results.purchases?.errors?.length || 0)) : 0;

    return (
        <div className="w-full min-h-[calc(100vh-140px)] space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Full-width Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div className="flex items-center gap-3.5">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-slate-100 active:bg-slate-200 rounded-2xl transition-colors text-slate-600 border border-slate-200 bg-white shadow-sm"
                        title="Back"
                    >
                        <FiArrowLeft size={22} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Bulk Posting Utility</h1>
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                                status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                status === 'PROCESSING' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                                status === 'ERROR' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {status}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">Manual Ledger Synchronization</p>
                    </div>
                </div>
            </div>

            {/* Responsive Full-Width Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Side: Controls & System Logic */}
                <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-6">
                    {/* Date Range Card */}
                    <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <FiCalendar className="text-slate-400" size={16} /> Date Range
                            </h3>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Filter
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider ml-1">From</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 transition-all outline-none"
                                    style={{ borderColor: primaryColor + '40' }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider ml-1">To</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 transition-all outline-none"
                                    style={{ borderColor: primaryColor + '40' }}
                                />
                            </div>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 ml-1">Quick Select</span>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={handleSetToday}
                                    className="px-2 py-2 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/80 rounded-xl transition-all text-center"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSetThisMonth}
                                    className="px-2 py-2 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/80 rounded-xl transition-all text-center"
                                >
                                    This Month
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSetLast30Days}
                                    className="px-2 py-2 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/80 rounded-xl transition-all text-center"
                                >
                                    30 Days
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleStartSync}
                            disabled={isProcessing}
                            className="w-full h-14 rounded-2xl text-white font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isProcessing ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <FiRefreshCw size={18} />
                            )}
                            <span>{isProcessing ? 'Syncing Transactions...' : 'Start Manual Sync'}</span>
                        </button>
                    </div>

                    {/* Engine Logic Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 sm:p-7 rounded-3xl text-white shadow-xl overflow-hidden relative group border border-slate-800">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700 pointer-events-none"></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <FiCpu size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm tracking-wide text-white">Engine Logic</h4>
                                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Automated Sync Rule</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed mb-4">
                            This utility re-evaluates all transactions in the selected range using your current Ledger Posting Setup. Existing vouchers will be replaced to ensure reports match policies.
                        </p>
                        <div className="space-y-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                                <FiCheckCircle className="text-emerald-400 text-xs shrink-0" />
                                <span>Re-evaluates Sales & Purchase transactions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiCheckCircle className="text-emerald-400 text-xs shrink-0" />
                                <span>Replaces outdated ledger journal entries</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiCheckCircle className="text-emerald-400 text-xs shrink-0" />
                                <span>Ensures financial ledger statements align with setup</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Progress & Results */}
                <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-6">
                    {/* Progress Section */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                                    <FiActivity size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Synchronization Progress</h3>
                                    <p className="text-xs text-slate-400 font-medium">Real-time status of ledger batch operations</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-center">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                    status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                    status === 'PROCESSING' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                    status === 'ERROR' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {status}
                                </span>
                                <div className="text-3xl font-extrabold tabular-nums ml-2" style={{ color: primaryColor }}>
                                    {progress}%
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 relative">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                                    style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-[11px] font-medium text-slate-400 px-1">
                                <span>{isProcessing ? 'Posting transactions in progress...' : status === 'COMPLETED' ? 'Process finished' : 'Awaiting start'}</span>
                                <span>{progress}%</span>
                            </div>
                        </div>

                        {/* Results Grid */}
                        {results && (
                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Execution Summary</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {/* Total Processed Card */}
                                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70">
                                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Total Processed</div>
                                        <div className="flex items-baseline justify-between">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                                                {totalProcessed}
                                                <span className="text-xs text-slate-400 font-bold ml-1.5">/ {totalItems}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                                                totalErrors > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            }`}>
                                                {totalErrors > 0 ? `${totalErrors} Errors` : 'All Clean'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sales Postings Card */}
                                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70">
                                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Sales Postings</div>
                                        <div className="flex items-baseline justify-between">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                                                {results.sales?.processed || 0}
                                                <span className="text-xs text-slate-400 font-bold ml-1.5">/ {results.sales?.total || 0}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                                                (results.sales?.errors?.length || 0) > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            }`}>
                                                {results.sales?.errors?.length || 0} Errors
                                            </span>
                                        </div>
                                    </div>

                                    {/* Purchase Postings Card */}
                                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 sm:col-span-2 xl:col-span-1">
                                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Purchase Postings</div>
                                        <div className="flex items-baseline justify-between">
                                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                                                {results.purchases?.processed || 0}
                                                <span className="text-xs text-slate-400 font-bold ml-1.5">/ {results.purchases?.total || 0}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                                                (results.purchases?.errors?.length || 0) > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            }`}>
                                                {results.purchases?.errors?.length || 0} Errors
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Idle State */}
                        {status === 'IDLE' && (
                            <div className="py-14 sm:py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200/80 rounded-2xl bg-slate-50/40">
                                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                                    <FiPlay size={28} className="ml-1 text-slate-400" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-1">Ready for Synchronization</h4>
                                <p className="text-xs text-slate-400 max-w-sm">Select the start and end dates from the left panel and click &ldquo;Start Manual Sync&rdquo; to begin re-evaluating ledger vouchers.</p>
                            </div>
                        )}
                    </div>

                    {/* Details Table if Errors */}
                    {((results?.sales?.errors?.length || 0) > 0 || (results?.purchases?.errors?.length || 0) > 0) && (
                        <div className="bg-red-50/40 p-6 sm:p-7 rounded-3xl border border-red-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
                                    <FiAlertCircle size={16} /> Transaction Failure Details
                                </h4>
                                <span className="text-[11px] font-semibold text-red-500 bg-red-100/70 px-2.5 py-0.5 rounded-full">
                                    {totalErrors} Failed
                                </span>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {[
                                    ...(results.sales?.errors || []).map(e => ({ ...e, type: 'Sale' })),
                                    ...(results.purchases?.errors || []).map(e => ({ ...e, type: 'Purchase' }))
                                ].map((err, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-red-100 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                {err.type}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-700">
                                                ID: {err.id}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-red-600 break-words sm:text-right">
                                            {err.error}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite linear;
                }
            `}</style>
        </div>
    );
};

export default BulkPosting;
