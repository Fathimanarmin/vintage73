import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import { FiPlus, FiTrash2, FiPrinter, FiTruck, FiPackage, FiSearch, FiEye } from 'react-icons/fi';
import DeliveryChallanPrint from '@/components/DeliveryChallanPrint';
import SearchableSelect from '@/components/SearchableSelect';

export default function DeliveryChallan() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [states, setStates] = useState([]);
  const [challans, setChallans] = useState([]);
  const [user, setUser] = useState(null);

  // Form State
  const [mode, setMode] = useState('list'); // 'list' or 'create'
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [reasonForMovement, setReasonForMovement] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [dispatchFrom, setDispatchFrom] = useState('');
  const [dispatchTo, setDispatchTo] = useState('');
  const [items, setItems] = useState([]);

  // Transport
  const [transportMode, setTransportMode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transporterId, setTransporterId] = useState('');

  // Print
  const [printData, setPrintData] = useState(null);
  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const partyOptions = [
    { value: '', label: 'Walk-in / Internal' },
    ...(customers || []).map(c => ({ value: c?.id || '', label: c?.name || '' }))
  ];

  const reasonOptions = [
    { value: '', label: 'Select Reason' },
    { value: 'Job Work', label: 'Job Work' },
    { value: 'Stock Transfer', label: 'Stock Transfer' },
    { value: 'Exhibition', label: 'Exhibition' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Supply on Approval', label: 'Supply on Approval' },
    { value: 'Others', label: 'Others' }
  ];

  const modeOptions = [
    { value: '', label: 'Select' },
    { value: 'Road', label: 'Road' },
    { value: 'Rail', label: 'Rail' },
    { value: 'Air', label: 'Air' },
    { value: 'Ship', label: 'Ship' }
  ];

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    const fetchData = async () => {
      try {
        const [custRes, prodRes, statesRes, challansRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products'),
          api.get('/states'),
          api.get('/delivery-challans')
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);
        setStates(statesRes.data);
        setChallans(challansRes.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // When customer changes
  useEffect(() => {
    if (customerId) {
      const cust = customers.find(c => c.id === parseInt(customerId));
      setSelectedCustomer(cust);
      if (cust?.state) setPlaceOfSupply(cust.state);
      if (cust?.address) setDispatchTo(cust.address);
    } else {
      setSelectedCustomer(null);
    }
  }, [customerId, customers]);

  // Add Item
  const addItem = (product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        productId: product.id,
        product,
        quantity: 1,
        hsnCode: product.hsnCode || '',
        description: ''
      }]);
    }
  };

  // Update Item
  const updateItem = (productId, field, value) => {
    setItems(items.map(i => {
      if (i.productId === productId) {
        return { ...i, [field]: field === 'quantity' ? (parseInt(value) || 1) : value };
      }
      return i;
    }));
  };

  // Remove Item
  const removeItem = (productId) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  // Save Challan
  const handleSave = async () => {
    if (!reasonForMovement) {
      toast.error('Please select reason for movement');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: customerId ? parseInt(customerId) : null,
        challanDate,
        reasonForMovement,
        placeOfSupply,
        dispatchFrom,
        dispatchTo,
        transportMode,
        vehicleNumber,
        transporterName,
        transporterId,
        branchId: user?.branchId || 1,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          hsnCode: i.hsnCode,
          description: i.description
        }))
      };

      const { data } = await api.post('/delivery-challans', payload);

      // Fetch print data
      const printRes = await api.get(`/delivery-challans/${data.id}/print`);
      setPrintData(printRes.data);

      toast.success('Delivery Challan created!');
      setTimeout(() => handlePrint(), 100);

      // Reset and go to list
      setItems([]);
      setCustomerId('');
      setReasonForMovement('');
      setMode('list');

      // Refresh list
      const res = await api.get('/delivery-challans');
      setChallans(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create challan');
    } finally {
      setSaving(false);
    }
  };

  // View/Print Challan
  const handleView = async (id) => {
    try {
      const { data } = await api.get(`/delivery-challans/${id}/print`);
      setPrintData(data);
      setTimeout(() => handlePrint(), 100);
    } catch (err) {
      toast.error('Failed to load challan');
    }
  };

  // Update Status
  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/delivery-challans/${id}/status`, { status });
      setChallans(challans.map(c => c.id === id ? { ...c, status } : c));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <FiTruck className="text-orange-600" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Delivery Challan</h1>
            <p className="text-sm text-slate-500">Create challan for goods movement</p>
          </div>
        </div>
        {mode === 'list' ? (
          <button
            onClick={() => setMode('create')}
            className="btn bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <FiPlus /> New Challan
          </button>
        ) : (
          <button
            onClick={() => setMode('list')}
            className="btn border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-medium w-full md:w-auto text-center"
          >
            Back to List
          </button>
        )}
      </div>

      {mode === 'list' ? (
        /* Challan List */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto">
            <table className="w-full text-sm min-w-[850px]">
              <thead className="bg-slate-50 text-slate-600 whitespace-nowrap">
                <tr>
                  <th className="text-left p-4">Challan No</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Party</th>
                  <th className="text-left p-4">Reason</th>
                  <th className="text-left p-4">Items</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-center p-4">Actions</th>
                </tr>
              </thead>
            <tbody>
              {challans.map(challan => (
                <tr key={challan.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4 font-medium">{challan.challanNumber}</td>
                  <td className="p-4">{new Date(challan.challanDate).toLocaleDateString('en-GB')}</td>
                  <td className="p-4">{challan.customer?.name || '-'}</td>
                  <td className="p-4">{challan.reasonForMovement}</td>
                  <td className="p-4">{challan.items?.length || 0} items</td>
                  <td className="p-4 text-center">
                    <select
                      value={challan.status}
                      onChange={(e) => handleStatusUpdate(challan.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded ${challan.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          challan.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleView(challan.id)} className="text-blue-600 hover:text-blue-800">
                      <FiPrinter size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {challans.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">No challans found</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        /* Create Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Header Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Party (Optional)</label>
                  <SearchableSelect
                    options={partyOptions}
                    value={customerId}
                    onChange={(val) => setCustomerId(val)}
                    placeholder="Walk-in / Internal"
                    direction="down"
                    triggerClassName="min-h-0 h-[38px] py-1.5 px-3 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Challan Date</label>
                  <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Reason for Movement *</label>
                  <SearchableSelect
                    options={reasonOptions}
                    value={reasonForMovement}
                    onChange={(val) => setReasonForMovement(val)}
                    placeholder="Select Reason"
                    direction="down"
                    triggerClassName="min-h-0 h-[38px] py-1.5 px-3 text-sm w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Dispatch From</label>
                  <textarea value={dispatchFrom} onChange={(e) => setDispatchFrom(e.target.value)} className="input min-h-[80px]" placeholder="Address" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Dispatch To</label>
                  <textarea value={dispatchTo} onChange={(e) => setDispatchTo(e.target.value)} className="input min-h-[80px]" placeholder="Address" />
                </div>
              </div>
            </div>

            {/* Transport */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FiTruck className="text-slate-500" /> Transport Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mode</label>
                  <SearchableSelect
                    options={modeOptions}
                    value={transportMode}
                    onChange={(val) => setTransportMode(val)}
                    placeholder="Select"
                    direction="down"
                    triggerClassName="min-h-0 h-[38px] py-1.5 px-3 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle No.</label>
                  <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Transporter</label>
                  <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Transporter GSTIN</label>
                  <input type="text" value={transporterId} onChange={(e) => setTransporterId(e.target.value)} className="input text-sm" />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <FiPackage className="text-slate-500" /> Items
                </h3>
              </div>
              <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 whitespace-nowrap">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">HSN</th>
                      <th className="text-center p-3 w-24">Qty</th>
                      <th className="text-left p-3">Description</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.productId} className="border-b border-slate-50">
                      <td className="p-3 font-medium">{item.product.name}</td>
                      <td className="p-3 text-slate-500">{item.hsnCode || '-'}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.productId, 'quantity', e.target.value)}
                          className="w-20 text-center border border-slate-200 rounded p-1"
                          min="1"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.productId, 'description', e.target.value)}
                          className="w-full border border-slate-200 rounded p-1 text-sm"
                          placeholder="Optional description"
                        />
                      </td>
                      <td className="p-3">
                        <button onClick={() => removeItem(item.productId)} className="text-red-500">
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
              {items.length === 0 && (
                <div className="p-8 text-center text-slate-400">Add products from the right panel</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || items.length === 0}
                className="btn bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <FiPrinter size={18} />
                {saving ? 'Saving...' : 'Save & Print'}
              </button>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-slate-200 h-fit sticky top-4">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-2">
              {products.map(product => (
                <div
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="p-3 hover:bg-orange-50 rounded-lg cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-slate-700">{product.name}</div>
                    <div className="text-xs text-slate-400">HSN: {product.hsnCode || 'N/A'}</div>
                  </div>
                  <button className="text-orange-500">
                    <FiPlus />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print */}
      <div className="hidden">
        <div ref={printRef}>
          {printData && <DeliveryChallanPrint data={printData} />}
        </div>
      </div>
    </div>
  );
}
