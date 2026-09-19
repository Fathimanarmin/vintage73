import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiDownload, FiCheckCircle, FiPackage, FiInfo, FiClock, FiPrinter, FiRefreshCw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import SearchableSelect from '@/components/SearchableSelect';

export default function StockReceipt() {
  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'received'
  const [branches, setBranches] = useState([]);
  const [selectedForPrint, setSelectedForPrint] = useState(null);
  const [company, setCompany] = useState(null);

  const stockPrintRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: stockPrintRef });

  // Filters
  const [filterBranchId, setFilterBranchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchIncoming();
    fetchBranches();
    fetchCompany();
  }, [activeTab]);

  const fetchCompany = async () => {
    try {
      const { data } = await api.get('/company');
      setCompany(data);
    } catch (err) { }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      const user = JSON.parse(localStorage.getItem('user'));
      setBranches(data.filter(b => b.id !== user.branchId));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIncoming = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      const { data } = await api.get('/transfers', {
        params: { branchId: user.branchId, type: 'incoming' }
      });

      if (activeTab === 'pending') {
        setIncomingTransfers(data.filter(t => t.status === 'PENDING'));
      } else {
        setIncomingTransfers(data.filter(t => t.status === 'RECEIVED'));
      }
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (id) => {
    if (!confirm('Mark as received? This will add stock to your branch inventory.')) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await api.put(`/transfers/${id}/receive`, { receivedById: user.id });
      toast.success('Stock updated in your branch!');
      fetchIncoming();
    } catch (err) {
      toast.error('Receipt failed');
    }
  };

  const filteredTransfers = incomingTransfers.filter(t => {
    const matchBranch = filterBranchId === '' || t.fromBranchId === parseInt(filterBranchId);
    const date = new Date(t.createdAt).setHours(0, 0, 0, 0);
    const matchStart = startDate ? date >= new Date(startDate).setHours(0, 0, 0, 0) : true;
    const matchEnd = endDate ? date <= new Date(endDate).setHours(23, 59, 59, 999) : true;
    return matchBranch && matchStart && matchEnd;
  });

  const triggerPrint = (transfer) => {
    setSelectedForPrint(transfer);
    setTimeout(() => handlePrint(), 100);
  };

  return (
    <div className="w-full p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Stock Receipt</h1>
          <p className="text-slate-500 text-sm">Verify and accept incoming stock</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 text-sm font-medium">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-2 px-1 border-b-2 transition-colors ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Pending Receipt
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`pb-2 px-1 border-b-2 transition-colors ${activeTab === 'received' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Received History
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4 flex flex-wrap md:flex-nowrap gap-4 items-end">
        <div className="w-full md:flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-400 uppercase mb-2">From Branch</label>
          <SearchableSelect
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map(b => ({ value: b.id, label: b.name }))
            ]}
            value={filterBranchId}
            onChange={val => setFilterBranchId(val)}
            placeholder="Select Branch"
            direction="down"
          />
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-1 gap-4 w-full md:w-auto">
          <div className="col-span-1 md:flex-1">
            <label className="block text-xs font-medium text-slate-400 uppercase mb-2">From Date</label>
            <input type="date" className="input w-full" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="col-span-1 md:flex-1">
            <label className="block text-xs font-medium text-slate-400 uppercase mb-2">To Date</label>
            <input type="date" className="input w-full" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <button
          onClick={() => { setFilterBranchId(''); setStartDate(''); setEndDate(''); }}
          className="text-slate-400 hover:text-red-500 font-medium text-xs flex items-center gap-1 pb-3 px-2 transition-colors uppercase whitespace-nowrap w-full md:w-auto justify-center"
        >
          <FiRefreshCw className="md:hidden" /> Reset Filters
        </button>
      </div>

      <div className="table-container scroll-line lg:no-scrollbar">
        <table className="table-modern w-full text-sm text-left">
          <thead>
            <tr className="whitespace-nowrap">
              <th className="p-4 pl-6">Date</th>
              <th className="p-4">From Branch</th>
              <th className="p-4">Items</th>
              <th className="p-4">Remarks</th>
              <th className="p-4">Received By/Time</th>
              <th className="p-4 text-right pr-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransfers.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 pl-6 font-medium text-slate-600">{new Date(t.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="p-4">
                  <span className="font-medium text-slate-800">{t.fromBranch?.name}</span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {t.items.map(i => (
                      <span key={i.id} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] items-center gap-1 font-medium">
                        {i.product.name} <span className="text-indigo-500">x{i.quantity}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 italic text-slate-400 text-xs">
                  {t.remarks || 'No remarks'}
                </td>
                <td className="p-4">
                  {t.status === 'RECEIVED' ? (
                    <div className="flex flex-col text-xs">
                      <span className="font-medium text-slate-700">{t.receivedBy?.name || 'Staff'}</span>
                      <span className="text-slate-400">{t.receivedAt ? new Date(t.receivedAt).toLocaleDateString('en-GB') + ' ' + new Date(t.receivedAt).toLocaleTimeString() : '-' }</span>
                    </div>
                  ) : (
                    <span className="text-slate-300 italic text-[10px]">Awaiting...</span>
                  )}
                </td>
                <td className="p-4 text-right pr-6">
                  {t.status === 'PENDING' ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => triggerPrint(t)}
                        className="text-primary hover:bg-primary-light/10 px-3 py-2 rounded-xl text-[10px] font-medium uppercase transition-colors flex items-center gap-1 border border-primary-light/20"
                      >
                        <FiPrinter /> Print
                      </button>
                      <button
                        onClick={() => handleReceive(t.id)}
                        className="bg-primary text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95"
                      >
                        <FiPackage /> Receive
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 items-center">
                      <button
                        onClick={() => triggerPrint(t)}
                        className="text-primary hover:bg-primary-light/10 px-3 py-2 rounded-xl text-[10px] font-medium uppercase transition-colors flex items-center gap-1 border border-primary-light/20"
                      >
                        <FiPrinter /> Print
                      </button>
                      <div className="text-primary font-medium text-xs flex items-center gap-1">
                        <FiCheckCircle /> Received
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredTransfers.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="p-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      {activeTab === 'pending' ? <FiPackage size={32} /> : <FiClock size={32} />}
                    </div>
                    <p className="text-slate-400 italic">No {activeTab} transfers to display</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Stock Transfer Challan (A4 Size) */}
      <div style={{ display: 'none' }}>
        <div ref={stockPrintRef} className="p-10 text-black bg-white" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'sans-serif' }}>
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
            {company?.logoUrl && (
              <img src={company.logoUrl} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
            )}
            <h1 className="text-xl font-bold uppercase tracking-tighter">Stock Transfer Challan</h1>
            <h2 className="text-base font-semibold mt-0.5 text-slate-700">{company?.companyName || 'BILLING SOFTWARE'}</h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">{company?.address || 'Inventory Management System'}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 text-[10px]">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="font-medium text-slate-400 uppercase text-[8px] mb-1 tracking-widest">Sending Branch</p>
              <p className="font-medium text-base text-slate-800">{selectedForPrint?.fromBranch?.name}</p>
              <p className="text-slate-500 mt-0.5">{selectedForPrint?.fromBranch?.address || 'Branch Address Not Set'}</p>
            </div>
            <div className="bg-primary-light/10 p-3 rounded-xl border border-primary-light/20">
              <p className="font-medium text-primary uppercase text-[8px] mb-1 tracking-widest">Receiving Branch</p>
              <p className="font-medium text-base text-slate-800">{selectedForPrint?.toBranch?.name}</p>
              <p className="text-slate-500 mt-0.5">{selectedForPrint?.toBranch?.address || 'Branch Address Not Set'}</p>
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 pb-2 border-b border-slate-100">
            <div>
              <p className="text-[9px] font-medium text-slate-400 uppercase">Transfer ID</p>
              <p className="text-sm font-mono font-medium text-slate-800">#ST-{selectedForPrint?.id?.toString().padStart(6, '0')}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium text-slate-400 uppercase">Transfer Date</p>
              <p className="text-[11px] font-medium text-slate-800">{selectedForPrint?.createdAt ? new Date(selectedForPrint.createdAt).toLocaleDateString('en-GB') + ' ' + new Date(selectedForPrint.createdAt).toLocaleTimeString() : '-'}</p>
            </div>
          </div>

          <table className="w-full text-[11px] mb-6">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 text-left rounded-l-md font-medium uppercase tracking-wider">Item Name</th>
                <th className="p-2 text-center w-24 rounded-r-md font-medium uppercase tracking-wider">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedForPrint?.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-2 font-medium text-slate-700">{item.product?.name}</td>
                  <td className="p-2 text-center font-medium text-slate-900">{item.quantity} units</td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedForPrint?.remarks && (
            <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[9px] font-medium text-slate-400 uppercase mb-0.5">Remarks</p>
              <p className="text-[10px] text-slate-600 italic">"{selectedForPrint.remarks}"</p>
            </div>
          )}

          {selectedForPrint?.status === 'RECEIVED' && (
            <div className="mt-auto grid grid-cols-2 gap-6 pt-6 border-t font-sans">
              <div>
                <p className="text-[8px] font-medium text-slate-400 uppercase mb-3 tracking-widest text-center">Issued By (Sender)</p>
                <div className="h-12 border-b border-slate-200"></div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-medium text-primary uppercase mb-1 tracking-widest">Received & Verified By</p>
                <p className="font-medium text-sm text-slate-800">{selectedForPrint.receivedBy?.name || 'Staff'}</p>
                <p className="text-[9px] text-slate-400 uppercase">
                  {selectedForPrint.receivedAt ? new Date(selectedForPrint.receivedAt).toLocaleDateString('en-GB') + ' ' + new Date(selectedForPrint.receivedAt).toLocaleTimeString() : '-'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 text-center border-t pt-4">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Electronic Stock Transfer Document - No Signature Required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
