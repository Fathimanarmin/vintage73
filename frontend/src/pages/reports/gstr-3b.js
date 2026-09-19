import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiDownload } from 'react-icons/fi';
import Head from 'next/head';
import SearchableSelect from '@/components/SearchableSelect';

export default function GSTR3BReport() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ outwardSupplies: {} });
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

            const res = await api.get('/reports/gst/gstr-3b', { params });
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load GSTR-3B data');
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

    const { outwardSupplies } = data;

    return (
        <>
            <Head>
                <title>GSTR-3B Report | POS</title>
            </Head>

            <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">GSTR-3B Report</h1>
                        <p className="text-slate-500 text-sm">Monthly Return Summary</p>
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

                {/* 3.1 Details of Outward Supplies */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <h3 className="font-medium text-slate-700">3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th className="w-1/3">Nature of Supplies</th>
                                    <th>Total Taxable Value</th>
                                    <th>Integrated Tax (IGST)</th>
                                    <th>Central Tax (CGST)</th>
                                    <th>State/UT Tax (SGST)</th>
                                    <th>Cess</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-medium text-slate-700">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                                    <td className="font-semibold">{formatCurrency(outwardSupplies?.taxableValue)}</td>
                                    <td>{formatCurrency(outwardSupplies?.igst)}</td>
                                    <td>{formatCurrency(outwardSupplies?.cgst)}</td>
                                    <td>{formatCurrency(outwardSupplies?.sgst)}</td>
                                    <td>{formatCurrency(outwardSupplies?.cess)}</td>
                                </tr>
                                <tr>
                                    <td className="font-medium text-slate-700">(b) Outward taxable supplies (zero rated)</td>
                                    <td>₹0.00</td>
                                    <td>₹0.00</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>₹0.00</td>
                                </tr>
                                <tr>
                                    <td className="font-medium text-slate-700">(c) Other outward supplies (Nil rated, exempted)</td>
                                    <td>₹0.00</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                </tr>
                                <tr>
                                    <td className="font-medium text-slate-700">(d) Inward supplies (liable to reverse charge)</td>
                                    <td>₹0.00</td>
                                    <td>₹0.00</td>
                                    <td>₹0.00</td>
                                    <td>₹0.00</td>
                                    <td>₹0.00</td>
                                </tr>
                                <tr>
                                    <td className="font-medium text-slate-700">(e) Non-GST outward supplies</td>
                                    <td>₹0.00</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                </tr>
                                <tr className="bg-slate-50 font-medium">
                                    <td>Total</td>
                                    <td>{formatCurrency(outwardSupplies?.taxableValue)}</td>
                                    <td>{formatCurrency(outwardSupplies?.igst)}</td>
                                    <td>{formatCurrency(outwardSupplies?.cgst)}</td>
                                    <td>{formatCurrency(outwardSupplies?.sgst)}</td>
                                    <td>{formatCurrency(outwardSupplies?.cess)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
