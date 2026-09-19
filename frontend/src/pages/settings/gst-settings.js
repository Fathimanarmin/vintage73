import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiSave, FiSettings, FiTruck, FiFileText, FiDollarSign } from 'react-icons/fi';
import SearchableSelect from '@/components/SearchableSelect';

export default function GSTSettings() {
  const [settings, setSettings] = useState({
    ewayBillUsername: '',
    ewayBillPassword: '',
    ewayBillClientId: '',
    ewayBillClientSecret: '',
    ewayBillThreshold: 50000,
    autoGenerateEwayBill: false,
    einvoiceUsername: '',
    einvoicePassword: '',
    einvoiceClientId: '',
    einvoiceClientSecret: '',
    autoGenerateEinvoice: false,
    gspName: 'CDSL',
    apiMode: 'SANDBOX',
    defaultPlaceOfSupply: '',
    invoicePrefix: 'INV',
    challanPrefix: 'DC',
    termsAndConditions: '',
    bankDetails: ''
  });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, statesRes] = await Promise.all([
          api.get('/gst-settings'),
          api.get('/states')
        ]);
        if (settingsRes.data) {
          setSettings(prev => ({ ...prev, ...settingsRes.data }));
        }
        setStates(statesRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/gst-settings', settings);
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
    <div className="w-full pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-light/10 flex items-center justify-center">
          <FiSettings className="text-primary" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">GST & E-Invoice Bot Settings</h1>
          <p className="text-sm text-slate-500">Configure automated GST, E-Invoice, and E-Way Bill integrations</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Global API Settings */}
        <div className="bg-primary-light/5 rounded-xl border border-primary/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiSettings className="text-primary" />
            <h2 className="font-semibold text-primary-dark uppercase tracking-wider text-xs">Global API Integration (Bot Mode)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-medium text-primary mb-1 uppercase tracking-widest">GSP Provider Name</label>
              <SearchableSelect
                options={[
                  { label: 'CDSL (Recommended)', value: 'CDSL' },
                  { label: 'Tally GSP', value: 'TALLY' },
                  { label: 'MasterSoft', value: 'MASTERSOFT' },
                  { label: 'ClearTax', value: 'CLEAR_TAX' }
                ]}
                value={settings.gspName}
                onChange={(val) => handleChange({ target: { name: 'gspName', value: val } })}
                direction="down"
                triggerClassName="input bg-white border-primary/20 h-[42px]"
                placeholder="Select GSP Provider"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-primary mb-1 uppercase tracking-widest">API Environment Mode</label>
              <div className="flex bg-white p-1 rounded-lg border border-primary/20">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, apiMode: 'SANDBOX' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.apiMode === 'SANDBOX' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  SANDBOX (Testing)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, apiMode: 'PRODUCTION' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${settings.apiMode === 'PRODUCTION' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  PRODUCTION (Live)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* E-Invoice Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FiFileText className="text-blue-600" />
              </div>
              <h2 className="font-semibold text-slate-800">E-Invoice (Bot Credentials)</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="autoGenerateEinvoice"
                  id="autoEinvoice"
                  className="sr-only peer"
                  checked={settings.autoGenerateEinvoice}
                  onChange={handleChange}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-medium text-slate-600">Enable Auto-Generation</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Invoice Portal Username</label>
              <input type="text" name="einvoiceUsername" value={settings.einvoiceUsername || ''} onChange={handleChange} className="input" placeholder="User123" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Invoice Portal Password</label>
              <input type="password" name="einvoicePassword" value={settings.einvoicePassword || ''} onChange={handleChange} className="input" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Invoice Client ID</label>
              <input type="text" name="einvoiceClientId" value={settings.einvoiceClientId || ''} onChange={handleChange} className="input" placeholder="Portal Client ID" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Invoice Client Secret</label>
              <input type="password" name="einvoiceClientSecret" value={settings.einvoiceClientSecret || ''} onChange={handleChange} className="input" placeholder="••••••••" />
            </div>
          </div>
        </div>

        {/* E-Way Bill Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <FiTruck className="text-amber-600" />
              </div>
              <h2 className="font-semibold text-slate-800">E-Way Bill (Bot Credentials)</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="autoGenerateEwayBill"
                  id="autoEway"
                  className="sr-only peer"
                  checked={settings.autoGenerateEwayBill}
                  onChange={handleChange}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-amber-600"></div>
                <span className="ml-2 text-xs font-medium text-slate-600">Enable Auto-Generation</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Minimum Threshold (₹)</label>
              <input type="number" name="ewayBillThreshold" value={settings.ewayBillThreshold} onChange={handleChange} className="input w-1/2" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Way Bill Username</label>
              <input type="text" name="ewayBillUsername" value={settings.ewayBillUsername || ''} onChange={handleChange} className="input" placeholder="GST Portal User" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Way Bill Password</label>
              <input type="password" name="ewayBillPassword" value={settings.ewayBillPassword || ''} onChange={handleChange} className="input" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Way Bill Client ID</label>
              <input type="text" name="ewayBillClientId" value={settings.ewayBillClientId || ''} onChange={handleChange} className="input" placeholder="API Client ID" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">E-Way Bill Client Secret</label>
              <input type="password" name="ewayBillClientSecret" value={settings.ewayBillClientSecret || ''} onChange={handleChange} className="input" placeholder="••••••••" />
            </div>
          </div>
        </div>

        {/* Invoice Format Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FiFileText className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Invoice Format & General</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Invoice Prefix</label>
              <input type="text" name="invoicePrefix" value={settings.invoicePrefix} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Challan Prefix</label>
              <input type="text" name="challanPrefix" value={settings.challanPrefix} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Default Place of Supply</label>
              <SearchableSelect
                options={[
                  { label: 'Select State', value: '' },
                  ...states.map(state => ({ label: state.name, value: state.name }))
                ]}
                value={settings.defaultPlaceOfSupply}
                onChange={(val) => handleChange({ target: { name: 'defaultPlaceOfSupply', value: val } })}
                direction="down"
                triggerClassName="input h-[42px]"
                placeholder="Select State"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Bank Details (Footer)</label>
              <textarea name="bankDetails" value={settings.bankDetails || ''} onChange={handleChange} className="input min-h-[80px] text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Terms & Conditions</label>
              <textarea name="termsAndConditions" value={settings.termsAndConditions || ''} onChange={handleChange} className="input min-h-[80px] text-xs" />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-6 right-6 z-10 shadow-2xl rounded-lg overflow-hidden">
          <button
            type="submit"
            disabled={saving}
            className="btn bg-primary hover:bg-primary-dark text-white px-8 py-3 font-medium flex items-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            <FiSave size={18} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
