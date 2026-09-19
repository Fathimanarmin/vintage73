import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FiChevronLeft, FiChevronRight, FiClock, FiCalendar } from 'react-icons/fi';

export default function AttendanceCalendar() {
    const [date, setDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState([]);
    const [leaveData, setLeaveData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ present: 0, halfDay: 0, totalHours: 0 });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        if (user) {
            fetchAttendance();
        }
    }, [user, date]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const res = await api.get(`/hrms/attendance/history?userId=${user.id}&month=${month}&year=${year}`);
            setAttendanceData(res.data.attendance || []);
            setLeaveData(res.data.leaves || []);
            calculateStats(res.data.attendance || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        let present = 0;
        let halfDay = 0;
        let hours = 0;

        data.forEach(record => {
            if (record.status === 'PRESENT') present++;
            if (record.status === 'HALF_DAY') halfDay++;
            // CHECKED_IN is intentionally not counted as present

            if (record.checkIn && record.checkOut) {
                const diff = new Date(record.checkOut) - new Date(record.checkIn);
                hours += diff / (1000 * 60 * 60);
            }
        });

        setStats({ present, halfDay, totalHours: hours.toFixed(1) });
    };

    const handlePrevMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendarDays = () => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-20 xs:h-24 sm:h-28 md:h-32 bg-slate-50/50 border border-slate-100/50"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayDate = new Date(year, month, day);
            // reset hours for comparison
            const dateString = currentDayDate.toISOString().split('T')[0];

            // Find attendance record for this day
            // Note: DB date is DateTime string (UTC). We need to match with local calendar day.
            // Using ISOString shifts the date if it's strictly UTC midnight vs Local midnight.
            // Robust approach: Check if record's local date matches currentDayDate.
            const record = attendanceData.find(a => {
                const recordDate = new Date(a.date);
                return recordDate.getDate() === currentDayDate.getDate() &&
                    recordDate.getMonth() === currentDayDate.getMonth() &&
                    recordDate.getFullYear() === currentDayDate.getFullYear();
            });

            // Find leave record for this day
            const leave = leaveData.find(l => {
                const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
                const e = new Date(l.endDate); e.setHours(0, 0, 0, 0);
                return currentDayDate >= s && currentDayDate <= e;
            });

            const isToday = currentDayDate.getDate() === today.getDate() &&
                currentDayDate.getMonth() === today.getMonth() &&
                currentDayDate.getFullYear() === today.getFullYear();

            const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6; // Sun or Sat

            // Determine Background Color
            let bgClass = '';
            let customStyle = {};

            if (isToday) bgClass = 'bg-primary-light/10';

            if (leave) {
                // If leave exists, use its color with opacity
                customStyle = { backgroundColor: `${leave.leaveType?.color}20`, borderColor: leave.leaveType?.color };
            } else if (!record && !isWeekend && currentDayDate < today) {
                bgClass = 'bg-red-50/50';
            }

            days.push(
                <div key={day} className={`h-20 xs:h-24 sm:h-28 md:h-32 border border-slate-100 p-1.5 sm:p-2 relative group transition-all hover:bg-slate-50 ${bgClass}`} style={customStyle}>
                    <div className="flex justify-between items-start">
                        <span className={`text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : isWeekend ? 'text-red-400' : 'text-slate-700'}`}>
                            {day}
                        </span>

                        <div className="flex flex-col items-end gap-1">
                            {record && (
                                <span className={`text-[8px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded leading-none ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                    record.status === 'HALF_DAY' ? 'bg-amber-100 text-amber-700' :
                                        record.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {record.status === 'CHECKED_IN' ? 'ACTIVE' : record.status}
                                </span>
                            )}
                            {leave && (
                                <span
                                    className="text-[8px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded text-white shadow-sm leading-none"
                                    style={{ backgroundColor: leave.leaveType?.color || '#3B82F6' }}
                                >
                                    {leave.leaveType?.name}
                                </span>
                            )}
                        </div>
                    </div>

                    {record ? (
                        <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                            {record.checkIn && (
                                <div className="text-[9px] sm:text-xs text-slate-500 flex items-center gap-1">
                                    <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-primary"></div>
                                    {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                            {record.checkOut && (
                                <div className="text-[9px] sm:text-xs text-slate-500 flex items-center gap-1">
                                    <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-slate-400"></div>
                                    {new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    ) : (
                        !isWeekend && !leave && currentDayDate < today && (
                            <div className="mt-2 sm:mt-4 flex justify-center">
                                <span className="text-[8px] sm:text-[10px] text-red-500 font-medium tracking-widest bg-red-100 px-1.5 sm:px-2 py-0.5 rounded-full">ABSENT</span>
                            </div>
                        )
                    )}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="p-6 w-full font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">My Attendance</h1>
                    <p className="text-slate-500 text-sm mt-1">Track your daily check-ins and work hours</p>
                </div>

                {/* Legend/Stats */}
                <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
                    <div className="flex flex-col items-center bg-white border border-slate-100 p-2 sm:p-3 rounded-xl shadow-sm min-w-[80px] sm:min-w-[100px] flex-1 sm:flex-none">
                        <span className="text-xl sm:text-2xl font-semibold text-primary leading-none mb-1">{stats.present}</span>
                        <span className="text-slate-400 text-[9px] sm:text-xs font-medium uppercase tracking-wider">Present</span>
                    </div>
                    <div className="flex flex-col items-center bg-white border border-slate-100 p-2 sm:p-3 rounded-xl shadow-sm min-w-[80px] sm:min-w-[100px] flex-1 sm:flex-none">
                        <span className="text-xl sm:text-2xl font-bold text-slate-700 leading-none mb-1">{stats.totalHours}</span>
                        <span className="text-slate-400 text-[9px] sm:text-xs font-medium uppercase tracking-wider">Total Hrs</span>
                    </div>
                </div>
            </div>

            {/* Calendar Controls */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm">
                    <button onClick={handlePrevMonth} className="p-2 sm:p-2.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-600">
                        <FiChevronLeft size={20} />
                    </button>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-700 flex items-center gap-2">
                        <FiCalendar className="text-primary mb-0.5 hidden xs:block" />
                        {date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2 sm:p-2.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-600">
                        <FiChevronRight size={20} />
                    </button>
                </div>

                {/* Calendar Grid Wrapper */}
                <div className="table-container scroll-line lg:no-scrollbar overflow-x-auto">
                    <div className="min-w-[600px] lg:min-w-full">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 bg-white border-b border-slate-100">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 bg-white">
                            {loading ? (
                                <div className="col-span-7 h-64 flex items-center justify-center text-slate-400">
                                    Loading calendar...
                                </div>
                            ) : renderCalendarDays()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
