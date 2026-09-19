import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiDownload, FiFilter } from 'react-icons/fi';
import Head from 'next/head';
import SearchableSelect from '@/components/SearchableSelect';

export default function GSTR1Report() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ b2b: [], b2c: [], summary: {} });
    const [filters, setFilters] = useState({
        period: 'this_month',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchReport();
    }, [filters.period]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = { ...filters };
            if (filters.period !== 'custom') {
                delete params.startDate;
                delete params.endDate;
            }

            const res = await api.get('/reports/gst/gstr-1', { params });
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load GSTR-1 data');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    return (
        <>
            <Head>
                <title>GSTR-1 Report | POS</title>
            </Head>

            <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">GSTR-1 Report</h1>
                        <p className="text-slate-500 text-sm">Details of outward supplies of goods or services</p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button className="w-full sm:w-auto btn btn-secondary text-sm flex items-center justify-center">
                            <FiDownload /> Export Excel
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Period</label>
                            <SearchableSelect
                                options={[
                                    { label: 'This Month', value: 'this_month' },
                                    { label: 'Last Month', value: 'last_month' },
                                    { label: 'Custom Range', value: 'custom' }
                                ]}
                                value={filters.period}
                                onChange={(val) => handleFilterChange({ target: { name: 'period', value: val } })}
                                direction="down"
                                triggerClassName="input h-[38px] py-2 text-sm bg-white"
                                placeholder="Select Period"
                            />
                        </div>

                        {filters.period === 'custom' && (
                            <>
                                <div className="w-full md:w-40">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        className="input py-2 text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className="input py-2 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={fetchReport}
                                    className="w-full sm:w-auto btn btn-primary py-2 px-4 h-[38px] mb-[1px]"
                                >
                                    Apply
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card bg-blue-50 border-blue-100 p-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-1">Total B2B Invoices</h3>
                        <p className="text-2xl font-bold text-blue-900">{data.summary?.totalB2B || 0}</p>
                    </div>
                    <div className="card bg-green-50 border-green-100 p-4">
                        <h3 className="text-sm font-medium text-green-800 mb-1">Total B2B Value</h3>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(data.summary?.totalB2BValue)}</p>
                    </div>
                    <div className="card bg-indigo-50 border-indigo-100 p-4">
                        <h3 className="text-sm font-medium text-indigo-800 mb-1">Total B2C Invoices</h3>
                        <p className="text-2xl font-bold text-indigo-900">{data.summary?.totalB2C || 0}</p>
                    </div>
                    <div className="card bg-purple-50 border-purple-100 p-4">
                        <h3 className="text-sm font-medium text-purple-800 mb-1">Total B2C Value</h3>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(data.summary?.totalB2CValue)}</p>
                    </div>
                </div>

                {/* B2B Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <h3 className="font-medium text-slate-700">4A, 4B, 4C, 6B, 6C - B2B Invoices</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>GSTIN/UIN</th>
                                    <th>Receiver Name</th>
                                    <th>Invoice No</th>
                                    <th>Invoice Date</th>
                                    <th>Invoice Value</th>
                                    <th>Place of Supply</th>
                                    <th>Reverse Charge</th>
                                    <th>Invoice Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.b2b?.length > 0 ? data.b2b.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.gstin}</td>
                                        <td>{item.customerName}</td>
                                        <td>{item.invoiceNumber}</td>
                                        <td>{new Date(item.invoiceDate).toLocaleDateString()}</td>
                                        <td>{formatCurrency(item.totalAmount)}</td>
                                        <td>{item.placeOfSupply}</td>
                                        <td>No</td>
                                        <td>Regular</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-6 text-slate-400">No B2B Data Found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* B2C Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <h3 className="font-medium text-slate-700">7 - B2C (Others)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>Place of Supply</th>
                                    <th>Taxable Value</th>
                                    <th>Rate</th>
                                    <th>Cess</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Usually B2C is aggregated state-wise and rate-wise. 
                             For this MVP, list individual B2C transactions or simple list. 
                             Showing individual for now as per controller logic. 
                         */}
                                {data.b2c?.length > 0 ? data.b2c.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.placeOfSupply}</td>
                                        <td>{formatCurrency(Number(item.subTotal))}</td>
                                        <td>-</td> {/* Rate aggregation needed in backend ideally */}
                                        <td>0</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-6 text-slate-400">No B2C Data Found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
