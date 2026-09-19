import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiDownload, FiPrinter, FiFilter } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';

export default function CashBookReport() {
    const { theme } = useTheme();
    const primaryColor = theme?.primaryColor || '#059669';
    const [transactions, setTransactions] = useState([]);
    const [ledgerInfo, setLedgerInfo] = useState(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(false);

    // Date Filtering (Default to current month)
    const date = new Date();
    const [startDate, setStartDate] = useState(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchCompanyProfile();
        fetchCashReport();
    }, []); // Initial load

    const fetchCompanyProfile = async () => {
        try {
            const res = await api.get('/company');
            setCompany(res.data);
        } catch (err) {
            console.error("Failed to load company info");
        }
    };

    const fetchCashReport = async () => {
        setLoading(true);
        try {
            // 1. Find the Cash Ledger ID first (usually named 'Cash' or 'Cash-in-Hand')
            const ledgersRes = await api.get('/accounting/ledgers?search=Cash');
            let cashLedger = (ledgersRes.data || []).find(l => {
                const name = (l.name || '').trim().toLowerCase();
                return name === 'cash' || name === 'cash in hand' || name === 'cash-in-hand' || name === 'cash account';
            }) || (ledgersRes.data || []).find(l => (l.name || '').toLowerCase().includes('cash'));

            if (!cashLedger) {
                // Fallback check all ledgers in case search filter was specific
                const allLedgers = await api.get('/accounting/ledgers');
                cashLedger = (allLedgers.data || []).find(l => {
                    const name = (l.name || '').trim().toLowerCase();
                    return name === 'cash' || name.includes('cash') || (l.group?.name || '').toLowerCase().includes('cash');
                });
            }

            if (!cashLedger) {
                toast.error("Cash ledger not found");
                return;
            }

            // 2. Fetch Statement
            const res = await api.get('/accounting/reports/ledger-statement', {
                params: {
                    ledgerId: cashLedger.id,
                    startDate,
                    endDate
                }
            });

            setLedgerInfo(res.data.ledger);
            setTransactions(res.data.statement || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load Cash Book');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!transactions.length) {
            toast.error("No data to export");
            return;
        }

        const openingBal = ledgerInfo?.openingBalance !== undefined && ledgerInfo?.openingBalance !== null
            ? Math.abs(Number(ledgerInfo.openingBalance))
            : 0;

        const closingBal = transactions.length > 0
            ? Math.abs(Number(transactions[transactions.length - 1].balance) || 0)
            : openingBal;

        const csvContent = [
            ['Date', 'Voucher No', 'Particulars', 'Debit', 'Credit', 'Balance'],
            // Opening Balance Row
            [
                startDate,
                '-',
                'By Balance b/d (Opening)',
                '-',
                '-',
                `${openingBal} ${ledgerInfo?.balanceType === 'DEBIT' ? 'Dr' : 'Cr'}`
            ],
            // Transactions
            ...transactions.map(tx => [
                new Date(tx.date).toLocaleDateString(),
                tx.voucherNumber,
                `"${tx.particulars} - ${tx.narration || ''}"`,
                tx.debit || 0,
                tx.credit || 0,
                `${Math.abs(tx.balance)} ${tx.balance >= 0 ? 'Dr' : 'Cr'}`
            ]),
            // Closing Balance Row
            [
                endDate,
                '-',
                'Total Closing Balance',
                '-',
                '-',
                `${closingBal} ${transactions.length > 0 ? (transactions[transactions.length - 1].balance >= 0 ? 'Dr' : 'Cr') : (ledgerInfo?.balanceType === 'DEBIT' ? 'Dr' : 'Cr')}`
            ]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CashBook_${startDate}_to_${endDate}.csv`;
        a.click();
    };

    const handlePrint = () => {
        window.print();
    };

    const totalDebit = transactions.reduce((sum, tx) => sum + (Number(tx.debit) || 0), 0);
    const totalCredit = transactions.reduce((sum, tx) => sum + (Number(tx.credit) || 0), 0);
    const openingBalanceNum = ledgerInfo?.openingBalance !== undefined && ledgerInfo?.openingBalance !== null
        ? Math.abs(Number(ledgerInfo.openingBalance))
        : 0;
    const closingBalanceNum = transactions.length > 0
        ? Math.abs(Number(transactions[transactions.length - 1].balance) || 0)
        : openingBalanceNum;
    const closingBalanceType = transactions.length > 0
        ? (transactions[transactions.length - 1].balance >= 0 ? 'Dr' : 'Cr')
        : (ledgerInfo?.balanceType === 'DEBIT' ? 'Dr' : 'Cr');

    const companyAddress = [company?.address, company?.city, company?.pincode ? `PIN: ${company.pincode}` : ''].filter(Boolean).join(', ');

    if (loading && !ledgerInfo) return <div className="p-12 text-center text-slate-500 font-medium text-sm">Loading Cash Book...</div>;

    return (
        <div id="printable-report" className="w-full p-4 sm:p-6 lg:p-8 print:p-0 bg-white min-h-screen rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }

                    /* Show only the report container and its children */
                    #printable-report, #printable-report * {
                        visibility: visible;
                    }

                    /* Position the report at the very top */
                    #printable-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    }

                    /* Hide specific elements marked as hidden in print */
                    .print\\:hidden { 
                        display: none !important; 
                        visibility: hidden !important;
                    }
                }
            `}</style>

            {/* Controls (Hidden in Print) */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
                        <input
                            type="date"
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 transition-all"
                            style={{ borderColor: primaryColor + '40' }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
                        <input
                            type="date"
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 transition-all"
                            style={{ borderColor: primaryColor + '40' }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchCashReport}
                        className="text-white px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <FiFilter size={15} /> Filter
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                    >
                        <FiDownload size={15} /> Excel
                    </button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={handlePrint}
                        className="bg-slate-900 text-white hover:bg-slate-800 active:scale-95 px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                    >
                        <FiPrinter size={15} /> Print Report
                    </button>
                </div>
            </div>

            {/* Report Header */}
            <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 uppercase tracking-wide">
                    {company?.companyName || 'Company Name'}
                </h1>
                {companyAddress && (
                    <p className="text-sm text-slate-600 mt-1 font-medium">{companyAddress}</p>
                )}
                <div className="mt-4 border-t border-slate-300 pt-3 inline-block px-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                        Cash Book Report
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                        Period: {startDate} to {endDate}
                    </p>
                </div>
            </div>

            {/* Report Content Table */}
            <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto rounded-xl border border-slate-200">
                <table className="table-modern w-full border-collapse text-sm min-w-[750px]">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 whitespace-nowrap text-xs font-bold uppercase tracking-wider">
                            <th className="border-b border-r border-slate-300 px-4 py-3 text-left w-[12%]">Date</th>
                            <th className="border-b border-r border-slate-300 px-4 py-3 text-left w-[15%]">Voucher No</th>
                            <th className="border-b border-r border-slate-300 px-4 py-3 text-left w-[35%]">Particulars</th>
                            <th className="border-b border-r border-slate-300 px-4 py-3 text-right w-[12%]">Debit (In)</th>
                            <th className="border-b border-r border-slate-300 px-4 py-3 text-right w-[12%]">Credit (Out)</th>
                            <th className="border-b border-slate-300 px-4 py-3 text-right w-[14%]">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Opening Balance Row */}
                        <tr className="bg-slate-50 font-semibold text-slate-700">
                            <td className="border-b border-r border-slate-200 px-4 py-2.5">{startDate}</td>
                            <td className="border-b border-r border-slate-200 px-4 py-2.5 text-slate-400">-</td>
                            <td className="border-b border-r border-slate-200 px-4 py-2.5 italic">By Balance b/d (Opening)</td>
                            <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right text-slate-400">-</td>
                            <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right text-slate-400">-</td>
                            <td className="border-b border-slate-200 px-4 py-2.5 text-right font-medium text-slate-800">
                                ₹{openingBalanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span className="text-[10px] ml-1 text-slate-500 font-bold">{ledgerInfo?.balanceType === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                            </td>
                        </tr>

                        {/* Transactions */}
                        {transactions.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="border-b border-r border-slate-200 px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                    {new Date(tx.date).toLocaleDateString()}
                                </td>
                                <td className="border-b border-r border-slate-200 px-4 py-2.5 text-slate-600 text-xs">
                                    <span className="font-medium text-slate-800">{tx.voucherNumber}</span>
                                    {tx.voucherType && (
                                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">{tx.voucherType.toLowerCase()}</span>
                                    )}
                                </td>
                                <td className="border-b border-r border-slate-200 px-4 py-2.5 text-slate-800 font-medium">
                                    {tx.particulars}
                                    {tx.narration && (
                                        <div className="text-[11px] text-slate-500 font-normal italic mt-0.5">{tx.narration}</div>
                                    )}
                                </td>
                                <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right font-medium text-emerald-700">
                                    {Number(tx.debit) > 0 ? `₹${Number(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                </td>
                                <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right font-medium text-red-700">
                                    {Number(tx.credit) > 0 ? `₹${Number(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                </td>
                                <td className="border-b border-slate-200 px-4 py-2.5 text-right font-mono text-slate-800 bg-slate-50/40">
                                    ₹{Math.abs(Number(tx.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    <span className="text-[10px] ml-1 text-slate-400 font-semibold">{tx.balance >= 0 ? 'Dr' : 'Cr'}</span>
                                </td>
                            </tr>
                        ))}

                        {/* Empty Row if no transactions */}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan="6" className="border-b border-slate-200 px-4 py-12 text-center text-slate-400 italic">
                                    No transactions found in this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        {/* Closing Balance Row */}
                        <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-800 text-slate-900">
                            <td className="border-r border-slate-300 px-4 py-3" colSpan="3">Total Closing Balance</td>
                            <td className="border-r border-slate-300 px-4 py-3 text-right text-emerald-700">
                                {totalDebit > 0 ? `₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="border-r border-slate-300 px-4 py-3 text-right text-red-700">
                                {totalCredit > 0 ? `₹${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-base text-slate-900 font-extrabold font-mono">
                                ₹{closingBalanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span className="text-xs ml-1 text-slate-600 font-bold">
                                    {closingBalanceType}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-12 grid grid-cols-2 gap-8 print:mt-16 pb-6">
                    <div className="text-center pt-8 border-t border-slate-300 w-48 sm:w-60 ml-4 sm:ml-8">
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Accountant Sign</p>
                    </div>
                    <div className="text-center pt-8 border-t border-slate-300 w-48 sm:w-60 ml-auto mr-4 sm:mr-8">
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Authorized Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
