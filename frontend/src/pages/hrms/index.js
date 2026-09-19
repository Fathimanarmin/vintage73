import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function HRMSDashboard() {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(null); // { checkIn: ..., checkOut: ... }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            setUser(u);
            fetchStatus(u.id);
        }
    }, []);

    const fetchStatus = async (userId) => {
        try {
            const res = await api.get(`/hrms/attendance/status?userId=${userId}`);
            setStatus(res.data.attendance || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            await api.post('/hrms/attendance/check-in', { userId: user.id });
            toast.success("Checked In Successfully!");
            fetchStatus(user.id);
        } catch (err) {
            toast.error(err.response?.data?.error || "Check-in failed");
        }
    };

    const handleCheckOut = async () => {
        try {
            await api.post('/hrms/attendance/check-out', { userId: user.id });
            toast.success("Checked Out Successfully!");
            fetchStatus(user.id);
        } catch (err) {
            toast.error(err.response?.data?.error || "Check-out failed");
        }
    };

    if (loading) return <div className="p-8">Loading HRMS...</div>;

    const isCheckedIn = !!status?.checkIn;
    const isCheckedOut = !!status?.checkOut;

    return (
        <div className="p-6 w-full space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-800">HRMS Dashboard</h1>
                <p className="text-slate-500">Welcome, {user?.name}</p>
            </header>

            {/* Attendance Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-md">
                <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                    <FiClock className="text-primary" /> Today's Attendance
                </h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Date</span>
                        <span className="font-medium">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status ? 'bg-primary-light text-primary-dark' : 'bg-gray-100 text-gray-500'}`}>
                            {status ? status.status : 'NOT MARKED'}
                        </span>
                    </div>

                    {status && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Check In</span>
                                <span className="font-mono">{new Date(status.checkIn).toLocaleTimeString()}</span>
                            </div>
                            {status.checkOut && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Check Out</span>
                                    <span className="font-mono">{new Date(status.checkOut).toLocaleTimeString()}</span>
                                </div>
                            )}
                        </>
                    )}

                    <div className="pt-4 flex gap-3">
                        {!isCheckedIn ? (
                            <button
                                onClick={handleCheckIn}
                                className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary-dark transition font-medium"
                            >
                                Check In
                            </button>
                        ) : !isCheckedOut ? (
                            <button
                                onClick={handleCheckOut}
                                className="flex-1 bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 transition font-medium"
                            >
                                Check Out
                            </button>
                        ) : (
                            <div className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-lg text-center font-medium">
                                Completed for Today
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
