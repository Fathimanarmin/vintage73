import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiGrid, FiTag, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function CategoryMaster() {
    const [activeTab, setActiveTab] = useState('product'); // 'product' or 'ticket'
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [barcodeTemplates, setBarcodeTemplates] = useState([]);
    const [formData, setFormData] = useState({ name: '', unitType: '', attributes: [], defaultLabelDesignId: '' });

    // Attribute editing state
    const [newAttributeName, setNewAttributeName] = useState('');
    const [newOptionInputs, setNewOptionInputs] = useState({});

    const UNIT_TYPES = [
        // Mass
        { value: 'kg', label: 'Kilogram (kg)' },
        { value: 'g', label: 'Gram (g)' },
        { value: 'mg', label: 'Milligram (mg)' },
        // Volume
        { value: 'l', label: 'Litre (l)' },
        { value: 'ml', label: 'Millilitre (ml)' },
        // Length
        { value: 'm', label: 'Meter (m)' },
        { value: 'cm', label: 'Centimeter (cm)' },
        { value: 'mm', label: 'Millimeter (mm)' },
        { value: 'ft', label: 'Feet (ft)' },
        // Quantity
        { value: 'pcs', label: 'Pieces (pcs)' },
        { value: 'box', label: 'Box' },
        { value: 'doz', label: 'Dozen (doz)' },
        { value: 'set', label: 'Set' },
        { value: 'pair', label: 'Pair' },
        { value: 'pkt', label: 'Packet (pkt)' },
        { value: 'bag', label: 'Bag' },
        { value: 'roll', label: 'Roll' },
        { value: 'bundle', label: 'Bundle' }
    ];

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const url = activeTab === 'product' ? '/categories' : '/tickets/categories';
            const { data } = await api.get(url);
            setCategories(data);
        } catch (error) {
            toast.error('Failed to fetch categories');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBarcodeTemplates = async () => {
        try {
            const { data } = await api.get('/barcode-templates');
            setBarcodeTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch barcode templates:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchBarcodeTemplates();
    }, [activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const baseUrl = activeTab === 'product' ? '/categories' : '/tickets/categories';
        try {
            const payload = activeTab === 'product'
                ? {
                    name: formData.name,
                    unitType: formData.unitType,
                    attributes: formData.attributes,
                    defaultLabelDesignId: formData.defaultLabelDesignId ? parseInt(formData.defaultLabelDesignId) : null
                }
                : { name: formData.name };

            if (editingCategory) {
                await api.put(`${baseUrl}/${editingCategory.id}`, payload);
                toast.success('Category updated successfully');
            } else {
                await api.post(baseUrl, payload);
                toast.success('Category created successfully');
            }
            setShowModal(false);
            setFormData({ name: '', unitType: '', attributes: [], defaultLabelDesignId: '' });
            setNewAttributeName('');
            setNewOptionInputs({});
            setEditingCategory(null);
            fetchCategories();
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.error || 'Operation failed';
            toast.error(msg);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        const baseUrl = activeTab === 'product' ? '/categories' : '/tickets/categories';
        try {
            await api.delete(`${baseUrl}/${id}`);
            toast.success('Category deleted successfully');
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        }
    };

    const openModal = (category = null) => {
        setNewAttributeName('');
        setNewOptionInputs({});
        fetchBarcodeTemplates();
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                unitType: category.unitType || '',
                attributes: Array.isArray(category.attributes) ? JSON.parse(JSON.stringify(category.attributes)) : [],
                defaultLabelDesignId: category.defaultLabelDesignId || category.defaultLabelDesign?.id || ''
            });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', unitType: '', attributes: [], defaultLabelDesignId: '' });
        }
        setShowModal(true);
    };

    // ── Attribute management handlers ────────────────────────────────────────
    const handleAddAttribute = () => {
        const trimmed = newAttributeName.trim();
        if (!trimmed) return;
        if (formData.attributes.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.warning(`Attribute "${trimmed}" already added`);
            return;
        }
        setFormData(prev => ({
            ...prev,
            attributes: [...prev.attributes, { name: trimmed, options: [] }]
        }));
        setNewAttributeName('');
    };

    const handleRemoveAttribute = (index) => {
        setFormData(prev => ({
            ...prev,
            attributes: prev.attributes.filter((_, idx) => idx !== index)
        }));
        setNewOptionInputs(prev => {
            const updated = { ...prev };
            delete updated[index];
            return updated;
        });
    };

    const handleAddOption = (attrIndex) => {
        const optText = (newOptionInputs[attrIndex] || '').trim();
        if (!optText) return;
        setFormData(prev => {
            const updated = [...prev.attributes];
            const currentOptions = updated[attrIndex].options || [];
            if (!currentOptions.includes(optText)) {
                updated[attrIndex] = { ...updated[attrIndex], options: [...currentOptions, optText] };
            }
            return { ...prev, attributes: updated };
        });
        setNewOptionInputs(prev => ({ ...prev, [attrIndex]: '' }));
    };

    const handleRemoveOption = (attrIndex, optIndex) => {
        setFormData(prev => {
            const updated = [...prev.attributes];
            updated[attrIndex] = {
                ...updated[attrIndex],
                options: updated[attrIndex].options.filter((_, idx) => idx !== optIndex)
            };
            return { ...prev, attributes: updated };
        });
    };

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Category Master</h1>
                    <p className="text-sm text-slate-500">Manage your product and service/ticket categories with attributes</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <FiPlus /> Add Category
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'product'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setActiveTab('product')}
                >
                    Product Categories
                </button>
                <button
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'ticket'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setActiveTab('ticket')}
                >
                    Ticket Categories
                </button>
            </div>

            <div className="card mb-6">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <FiSearch className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="table-container lg:no-scrollbar overflow-x-auto">
                    <table className="table-modern">
                        <thead>
                            <tr className="whitespace-nowrap">
                                <th>Category Name</th>
                                {activeTab === 'product' && <th>Default Label</th>}
                                {activeTab === 'product' && <th>Unit Type</th>}
                                {activeTab === 'product' && <th>Attributes</th>}
                                {activeTab === 'product' && <th>Products Linked</th>}
                                {activeTab === 'ticket' && <th>Usage</th>}
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-8 text-slate-500">No categories found.</td></tr>
                            ) : (
                                filteredCategories.map((category) => (
                                    <tr key={category.id}>
                                        <td className="font-medium text-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-primary-light/20 flex items-center justify-center text-primary">
                                                    <FiGrid />
                                                </div>
                                                {category.name}
                                            </div>
                                        </td>
                                        {activeTab === 'product' && (
                                            <td>
                                                {category.defaultLabelDesign ? (
                                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md text-xs font-semibold">
                                                        {category.defaultLabelDesign.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                        )}
                                        {activeTab === 'product' && (
                                            <td>
                                                {category.unitType ? (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium uppercase">
                                                        {category.unitType}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                        )}
                                        {activeTab === 'product' && (
                                            <td>
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {Array.isArray(category.attributes) && category.attributes.length > 0 ? (
                                                        <>
                                                            {category.attributes.slice(0, 3).map((attr, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-medium" title={attr.options?.join(', ')}>
                                                                    {attr.name}
                                                                </span>
                                                            ))}
                                                            {category.attributes.length > 3 && (
                                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium">
                                                                    +{category.attributes.length - 3} more
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">No attributes</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {activeTab === 'product' && (
                                            <td>
                                                <span className="badge badge-info">
                                                    {category._count?.products || 0} Products
                                                </span>
                                            </td>
                                        )}
                                        {activeTab === 'ticket' && (
                                            <td>
                                                <span className="badge badge-primary">
                                                    {category._count?.tickets || 0} Tickets Linked
                                                </span>
                                            </td>
                                        )}
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(category)} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                                                    <FiEdit />
                                                </button>
                                                <button onClick={() => handleDelete(category.id)} className="p-2 hover:bg-red-50 rounded text-red-500 transition-colors">
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

            {showModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-medium text-lg text-slate-800">
                                {editingCategory ? 'Edit Category' : 'Add New Category'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-5">
                            {/* Category Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    {activeTab === 'product' ? 'Product' : 'Ticket'} Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    className="input w-full"
                                    placeholder={activeTab === 'product' ? "e.g. Electronics, Clothing" : "e.g. Software, Hardware"}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Unit Type — product categories only */}
                            {activeTab === 'product' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Unit Type</label>
                                    <select
                                        className="input w-full"
                                        value={formData.unitType}
                                        onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                                    >
                                        <option value="">Select Unit</option>
                                        {UNIT_TYPES.map(unit => (
                                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Default Label Design — product categories only */}
                            {activeTab === 'product' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Label Design</label>
                                    <select
                                        className="input w-full"
                                        value={formData.defaultLabelDesignId || ''}
                                        onChange={(e) => setFormData({ ...formData, defaultLabelDesignId: e.target.value })}
                                    >
                                        <option value="">Select Label Design</option>
                                        {barcodeTemplates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Dynamically loaded from Barcode Creator templates.
                                    </p>
                                </div>
                            )}

                            {/* Attributes — product categories only */}
                            {activeTab === 'product' && (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">Category Attributes</p>
                                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                            Attributes configured here are automatically inherited by Product Types under this category.
                                        </p>
                                    </div>

                                    {/* Add Attribute Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Attribute name (e.g. Sleeve, Color, Material...)"
                                            className="input flex-1 text-xs"
                                            value={newAttributeName}
                                            onChange={e => setNewAttributeName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute(); } }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddAttribute}
                                            className="btn btn-secondary text-xs px-4 whitespace-nowrap"
                                        >
                                            <FiPlus size={13} /> Add
                                        </button>
                                    </div>

                                    {/* Configured Attributes */}
                                    <div className="space-y-2">
                                        {formData.attributes.length === 0 ? (
                                            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                                <FiTag size={22} className="mx-auto text-slate-300 mb-1" />
                                                <p className="text-xs text-slate-400">No attributes yet. Add one above.</p>
                                            </div>
                                        ) : (
                                            formData.attributes.map((attr, attrIdx) => (
                                                <div key={attrIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                                                            <FiTag className="text-primary text-xs" />
                                                            {attr.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAttribute(attrIdx)}
                                                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="Remove attribute"
                                                        >
                                                            <FiX size={13} />
                                                        </button>
                                                    </div>

                                                    {/* Options */}
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {(attr.options || []).map((opt, optIdx) => (
                                                            <span
                                                                key={optIdx}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-700 rounded-md text-[11px] border border-slate-200 shadow-sm font-medium"
                                                            >
                                                                {opt}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveOption(attrIdx, optIdx)}
                                                                    className="text-slate-400 hover:text-red-500 ml-0.5 leading-none"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </span>
                                                        ))}
                                                        {(attr.options || []).length === 0 && (
                                                            <span className="text-[10px] text-slate-400 italic">No options — add below</span>
                                                        )}
                                                    </div>

                                                    {/* Add Option Input */}
                                                    <div className="flex gap-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder={`Add option to ${attr.name}...`}
                                                            className="input flex-1 !py-1 text-xs bg-white"
                                                            value={newOptionInputs[attrIdx] || ''}
                                                            onChange={e => setNewOptionInputs({ ...newOptionInputs, [attrIdx]: e.target.value })}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(attrIdx); } }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddOption(attrIdx)}
                                                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                                                        >
                                                            Add Option
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingCategory ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
