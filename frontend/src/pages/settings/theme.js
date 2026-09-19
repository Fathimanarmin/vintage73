import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'react-toastify';
import { FiSave, FiRefreshCw, FiDroplet, FiLayout, FiCheck } from 'react-icons/fi';

export default function ThemeSettings() {
    const { theme, updateTheme } = useTheme();
    const [loading, setLoading] = useState(false);

    const [localTheme, setLocalTheme] = useState({
        primaryColor: '#10b981',
        secondaryColor: '#059669',
        gradientType: 'linear'
    });
    const [showLogoOnly, setShowLogoOnly] = useState(false);

    useEffect(() => {
        if (theme) {
            setLocalTheme({
                primaryColor: theme.primaryColor,
                secondaryColor: theme.secondaryColor,
                gradientType: theme.gradientType
            });
            setShowLogoOnly(theme.companyProfile?.showOnlyLogoOnDashboard || false);
        }
    }, [theme]);

    // Pre-defined color palettes
    const colorPresets = [
        { name: 'Emerald (Default)', primary: '#10b981', secondary: '#059669' },
        { name: 'Royal Blue', primary: '#3b82f6', secondary: '#1e40af' },
        { name: 'Purple Haze', primary: '#8b5cf6', secondary: '#5b21b6' },
        { name: 'Crimson Red', primary: '#ef4444', secondary: '#991b1b' },
        { name: 'Midnight', primary: '#0f172a', secondary: '#334155' },
        { name: 'Sunset Orange', primary: '#f97316', secondary: '#c2410c' },
        { name: 'Teal Ocean', primary: '#14b8a6', secondary: '#0f766e' },
        { name: 'Pink Rose', primary: '#ec4899', secondary: '#be185d' },
    ];

    const handleSave = async () => {
        setLoading(true);
        try {
            // 1. Persist to API
            // Since our updateCompanyProfile API is partial, we can just send the fields we want to update.
            await api.post('/company', {
                ...localTheme,
                showOnlyLogoOnDashboard: showLogoOnly
            });

            // 2. Update Context (which updates CSS variables)
            await updateTheme({
                ...localTheme,
                companyProfile: {
                    ...theme.companyProfile,
                    showOnlyLogoOnDashboard: showLogoOnly
                }
            });

            toast.success('Theme updated successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save theme settings');
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (preset) => {
        const newTheme = {
            ...localTheme,
            primaryColor: preset.primary,
            secondaryColor: preset.secondary
        };
        setLocalTheme(newTheme);
        // Live preview by updating context immediately (optional, or wait for save)
        // To make it feel responsive, let's update contexts 'preview' capabilities if we had them,
        // but for now, we just update local state. The user sees changes on 'Save'.
        // actually, let's allow "Live Preview" by updating the CSS variables temporarily?
        // Nah, keeping it simple: Select -> Save to Apply.
    };

    // Helper to preview gradient
    const getGradientStyle = () => {
        return {
            background: `linear-gradient(135deg, ${localTheme.primaryColor} 0%, ${localTheme.secondaryColor} 100%)`
        };
    };

    return (
        <div className="w-full space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-slate-800">Theme Settings</h1>
                <p className="text-slate-500 text-sm">Customize the look and feel of the application.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: Controls */}
                <div className="space-y-6">

                    {/* Presets */}
                    <div className="card">
                        <h3 className="text-sm font-medium text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <FiDroplet /> Recommended Palettes
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {colorPresets.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => applyPreset(preset)}
                                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3
                                ${localTheme.primaryColor === preset.primary ? 'border-primary bg-primary-light/10 ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                            `}
                                >
                                    <div className="w-8 h-8 rounded-full shadow-sm flex-shrink-0" style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }} />
                                    <span className="text-sm font-medium text-slate-700">{preset.name}</span>
                                    {localTheme.primaryColor === preset.primary && <FiCheck className="ml-auto text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Customizer */}
                    <div className="card">
                        <h3 className="text-sm font-medium text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <FiLayout /> Custom Colors
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={localTheme.primaryColor}
                                        onChange={(e) => setLocalTheme({ ...localTheme, primaryColor: e.target.value })}
                                        className="h-10 w-20 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={localTheme.primaryColor}
                                        onChange={(e) => setLocalTheme({ ...localTheme, primaryColor: e.target.value })}
                                        className="input w-32 uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary / Gradient Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={localTheme.secondaryColor}
                                        onChange={(e) => setLocalTheme({ ...localTheme, secondaryColor: e.target.value })}
                                        className="h-10 w-20 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={localTheme.secondaryColor}
                                        onChange={(e) => setLocalTheme({ ...localTheme, secondaryColor: e.target.value })}
                                        className="input w-32 uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Visibility */}
                    <div className="card">
                        <h3 className="text-sm font-medium text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <FiLayout /> Dashboard Visibility
                        </h3>
                        <div className="flex items-center gap-3 py-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={showLogoOnly}
                                    onChange={(e) => setShowLogoOnly(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700 select-none">
                                    Hide Dashboard Stats (Show Layout Only)
                                </span>
                            </label>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            If enabled, the main dashboard will only show your company logo/background image instead of financial statistics.
                        </p>
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="space-y-6">
                    <div className="card sticky top-6">
                        <h3 className="text-sm font-medium text-slate-400 uppercase mb-4">Live Preview</h3>

                        {/* Mock Buttons */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Buttons & Actions</p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        className="px-4 py-2 rounded-lg text-white font-medium shadow-md transition-transform active:scale-95"
                                        style={getGradientStyle()}
                                    >
                                        Primary Action
                                    </button>
                                    <button className="btn btn-secondary">Secondary</button>
                                </div>
                            </div>

                            {/* Mock Navigation */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Navigation Bar</p>
                                <div
                                    className="h-12 rounded-lg flex items-center px-4 justify-between shadow-sm text-white"
                                    style={getGradientStyle()}
                                >
                                    <div className="flex gap-4 text-sm font-semibold opacity-90">
                                        <span>Home</span>
                                        <span className="opacity-100 bg-white/20 px-2 py-0.5 rounded">Active</span>
                                        <span>Settings</span>
                                    </div>
                                    <div className="w-6 h-6 bg-white/20 rounded-full" />
                                </div>
                            </div>

                            {/* Mock Active Tab */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Active Elements</p>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                                        style={{ background: `${localTheme.primaryColor}20`, color: localTheme.primaryColor }}
                                    >
                                        Active Status
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={getGradientStyle()}
                            >
                                {loading ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                                Save Theme Changes
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
