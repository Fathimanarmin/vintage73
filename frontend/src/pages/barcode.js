import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import ReactBarcode from 'react-barcode';
import {
    FiPrinter, FiSearch, FiBox, FiSettings, FiCheck, FiSave, FiGrid,
    FiAlignLeft, FiAlignCenter, FiAlignRight, FiLayout, FiPlus, FiCopy,
    FiTrash2, FiCode, FiFileText, FiRefreshCw, FiCheckCircle, FiEye, FiX, FiSliders
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { printZplViaQz, printImageViaQz, connectQZ, isQzConnected } from '@/lib/qzTray';

const EXAMPLE_ZPL = `^XA
^PRC
^LH0,0^FS
^LL600
^MD20
^MNY
^LH0,0^FS
^FO442,20^ABN,16,0^CI0^FR^FD{{barcode}}^FS
^BY1,3.0^FO422,35^BCN,51,N,Y,N^FR^FD>\\:{{barcode}}^FS
^FO442,90^ABN,16,0^CI0^FR^FD{{productName}}^FS
^FO442,114^ABN,16,0^CI0^FR^FDMRP:^FS
^FO482,114^ABN,20,0^CI0^FR^FD{{price}}^FS

^FO42,20^ABN,16,0^CI0^FR^FD{{barcode}}^FS
^BY1,3.0^FO22,35^BCN,51,N,Y,N^FR^FD>\\:{{barcode}}^FS
^FO42,90^ABN,16,0^CI0^FR^FD{{productName}}^FS
^FO42,114^ABN,16,0^CI0^FR^FDMRP:^FS
^FO82,114^ABN,20,0^CI0^FR^FD{{price}}^FS
^PQ1,0,0,N
^XZ`;

export default function BarcodeCreator() {
    // Top-level mode tab: 'zpl' (Raw ZPL Template Management) or 'visual' (Visual Designer)
    const [activeTab, setActiveTab] = useState('zpl');

    // Visual Designer state
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState({
        nameFontSize: 20,
        priceFontSize: 16,
        barcodeWidth: 2,
        barcodeHeight: 100,
        barcodeFontSize: 18,
        alignment: 'center',
        showName: true,
        showPrice: true,
        showBarcodeValue: true,
        paperSize: 'Single',
        columns: 1,
        margin: 10,
        labelWidth: 40,
        labelHeight: 20,
        paperWidth: 210,
        columnGap: 5,
        rowGap: 5
    });

    // Raw ZPL Templates state
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [activeTemplateId, setActiveTemplateId] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [rawZpl, setRawZpl] = useState('');
    const [labelWidth, setLabelWidth] = useState(40);
    const [labelHeight, setLabelHeight] = useState(20);
    const [dpi, setDpi] = useState(203);
    const [isSavingZpl, setIsSavingZpl] = useState(false);
    const textareaRef = useRef(null);

    // ZPL Preview state
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewDimensions, setPreviewDimensions] = useState(null);
    const [showZplPrintModal, setShowZplPrintModal] = useState(false);
    const [zplPrintQuantity, setZplPrintQuantity] = useState(1);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            setUser(u);
            fetchSettings(u.branchId);
        }
        fetchProducts();
        fetchTemplates();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSettings = async (branchId) => {
        if (!branchId) return;
        try {
            const { data } = await api.get(`/barcode-settings/${branchId}`);
            if (data) setSettings({
                ...data,
                labelWidth: data.labelWidth ?? 40,
                labelHeight: data.labelHeight ?? 20,
                paperWidth: data.paperWidth ?? 210,
                columnGap: data.columnGap ?? 5,
                rowGap: data.rowGap ?? 5
            });
        } catch (err) {
            console.error("Error fetching barcode settings:", err);
        }
    };

    const fetchTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const { data } = await api.get('/barcode-templates');
            const list = Array.isArray(data) ? data : [];
            setTemplates(list);
            // If currently no active template and list has items, optionally select first or leave ready for new
            if (list.length > 0 && activeTemplateId === null && !templateName && !rawZpl) {
                // Keep ready for new template or let user select
            }
        } catch (err) {
            console.error("Error fetching barcode templates:", err);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!user?.branchId) return;
        setLoading(true);
        try {
            await api.put(`/barcode-settings/${user.branchId}`, settings);
            toast.success("Design settings saved for this branch");
        } catch (err) {
            toast.error("Failed to save settings");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // ZPL Actions
    const handleNewTemplate = () => {
        setActiveTemplateId(null);
        setTemplateName('');
        setRawZpl('');
        setLabelWidth(40);
        setLabelHeight(20);
        setDpi(203);
        setPreviewImage(null);
        toast.info("Ready to create a new template");
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleLoadTemplate = (t) => {
        setActiveTemplateId(t.id);
        setTemplateName(t.name);
        setRawZpl(t.rawZpl || '');
        setLabelWidth(t.labelWidth !== null && t.labelWidth !== undefined ? t.labelWidth : 40);
        setLabelHeight(t.labelHeight !== null && t.labelHeight !== undefined ? t.labelHeight : 20);
        setDpi(t.dpi !== null && t.dpi !== undefined ? t.dpi : 203);
        setPreviewImage(null);
        toast.success(`Loaded template "${t.name}" (${t.labelWidth || 40}×${t.labelHeight || 20}mm, ${t.dpi || 203} DPI)`);
    };

    const handleSaveZplTemplate = async () => {
        if (!templateName.trim()) {
            toast.error("Please enter a Template Name");
            return;
        }

        if (rawZpl === undefined || rawZpl === null || !rawZpl.trim()) {
            toast.error("Please enter Raw ZPL code");
            return;
        }

        const payload = {
            name: templateName.trim(),
            rawZpl: rawZpl,
            labelWidth: parseFloat(labelWidth) || 40,
            labelHeight: parseFloat(labelHeight) || 20,
            dpi: parseInt(dpi, 10) || 203
        };

        setIsSavingZpl(true);
        try {
            if (activeTemplateId) {
                // Update existing template
                const { data } = await api.put(`/barcode-templates/${activeTemplateId}`, payload);
                toast.success(`Template "${data.name}" updated successfully`);
                setTemplates(prev => prev.map(item => item.id === data.id ? data : item));
            } else {
                // Create new template
                const { data } = await api.post('/barcode-templates', payload);
                toast.success(`Template "${data.name}" created successfully`);
                setActiveTemplateId(data.id);
                setTemplates(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to save template";
            toast.error(msg);
        } finally {
            setIsSavingZpl(false);
        }
    };

    const handlePreviewZpl = async (customZpl = null, customW = null, customH = null, customDpi = null) => {
        const codeToPreview = customZpl || rawZpl;
        if (!codeToPreview || !codeToPreview.trim()) {
            toast.warning("Please enter or select Raw ZPL code first to preview");
            return;
        }

        const w = customW !== null && customW !== undefined ? customW : (parseFloat(labelWidth) || 40);
        const h = customH !== null && customH !== undefined ? customH : (parseFloat(labelHeight) || 20);
        const d = customDpi !== null && customDpi !== undefined ? customDpi : (parseInt(dpi, 10) || 203);

        setPreviewLoading(true);
        setShowPreviewModal(true);
        try {
            const { data } = await api.post('/barcode-templates/render-preview', {
                zpl: codeToPreview,
                labelWidth: w,
                labelHeight: h,
                dpi: d,
                sampleProduct: selectedProduct || { name: 'PENDANT', barcode: 'SK1252612334', price: '1500' }
            });

            if (data.success && data.image) {
                setPreviewImage(data.image);
                setPreviewDimensions(data.dimensions);
            } else {
                toast.error(data.message || "Failed to render ZPL preview");
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to render ZPL preview";
            toast.error(msg);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleOpenZplPrintModal = () => {
        if (!rawZpl || !rawZpl.trim()) {
            toast.warning("No Raw ZPL code available to print");
            return;
        }
        setZplPrintQuantity(1);
        setShowZplPrintModal(true);
    };

    const handleExecuteZplPrint = async () => {
        const rawVal = String(zplPrintQuantity).trim();
        if (!rawVal) {
            toast.error('Please enter the number of labels to print');
            return;
        }
        if (!/^\d+$/.test(rawVal)) {
            toast.error('Please enter a valid positive whole number (no decimals or symbols)');
            return;
        }
        const qty = parseInt(rawVal, 10);
        if (qty <= 0) {
            toast.error('Number of labels must be at least 1');
            return;
        }

        let zplToPrint = rawZpl;

        // Map product data placeholders to selected product or standard sample values
        const prod = selectedProduct || {
            name: 'PENDANT',
            barcode: 'SK1252612334',
            price: '1500'
        };
        const replacements = {
            productName: prod.name || prod.productName || 'PENDANT',
            name: prod.name || prod.productName || 'PENDANT',
            barcode: prod.barcode || 'SK1252612334',
            sku: prod.barcode || 'SK1252612334',
            price: prod.price !== undefined && prod.price !== null ? String(prod.price) : '1500',
            mrp: prod.price !== undefined && prod.price !== null ? String(prod.price) : '1500',
            sellingPrice: prod.price !== undefined && prod.price !== null ? String(prod.price) : '1500',
            size: prod.size || '',
            category: prod.categoryName || ''
        };
        Object.entries(replacements).forEach(([key, val]) => {
            const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
            const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
            zplToPrint = zplToPrint.replace(regexDouble, val).replace(regexSingle, val);
        });

        // Inject requested quantity into ZPL
        if (/\^PQ\d+/i.test(zplToPrint)) {
            zplToPrint = zplToPrint.replace(/\^PQ\d+[^\\^]*/i, `^PQ${qty},0,0,N`);
        } else if (/\^XZ/i.test(zplToPrint)) {
            zplToPrint = zplToPrint.replace(/\^XZ/i, `^PQ${qty},0,0,N\n^XZ`);
        } else {
            zplToPrint = `${zplToPrint}\n^PQ${qty},0,0,N\n^XZ`;
        }

        setShowZplPrintModal(false);

        try {
            // Priority 1: Print via QZ Tray (Pixel/Image for non-Zebra or ZPL for Zebra)
            try {
                if (!isQzConnected()) {
                    await connectQZ();
                }
                if (isQzConnected()) {
                    let res;
                    if (previewImage) {
                        res = await printImageViaQz(previewImage, qty);
                    } else {
                        res = await printZplViaQz(zplToPrint, qty);
                    }
                    toast.success(res.message || `Sent ${qty} label(s) to printer via QZ Tray.`);
                    return;
                }
            } catch (qzErr) {
                console.warn('QZ Tray print fallback to backend socket:', qzErr?.message || qzErr);
            }

            let localSent = false;
            try {
                if (typeof window !== 'undefined') {
                    const fetchPromise = fetch('http://127.0.0.1:9100/write', {
                        method: 'POST',
                        body: zplToPrint,
                        mode: 'no-cors'
                    });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800));
                    await Promise.race([fetchPromise, timeoutPromise]);
                    localSent = true;
                }
            } catch (errLocal) {
                // Local print agent not running
            }

            const { data } = await api.post('/barcode-templates/print-zpl', {
                zpl: zplToPrint,
                quantity: qty
            });

            if (data.success) {
                toast.success(data.message || `Sent ${qty} label(s) for "${templateName || 'Selected Design'}" to Zebra printer.`);
            } else if (localSent) {
                toast.success(`Sent ${qty} label(s) for "${templateName || 'Selected Design'}" to local Zebra printer.`);
            } else {
                toast.info(`ZPL sent for ${qty} label(s) using "${templateName || 'Selected Design'}". (${data.message || 'Printer host not configured in backend .env'})`);
            }
        } catch (err) {
            console.error('Error sending ZPL to printer:', err);
            toast.error('Failed to send ZPL to printer: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCopyZpl = (textToCopy) => {
        const code = textToCopy !== undefined ? textToCopy : rawZpl;
        if (!code) {
            toast.warning("No ZPL code to copy");
            return;
        }
        navigator.clipboard.writeText(code).then(() => {
            toast.success("ZPL code copied to clipboard!");
        }).catch(() => {
            toast.error("Failed to copy code to clipboard");
        });
    };

    const handleDeleteTemplate = async (id, name, e) => {
        if (e) e.stopPropagation();
        if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
        try {
            await api.delete(`/barcode-templates/${id}`);
            toast.success(`Template "${name}" deleted successfully`);
            if (activeTemplateId === id) {
                handleNewTemplate();
            }
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete template");
        }
    };

    const handleLoadSampleZpl = () => {
        setRawZpl(EXAMPLE_ZPL);
        if (!templateName) {
            setTemplateName('Sample Jewelry ZPL');
        }
        toast.info("Sample ZPL loaded into editor");
    };

    const handleKeyDownTextarea = (e) => {
        // Tab indentation support in code editor
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const value = rawZpl;
            const updated = value.substring(0, start) + '  ' + value.substring(end);
            setRawZpl(updated);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
            }, 0);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden border-b border-slate-100 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Barcode Creator</h1>
                    <p className="text-slate-500 text-sm">Create and manage Raw ZPL label templates and branch print designs</p>
                </div>

                {/* Tabs & Top Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setActiveTab('zpl')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'zpl'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <FiCode /> Raw ZPL Templates
                        </button>
                        <button
                            onClick={() => setActiveTab('visual')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'visual'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <FiLayout /> Visual Designer
                        </button>
                    </div>

                    {activeTab === 'visual' && (
                        <div className="flex gap-2">
                            <button
                                className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                                onClick={handleSaveSettings}
                                disabled={loading}
                            >
                                {loading ? <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" /> : <FiSave />}
                                Save Design
                            </button>
                            <button
                                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors shadow-sm"
                                onClick={handlePrint}
                                disabled={!selectedProduct}
                            >
                                <FiPrinter /> Print Barcode
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* TAB 1: RAW ZPL TEMPLATE MANAGEMENT */}
            {activeTab === 'zpl' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Saved Templates List */}
                    <div className="lg:col-span-4 xl:col-span-4 card h-fit space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-800">Saved Templates</span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                                    {templates.length}
                                </span>
                            </div>
                            <button
                                onClick={handleNewTemplate}
                                className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors shadow-sm"
                            >
                                <FiPlus size={14} /> New Template
                            </button>
                        </div>

                        {/* Search templates */}
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Search templates by name..."
                                value={templateSearch}
                                onChange={e => setTemplateSearch(e.target.value)}
                            />
                        </div>

                        {/* List */}
                        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                            {templatesLoading ? (
                                <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                    Loading templates...
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    <FiCode className="text-3xl mx-auto mb-2 opacity-30" />
                                    <p className="font-medium">No templates found</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Click "New Template" above to create one</p>
                                </div>
                            ) : (
                                filteredTemplates.map(t => {
                                    const isSelected = activeTemplateId === t.id;
                                    const lineCount = (t.rawZpl || '').split('\n').length;
                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => handleLoadTemplate(t)}
                                            className={`p-3.5 rounded-xl cursor-pointer border-2 transition-all group ${
                                                isSelected
                                                    ? 'bg-primary-light/10 border-primary shadow-sm'
                                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                                                        {t.name}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                        {t.labelWidth || 40}×{t.labelHeight || 20}mm • {t.dpi || 203} DPI • {lineCount} lines
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary-light/20 px-2 py-0.5 rounded">
                                                        <FiCheckCircle size={11} /> Active
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleLoadTemplate(t); }}
                                                        className="text-primary font-medium hover:underline text-xs"
                                                    >
                                                        Load
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLoadTemplate(t);
                                                            handlePreviewZpl(t.rawZpl, t.labelWidth || 40, t.labelHeight || 20, t.dpi || 203);
                                                        }}
                                                        className="text-emerald-600 font-medium hover:underline text-xs flex items-center gap-1"
                                                    >
                                                        <FiEye size={12} /> Preview
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        title="Copy ZPL"
                                                        onClick={(e) => { e.stopPropagation(); handleCopyZpl(t.rawZpl); }}
                                                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                                    >
                                                        <FiCopy size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Delete Template"
                                                        onClick={(e) => handleDeleteTemplate(t.id, t.name, e)}
                                                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                    >
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Raw ZPL Editor */}
                    <div className="lg:col-span-8 xl:col-span-8 card flex flex-col space-y-4">
                        {/* Editor Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-mono text-sm font-bold">
                                    ^Z
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">
                                        {activeTemplateId ? `Editing: ${templateName || 'Untitled Template'}` : 'New Barcode Label Template'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        {activeTemplateId ? `Template ID #${activeTemplateId} • Each template has its own Raw ZPL, dimensions & DPI` : 'Creates an independent Raw ZPL barcode template'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                                <button
                                    type="button"
                                    onClick={handleLoadSampleZpl}
                                    className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                                    title="Insert standard jewelry 2-up barcode sample ZPL"
                                >
                                    Load Sample ZPL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePreviewZpl()}
                                    disabled={previewLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                                    title="Render actual selected Raw ZPL label design"
                                >
                                    {previewLoading ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <FiEye size={13} />
                                    )}
                                    Preview ZPL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCopyZpl(rawZpl)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                                >
                                    <FiCopy size={13} /> Copy ZPL
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveZplTemplate}
                                    disabled={isSavingZpl}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors shadow-sm"
                                >
                                    {isSavingZpl ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <FiSave size={13} />
                                    )}
                                    {activeTemplateId ? 'Update Template' : 'Save Template'}
                                </button>
                            </div>
                        </div>

                        {/* Template Name Input */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Template Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="input w-full text-sm font-medium"
                                placeholder="e.g. Gold SKU, Silver, Diamond Temp, Uncut, Precious..."
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                            />
                        </div>

                        {/* Template-Specific Dimensions & DPI Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Label Width (mm)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="300"
                                    step="0.5"
                                    className="input w-full !py-1.5 text-xs font-semibold text-slate-800"
                                    placeholder="40"
                                    value={labelWidth}
                                    onChange={e => setLabelWidth(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Label Height (mm)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="300"
                                    step="0.5"
                                    className="input w-full !py-1.5 text-xs font-semibold text-slate-800"
                                    placeholder="20"
                                    value={labelHeight}
                                    onChange={e => setLabelHeight(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Printer DPI
                                </label>
                                <select
                                    className="input w-full !py-1.5 text-xs font-semibold text-slate-800"
                                    value={dpi}
                                    onChange={e => setDpi(parseInt(e.target.value, 10))}
                                >
                                    <option value={203}>203 DPI (8 dpmm)</option>
                                    <option value={300}>300 DPI (12 dpmm)</option>
                                    <option value={600}>600 DPI (24 dpmm)</option>
                                </select>
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                    Calculated Settings (^PW / ^LL)
                                </label>
                                <div className="flex items-center gap-2 text-[11px] font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 h-[34px]">
                                    <span className="text-emerald-700 font-bold" title="Print Width in dots">
                                        ^PW{Math.round((parseFloat(labelWidth) || 40) * ((parseInt(dpi, 10) || 203) / 25.4))}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-blue-700 font-bold" title="Label Length in dots">
                                        ^LL{Math.round((parseFloat(labelHeight) || 20) * ((parseInt(dpi, 10) || 203) / 25.4))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Raw ZPL Code Editor */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Raw ZPL Code <span className="text-red-500">*</span>
                                </label>
                                <span className="text-[11px] text-slate-400 font-mono">
                                    {(rawZpl || '').split('\n').length} lines • {(rawZpl || '').length} characters
                                </span>
                            </div>

                            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                                <textarea
                                    ref={textareaRef}
                                    value={rawZpl}
                                    onChange={e => setRawZpl(e.target.value)}
                                    onKeyDown={handleKeyDownTextarea}
                                    rows={18}
                                    spellCheck="false"
                                    autoCapitalize="off"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    placeholder="Paste or write Raw ZPL code here (e.g. ^XA ... ^XZ)&#10;Line breaks and backslashes will be strictly preserved."
                                    className="w-full bg-slate-950 text-emerald-400 font-mono text-xs sm:text-sm p-4 outline-none resize-y leading-relaxed custom-scrollbar selection:bg-emerald-800 selection:text-white"
                                    style={{
                                        minHeight: '440px',
                                        tabSize: 2,
                                        whiteSpace: 'pre',
                                        wordBreak: 'normal',
                                        overflowWrap: 'normal'
                                    }}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                <p className="text-[11px] text-slate-400">
                                    💡 Tip: You can paste, edit, and copy complete ZPL directly. Tab key will insert 2 spaces.
                                </p>
                                <div className="flex gap-2">
                                    {activeTemplateId && (
                                        <button
                                            type="button"
                                            onClick={handleNewTemplate}
                                            className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1"
                                        >
                                            Cancel & New
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSaveZplTemplate}
                                        disabled={isSavingZpl}
                                        className="btn btn-primary text-xs py-1.5 px-4"
                                    >
                                        <FiSave size={13} /> {activeTemplateId ? 'Update Template' : 'Save Template'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: VISUAL DESIGNER (Original Barcode Generator functionality preserved) */}
            {activeTab === 'visual' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Step 1: Product Selection */}
                    <div className="md:col-span-4 lg:col-span-3 card h-fit print:hidden">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-medium uppercase text-[10px] tracking-widest">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">1</span>
                            Select Product
                        </div>
                        <div className="relative mb-4">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedProduct?.id === product.id ? 'bg-primary-light/10 border-primary' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                    onClick={() => setSelectedProduct(product)}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className={`font-medium text-sm ${selectedProduct?.id === product.id ? 'text-primary' : 'text-slate-700'}`}>{product.name}</p>
                                        {selectedProduct?.id === product.id && <FiCheck className="text-primary" />}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-[10px] text-slate-400 font-mono italic">{product.barcode || 'NO BARCODE'}</p>
                                        <p className="text-xs font-medium text-slate-900">₹{Number(product.price).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                            {filteredProducts.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No products found</p>}
                        </div>
                    </div>

                    {/* Step 2: Visualization (The Designer) */}
                    <div className="md:col-span-8 lg:col-span-6 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center min-h-[500px] print:w-full print:bg-white print:border-0 print:p-0 overflow-auto scroll-line lg:no-scrollbar">
                        {selectedProduct ? (
                            <div
                                className="DesignerContent bg-white shadow-2xl transition-all duration-300 print:shadow-none print:p-0 mx-auto"
                                style={{
                                    width: settings.paperSize === 'Grid' ? `${settings.paperWidth}mm` : 'auto',
                                    minWidth: settings.paperSize === 'Grid' ? `${settings.paperWidth}mm` : 'auto',
                                    padding: settings.paperSize === 'Grid' ? '2mm' : '0',
                                    display: settings.paperSize === 'Grid' ? 'grid' : 'block',
                                    gridTemplateColumns: settings.paperSize === 'Grid' ? `repeat(${settings.columns || 1}, ${settings.labelWidth}mm)` : 'none',
                                    gap: `${settings.rowGap}mm ${settings.columnGap}mm`,
                                    justifyItems: 'center',
                                    justifyContent: 'center',
                                    alignItems: 'start',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {Array.from({ length: settings.paperSize === 'Grid' ? (settings.columns * 10) : 1 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="border border-slate-100 rounded-sm overflow-hidden print:border-0"
                                        style={{
                                            width: settings.paperSize === 'Grid' ? `${settings.labelWidth}mm` : 'fit-content',
                                            height: settings.paperSize === 'Grid' ? `${settings.labelHeight}mm` : 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: settings.alignment === 'left' ? 'flex-start' : settings.alignment === 'right' ? 'flex-end' : 'center',
                                            justifyContent: 'center',
                                            padding: settings.paperSize === 'Grid' ? '2mm' : `${settings.margin}px`,
                                            textAlign: settings.alignment,
                                            pageBreakInside: 'avoid',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {settings.showName && (
                                            <h3
                                                className="font-medium mb-1 text-slate-800 print:text-black leading-tight"
                                                style={{ fontSize: `${settings.nameFontSize}px`, lineHeight: 1.1 }}
                                            >
                                                {selectedProduct.name}
                                            </h3>
                                        )}

                                        {settings.showPrice && (
                                            <p
                                                className="text-slate-600 print:text-black mb-1 font-medium"
                                                style={{ fontSize: `${settings.priceFontSize}px` }}
                                            >
                                                ₹{Number(selectedProduct.price).toFixed(2)}
                                            </p>
                                        )}

                                        <div className="bg-transparent inline-block max-w-full overflow-hidden">
                                            <ReactBarcode
                                                value={selectedProduct.barcode || `GEN-${selectedProduct.id}`}
                                                width={settings.barcodeWidth}
                                                height={settings.barcodeHeight}
                                                fontSize={settings.barcodeFontSize}
                                                displayValue={settings.showBarcodeValue}
                                                background="transparent"
                                                margin={0}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                <FiBox className="text-6xl mx-auto mb-4 opacity-20" />
                                <p className="font-medium">Selected product will appear here</p>
                                <p className="text-xs mt-1">Select a product from the left to start</p>
                            </div>
                        )}

                        <div className="mt-8 px-4 py-2 bg-primary-light text-primary text-[10px] font-medium uppercase tracking-widest rounded-full border border-primary-light print:hidden animate-pulse">
                            Live Preview
                        </div>
                    </div>

                    {/* Step 3: Properties Panel */}
                    <div className="md:col-span-12 lg:col-span-3 card h-fit print:hidden max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-2 mb-6 text-slate-400 font-medium uppercase text-[10px] tracking-widest sticky top-0 bg-white py-2 z-10 border-b border-slate-50">
                            <FiSettings className="text-sm" />
                            Design Properties
                        </div>

                        <div className="space-y-8">
                            {/* Page Setup Section */}
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mb-3 block flex items-center gap-2">
                                    <FiLayout /> Page & Grid Setup
                                </label>
                                <div className="space-y-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-700">Mode</span>
                                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                                            <button
                                                onClick={() => setSettings({ ...settings, paperSize: 'Single' })}
                                                className={`px-2 py-1 text-[10px] font-medium rounded ${settings.paperSize === 'Single' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Single
                                            </button>
                                            <button
                                                onClick={() => setSettings({ ...settings, paperSize: 'Grid', columns: settings.columns <= 1 ? 2 : settings.columns })}
                                                className={`px-2 py-1 text-[10px] font-medium rounded ${settings.paperSize === 'Grid' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}
                                            >
                                                Multi-up
                                            </button>
                                        </div>
                                    </div>

                                    {settings.paperSize === 'Grid' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-slate-500">Cols</span>
                                                    <input
                                                        type="number" className="input text-xs py-1"
                                                        value={settings.columns}
                                                        onChange={e => setSettings({ ...settings, columns: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-slate-500">Total W (mm)</span>
                                                    <input
                                                        type="number" className="input text-xs py-1"
                                                        value={settings.paperWidth}
                                                        onChange={e => setSettings({ ...settings, paperWidth: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-slate-500">Label W (mm)</span>
                                                    <input
                                                        type="number" className="input text-xs py-1"
                                                        value={settings.labelWidth}
                                                        onChange={e => setSettings({ ...settings, labelWidth: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-slate-500">Label H (mm)</span>
                                                    <input
                                                        type="number" className="input text-xs py-1"
                                                        value={settings.labelHeight}
                                                        onChange={e => setSettings({ ...settings, labelHeight: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-slate-500">Col Gap</span>
                                                    <input
                                                        type="number" className="input text-xs py-1"
                                                        value={settings.columnGap}
                                                        onChange={e => setSettings({ ...settings, columnGap: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-slate-500">Row Gap</span>
                                                    <input
                                                        type="number" className="input text-xs py-1"
                                                        value={settings.rowGap}
                                                        onChange={e => setSettings({ ...settings, rowGap: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Typography Section */}
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mb-3 block">Typography</label>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-semibold text-slate-600">Name Size</span>
                                            <span className="text-[10px] font-mono font-medium bg-slate-100 px-1 rounded">{settings.nameFontSize}px</span>
                                        </div>
                                        <input
                                            type="range" min="10" max="40"
                                            className="w-full accent-primary h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                            value={settings.nameFontSize}
                                            onChange={e => setSettings({ ...settings, nameFontSize: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-semibold text-slate-600">Price Size</span>
                                            <span className="text-[10px] font-mono font-medium bg-slate-100 px-1 rounded">{settings.priceFontSize}px</span>
                                        </div>
                                        <input
                                            type="range" min="8" max="30"
                                            className="w-full accent-primary h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                            value={settings.priceFontSize}
                                            onChange={e => setSettings({ ...settings, priceFontSize: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Barcode Section */}
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mb-3 block">Barcode Specs</label>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-semibold text-slate-600">Height</span>
                                            <span className="text-[10px] font-mono font-medium bg-slate-100 px-1 rounded">{settings.barcodeHeight}px</span>
                                        </div>
                                        <input
                                            type="range" min="20" max="200"
                                            className="w-full accent-primary h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                            value={settings.barcodeHeight}
                                            onChange={e => setSettings({ ...settings, barcodeHeight: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-semibold text-slate-600">Line Width</span>
                                            <span className="text-[10px] font-mono font-medium bg-slate-100 px-1 rounded">{settings.barcodeWidth}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="4" step="0.5"
                                            className="w-full accent-primary h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                                            value={settings.barcodeWidth}
                                            onChange={e => setSettings({ ...settings, barcodeWidth: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Layout Section */}
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mb-3 block">Arrangement</label>
                                <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                                    <button
                                        className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${settings.alignment === 'left' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        onClick={() => setSettings({ ...settings, alignment: 'left' })}
                                    >
                                        <FiAlignLeft size={16} />
                                    </button>
                                    <button
                                        className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${settings.alignment === 'center' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        onClick={() => setSettings({ ...settings, alignment: 'center' })}
                                    >
                                        <FiAlignCenter size={16} />
                                    </button>
                                    <button
                                        className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${settings.alignment === 'right' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                        onClick={() => setSettings({ ...settings, alignment: 'right' })}
                                    >
                                        <FiAlignRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Visibility Toggles */}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-600">Show Name</span>
                                    <button
                                        onClick={() => setSettings({ ...settings, showName: !settings.showName })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${settings.showName ? 'bg-primary' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.showName ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-600">Show Price</span>
                                    <button
                                        onClick={() => setSettings({ ...settings, showPrice: !settings.showPrice })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${settings.showPrice ? 'bg-primary' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.showPrice ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-600">Code Text</span>
                                    <button
                                        onClick={() => setSettings({ ...settings, showBarcodeValue: !settings.showBarcodeValue })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${settings.showBarcodeValue ? 'bg-primary' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.showBarcodeValue ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW ZPL MODAL */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[50000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <h3 className="font-bold text-slate-800 text-base">
                                        Preview ZPL — {templateName || 'Selected Template'}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Visual representation rendered from actual Raw ZPL command data
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Specs Pills */}
                        <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-semibold text-slate-700">
                                📏 {labelWidth}mm × {labelHeight}mm
                            </span>
                            <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-semibold text-slate-700">
                                🖨️ {dpi} DPI
                            </span>
                            <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-emerald-700 font-bold">
                                ^PW{Math.round((parseFloat(labelWidth) || 40) * ((parseInt(dpi, 10) || 203) / 25.4))}
                            </span>
                            <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-blue-700 font-bold">
                                ^LL{Math.round((parseFloat(labelHeight) || 20) * ((parseInt(dpi, 10) || 203) / 25.4))}
                            </span>
                        </div>

                        {/* Image Preview Canvas */}
                        <div className="p-6 flex flex-col items-center justify-center min-h-[260px] max-h-[460px] overflow-auto bg-slate-50/50">
                            {previewLoading ? (
                                <div className="flex flex-col items-center gap-3 text-slate-500 text-xs py-10">
                                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                                    <span className="font-medium">Rendering exact ZPL label preview...</span>
                                </div>
                            ) : previewImage ? (
                                <div className="p-4 bg-white rounded-xl border-2 border-dashed border-slate-300 shadow-md max-w-full flex items-center justify-center">
                                    <img
                                        src={previewImage}
                                        alt="ZPL Label Preview"
                                        className="max-h-[340px] max-w-full object-contain rounded"
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    <FiCode className="text-3xl mx-auto mb-2 opacity-30" />
                                    <p className="font-medium">No preview available</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Click "Refresh Preview" to render</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => handlePreviewZpl()}
                                disabled={previewLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                            >
                                <FiRefreshCw className={previewLoading ? 'animate-spin' : ''} size={13} />
                                Refresh Preview
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenZplPrintModal}
                                    disabled={previewLoading || !rawZpl}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors shadow-sm active:scale-95"
                                    title="Print this ZPL template design"
                                >
                                    <FiPrinter size={13} />
                                    Print
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPreviewModal(false)}
                                    className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quantity Modal for Preview ZPL Print */}
            {showZplPrintModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/80">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-800">Print Labels</h3>
                                <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
                                    {labelWidth}×{labelHeight}mm
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                                {templateName || 'Selected ZPL Design'}
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Number of Labels to Print
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    autoFocus
                                    required
                                    className="input w-full text-center text-lg font-bold text-slate-800"
                                    value={zplPrintQuantity}
                                    onChange={e => setZplPrintQuantity(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleExecuteZplPrint();
                                        }
                                    }}
                                />
                                <p className="text-[11px] text-slate-400 mt-1 text-center">
                                    Controls the exact number of physical labels to print
                                </p>
                            </div>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowZplPrintModal(false)}
                                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteZplPrint}
                                    className="flex-1 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-dark shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <FiPrinter size={14} /> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .DesignerContent, .DesignerContent * {
                        visibility: visible;
                    }
                    .DesignerContent {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: ${settings.paperSize === 'Grid' ? '100%' : 'auto'} !important;
                    }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #0f172a;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
