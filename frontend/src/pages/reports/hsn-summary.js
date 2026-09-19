import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiDownload } from 'react-icons/fi';
import Head from 'next/head';
import SearchableSelect from '@/components/SearchableSelect';

export default function HSNSummaryReport() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
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

            const res = await api.get('/reports/gst/hsn-summary', { params });
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load HSN Summary data');
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
                <title>HSN Summary | POS</title>
            </Head>

            <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">HSN Summary</h1>
                        <p className="text-slate-500 text-sm">Item-wise Summary Details</p>
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

                {/* HSN Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>HSN Code</th>
                                    <th>Description</th>
                                    <th>UQC</th>
                                    <th>Total Quantity</th>
                                    <th>Total Value</th>
                                    <th>Taxable Value</th>
                                    <th>IGST</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>Cess</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="font-medium text-slate-800">{item.hsnCode}</td>
                                        <td>{item.description}</td>
                                        <td>{item.uqc}</td>
                                        <td>{item.totalQuantity}</td>
                                        <td>{formatCurrency(item.totalValue)}</td>
                                        <td className="font-medium">{formatCurrency(item.taxableValue)}</td>
                                        <td>{formatCurrency(item.igst)}</td>
                                        <td>{formatCurrency(item.cgst)}</td>
                                        <td>{formatCurrency(item.sgst)}</td>
                                        <td>{formatCurrency(item.cess)}</td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan="10" className="text-center py-6 text-slate-400">No Data Found</td>
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
