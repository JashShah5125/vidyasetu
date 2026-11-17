import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  MessageSquare,
  MapPin,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  KeyRound,
  UserCheck,
  Lock,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { attendanceApi, type StudentLectureItem } from '../services/attendanceApi';
import { homeworkApi, type MyHomeworkItem } from '../services/homeworkApi';
import { doubtApi, type DoubtItem } from '../services/doubtApi';
import { captureCurrentLocation } from '../utils/geolocation';

const getTodayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '--:--';
  const [hRaw, mRaw] = timeStr.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return timeStr;
  return `${((hRaw + 11) % 12) + 1}:${String(mRaw).padStart(2, '0')} ${hRaw >= 12 ? 'PM' : 'AM'}`;
};

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState<StudentLectureItem[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ full_name?: string; batch_name?: string; student_code?: string }>({});
  const [homeworks, setHomeworks] = useState<MyHomeworkItem[]>([]);
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);

  // Check-in state
  const [pins, setPins] = useState<{ [lectureId: number]: string }>({});
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [checkinErrors, setCheckinErrors] = useState<{ [lectureId: number]: string }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const today = getTodayDateStr();

    try {
      const [lecRes, hwRes, doubtRes] = await Promise.allSettled([
        attendanceApi.getStudentLectures(today),
        homeworkApi.getMyHomeworks(),
        doubtApi.getStudentDoubts()
      ]);

      if (lecRes.status === 'fulfilled') {
        setLectures(lecRes.value?.lectures || []);
        if (lecRes.value?.student) {
          setStudentInfo(lecRes.value.student);
        }
      }

      if (hwRes.status === 'fulfilled') {
        setHomeworks(hwRes.value || []);
      }

      if (doubtRes.status === 'fulfilled') {
        setDoubts(doubtRes.value || []);
      }
    } catch (err) {
      console.error('[StudentDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async (lecture: StudentLectureItem) => {
    const code = (pins[lecture.id] || '').trim();
    if (!code) {
      setCheckinErrors(prev => ({ ...prev, [lecture.id]: 'Please enter the 4-digit Class PIN.' }));
      return;
    }

    setCheckinErrors(prev => {
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
          ? `Checked in (${Math.round(geo.distanceMeters)}m from campus)!`
          : 'Attendance check-in recorded successfully!',
        'success'
      );
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to verify location and check in.';
      setCheckinErrors(prev => ({ ...prev, [lecture.id]: msg }));
      addToast(msg, 'error');
    } finally {
      setCheckingInId(null);
    }
  };

  const displayName = studentInfo.full_name || currentUser?.name || 'Student';
  const attendedCount = lectures.filter(l => l.attendance_status === 1 || l.student_checkin_at).length;
  const pendingHwCount = homeworks.filter(h => !h.mySubmission).length;
  const activeDoubtsCount = doubts.filter(d => d.status !== 2 && d.statusLabel !== 'Resolved').length;

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <GraduationCap size={13} /> Student Portal
            </span>
            {studentInfo.batch_name && (
              <span className="text-xs font-semibold text-slate-500">
                • Batch: {studentInfo.batch_name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Here is your daily class schedule, attendance status, and pending tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm">
            <Calendar size={14} className="text-indigo-600" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Lectures */}
        <Card className="p-5 border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Lectures</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{lectures.length}</span>
            <span className="text-xs font-semibold text-slate-500">scheduled</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lectures.some(l => l.student_checkin_open === 1) ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Check-in open now
              </span>
            ) : (
              'All lectures today'
            )}
          </p>
        </Card>

        {/* My Attendance */}
        <Card className="p-5 border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Attendance</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{attendedCount}</span>
            <span className="text-xs font-semibold text-slate-500">/ {lectures.length} today</span>
          </div>
          <button
            onClick={() => navigate('/attendance')}
            className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1"
          >
            Open Attendance Desk <ArrowRight size={12} />
          </button>
        </Card>

        {/* Pending Homework */}
        <Card className="p-5 border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Homework</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{pendingHwCount}</span>
            <span className="text-xs font-semibold text-slate-500">due</span>
          </div>
          <button
            onClick={() => navigate('/homework')}
            className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 mt-1"
          >
            View Assignments <ArrowRight size={12} />
          </button>
        </Card>

        {/* Active Doubts */}
        <Card className="p-5 border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Doubts</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{activeDoubtsCount}</span>
            <span className="text-xs font-semibold text-slate-500">active inquiries</span>
          </div>
          <button
            onClick={() => navigate('/doubts')}
            className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1 mt-1"
          >
            Ask or View Doubts <ArrowRight size={12} />
          </button>
        </Card>
      </div>

      {/* ── Main Section: Today's Schedule & Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Class Schedule & Live Check-In (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-indigo-600" /> Today's Lecture Schedule
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/attendance')}
              className="text-xs font-bold flex items-center gap-1"
            >
              Full Attendance View <ArrowRight size={13} />
            </Button>
          </div>

          {loading ? (
            <Card className="p-12 text-center border border-slate-200">
              <Loader2 size={32} className="mx-auto text-indigo-600 animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-600">Loading your schedule...</p>
            </Card>
          ) : lectures.length === 0 ? (
            <Card className="p-10 text-center border border-slate-200/80 bg-white space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Lectures Scheduled Today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have no scheduled lectures for today. Use this time to catch up on pending homework or ask doubts!
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/homework')}>
                  View Homework
                </Button>
                <Button size="sm" variant="primary" onClick={() => navigate('/doubts')}>
                  Ask a Doubt
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {lectures.map(lec => {
                const isLocked = Boolean(lec.attendance_taken === 1 && lec.attendance_locked_at);
                const isOpen = Boolean(Number(lec.student_checkin_open) === 1);
                const isGeofenced = Boolean(Number(lec.geofence_enabled) === 1);
                const hasCheckedIn = Boolean(lec.student_checkin_at);
                const errorMsg = checkinErrors[lec.id];

                return (
                  <Card key={lec.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900">{lec.subject_name}</h3>
                          {lec.attendance_status === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                          {isGeofenced && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <MapPin size={11} /> Geo-Fence {lec.geofence_radius_meters || 100}m
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span><strong>Time:</strong> {formatTime(lec.start_time)} – {formatTime(lec.end_time)}</span>
                          {lec.teacher_name && <span>• <strong>Faculty:</strong> {lec.teacher_name}</span>}
                          {lec.branch_name && <span>• <strong>Branch:</strong> {lec.branch_name}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Check-In States */}
                    {hasCheckedIn ? (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck size={16} className="text-emerald-600" />
                          <span>
                            Check-in verified
                            {lec.student_checkin_geofence_status === 'INSIDE' && lec.student_checkin_distance_meters != null
                              ? ` (${Math.round(Number(lec.student_checkin_distance_meters))}m from campus)`
                              : ''}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-700">
                          {new Date(lec.student_checkin_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : isLocked ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-2">
                        <Lock size={14} className="text-slate-400" />
                        Attendance locked by teacher.
                      </div>
                    ) : isOpen ? (
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <div className="relative flex-1">
                            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Enter 4-digit PIN"
                              value={pins[lec.id] || ''}
                              onChange={e => setPins(prev => ({ ...prev, [lec.id]: e.target.value }))}
                              className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-xl text-xs font-mono font-bold tracking-widest bg-white text-slate-900 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => handleCheckIn(lec)}
                            disabled={checkingInId === lec.id}
                            className="text-xs font-bold shrink-0 flex items-center gap-1.5"
                          >
                            {checkingInId === lec.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <MapPin size={13} />
                            )}
                            {checkingInId === lec.id ? 'Checking...' : 'Check In With Location'}
                          </Button>
                        </div>
                        {errorMsg && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-1.5">
                            <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
                            <span>{errorMsg}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                        <Clock size={13} className="text-amber-600" />
                        Check-in will open when your teacher starts the class session.
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Homework & Doubts */}
        <div className="space-y-6">
          {/* Pending Homework Mini List */}
          <Card className="p-5 border border-slate-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" /> Homework & Tasks
              </h3>
              <button
                onClick={() => navigate('/homework')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View all ({homeworks.length})
              </button>
            </div>

            {homeworks.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No active homework assignments.</p>
            ) : (
              <div className="space-y-2">
                {homeworks.slice(0, 3).map(hw => {
                  const subStatus = hw.mySubmission?.status || 'Pending';
                  return (
                    <div
                      key={hw.id}
                      onClick={() => navigate('/homework')}
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{hw.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${subStatus === 'Graded' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          subStatus === 'Submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {subStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{hw.subjectName || 'General'}</span>
                        {hw.dueDate && (
                          <span>Due: {new Date(hw.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent Doubts Card */}
          <Card className="p-5 border border-slate-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-purple-600" /> My Recent Doubts
              </h3>
              <button
                onClick={() => navigate('/doubts')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View all ({doubts.length})
              </button>
            </div>

            {doubts.length === 0 ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-slate-500">No doubts asked yet.</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/doubts')} className="text-xs font-bold">
                  Ask a Doubt
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {doubts.slice(0, 3).map(d => (
                  <div
                    key={d.id}
                    onClick={() => navigate('/doubts')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{d.topic}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === 2 || d.statusLabel === 'Resolved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                        {d.statusLabel || (d.status === 2 ? 'Resolved' : 'Active')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{d.subject?.name || 'General'} • {d.teacher?.name || 'Teacher'}</span>
                      {d.replyCount != null && d.replyCount > 0 && (
                        <span>{d.replyCount} {d.replyCount === 1 ? 'reply' : 'replies'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
export default StudentDashboard;

