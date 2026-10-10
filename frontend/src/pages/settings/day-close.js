import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import {
  FiCalendar, FiCheckCircle, FiAlertTriangle, FiLock, FiClock, FiRefreshCw
} from 'react-icons/fi';
import { useRouter } from 'next/router';

const getTodayIso = () => new Date().toISOString().split('T')[0];

const formatDisplayFromIso = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function DayClosePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync with URL date query if navigated with ?date=YYYY-MM-DD
  useEffect(() => {
    if (router.query.date) {
      setSelectedDate(router.query.date);
    }
  }, [router.query.date]);

  useEffect(() => {
    fetchDayCloseStatus(selectedDate);
  }, [selectedDate]);

  const fetchDayCloseStatus = async (dateStr) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/day-close/status', {
        params: { date: dateStr }
      });
      if (res.data && res.data.success) {
        setStatusData(res.data);
      }
    } catch (err) {
      console.error('Error fetching day close status:', err);
      setError(err.response?.data?.message || 'Failed to load business date status');
      toast.error(err.response?.data?.message || 'Failed to load Day Close status');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    setSubmitting(true);
    try {
      const payload = { businessDate: selectedDate };
      const res = await api.post('/day-close/confirm', payload);
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Day Close completed successfully!');
        setShowConfirmModal(false);
        await fetchDayCloseStatus(selectedDate);
      }
    } catch (err) {
      console.error('Error confirming day close:', err);
      toast.error(err.response?.data?.message || 'Failed to complete Day Close');
    } finally {
      setSubmitting(false);
    }
  };

  const todayIso = getTodayIso();
  const isClosed = statusData?.status === 'CLOSED';
  const isPendingPrevious = statusData?.hasPendingPrevious;
  const pendingDateDisplay = statusData?.pendingDateDisplay;
  const pendingDateIso = statusData?.pendingDate;

  const displayFormattedDate = formatDisplayFromIso(selectedDate);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      {/* Title Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          <FiCalendar />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Day Close</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Finalize business operations for the selected business date.
        </p>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <FiRefreshCw className="animate-spin text-emerald-600" />
          Loading business date status...
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center space-y-4">
          <div className="text-red-500 text-sm font-semibold">{error}</div>
          <button
            onClick={() => fetchDayCloseStatus(selectedDate)}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FiRefreshCw /> Retry Loading
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Missed Day Close Warning Banner */}
          {isPendingPrevious && (
            <div className="bg-amber-500 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <FiAlertTriangle className="text-2xl flex-shrink-0 text-amber-100" />
                <div>
                  <h4 className="font-bold text-sm">Day Close Pending!</h4>
                  <p className="text-xs text-amber-50 mt-0.5">
                    You have not closed the business date <span className="font-bold text-white">{pendingDateDisplay}</span>. Please complete the pending Day Close before proceeding to a later date.
                  </p>
                </div>
              </div>
              {pendingDateIso && selectedDate !== pendingDateIso && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(pendingDateIso)}
                  className="px-3.5 py-1.5 bg-white text-amber-900 text-xs font-bold rounded-lg shadow-sm hover:bg-amber-50 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
                >
                  Select {pendingDateDisplay} →
                </button>
              )}
            </div>
          )}

          {/* Main Business Date Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
            
            {/* Status Indicator */}
            <div className="flex justify-center">
              <span className={`px-4 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                isClosed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isClosed ? (
                  <><FiCheckCircle className="text-emerald-600" /> CLOSED</>
                ) : (
                  <><FiClock className="text-amber-600" /> OPEN</>
                )}
              </span>
            </div>

            {/* Display & Date Picker Section */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                CURRENT BUSINESS DATE
              </span>

              {/* Formatted Date Display */}
              <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {displayFormattedDate}
              </div>

              {/* Date Picker Component */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <FiCalendar className="text-emerald-600" /> Select Business Date:
                </label>
                <input
                  type="date"
                  max={todayIso}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:bg-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                />
              </div>

              {isClosed && statusData?.closedAt && (
                <p className="text-xs text-emerald-700 font-medium pt-2">
                  Closed on {new Date(statusData.closedAt).toLocaleString()} by {statusData.closedBy || 'User'}
                </p>
              )}
            </div>

            {/* Action Section */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              {isClosed ? (
                <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
                  <FiCheckCircle className="text-emerald-600 text-base" />
                  Day Close for {displayFormattedDate} is complete.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <FiCheckCircle className="text-lg" /> OK / Confirm Day Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              <FiLock />
            </div>

            <div>
              <h3 className="font-bold text-gray-800 text-lg">Confirm Day Close</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to close business date <span className="font-bold text-gray-900">{displayFormattedDate}</span>?
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmClose}
                className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
              >
                {submitting ? 'Saving...' : 'Yes, Close Date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
