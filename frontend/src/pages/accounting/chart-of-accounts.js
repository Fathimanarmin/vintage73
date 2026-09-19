import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';

export default function ChartOfAccounts() {
    const [ledgers, setLedgers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        groupId: '',
        openingBalance: '0',
        balanceType: 'DEBIT',
        description: ''
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ledgersRes, groupsRes] = await Promise.all([
                api.get('/accounting/ledgers'),
                api.get('/accounting/groups')
            ]);
            setLedgers(ledgersRes.data);
            setGroups(groupsRes.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.groupId) {
            toast.error('Account Group is required');
            return;
        }
        try {
            if (editingId) {
                await api.put(`/accounting/ledgers/${editingId}`, formData);
                toast.success('Ledger updated successfully');
            } else {
                await api.post('/accounting/ledgers', formData);
                toast.success('Ledger created successfully');
            }
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save ledger');
        }
    };

    const handleEdit = (ledger) => {
        setFormData({
            name: ledger.name,
            groupId: ledger.groupId.toString(),
            openingBalance: ledger.openingBalance.toString(),
            balanceType: ledger.balanceType,
            description: ledger.description || ''
        });
        setEditingId(ledger.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this ledger?')) return;

        try {
            await api.delete(`/accounting/ledgers/${id}`);
            toast.success('Ledger deleted successfully');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete ledger');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            groupId: '',
            openingBalance: '0',
            balanceType: 'DEBIT',
            description: ''
        });
        setEditingId(null);
    };

    // Filter ledgers based on search
    const filteredLedgers = ledgers.filter(ledger =>
        ledger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ledger.group?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Export to CSV
    const handleExport = () => {
        const csvContent = [
            ['Ledger Name', 'Group', 'Group Type', 'Opening Balance', 'Current Balance', 'Balance Type'],
            ...filteredLedgers.map(l => [
                l.name,
                l.group?.name || '',
                l.group?.groupType || '',
                l.openingBalance,
                l.currentBalance || 0,
                l.balanceType
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chart-of-accounts.csv';
        a.click();
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Chart of Accounts</h1>
                    <p className="text-slate-500 text-sm mt-1">{filteredLedgers.length} ledgers</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                        <FiDownload size={16} /> Export CSV
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-dark transition-all shadow-sm"
                    >
                        <FiPlus size={16} /> Add Ledger
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search ledgers or groups..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : (
                <div className="card shadow-md border border-slate-200">
                    <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto shadow-sm border border-slate-200">
                        <table className="table-modern w-full">
                            <thead>
                                <tr className="whitespace-nowrap">
                                    <th style={{ width: '4%' }}>#</th>
                                    <th style={{ width: '26%' }}>Ledger Name</th>
                                    <th style={{ width: '18%' }}>Group</th>
                                    <th style={{ width: '10%' }}>Type</th>
                                    <th className="text-right" style={{ width: '13%' }}>Opening Balance</th>
                                    <th className="text-right" style={{ width: '13%' }}>Current Balance</th>
                                    <th className="text-center" style={{ width: '6%' }}>Dr/Cr</th>
                                    <th className="text-center" style={{ width: '10%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLedgers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-slate-400">
                                            No ledgers found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLedgers.map((ledger, index) => (
                                        <tr key={ledger.id}>
                                            <td className="text-slate-500">
                                                {index + 1}
                                            </td>
                                            <td className="font-semibold text-slate-800">
                                                {ledger.name}
                                                {ledger.description && (
                                                    <div className="text-[10px] text-slate-500 font-normal mt-0">
                                                        {ledger.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-slate-600">
                                                {ledger.group?.name || '-'}
                                            </td>
                                            <td>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${ledger.group?.groupType === 'ASSETS' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                    ledger.group?.groupType === 'LIABILITIES' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                        ledger.group?.groupType === 'EQUITY' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                            ledger.group?.groupType === 'INCOME' ? 'bg-primary-light/10 text-primary border border-primary/20' :
                                                                ledger.group?.groupType === 'EXPENSES' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                                                    'bg-slate-50 text-slate-700'
                                                    }`}>
                                                    {ledger.group?.groupType || '-'}
                                                </span>
                                            </td>
                                            <td className="text-right font-mono text-slate-700">
                                                ₹{parseFloat(ledger.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="text-right font-mono font-semibold">
                                                <span className={parseFloat(ledger.currentBalance || 0) >= 0 ? 'text-primary' : 'text-red-600'}>
                                                    ₹{parseFloat(ledger.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ledger.balanceType === 'DEBIT'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                    : 'bg-green-50 text-green-700 border border-green-100'
                                                    }`}>
                                                    {ledger.balanceType === 'DEBIT' ? 'Dr' : 'Cr'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(ledger)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    {!ledger.isSystem && (
                                                        <button
                                                            onClick={() => handleDelete(ledger.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-slate-50 border-t border-slate-300 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-slate-600">
                            Showing <span className="font-semibold">{filteredLedgers.length}</span> of <span className="font-semibold">{ledgers.length}</span> ledgers
                        </div>
                        <div className="flex flex-wrap gap-6 text-sm justify-center">
                            <div>
                                <span className="text-slate-500">Total Opening Balance: </span>
                                <span className="font-medium text-slate-800">
                                    ₹{ledgers.reduce((sum, l) => sum + parseFloat(l.openingBalance), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Total Current Balance: </span>
                                <span className="font-medium text-primary">
                                    ₹{ledgers.reduce((sum, l) => sum + parseFloat(l.currentBalance || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-200 shrink-0">
                            <h2 className="text-xl font-semibold text-slate-800">
                                {editingId ? 'Edit Ledger' : 'Add New Ledger'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
                                    Ledger Name *
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
                                    Account Group *
                                </label>
                                <SearchableSelect
                                    options={groups.map(group => ({
                                        value: group.id,
                                        label: group.parent ? `${group.parent.name} > ${group.name}` : group.name
                                    }))}
                                    value={formData.groupId}
                                    onChange={val => setFormData({ ...formData, groupId: val })}
                                    placeholder="Select Group"
                                    direction="down"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
                                        Opening Balance
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={formData.openingBalance}
                                        onChange={e => setFormData({ ...formData, openingBalance: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
                                        Balance Type
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'DEBIT', label: 'Debit' },
                                            { value: 'CREDIT', label: 'Credit' }
                                        ]}
                                        value={formData.balanceType}
                                        onChange={val => setFormData({ ...formData, balanceType: val })}
                                        placeholder="Select Type"
                                        direction="down"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-dark transition-all"
                                >
                                    {editingId ? 'Update' : 'Create'} Ledger
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
