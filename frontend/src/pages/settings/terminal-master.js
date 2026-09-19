import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { FiMonitor, FiShield, FiCheckCircle, FiXCircle, FiTrash2, FiSettings, FiPlus, FiAlertTriangle, FiSmartphone } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { getTerminalId, registerThisTerminal } from '@/lib/terminal';
import ProfessionalModal from '@/components/ProfessionalModal';
import SearchableSelect from '@/components/SearchableSelect';

export default function TerminalMaster() {
    const { primaryColor } = useTheme();
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminalLock, setTerminalLock] = useState(false);
    const [branches, setBranches] = useState([]);
    const [users, setUsers] = useState([]);
    const [thisTerminalId, setThisTerminalId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTerminalName, setNewTerminalName] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkNames, setBulkNames] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [terminalToDelete, setTerminalToDelete] = useState(null);

    useEffect(() => {
        fetchData();
        setThisTerminalId(getTerminalId());
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [termRes, setRes, branchRes, userRes] = await Promise.all([
                api.get('/terminals'),
                api.get('/terminals/settings'),
                api.get('/branches'),
                api.get('/users')
            ]);
            setTerminals(termRes.data);
            setTerminalLock(setRes.data.terminalLock);
            setBranches(branchRes.data);
            setUsers(userRes.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch terminal data');
        } finally {
            setLoading(false);
        }
    };

    const toggleTerminalLock = async () => {
        try {
            const { data } = await api.post('/terminals/settings', { terminalLock: !terminalLock });
            setTerminalLock(data.terminalLock);
            toast.success(`Terminal Access Control ${data.terminalLock ? 'Enabled' : 'Disabled'}`);
        } catch (err) {
            toast.error('Failed to update settings');
        }
    };

    const updateTerminalStatus = async (id, isActive) => {
        try {
            await api.put(`/terminals/${id}`, { isActive });
            setTerminals(terminals.map(t => t.id === id ? { ...t, isActive } : t));
            toast.success(`Terminal ${isActive ? 'Authorized' : 'Deactivated'}`);
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const updateTerminalUser = async (id, userId) => {
        try {
            await api.put(`/terminals/${id}`, { userId });
            const user = users.find(u => u.id === parseInt(userId));
            setTerminals(terminals.map(t => t.id === id ? { ...t, userId: userId ? parseInt(userId) : null, user } : t));
            toast.success('Terminal user mapping updated');
        } catch (err) {
            toast.error('Failed to update terminal user');
        }
    };

    const confirmDelete = (terminal) => {
        setTerminalToDelete(terminal);
        setIsDeleteModalOpen(true);
    };

    const deleteTerminal = async () => {
        if (!terminalToDelete) return;
        try {
            await api.delete(`/terminals/${terminalToDelete.id}`);
            setTerminals(terminals.filter(t => t.id !== terminalToDelete.id));
            toast.success('Terminal removed');
            setIsDeleteModalOpen(false);
            setTerminalToDelete(null);
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleRegister = async () => {
        if (isBulkMode) {
            if (!bulkNames.trim()) {
                toast.error('Please enter terminal names');
                return;
            }
            if (!selectedBranchId) {
                toast.error('Please select a branch');
                return;
            }
            const names = bulkNames.split(',').map(n => n.trim()).filter(n => n);
            try {
                const { data } = await api.post('/terminals/bulk', {
                    branchId: selectedBranchId,
                    names
                });

                let msg = `${data.created.length} terminals created.`;
                if (data.skipped.length > 0) {
                    msg += ` ${data.skipped.length} skipped (duplicates).`;
                }
                toast.info(msg);
                setIsModalOpen(false);
                setBulkNames('');
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Bulk registration failed');
            }
        } else {
            if (!newTerminalName) {
                toast.error('Please enter a terminal name');
                return;
            }
            try {
                // If it's a manual registration for a specific branch (not current device)
                if (selectedBranchId) {
                    await api.post('/terminals/register', {
                        name: newTerminalName,
                        branchId: selectedBranchId,
                        isManual: true
                    });
                    toast.success('Terminal created successfully.');
                } else {
                    // Original "Register This Device" logic
                    await registerThisTerminal(newTerminalName);
                    toast.success('Terminal registration requested. Please approve it from the list.');
                }

                setIsModalOpen(false);
                setNewTerminalName('');
                setSelectedBranchId('');
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Registration failed');
            }
        }
    };

    const isThisTerminal = (code) => code === thisTerminalId;

    return (
        <div className="w-full py-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                        <FiMonitor className="text-primary" /> Terminal Master
                    </h1>
                    <p className="text-slate-500 text-sm">Manage authorized devices and access control settings.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2">Access Control</span>
                        <div className="flex items-center gap-2 px-2">
                            <span className={`text-sm font-medium ${terminalLock ? 'text-primary' : 'text-slate-400'}`}>
                                {terminalLock ? 'STRICT MODE ACTIVE' : 'OPEN ACCESS'}
                            </span>
                            <button
                                onClick={toggleTerminalLock}
                                className={`w-12 h-6 rounded-full relative transition-colors ${terminalLock ? 'bg-primary' : 'bg-slate-200'}`}
                            >
                                <motion.div
                                    animate={{ left: terminalLock ? '26px' : '2px' }}
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {terminalLock && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <FiAlertTriangle className="text-amber-500 mt-1 shrink-0" />
                    <div>
                        <h4 className="text-amber-800 font-medium text-sm text-balance">Strict Terminal Access is ON</h4>
                        <p className="text-amber-700 text-xs">Only approved and active terminals listed below will be able to log in to the system. Unknown devices will be blocked.</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-medium text-slate-800">Authorized Terminals</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => {
                                setIsBulkMode(true);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-all"
                        >
                            <FiPlus /> Bulk Create
                        </button>
                        <button
                            onClick={() => {
                                setIsBulkMode(false);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                        >
                            <FiMonitor /> Add Terminal
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }}>
                        {/* ... table content remains same ... */}
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Terminal Info</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Fingerprint (ID)</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Linked User</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Activity</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {terminals.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 whitespace-nowrap">
                                        No terminals registered yet.
                                    </td>
                                </tr>
                            ) : (
                                terminals.map((term) => (
                                    <tr key={term.id} className={`hover:bg-slate-50/50 transition-colors ${isThisTerminal(term.terminalCode) ? 'bg-primary/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${term.isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                                    <FiMonitor />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                                        {term.name}
                                                        {isThisTerminal(term.terminalCode) && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-primary text-white rounded-full">THIS DEVICE</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{term.branch?.name || 'All Branches'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
                                                {term.terminalCode.substring(0, 18)}...
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={term.userId || ''}
                                                onChange={(e) => updateTerminalUser(term.id, e.target.value)}
                                                className="text-xs font-medium bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 w-40"
                                            >
                                                <option value="">No User Linked</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.username} ({u.name})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-600 font-medium">
                                                {new Date(term.lastUsed).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-slate-400">{term.ipAddress || 'No IP recorded'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-medium tracking-wider ${term.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {term.isActive ? 'ACTIVE / AUTHORIZED' : 'INACTIVE / PENDING'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => updateTerminalStatus(term.id, !term.isActive)}
                                                    className={`p-2 rounded-lg transition-all ${term.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                    title={term.isActive ? 'Suspend Access' : 'Authorize Device'}
                                                >
                                                    {term.isActive ? <FiXCircle /> : <FiCheckCircle />}
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(term)}
                                                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                                                    title="Remove Terminal"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registration Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 my-auto"
                        >
                            <div className="p-8">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 mx-auto">
                                    <FiMonitor size={32} />
                                </div>

                                <h3 className="text-2xl font-semibold text-center text-slate-800 mb-2">
                                    {isBulkMode ? 'Bulk Create Terminals' : 'Register Terminal'}
                                </h3>
                                <p className="text-center text-slate-500 text-sm mb-8 px-4">
                                    {isBulkMode
                                        ? 'Create multiple terminals for a specific branch at once.'
                                        : 'Link a device to a branch and give it a unique name.'}
                                </p>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">Target Branch</label>
                                        <SearchableSelect
                                            options={[
                                                { label: 'Select Branch (Optional for current device)', value: '' },
                                                ...branches.map(b => ({ label: b.name, value: b.id }))
                                            ]}
                                            value={selectedBranchId}
                                            onChange={(val) => setSelectedBranchId(val)}
                                            direction="down"
                                            triggerClassName="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 h-[56px] text-slate-800 text-sm font-medium"
                                            placeholder="Select Branch (Optional for current device)"
                                        />
                                    </div>

                                    {isBulkMode ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">TERMINAL NAMES (COMMA SEPARATED)</label>
                                            <textarea
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300 min-h-[100px]"
                                                placeholder="Counter 1, Counter 2, Delivery PC..."
                                                value={bulkNames}
                                                onChange={(e) => setBulkNames(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">TERMINAL NAME</label>
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                                                placeholder="e.g. Sales Counter 1, Manager PC"
                                                value={newTerminalName}
                                                onChange={(e) => setNewTerminalName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setNewTerminalName('');
                                                setBulkNames('');
                                                setSelectedBranchId('');
                                            }}
                                            className="flex-1 px-6 py-4 rounded-2xl border border-slate-100 text-slate-500 font-medium text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRegister}
                                            className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-medium text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                                        >
                                            {isBulkMode ? 'Create All' : 'Register'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 flex items-center justify-center gap-2 border-t border-slate-100">
                                <FiShield size={14} className="text-slate-400" />
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-0.5">Device Fingerprinting Active</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Deletion Confirmation Modal */}
            <ProfessionalModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={deleteTerminal}
                title="Remove Terminal?"
                message={`Are you sure you want to remove ${terminalToDelete?.name}? This device will lose access immediately if Strict Mode is active.`}
                confirmText="Yes, Remove"
                type="danger"
            />

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-medium text-slate-800 flex items-center gap-2 mb-2">
                        <FiShield className="text-primary" /> Security Best Practices
                    </h4>
                    <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                        <li>Each PC accessing the software should have a unique Terminal name.</li>
                        <li>Deactivate terminals immediately if a device is lost or compromised.</li>
                        <li>Use "Strict Mode" to prevent unauthorized devices from connecting via your local network.</li>
                        <li>Terminal IDs are stored in your browser. Clearing browser data might reset the Terminal ID.</li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                    <FiSmartphone className="text-3xl text-slate-300 mb-3" />
                    <h4 className="font-medium text-slate-800 text-sm">Mobile & Table Access</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        If you access this software from a phone or tablet, you must also register and approve the device here before logging in.
                    </p>
                </div>
            </div>
        </div>
    );
}
