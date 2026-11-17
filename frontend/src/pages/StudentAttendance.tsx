import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  XCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { attendanceApi, type StudentLectureItem } from '../services/attendanceApi';
import { captureCurrentLocation } from '../utils/geolocation';

const getLocalToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayTime = (timeStr?: string) => {
  if (!timeStr) return '--:--';
  const [hRaw, mRaw] = timeStr.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return timeStr;
  return `${((hRaw + 11) % 12) + 1}:${String(mRaw).padStart(2, '0')} ${hRaw >= 12 ? 'PM' : 'AM'}`;
};

export const StudentAttendance: React.FC = () => {
  const { addToast } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(getLocalToday);
  const [lectures, setLectures] = useState<StudentLectureItem[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [pins, setPins] = useState<{ [lectureId: number]: string }>({});
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [cardErrors, setCardErrors] = useState<{ [lectureId: number]: string }>({});

  const fetchLectures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getStudentLectures(selectedDate);
      setLectures(data.lectures || []);
      setStudentName(data.student?.full_name || '');
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to load your lecture schedule.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, addToast]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const handleCheckIn = async (lecture: StudentLectureItem) => {
    const code = (pins[lecture.id] || '').trim();
    if (!code) {
      setCardErrors(prev => ({ ...prev, [lecture.id]: 'Enter the 4-digit Class PIN shared by your teacher.' }));
      return;
    }

    setCardErrors(prev => {
      const next = { ...prev };
      delete next[lecture.id];
      return next;
    });
    setCheckingInId(lecture.id);

    try {
      const geofenceRequired = Boolean(Number(lecture.geofence_enabled) === 1);
      let location = null;
      if (geofenceRequired) {
        location = await captureCurrentLocation();
      } else {
        try {
          location = await captureCurrentLocation({ enableHighAccuracy: false, maximumAge: 60000, timeout: 4000 });
        } catch {
          location = null;
        }
      }

      const res = await attendanceApi.studentCheckIn(lecture.id, code, location);
      const geo = res?.data?.geofence;
      addToast(
        geo?.status === 'INSIDE' && geo?.distanceMeters != null
          ? `Checked in (${Math.round(geo.distanceMeters)}m from ${lecture.branch_name || 'branch'})!`
          : 'Attendance check-in recorded!',
        'success'
      );
      await fetchLectures();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to verify location and check in.';
      setCardErrors(prev => ({ ...prev, [lecture.id]: msg }));
      addToast(msg, 'error');
    } finally {
      setCheckingInId(null);
    }
  };

  const renderAttendanceBadge = (lecture: StudentLectureItem) => {
    if (lecture.attendance_status === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} /> Present
        </span>
      );
    }
    if (lecture.attendance_status === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} /> Late
        </span>
      );
    }
    if (lecture.attendance_status === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={13} /> Absent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <Clock size={13} /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Attendance &amp; Check-In</h1>
          <p className="text-xs text-slate-500 mt-1">
            {studentName ? `${studentName} — ` : ''}
            Verify your campus location with the Class PIN when your teacher opens check-in.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={fetchLectures}
            disabled={loading}
            className="text-xs font-bold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 size={36} className="text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading your lectures...</p>
        </div>
      ) : lectures.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200">
          <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Lectures Scheduled</h3>
          <p className="text-xs text-slate-500 mt-1">
            You have no scheduled classes for {selectedDate}.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {lectures.map(lec => {
            const isLocked = Boolean(lec.attendance_taken === 1 && lec.attendance_locked_at);
            const isOpen = Boolean(Number(lec.student_checkin_open) === 1);
            const isGeofenced = Boolean(Number(lec.geofence_enabled) === 1);
            const hasCheckedIn = Boolean(lec.student_checkin_at);
            const errorMsg = cardErrors[lec.id];

            return (
              <Card key={lec.id} className="p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900">{lec.subject_name}</h2>
                      {renderAttendanceBadge(lec)}
                      {isGeofenced && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <MapPin size={12} /> Geo-Fence {lec.geofence_radius_meters || 100}m
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <Lock size={11} /> Locked
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                      <span><strong>Batch:</strong> {lec.batch_name}</span>
                      <span>•</span>
                      <span><strong>Time:</strong> {formatDisplayTime(lec.start_time)} – {formatDisplayTime(lec.end_time)}</span>
                      {lec.teacher_name && (
                        <>
                          <span>•</span>
                          <span><strong>Faculty:</strong> {lec.teacher_name}</span>
                        </>
                      )}
                      {lec.branch_name && (
                        <>
                          <span>•</span>
                          <span><strong>Branch:</strong> {lec.branch_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {hasCheckedIn ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        Self check-in recorded
                        {lec.student_checkin_geofence_status === 'INSIDE' && lec.student_checkin_distance_meters != null
                          ? ` • Verified ${Math.round(Number(lec.student_checkin_distance_meters))}m from ${lec.branch_name || 'branch'}`
                          : ''}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {new Date(lec.student_checkin_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : isLocked ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-2">
                    <Lock size={14} className="text-slate-400 shrink-0" />
                    Attendance has already been finalized and locked by your teacher.
                  </div>
                ) : isOpen ? (
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                          Enter 4-Digit Class PIN (Shown by Teacher)
                        </label>
                        <div className="relative max-w-xs">
                          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="e.g. 4829"
                            value={pins[lec.id] || ''}
                            onChange={e => setPins(prev => ({ ...prev, [lec.id]: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-xl text-sm font-mono font-bold tracking-widest bg-white text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleCheckIn(lec)}
                        disabled={checkingInId === lec.id}
                        className="flex items-center gap-2 text-xs font-bold sm:mt-4 shrink-0"
                      >
                        {checkingInId === lec.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <MapPin size={14} />
                        )}
                        {checkingInId === lec.id ? 'Verifying Location...' : 'Verify Location & Check In'}
                      </Button>
                    </div>

                    {errorMsg && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                        <ShieldAlert size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    Self check-in is not open yet. Wait for your teacher to start check-in and share the Class PIN.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

