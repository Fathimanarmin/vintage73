import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'react-toastify';
import { FiSave, FiMessageSquare, FiInfo, FiCopy, FiCheckCircle, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function WhatsAppSettings() {
    const { theme } = useTheme();
    const primaryColor = theme?.primaryColor || '#10b981';
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        apiKey: '',
        apiUrl: 'http://whatsappapi.fastsmsindia.com/wapp/api/send',
        isActive: true,
        salesTemplate: 'Hello [[customer_name]], thank you for your purchase! Your Bill No: [[bill_no]] for amount [[total_amount]] is ready. View here: [[link]]',
        quotationTemplate: 'Hi [[customer_name]], we have prepared a quotation [[quotation_no]] for you. Total Amount: [[total_amount]]. Check details: [[link]]',
        paymentTemplate: 'Dear [[customer_name]], we have received your payment of [[amount]] against Bill: [[bill_no]]. Current Balance: [[balance]].',
        creditTemplate: 'Hello [[customer_name]], this is a reminder regarding your outstanding balance of [[total_amount]]. Please settle the payment at your earliest convenience. Thank you.'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/whatsapp/settings');
            if (data) setSettings(data);
        } catch (err) {
            console.error('Failed to load WhatsApp settings:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post('/whatsapp/settings', settings);
            toast.success('WhatsApp settings updated successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const PlaceholderBadge = ({ text }) => (
        <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors"
            onClick={() => {
                navigator.clipboard.writeText(`[[${text}]]`);
                toast.info(`Copied [[${text}]]`);
            }}
        >
            <FiCopy className="w-2.5 h-2.5" />
            {text}
        </span>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-8 pb-12"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">WhatsApp Integration</h1>
                    <p className="text-slate-500 text-sm">Configure your fastsmsindia API credentials and design message templates.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/settings/whatsapp-history">
                        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium text-sm hover:shadow-sm transition-all">
                            <FiClock /> View History
                        </button>
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <FiSave />
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* API Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                <FiMessageSquare className="w-5 h-5" />
                            </div>
                            <h2 className="font-semibold text-slate-800">Connection Settings</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">API Endpoint</label>
                                <input
                                    type="text"
                                    value={settings.apiUrl}
                                    onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="Enter API URL"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">API Key</label>
                                <input
                                    type="password"
                                    value={settings.apiKey || ''}
                                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="••••••••••••••••"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-700">Active Status</span>
                                    <span className="text-[10px] text-slate-400">Enable/Disable integration</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.isActive}
                                        onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl flex gap-3 border border-blue-100">
                            <FiInfo className="text-blue-500 mt-1 flex-shrink-0" />
                            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                                This integration uses the GET method of the fastsmsindia API. Ensure your API Key is valid and has sufficient balance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Template Designer */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <FiCheckCircle className="w-5 h-5" />
                                </div>
                                <h2 className="font-semibold text-slate-800">Custom Message Templates</h2>
                            </div>
                        </div>

                        {/* Available Tags */}
                        <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                            <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <FiCopy className="w-3 h-3" /> Click to copy placeholders
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <PlaceholderBadge text="customer_name" />
                                <PlaceholderBadge text="bill_no" />
                                <PlaceholderBadge text="quotation_no" />
                                <PlaceholderBadge text="total_amount" />
                                <PlaceholderBadge text="amount" />
                                <PlaceholderBadge text="balance" />
                                <PlaceholderBadge text="link" />
                                <PlaceholderBadge text="company_name" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Sales Template */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">POS Sales Invoice</label>
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Recommended for POS</span>
                                </div>
                                <textarea
                                    value={settings.salesTemplate || ''}
                                    onChange={(e) => setSettings({ ...settings, salesTemplate: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-semibold leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                                    placeholder="Hello [[customer_name]], thank you for your purchase!"
                                />
                            </div>

                            {/* Quotation Template */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Quotations Template</label>
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Used in Quotation Module</span>
                                </div>
                                <textarea
                                    value={settings.quotationTemplate || ''}
                                    onChange={(e) => setSettings({ ...settings, quotationTemplate: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-semibold leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                                    placeholder="Hi [[customer_name]], we have prepared a quotation..."
                                />
                            </div>

                            {/* Payment Template */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Payment Receipts</label>
                                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">For balance updates</span>
                                </div>
                                <textarea
                                    value={settings.paymentTemplate || ''}
                                    onChange={(e) => setSettings({ ...settings, paymentTemplate: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-semibold leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                                    placeholder="Dear [[customer_name]], payment of [[amount]] received."
                                />
                            </div>

                            {/* Credit Template */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Credit Management</label>
                                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Debt Reminders</span>
                                </div>
                                <textarea
                                    value={settings.creditTemplate || ''}
                                    onChange={(e) => setSettings({ ...settings, creditTemplate: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-semibold leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                                    placeholder="Hello [[customer_name]], your outstanding balance is [[total_amount]]..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
