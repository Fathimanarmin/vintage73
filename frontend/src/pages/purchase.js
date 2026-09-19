import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiPlus, FiTrash, FiSave, FiTruck, FiEye, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmationModal from '@/components/ConfirmationModal';
import SearchableSelect from '@/components/SearchableSelect';

export default function Purchase() {
  const [activeTab, setActiveTab] = useState('entry'); // 'entry' | 'history'
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const initialRow = {
    productId: '',
    brand: '',
    brandId: null,
    availableBrands: [],
    sizes: [],
    totalQuantity: 0,
    quantity: 0,
    unitCost: 0,
    taxPercent: 0,
    total: 0
  };

  const [rows, setRows] = useState([{ ...initialRow }]);
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Details Modal
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Filter State
  const [histStartDate, setHistStartDate] = useState('');
  const [histEndDate, setHistEndDate] = useState('');
  const [histSearch, setHistSearch] = useState('');

  // Branch Logic
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [user, setUser] = useState(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  useEffect(() => {
    // Init User
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setSelectedBranch(u.branchId?.toString() || '');
      if (u.role === 'admin') {
        api.get('/branches').then(res => setBranches(res.data)).catch(console.error);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const branchId = storedUser ? JSON.parse(storedUser).branchId : null;

      const [prodRes, supRes, brandRes] = await Promise.all([
        api.get('/products', { params: { branchId } }),
        api.get('/suppliers'),
        api.get('/brands')
      ]);
      setProducts(prodRes.data);
      setSuppliers(supRes.data);
      setBrands(brandRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const getAvailableBrandsForProduct = (product, brandsList) => {
    if (!product) return [];

    let parsedBrandPrices = product.brandPrices;
    if (typeof parsedBrandPrices === 'string') {
      try { parsedBrandPrices = JSON.parse(parsedBrandPrices); } catch (e) { parsedBrandPrices = {}; }
    }

    const bMap = new Map();

    if (parsedBrandPrices && typeof parsedBrandPrices === 'object') {
      Object.keys(parsedBrandPrices).forEach(bIdStr => {
        const entry = parsedBrandPrices[bIdStr];
        if (entry && !entry.isDeleted) {
          const bId = parseInt(bIdStr, 10);
          if (!isNaN(bId)) {
            const matchedBrand = brandsList.find(b => b.id === bId);
            bMap.set(bId, {
              id: bId,
              name: matchedBrand ? matchedBrand.name : (entry.name || product.brandName || `Brand #${bId}`)
            });
          }
        }
      });
    }

    if (bMap.size === 0 && (product.brandId || product.brand?.id)) {
      const primaryId = product.brandId || product.brand?.id;
      const primaryName = product.brandName || product.brand?.name;
      bMap.set(primaryId, { id: primaryId, name: primaryName || `Brand #${primaryId}` });
    }

    return Array.from(bMap.values());
  };

  const getSizesForBrand = (product, brandId) => {
    if (!product) return [];

    let parsedBrandPrices = product.brandPrices;
    if (typeof parsedBrandPrices === 'string') {
      try { parsedBrandPrices = JSON.parse(parsedBrandPrices); } catch (e) { parsedBrandPrices = null; }
    }

    const bKey = brandId ? String(brandId) : null;
    if (parsedBrandPrices && bKey && parsedBrandPrices[bKey]) {
      const bEntry = parsedBrandPrices[bKey];
      let bSizeStocks = bEntry.sizeStocks;
      if (typeof bSizeStocks === 'string') {
        try { bSizeStocks = JSON.parse(bSizeStocks); } catch (e) { bSizeStocks = []; }
      }

      if (Array.isArray(bSizeStocks) && bSizeStocks.length > 0) {
        return bSizeStocks
          .filter(s => !s.isDeleted)
          .map(s => ({
            size: s.size,
            currentStock: parseInt(s.stock, 10) || 0,
            quantity: 0
          }));
      }

      if (Array.isArray(bEntry.sizes) && bEntry.sizes.length > 0) {
        return bEntry.sizes.map(sz => ({
          size: sz,
          currentStock: 0,
          quantity: 0
        }));
      }
    }

    let configuredSizes = [];
    if (product.productType?.sizes) {
      let ptSizes = product.productType.sizes;
      if (typeof ptSizes === 'string') { try { ptSizes = JSON.parse(ptSizes); } catch (e) {} }
      if (Array.isArray(ptSizes)) configuredSizes = ptSizes;
    }

    if (configuredSizes.length === 0 && product.size) {
      configuredSizes = product.size.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (configuredSizes.length > 0) {
      return configuredSizes.map(sz => ({
        size: sz,
        currentStock: 0,
        quantity: 0
      }));
    }

    return [{
      size: 'Free Size',
      currentStock: 0,
      quantity: 0
    }];
  };

  const fetchHistory = async () => {
    try {
      // Use selectedBranch if available (for admins filtering), else user branch (default)
      // For history, we want to see ALL if admin selects 'all'
      const queryBranchId = selectedBranch === 'all' ? undefined : selectedBranch;
      const res = await api.get('/purchases', { params: { branchId: queryBranchId } });
      setPurchases(res.data);
    } catch (err) {
      toast.error("Failed to load history");
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedBranch) {
      fetchHistory();
    }
  }, [activeTab, selectedBranch]);

  const filteredPurchases = purchases.filter(p => {
    const matchSearch = (p.supplier?.name || "").toLowerCase().includes(histSearch.toLowerCase()) ||
      p.id.toString().includes(histSearch);

    const pDate = new Date(p.purchaseDate);
    const matchStart = histStartDate ? pDate >= new Date(histStartDate) : true;
    const matchEnd = histEndDate ? pDate <= new Date(new Date(histEndDate).setHours(23, 59, 59)) : true;

    return matchSearch && matchStart && matchEnd;
  });

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    // Auto-fetch Tax %, Unit Cost, Brand, and Sizes when Product is selected
    if (field === 'productId') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newRows[index].taxPercent = parseFloat(product.taxRate || product.taxPercent || 0);
        if (product.costPrice) {
          newRows[index].unitCost = parseFloat(product.costPrice);
        }

        const availableBrands = getAvailableBrandsForProduct(product, brands);
        const selectedBrandObj = availableBrands[0] || null;
        const selectedBrandId = selectedBrandObj ? selectedBrandObj.id : null;
        const selectedBrandName = selectedBrandObj ? selectedBrandObj.name : '';

        newRows[index].availableBrands = availableBrands;
        newRows[index].brandId = selectedBrandId;
        newRows[index].brand = selectedBrandName;

        const sizes = getSizesForBrand(product, selectedBrandId);
        newRows[index].sizes = sizes;
        newRows[index].totalQuantity = 0;
        newRows[index].quantity = 0;
        newRows[index].total = 0;
      } else {
        newRows[index].availableBrands = [];
        newRows[index].brand = '';
        newRows[index].brandId = null;
        newRows[index].sizes = [];
        newRows[index].totalQuantity = 0;
        newRows[index].quantity = 0;
        newRows[index].total = 0;
      }
    } else if (field === 'brandId') {
      const product = products.find(p => p.id === parseInt(newRows[index].productId));
      if (product) {
        const selectedBrandId = value ? parseInt(value, 10) : null;
        const brandObj = (newRows[index].availableBrands || []).find(b => b.id === selectedBrandId) ||
                         brands.find(b => b.id === selectedBrandId);
        
        newRows[index].brandId = selectedBrandId;
        newRows[index].brand = brandObj ? brandObj.name : '';

        const sizes = getSizesForBrand(product, selectedBrandId);
        newRows[index].sizes = sizes;
        newRows[index].totalQuantity = 0;
        newRows[index].quantity = 0;
        newRows[index].total = 0;
      }
    }

    // Auto calculate total (Cost * Qty) + Tax
    const qty = parseFloat(newRows[index].totalQuantity || newRows[index].quantity || 0);
    const cost = parseFloat(newRows[index].unitCost || 0);
    const taxRate = parseFloat(newRows[index].taxPercent || 0);

    const subTotal = qty * cost;
    const taxAmt = subTotal * (taxRate / 100);
    newRows[index].total = subTotal + taxAmt;

    setRows(newRows);
  };

  const handleSizeQtyChange = (rowIndex, sizeIndex, val) => {
    const newRows = [...rows];
    const row = newRows[rowIndex];
    const parsedQty = Math.max(0, parseInt(val, 10) || 0);

    if (row.sizes && row.sizes[sizeIndex]) {
      row.sizes[sizeIndex].quantity = parsedQty;

      const totalQty = row.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);
      row.totalQuantity = totalQty;
      row.quantity = totalQty;

      const cost = parseFloat(row.unitCost || 0);
      const taxRate = parseFloat(row.taxPercent || 0);
      const subTotal = totalQty * cost;
      const taxAmt = subTotal * (taxRate / 100);
      row.total = subTotal + taxAmt;

      setRows(newRows);
    }
  };

  const addRow = () => {
    setRows([...rows, { ...initialRow }]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!supplier) {
        toast.error('Please select a supplier');
        return;
      }

      const user = JSON.parse(localStorage.getItem('user'));
      // Use user's branch if available, otherwise use selected branch (for super admins)
      const branchIdToUse = user.branchId || selectedBranch;

      if (!branchIdToUse || branchIdToUse === 'all') {
        toast.error('Please select a valid branch');
        return;
      }

      const itemsToSubmit = [];

      for (const r of rows) {
        if (!r.productId) continue;

        const activeSizes = (r.sizes || []).filter(s => s.quantity > 0);

        if (activeSizes.length > 0) {
          for (const s of activeSizes) {
            itemsToSubmit.push({
              productId: parseInt(r.productId),
              brandId: r.brandId ? parseInt(r.brandId) : null,
              brandName: r.brand || null,
              size: s.size || null,
              quantity: parseInt(s.quantity),
              unitCost: parseFloat(r.unitCost || 0),
              taxPercent: parseFloat(r.taxPercent || 0)
            });
          }
        } else if ((r.totalQuantity || r.quantity) > 0) {
          itemsToSubmit.push({
            productId: parseInt(r.productId),
            brandId: r.brandId ? parseInt(r.brandId) : null,
            brandName: r.brand || null,
            size: r.size || null,
            quantity: parseInt(r.totalQuantity || r.quantity),
            unitCost: parseFloat(r.unitCost || 0),
            taxPercent: parseFloat(r.taxPercent || 0)
          });
        }
      }

      if (itemsToSubmit.length === 0) {
        toast.error('Please enter purchase quantity for at least one size');
        return;
      }

      const selectedSupplier = suppliers.find(s => s.id === parseInt(supplier));

      const payload = {
        supplierId: parseInt(supplier),
        supplierName: selectedSupplier?.name || 'Unknown',
        purchaseDate: purchaseDate,
        paymentMethod: paymentMethod,
        branchId: parseInt(branchIdToUse),
        items: itemsToSubmit
      };
      await api.post('/purchases', payload);
      toast.success('Purchase Saved & Stock Updated!');
      setRows([{ ...initialRow }]);
      setSupplier('');
      setPaymentMethod('Cash');
      fetchData(); // Refresh product stocks immediately
      fetchHistory(); // Refresh history
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save purchase');
    }
  };

  const handleDelete = (id) => {
    setPurchaseToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!purchaseToDelete) return;
    try {
      await api.delete(`/purchases/${purchaseToDelete}`);
      toast.success('Purchase cancelled successfully');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel purchase');
    }
    setDeleteModalOpen(false);
    setPurchaseToDelete(null);
  };

  const grandTotal = rows.reduce((acc, row) => acc + (row.total || 0), 0);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Purchase Management</h1>
          <p className="text-slate-500 text-sm mt-1">Stock Inward & History</p>
        </div>

        {activeTab === 'entry' && (
          <div className="flex items-center gap-3 bg-primary-light px-4 py-2 rounded-xl border border-primary/20 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <p className="text-xs text-primary font-medium uppercase tracking-wider">Estimate Total</p>
              <p className="text-2xl font-bold text-primary-dark">₹ {grandTotal.toFixed(2)}</p>
            </div>
            <FiTruck className="text-2xl text-primary" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('entry')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'entry' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FiPlus /> New Entry
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FiTruck /> Purchase History
        </button>
      </div>

      {activeTab === 'entry' ? (
        <div className="card shadow-lg border-0 bg-white p-6 rounded-xl">
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Supplier</label>
              <SearchableSelect
                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                value={supplier}
                onChange={val => setSupplier(val)}
                placeholder="-- Choose Supplier --"
                direction="down"
              />
              <div className="text-xs text-slate-400 mt-1">
                Supplier not in list? <a href="/suppliers" className="text-primary hover:underline">Add new supplier</a>
              </div>
            </div>

            {/* Branch Selection for Admins (Only if no branch assigned) */}
            {user?.role === 'admin' && !user?.branchId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Branch</label>
                <SearchableSelect
                  options={branches.map(b => ({ value: b.id, label: b.name }))}
                  value={selectedBranch}
                  onChange={val => setSelectedBranch(val)}
                  placeholder="-- Choose Branch --"
                  direction="down"
                />
                <div className="text-xs text-slate-400 mt-1">Req. for Inventory</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date (Backdate)</label>
              <input
                type="date"
                className="input w-full p-2 border rounded-lg"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Defaults to today</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
              <SearchableSelect
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI / GPay' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Credit', label: 'Credit (Unpaid)' }
                ]}
                value={paymentMethod}
                onChange={val => setPaymentMethod(val)}
                placeholder="Select Method"
                direction="down"
              />
              <p className="text-xs text-slate-400 mt-1">Affects Supplier Payments</p>
            </div>
          </div>

          <div className="table-container scroll-line lg:no-scrollbar mb-6 overflow-x-auto min-h-[400px] pb-32">
            <table className="table-modern w-full min-w-[960px]">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="p-3 w-1/4 min-w-[220px]">Product</th>
                  <th className="p-3 w-32 min-w-[120px]">Brand</th>
                  <th className="p-3 min-w-[260px]">Size & Purchase Qty</th>
                  <th className="p-3 w-20 text-center">Total Qty</th>
                  <th className="p-3 w-28">Cost (₹)</th>
                  <th className="p-3 w-20">Tax %</th>
                  <th className="p-3 w-28">Total (₹)</th>
                  <th className="p-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100 last:border-0 relative focus-within:z-50">
                    <td className="p-2 relative align-top">
                      <SearchableSelect
                        options={products.map(p => ({
                          value: p.id,
                          label: `${p.name} ${p.barcode ? `[${p.barcode}]` : ''} (Stock: ${p.stock})`
                        }))}
                        value={row.productId}
                        onChange={val => handleRowChange(index, 'productId', val)}
                        placeholder="Select Product..."
                        direction="down"
                        className="min-w-[220px]"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <select
                        className="input w-full p-2 border rounded text-xs bg-white font-medium"
                        value={row.brandId || ''}
                        onChange={e => handleRowChange(index, 'brandId', e.target.value)}
                        disabled={!row.productId}
                      >
                        {!row.productId ? (
                          <option value="">-</option>
                        ) : row.availableBrands && row.availableBrands.length > 0 ? (
                          row.availableBrands.map(b => (
                            <option key={b.id || b.name} value={b.id || ''}>
                              {b.name}
                            </option>
                          ))
                        ) : (
                          <option value="">No Brand</option>
                        )}
                      </select>
                    </td>
                    <td className="p-2 align-top">
                      {!row.productId ? (
                        <span className="text-xs text-slate-400 italic">Select product first</span>
                      ) : (
                        <div className="bg-slate-50/90 rounded-lg p-2.5 border border-slate-200">
                          <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-600 pb-1 mb-1.5 border-b border-slate-200 uppercase tracking-wider">
                            <span>Size (Stock)</span>
                            <span className="text-right pr-1">Purchase Qty</span>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {(row.sizes || []).map((sItem, sIdx) => (
                              <div key={sIdx} className="grid grid-cols-2 gap-3 items-center text-xs">
                                <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-center truncate">
                                  {sItem.size} <span className="text-[10px] text-slate-400 font-normal">({sItem.currentStock || 0})</span>
                                </span>
                                <div className="text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    className="input w-24 p-1 text-right text-xs font-bold border rounded bg-white"
                                    placeholder="0"
                                    value={sItem.quantity === 0 ? '' : sItem.quantity}
                                    onChange={e => handleSizeQtyChange(index, sIdx, e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-center align-top pt-4">
                      <span className="font-bold text-slate-800 text-sm">{row.totalQuantity || row.quantity || 0}</span>
                    </td>
                    <td className="p-2 align-top pt-3">
                      <input type="number" min="0" step="any" className="input w-full p-2 border rounded" value={row.unitCost} onChange={e => handleRowChange(index, 'unitCost', e.target.value)} />
                    </td>
                    <td className="p-2 align-top pt-3">
                      <input type="number" min="0" step="any" className="input w-full p-2 border rounded bg-slate-50" value={row.taxPercent || 0} onChange={e => handleRowChange(index, 'taxPercent', e.target.value)} placeholder="0" />
                    </td>
                    <td className="p-3 font-semibold text-slate-700 align-top pt-4">
                      {row.total?.toFixed(2)}
                    </td>
                    <td className="p-2 text-center align-top pt-3">
                      <button onClick={() => removeRow(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <FiTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 flex flex-wrap justify-end items-center gap-4 md:gap-8 px-4 py-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-sm font-medium text-slate-600">Total Qty: <span className="text-slate-900 ml-1 font-bold">{rows.reduce((s, r) => s + (r.totalQuantity || r.quantity || 0), 0)}</span></div>
              <div className="text-sm font-medium text-slate-600">SubTotal: <span className="text-slate-900 ml-1">₹ {rows.reduce((s, r) => s + ((r.totalQuantity || r.quantity || 0) * r.unitCost), 0).toFixed(2)}</span></div>
              <div className="text-sm font-medium text-slate-600">Tax: <span className="text-slate-900 ml-1">₹ {rows.reduce((s, r) => s + (((r.totalQuantity || r.quantity || 0) * r.unitCost) * ((r.taxPercent || 0) / 100)), 0).toFixed(2)}</span></div>
              <div className="text-primary-dark font-bold text-xl bg-white px-4 py-2 rounded-lg shadow-sm border border-primary/10">Total: ₹ {grandTotal.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button onClick={addRow} className="btn px-4 py-2 border border-primary-light text-primary rounded-lg hover:bg-primary-light flex items-center gap-2"><FiPlus /> Add Row</button>
            <button onClick={handleSubmit} className="btn ml-auto px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow flex items-center gap-2"><FiSave /> Save Purchase</button>
          </div>
        </div>
      ) : (
        <div>
          {/* Filters */}
          <div className="card mb-4 border-0 shadow-sm bg-white p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-end">
            {user?.role === 'admin' && (
              <div className="w-full md:min-w-[150px] md:w-auto">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Branch</label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'All Branches' },
                    ...branches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  value={selectedBranch}
                  onChange={val => setSelectedBranch(val)}
                  placeholder="Select Branch"
                  direction="down"
                />
              </div>
            )}
            <div className="w-full md:flex-1 md:min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search Supplier / Inv #</label>
              <input
                type="text"
                placeholder="Search..."
                className="input w-full py-2 border rounded-lg px-3"
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                className="input w-full py-2 border rounded-lg px-3"
                value={histStartDate}
                onChange={e => setHistStartDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                className="input w-full py-2 border rounded-lg px-3"
                value={histEndDate}
                onChange={e => setHistEndDate(e.target.value)}
              />
            </div>
            <button
              className="w-full md:w-auto text-sm font-medium text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              onClick={() => { setHistSearch(''); setHistStartDate(''); setHistEndDate(''); }}
            >
              <FiRefreshCw size={14} /> Clear
            </button>
          </div>

          <div className="table-container scroll-line lg:no-scrollbar">
            <table className="table-modern w-full min-w-[900px] text-sm text-left">
              <thead>
                <tr className="whitespace-nowrap">
                  <th className="p-4">Date</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Inv No (Ref)</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Method</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No purchase records match your search</td></tr>
                ) : (
                  filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-medium">{new Date(p.purchaseDate).toLocaleDateString('en-GB')}</td>
                      <td className="p-4">{p.supplier?.name || "Unknown"}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">#{p.id}</td>
                      <td className="p-4 text-right font-medium text-slate-700">₹{parseFloat(p.totalAmount).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className="text-[10px] font-medium text-slate-400 border border-slate-200 px-2 py-0.5 rounded uppercase">{p.paymentMethod || 'Cash'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${p.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-primary-light text-primary-dark'}`}>{p.status}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1 sm:gap-2">
                          <button
                            onClick={() => setSelectedPurchase(p)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary-light rounded-lg transition-all"
                            title="View Details"
                          >
                            <FiEye size={18} />
                          </button>
                          {p.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Cancel Purchase"
                            >
                              <FiTrash size={18} />
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
        </div>
      )}

      {/* Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPurchase(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Purchase Details #{selectedPurchase.id}</h3>
                <p className="text-sm text-slate-500">{new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-GB')} • {selectedPurchase.supplier?.name}</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-0 max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100/50 text-slate-600 font-medium">
                  <tr>
                    <th className="p-3 text-left pl-6">Product</th>
                    <th className="p-3 text-left">Brand</th>
                    <th className="p-3 text-center">Size</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right pr-6">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items?.map(item => (
                    <tr key={item.id}>
                      <td className="p-3 pl-6 font-medium text-slate-800">{item.product?.name || "Deleted Product"}</td>
                      <td className="p-3 text-xs text-slate-600">
                        {item.product?.brand?.name || item.product?.brandName ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px] font-semibold border border-amber-200">
                            {item.product?.brand?.name || item.product?.brandName}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-center text-xs font-semibold text-emerald-700">
                        {item.size || item.product?.size || 'Free Size'}
                      </td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right">₹{parseFloat(item.unitCost).toFixed(2)}</td>
                      <td className="p-3 text-right pr-6 font-medium">₹{(item.quantity * item.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total Items: {selectedPurchase.items?.reduce((s, i) => s + i.quantity, 0)}</span>
              <div className="text-xl font-semibold text-slate-800">
                <span className="text-xs text-slate-400 uppercase mr-3">Paid via {selectedPurchase.paymentMethod || 'Cash'}</span>
                Total: <span className="text-primary">₹{parseFloat(selectedPurchase.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Cancel Purchase?"
        message="Are you sure you want to cancel this purchase? This will revert the stock inventory. This action cannot be undone."
      />
    </div>
  );
}
