import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { academicEventsApi } from '../../services/academicEventsApi';
import type { 
  AcademicEventItem, 
  AcademicEventType, 
  CreateAcademicEventPayload 
} from '../../services/academicEventsApi';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  MapPin, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  PartyPopper, 
  GraduationCap, 
  Users, 
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface AcademicCalendarManagerProps {
  embedded?: boolean;
}

export const AcademicCalendarManager: React.FC<AcademicCalendarManagerProps> = ({ embedded = false }) => {
  const { branches, addToast, currentUser } = useApp();

  const [events, setEvents] = useState<AcademicEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEventItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deletingEvent, setDeletingEvent] = useState<AcademicEventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateAcademicEventPayload>({
    title: '',
    type: 'EVENT',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    venue: '',
    description: '',
    branchId: null
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await academicEventsApi.getEvents({
        branchId: selectedBranch !== 'All' ? selectedBranch : undefined,
        type: selectedType !== 'All' ? selectedType : undefined,
        search: search.trim() || undefined
      });
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load academic events:', err);
      addToast(err?.response?.data?.message || 'Failed to load academic calendar events.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedType, search, addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingEvent(null);
    setFormData({
      title: '',
      type: 'EVENT',
      startDate: today,
      endDate: today,
      startTime: '',
      endTime: '',
      venue: '',
      description: '',
      branchId: null
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (evt: AcademicEventItem) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title,
      type: evt.type,
      startDate: evt.startDate,
      endDate: evt.endDate || evt.startDate,
      startTime: evt.startTime || '',
      endTime: evt.endTime || '',
      venue: evt.venue || '',
      description: evt.description || '',
      branchId: evt.branchId || null
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.title.trim()) {
      errors.title = 'Event title is required.';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start date is required.';
    }
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = 'End date cannot be earlier than start date.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload: CreateAcademicEventPayload = {
        title: formData.title.trim(),
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        venue: formData.venue?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        branchId: formData.branchId ? Number(formData.branchId) : null
      };

      if (editingEvent) {
        await academicEventsApi.updateEvent(editingEvent.id, payload);
        addToast(`Event "${payload.title}" updated successfully.`, 'success');
      } else {
        await academicEventsApi.createEvent(payload);
        addToast(`Event "${payload.title}" created successfully.`, 'success');
      }

      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      addToast(err?.response?.data?.message || 'Failed to save event.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      await academicEventsApi.deleteEvent(deletingEvent.id);
      addToast(`Event "${deletingEvent.title}" deleted successfully.`, 'success');
      setDeletingEvent(null);
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      addToast(err?.response?.data?.message || 'Failed to delete event.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats KPI
  const stats = useMemo(() => {
    const total = events.length;
    const exams = events.filter(e => e.type === 'EXAM').length;
    const holidays = events.filter(e => e.type === 'HOLIDAY').length;
    const meetings = events.filter(e => e.type === 'MEETING').length;
    return { total, exams, holidays, meetings };
  }, [events]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, selectedBranch]);

  const totalPages = Math.max(1, Math.ceil(events.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return events.slice(startIndex, startIndex + pageSize);
  }, [events, currentPage, pageSize]);

  const getTypeBadge = (type: AcademicEventType) => {
    switch (type) {
      case 'EXAM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <GraduationCap size={13} /> EXAM
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PartyPopper size={13} /> HOLIDAY
          </span>
        );
      case 'MEETING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Users size={13} /> MEETING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles size={13} /> EVENT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarDays className="text-blue-600" size={26} />
              Academic Calendar & Events
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure institute examinations, official holidays, parent-teacher meets, and campus activities.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Event / Holiday</span>
          </Button>
        </div>
      )}

      {/* Embedded Title if rendered inside another page */}
      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="text-blue-600" size={20} />
              Institute Academic Calendar & Holidays
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Events created here synchronize directly with teacher schedules and attendance calendars.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Event / Holiday</span>
          </Button>
        </div>
      )}

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Events</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">Current academic cycle</div>
        </Card>

        <Card className="p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assessments / Exams</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <GraduationCap size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{stats.exams}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">Tests and examinations</div>
        </Card>

        <Card className="p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Holidays</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <PartyPopper size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.holidays}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">Official non-working days</div>
        </Card>

        <Card className="p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meetings / PTM</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">{stats.meetings}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">Parent & faculty meets</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-slate-200 bg-white shadow-2xs rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by event title, venue, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="All">All Event Types</option>
              <option value="EXAM">Exams & Tests</option>
              <option value="HOLIDAY">Official Holidays</option>
              <option value="MEETING">Meetings & PTM</option>
              <option value="EVENT">Campus Events</option>
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchEvents}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              title="Refresh events list"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Events Table / Card List */}
      <Card className="border border-slate-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin text-blue-600" size={28} />
            <span className="text-sm font-semibold text-slate-500">Loading academic events...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <h4 className="text-base font-bold text-slate-700">No Academic Events Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No calendar events or holidays match your current filter criteria.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={openCreateModal}
              className="mt-2 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              + Create First Event
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Event Details</th>
                  <th className="px-5 py-3.5">Date & Duration</th>
                  <th className="px-5 py-3.5">Venue / Branch</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedEvents.map((evt) => {
                  const isRange = evt.endDate && evt.endDate !== evt.startDate;
                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        {getTypeBadge(evt.type)}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-slate-900">{evt.title}</div>
                        {evt.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {evt.description}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span>{evt.startDate}</span>
                          {isRange && (
                            <>
                              <span className="text-slate-400">→</span>
                              <span>{evt.endDate}</span>
                            </>
                          )}
                        </div>
                        {(evt.startTime || evt.endTime) && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1">
                            <Clock size={12} />
                            <span>
                              {evt.startTime || '00:00'} - {evt.endTime || 'End of Day'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>{evt.venue || 'All Branches'}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {evt.branchName ? `Branch: ${evt.branchName}` : 'Institute-Wide'}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(evt)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEvent(evt)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {events.length > 0 && !loading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={events.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        )}
      </Card>

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Edit Academic Event' : 'Add New Academic Event / Holiday'}
        description="Configure calendar items for academic testing, holidays, and institution meets."
        size="lg"
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Term 1 Mid-Term Assessment Week or Gandhi Jayanti"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                formErrors.title ? 'border-rose-400' : 'border-slate-200'
              }`}
            />
            {formErrors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.title}</p>}
          </div>

          {/* Type and Branch Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Event Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AcademicEventType })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="EVENT">Campus Event / Activity</option>
                <option value="EXAM">Examination / Assessment</option>
                <option value="HOLIDAY">Official Holiday (No Lectures)</option>
                <option value="MEETING">Parent-Teacher Meeting (PTM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Branch
              </label>
              <select
                value={formData.branchId ? String(formData.branchId) : ''}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="">All Branches (Institute-Wide)</option>
                {branches.map(b => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData({
                    ...formData,
                    startDate: newStart,
                    endDate: formData.endDate && formData.endDate < newStart ? newStart : formData.endDate
                  });
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  formErrors.startDate ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
              {formErrors.startDate && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.startDate}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate || ''}
                min={formData.startDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  formErrors.endDate ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
              {formErrors.endDate && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.endDate}</p>}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Time (Optional)
              </label>
              <input
                type="time"
                value={formData.startTime || ''}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Time (Optional)
              </label>
              <input
                type="time"
                value={formData.endTime || ''}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Venue / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Main Auditorium / All Branches / Online Zoom"
              value={formData.venue || ''}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Provide event details, student guidelines, or schedule remarks..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
            >
              {isSaving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        title="Delete Academic Event"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-100">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 font-medium leading-relaxed">
              Are you sure you want to delete <strong className="font-bold text-rose-900">"{deletingEvent?.title}"</strong>? This will remove the event from all faculty timetables and academic calendars.
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingEvent(null)}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
