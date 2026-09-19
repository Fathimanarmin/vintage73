import { useState, useEffect } from 'react';
import api, { getServerUrl } from '@/lib/api';
import { toast } from 'react-toastify';
import { FiUpload, FiImage, FiSave } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';

export default function ScreenLayoutSettings() {
  const { refreshTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showLogoOnly, setShowLogoOnly] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const res = await api.get('/company');
      if (res.data) {
        if (res.data.dashboardImageUrl) setCurrentImage(res.data.dashboardImageUrl);
        setShowLogoOnly(res.data.showOnlyLogoOnDashboard || false);
      }
    } catch (err) {
      console.error('Failed to fetch company settings', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm('Are you sure you want to remove the dashboard image?')) return;
    setLoading(true);
    try {
      await api.post('/company', { removeDashboardImage: true });
      toast.success('Image removed successfully');
      setCurrentImage(null);
      setPreviewUrl(null);
      await refreshTheme();
      fetchCompanyData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Allow submit as long as we have a current image or are just changing the toggle
    // Removing the strict early return that required an image to be present

    setLoading(true);
    const formData = new FormData();
    if (selectedFile) {
      formData.append('dashboardImage', selectedFile);
    }
    // Convert boolean to string if needed, though most backends handle it or we can just append it.
    // The backend receives it as a string 'true'/'false' usually via form-data, or we can rely on auto conversion.
    // Explicitly appending as string or value is fine.
    formData.append('showOnlyLogoOnDashboard', showLogoOnly);

    try {
      await api.post('/company', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Screen Layout Image updated!');
      await refreshTheme(); // Refresh global theme context to update layout wallpaper IMMEDIATELY
      fetchCompanyData();
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update image';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Screen Layout Settings</h1>
        <p className="text-slate-500 text-sm">Customize the default dashboard layout image.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Current / Preview */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FiImage />
              Current Visualization
            </h3>
            <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : currentImage ? (
                <img src={`${getServerUrl()}${currentImage}`} alt="Current Layout" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <FiImage className="mx-auto text-4xl mb-2 opacity-50" />
                  <p className="text-sm">No layout image set</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              This image will be displayed on the main dashboard area.
            </p>
            {currentImage && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center justify-center gap-2 mx-auto border border-red-200 bg-red-50 px-3 py-1 rounded"
                >
                  <FiImage className="line-through" /> Remove Image
                </button>
              </div>
            )}
          </div>

          {/* Upload Control */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload New Image</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary/30 border-dashed rounded-lg cursor-pointer bg-primary-light/5 hover:bg-primary-light/10 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiUpload className="w-8 h-8 mb-3 text-primary" />
                      <p className="mb-2 text-sm text-primary-dark"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-primary">SVG, PNG, JPG or GIF (MAX. 5MB)</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="showLogoOnly"
                    className="sr-only peer"
                    checked={showLogoOnly}
                    onChange={(e) => setShowLogoOnly(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700 select-none">
                    Show only this layout on Dashboard (Hide Stats)
                  </span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all
                                ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark shadow-md hover:shadow-lg'}
                            `}
                >
                  {loading ? 'Saving...' : <><FiSave /> Save Settings</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
