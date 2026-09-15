import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  HelpCircle,
  MessageSquare,
  Send,
  Paperclip,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Search,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  User,
  GraduationCap
} from 'lucide-react';
import { doubtApi } from '../services/doubtApi';
import type { DoubtItem, EligibleTeacher, DoubtReply } from '../services/doubtApi';

export const StudentDoubts: React.FC = () => {
  const { addToast, currentUser } = useApp();

  // Data states
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtItem | null>(null);
  const [eligibleTeachers, setEligibleTeachers] = useState<EligibleTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Reply form states
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // New Doubt Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTeacherId, setModalTeacherId] = useState<number | ''>('');
  const [modalAssignmentKey, setModalAssignmentKey] = useState<string>('');
  const [modalTopic, setModalTopic] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalFiles, setModalFiles] = useState<File[]>([]);
  const [isSubmittingDoubt, setIsSubmittingDoubt] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Image preview modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Load initial data
  const loadDoubts = async (retainSelectedId?: number) => {
    try {
      setLoading(true);
      const [doubtsData, teachersData] = await Promise.all([
        doubtApi.getStudentDoubts(),
        doubtApi.getEligibleTeachers()
      ]);
      setDoubts(doubtsData);
      setEligibleTeachers(teachersData);

      const targetId = retainSelectedId || selectedDoubt?.id || (doubtsData.length > 0 ? doubtsData[0].id : null);
      if (targetId) {
        loadDoubtThread(targetId);
      } else {
        setSelectedDoubt(null);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load doubts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDoubtThread = async (doubtId: number) => {
    try {
      setLoadingThread(true);
      const fullDoubt = await doubtApi.getStudentDoubt(doubtId);
      setSelectedDoubt(fullDoubt);
      // Update unread count in local list
      setDoubts(prev => prev.map(d => (d.id === doubtId ? { ...d, unreadCount: 0, status: fullDoubt.status, statusLabel: fullDoubt.statusLabel } : d)));
    } catch (err: any) {
      addToast(err.message || 'Failed to load thread.', 'error');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    loadDoubts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll chat to bottom when replies update
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedDoubt?.replies, loadingThread]);

  // Derived filters
  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    doubts.forEach(d => {
      if (d.subject?.name) subs.add(d.subject.name);
    });
    return Array.from(subs);
  }, [doubts]);

  const filteredDoubts = useMemo(() => {
    return doubts.filter(d => {
      const matchSearch =
        d.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.lastMessage && d.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchStatus = true;
      if (statusFilter !== 'All') {
        const statusCode = Number(statusFilter);
        matchStatus = d.status === statusCode;
      }

      const matchSubject = subjectFilter === 'All' || d.subject.name === subjectFilter;

      return matchSearch && matchStatus && matchSubject;
    });
  }, [doubts, searchTerm, statusFilter, subjectFilter]);

  // Cascading dropdown options for New Doubt Modal
  const selectedTeacherAssignments = useMemo(() => {
    if (!modalTeacherId) return [];
    const t = eligibleTeachers.find(item => item.teacherId === Number(modalTeacherId));
    return t ? t.assignments : [];
  }, [modalTeacherId, eligibleTeachers]);

  // Handle Send Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoubt) return;
    if (!replyMessage.trim() && replyFiles.length === 0) {
      addToast('Please type a message or attach a file.', 'error');
      return;
    }

    try {
      setIsSendingReply(true);
      const formData = new FormData();
      formData.append('message', replyMessage.trim());
      replyFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const updated = await doubtApi.addStudentReply(selectedDoubt.id, formData);
      setSelectedDoubt(updated);
      setReplyMessage('');
      setReplyFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Update list status if changed
      setDoubts(prev => prev.map(d => (d.id === updated.id ? {
        ...d,
        status: updated.status,
        statusLabel: updated.statusLabel,
        lastMessage: replyMessage.trim() || 'Attachment',
        updatedAt: updated.updatedAt
      } : d)));

      addToast('Reply sent.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to send reply.', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle Status Update (e.g. mark resolved)
  const handleUpdateStatus = async (newStatus: number) => {
    if (!selectedDoubt) return;
    try {
      const updated = await doubtApi.updateStudentDoubtStatus(selectedDoubt.id, newStatus);
      setSelectedDoubt(updated);
      setDoubts(prev => prev.map(d => (d.id === updated.id ? {
        ...d,
        status: updated.status,
        statusLabel: updated.statusLabel
      } : d)));
      addToast(`Doubt marked as ${updated.statusLabel}.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update status.', 'error');
    }
  };

  // Handle New Doubt Submission
  const handleCreateDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTeacherId || !modalAssignmentKey) {
      addToast('Please select a teacher and the relevant batch/subject.', 'error');
      return;
    }
    if (!modalTopic.trim()) {
      addToast('Please provide a topic title.', 'error');
      return;
    }
    if (!modalMessage.trim() && modalFiles.length === 0) {
      addToast('Please enter your question or attach files.', 'error');
      return;
    }

    const [batchIdStr, subjectIdStr] = modalAssignmentKey.split(':');
    const batchId = Number(batchIdStr);
    const subjectId = Number(subjectIdStr);

    try {
      setIsSubmittingDoubt(true);
      const formData = new FormData();
      formData.append('assignedTeacherId', String(modalTeacherId));
      formData.append('batchId', String(batchId));
      formData.append('subjectId', String(subjectId));
      formData.append('topic', modalTopic.trim());
      formData.append('message', modalMessage.trim());
      modalFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const created = await doubtApi.createStudentDoubt(formData);
      addToast('Doubt submitted to teacher successfully.', 'success');
      setIsModalOpen(false);

      // Reset modal fields
      setModalTeacherId('');
      setModalAssignmentKey('');
      setModalTopic('');
      setModalMessage('');
      setModalFiles([]);

      // Reload list and select created doubt
      await loadDoubts(created.id);
    } catch (err: any) {
      addToast(err.message || 'Failed to submit doubt.', 'error');
    } finally {
      setIsSubmittingDoubt(false);
    }
  };

  const getStatusBadge = (statusCode: number, statusLabel: string) => {
    switch (statusCode) {
      case 0:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Open</span>;
      case 1:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">In Progress</span>;
      case 2:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Resolved</span>;
      case 3:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">Reopened</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{statusLabel || 'Open'}</span>;
    }
  };

  const isImageFile = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-indigo-600" />
            My Doubts & Discussions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ask questions directly to your assigned subject teachers and get clarifications with image & file attachments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDoubts(selectedDoubt?.id)}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ask a Doubt
          </Button>
        </div>
      </div>

      {/* Main Split Pane Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Doubts Inbox & Filters (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filter Bar */}
          <Card className="p-3.5 space-y-3 border border-gray-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search topics, teacher or subject..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: '0', label: 'Open' },
                  { value: '1', label: 'In Progress' },
                  { value: '2', label: 'Resolved' },
                  { value: '3', label: 'Reopened' }
                ]}
                className="h-9 text-xs"
              />

              <Select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Subjects' },
                  ...uniqueSubjects.map(s => ({ value: s, label: s }))
                ]}
                className="h-9 text-xs"
              />
            </div>
          </Card>

          {/* Doubt List */}
          <Card className="divide-y divide-gray-100 max-h-[620px] overflow-y-auto border border-gray-200 bg-white shadow-sm">
            {loading && doubts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading your doubts...
              </div>
            ) : filteredDoubts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="font-medium text-gray-700">No doubts found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm || statusFilter !== 'All' || subjectFilter !== 'All'
                    ? 'Try clearing the active filters'
                    : 'Click "Ask a Doubt" to post your first question to your teacher.'}
                </p>
              </div>
            ) : (
              filteredDoubts.map(doubt => {
                const isSelected = selectedDoubt?.id === doubt.id;
                return (
                  <div
                    key={doubt.id}
                    onClick={() => loadDoubtThread(doubt.id)}
                    className={`p-3.5 cursor-pointer transition-all hover:bg-indigo-50/50 ${
                      isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600 pl-2.5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                        {doubt.topic}
                      </h4>
                      {getStatusBadge(doubt.status, doubt.statusLabel)}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 flex-wrap">
                      <span className="font-medium text-gray-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        {doubt.teacher.name}
                      </span>
                      <span>•</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {doubt.subject.name}
                      </span>
                      <span>•</span>
                      <span className="text-gray-400 text-[11px]">
                        {doubt.batch.name}
                      </span>
                    </div>

                    {doubt.lastMessage && (
                      <p className="text-xs text-gray-600 line-clamp-1 mt-1.5">
                        {doubt.lastMessage}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(doubt.updatedAt || doubt.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {doubt.unreadCount && doubt.unreadCount > 0 ? (
                          <span className="bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                            {doubt.unreadCount} new
                          </span>
                        ) : null}
                        <span className="flex items-center gap-0.5 text-gray-500">
                          <MessageSquare className="w-3 h-3" />
                          {doubt.replyCount || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Right Column: Chat & Discussion Thread (7 cols) */}
        <div className="lg:col-span-7">
          {selectedDoubt ? (
            <Card className="flex flex-col h-[700px] border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50/70">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900 leading-snug">
                        {selectedDoubt.topic}
                      </h3>
                      {getStatusBadge(selectedDoubt.status, selectedDoubt.statusLabel)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-gray-800">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        Teacher: <span className="text-gray-900 font-semibold">{selectedDoubt.teacher.name}</span>
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{selectedDoubt.subject.name}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500">{selectedDoubt.batch.name}</span>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    {selectedDoubt.status !== 2 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(2)}
                        className="h-8 text-xs font-medium text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                        title="Mark this doubt as resolved"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Mark Resolved
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(3)}
                        className="h-8 text-xs font-medium text-purple-700 border-purple-300 hover:bg-purple-50 flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                        title="Reopen this doubt thread"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                        Reopen Doubt
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Thread Messages Area */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
              >
                {loadingThread ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-500" />
                    Loading discussion...
                  </div>
                ) : (
                  (selectedDoubt.replies || []).map((reply: DoubtReply) => {
                    const isStudent = reply.senderRole === 'student';
                    return (
                      <div
                        key={reply.id}
                        className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {reply.senderName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            isStudent ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isStudent ? 'You' : 'Teacher'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs text-sm leading-relaxed ${
                            isStudent
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs'
                          }`}
                        >
                          {reply.message && (
                            <p className="whitespace-pre-wrap">{reply.message}</p>
                          )}

                          {/* Attachments rendering */}
                          {reply.attachments && reply.attachments.length > 0 && (
                            <div className={`mt-2.5 pt-2 border-t space-y-2 ${
                              isStudent ? 'border-indigo-500/50' : 'border-gray-100'
                            }`}>
                              <div className="text-[11px] font-medium opacity-80 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                Attachments ({reply.attachments.length})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {reply.attachments.map((attUrl, idx) => {
                                  const isImg = isImageFile(attUrl);
                                  const filename = attUrl.split('/').pop() || 'Attachment';
                                  return isImg ? (
                                    <div
                                      key={idx}
                                      onClick={() => setPreviewImageUrl(attUrl)}
                                      className="group relative cursor-pointer rounded-lg overflow-hidden border border-black/10 bg-black/5 hover:opacity-90 transition-opacity"
                                    >
                                      <img
                                        src={attUrl}
                                        alt="attachment"
                                        className="w-24 h-24 object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                                        View
                                      </div>
                                    </div>
                                  ) : (
                                    <a
                                      key={idx}
                                      href={attUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors ${
                                        isStudent
                                          ? 'bg-indigo-700/60 hover:bg-indigo-700 border-indigo-400/40 text-white'
                                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                                      }`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span className="max-w-[130px] truncate">{filename}</span>
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Box */}
              <div className="p-3.5 border-t border-gray-200 bg-white">
                {/* Pending attachments previews */}
                {replyFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {replyFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-xs text-indigo-700"
                      >
                        {f.type.startsWith('image/') ? (
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        <span className="max-w-[150px] truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setReplyFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        if (replyFiles.length + newFiles.length > 5) {
                          addToast('Maximum 5 attachments allowed per reply.', 'error');
                          return;
                        }
                        setReplyFiles(prev => [...prev, ...newFiles]);
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image or file"
                    className="h-10 px-3 text-gray-500 hover:text-indigo-600"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Input
                    type="text"
                    placeholder="Type your message or clarification..."
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSendingReply || (!replyMessage.trim() && replyFiles.length === 0)}
                    className="h-10 px-4 flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            <Card className="h-[700px] border border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No Doubt Selected</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Select a doubt from the list on the left to view the complete conversation thread, or click "Ask a Doubt" to initiate a new query.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Ask a Doubt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Ask a Doubt to Your Teacher
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoubt} className="p-6 space-y-4">
              {/* Teacher Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Teacher *
                </label>
                <Select
                  value={String(modalTeacherId)}
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setModalTeacherId(val);
                    setModalAssignmentKey('');
                  }}
                  options={[
                    { value: '', label: '-- Choose Assigned Teacher --' },
                    ...eligibleTeachers.map(t => ({
                      value: String(t.teacherId),
                      label: t.teacherName
                    }))
                  ]}
                  className="w-full text-sm"
                  required
                />
              </div>

              {/* Batch & Subject Selector (Cascaded) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Batch & Subject *
                </label>
                <Select
                  value={modalAssignmentKey}
                  onChange={e => setModalAssignmentKey(e.target.value)}
                  disabled={!modalTeacherId || selectedTeacherAssignments.length === 0}
                  options={[
                    { value: '', label: !modalTeacherId ? 'Select a teacher first' : '-- Select Batch & Subject --' },
                    ...selectedTeacherAssignments.map(a => ({
                      value: `${a.batchId}:${a.subjectId}`,
                      label: `${a.subjectName} (${a.batchName})`
                    }))
                  ]}
                  className="w-full text-sm"
                  required
                />
              </div>

              {/* Topic / Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Topic / Doubt Summary *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Question on Chapter 3 Problem 12"
                  value={modalTopic}
                  onChange={e => setModalTopic(e.target.value)}
                  className="w-full text-sm"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Detailed Question / Message *
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain where you are stuck or provide the context of your question..."
                  value={modalMessage}
                  onChange={e => setModalMessage(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Attachment Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Attachments (Images, PDF, Documents — up to 5 files, max 10MB each)
                </label>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      if (modalFiles.length + newFiles.length > 5) {
                        addToast('Maximum 5 attachments allowed.', 'error');
                        return;
                      }
                      setModalFiles(prev => [...prev, ...newFiles]);
                    }
                  }}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-gray-600"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach Files ({modalFiles.length}/5)
                  </Button>
                </div>

                {modalFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {modalFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-xs text-indigo-700"
                      >
                        <span className="max-w-[150px] truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setModalFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingDoubt}
                  className="flex items-center gap-1.5"
                >
                  {isSubmittingDoubt ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Doubt
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
