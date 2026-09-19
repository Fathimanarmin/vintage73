import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { FiLock, FiKey, FiCheckCircle } from 'react-icons/fi';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error('New passwords do not match');
    }

    if (formData.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      toast.success('Password changed successfully');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">Security Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Update your account password to stay secure</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <FiKey size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Change Password</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Secure your account</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Current Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  required
                  type="password"
                  className="input w-full pl-11 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">New Password</label>
                <div className="relative">
                  <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    type="password"
                    className="input w-full pl-11 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    placeholder="Min. 6 characters"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Confirm New Password</label>
                <div className="relative">
                  <FiCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    type="password"
                    className="input w-full pl-11 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    placeholder="Repeat new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white font-medium px-10 py-4 rounded-2xl hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/20 transition-all active:scale-95 text-sm uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <FiLock size={20} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-blue-900 mb-1">Security Tip</h4>
          <p className="text-blue-700 text-xs leading-relaxed">
            Use a strong password that you don't use elsewhere. A mix of letters, numbers, and symbols is recommended for maximum account security.
          </p>
        </div>
      </div>
    </div>
  );
}
