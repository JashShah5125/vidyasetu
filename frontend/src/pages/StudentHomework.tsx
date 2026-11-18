import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Upload,
  XCircle
} from 'lucide-react';
import { homeworkApi } from '../services/homeworkApi';
import type { MyHomeworkItem } from '../services/homeworkApi';

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'Graded': return 'bg-green-100 text-green-800';
    case 'Submitted': return 'bg-blue-100 text-blue-800';
    case 'Closed': return 'bg-gray-100 text-gray-800';
    default: return 'bg-amber-100 text-amber-800';
  }
};

const getFileList = (files: any): string[] => {
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  if (typeof files === 'string') {
    try {
      const parsed = JSON.parse(files);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === 'string' && parsed) return [parsed];
    } catch {
      return files.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const isPdfFile = (url: string): boolean => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.pdf');
};

const isViewableInline = (url: string): boolean => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.txt'].some(ext => clean.endsWith(ext));
};

const getFileTypeLabel = (url: string): string => {
  if (!url) return 'File';
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'PDF Document';
  if (clean.endsWith('.xlsx') || clean.endsWith('.xls') || clean.endsWith('.csv')) return 'Spreadsheet';
  if (clean.endsWith('.doc') || clean.endsWith('.docx')) return 'Word Document';
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some(ext => clean.endsWith(ext))) return 'Image';
  if (clean.endsWith('.zip') || clean.endsWith('.rar')) return 'Archive ZIP';
  return 'Resource File';
};

const getFileDisplayName = (url: string): string => {
  if (!url) return 'Document';
  const name = url.split('/').pop() || 'Document';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

export const StudentHomework: React.FC = () => {
  const { addToast } = useApp();

  const [homeworks, setHomeworks] = useState<MyHomeworkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [selected, setSelected] = useState<MyHomeworkItem | null>(null);

  const [responseText, setResponseText] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const handleDownload = async (fileUrl: string, customName?: string) => {
    if (!fileUrl) return;
    setDownloadingUrl(fileUrl);
    try {
      const fileName = customName || fileUrl.split('/').pop() || 'document.pdf';
      const cleanFileName = decodeURIComponent(fileName);

      // Attempt blob download to ensure true browser file download
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('File download network error');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      addToast(`Downloaded ${cleanFileName}`, 'success');
    } catch (err) {
      console.warn('Direct blob download failed, falling back to window anchor:', err);
      // Fallback: direct browser anchor trigger with download attribute
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.download = customName || fileUrl.split('/').pop() || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingUrl(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await homeworkApi.getMyHomeworks();
      setHomeworks(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load homework.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (item: MyHomeworkItem) => {
    setSelected(item);
    setResponseText(item.mySubmission?.status === 'Graded' ? '' : '');
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (!responseText.trim() && files.length === 0) {
      addToast('Write a response or attach a file before submitting.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await homeworkApi.submitHomework(selected.id, responseText.trim(), files);
      addToast('Homework submitted successfully!', 'success');
      const fresh = await homeworkApi.getMyHomework(selected.id);
      setSelected(fresh);
      setHomeworks(prev => prev.map(h => (h.id === fresh.id ? fresh : h)));
      setResponseText('');
      setFiles([]);
    } catch (err: any) {
      addToast(err.message || 'Failed to submit homework.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = homeworks.filter(h => {
    if (filter === 'pending') return !h.mySubmission;
    if (filter === 'submitted') return h.mySubmission?.status === 'Submitted';
    if (filter === 'graded') return h.mySubmission?.status === 'Graded';
    return true;
  });

  // ─── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    const sub = selected.mySubmission;
    const canSubmit = selected.status === 'Published' && sub?.status !== 'Graded';
    const teacherFiles = getFileList(selected.files);
    const subFiles = getFileList(sub?.files);

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">{selected.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {selected.subjectName} · {selected.batchNames.join(', ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Subject</dt><dd className="font-medium">{selected.subjectName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium">{selected.status}</dd></div>
                <div className="flex justify-between items-start"><dt className="text-slate-500">Due Date</dt><dd className="font-medium flex items-center gap-1"><Calendar size={13} />{selected.dueDate}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max Marks</dt><dd className="font-medium">{selected.maxMarks ?? '—'}</dd></div>
              </dl>
              {selected.description && (
                <p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selected.description}
                </p>
              )}

              {/* Teacher Attachments / Question Paper PDF */}
              {teacherFiles.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-600" />
                      Teacher Attachments ({teacherFiles.length})
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {teacherFiles.map((f, i) => {
                      const isPdf = isPdfFile(f);
                      const name = getFileDisplayName(f);
                      const isDownloading = downloadingUrl === f;

                      return (
                        <div
                          key={i}
                          className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-xl transition-all space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isPdf ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate" title={name}>
                                {name}
                              </p>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                {getFileTypeLabel(f)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => handleDownload(f, name)}
                              disabled={isDownloading}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Download to your device"
                            >
                              {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                              <span>{isPdf ? 'Download PDF' : 'Download File'}</span>
                            </button>
                            {isViewableInline(f) && (
                              <a
                                href={f}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1 h-8 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                                title="Open in new tab"
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {sub && (
              <Card className={`p-5 border ${sub.status === 'Graded' ? 'border-green-200 bg-green-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-green-600" /> My Submission
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(sub.status)}`}>{sub.status}</span>
                  </div>
                  {sub.status === 'Graded' && (
                    <div className="flex justify-between"><span className="text-slate-500">Marks</span><span className="font-semibold text-slate-900">{sub.marksObtained ?? '—'} {selected.maxMarks ? `/ ${selected.maxMarks}` : ''}</span></div>
                  )}
                  {sub.feedback && (
                    <p className="text-slate-600 bg-white rounded-lg p-2.5 border border-slate-100 whitespace-pre-line text-xs">"{sub.feedback}"</p>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="font-medium">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}</span></div>
                  {sub.isLate && <p className="text-xs text-amber-600 font-semibold">Submitted after the due date</p>}

                  {/* Student Submitted Files */}
                  {subFiles.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-200/60">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Submitted Files</span>
                      <div className="space-y-1.5">
                        {subFiles.map((sf, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 text-xs">
                            <span className="truncate text-slate-700 flex items-center gap-1.5 font-medium">
                              <Paperclip size={12} className="text-slate-400" />
                              {getFileDisplayName(sf)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownload(sf, getFileDisplayName(sf))}
                              className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                              title="Download submitted file"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {canSubmit ? (
              <Card className="p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Send size={15} className="text-blue-600" /> {sub ? 'Resubmit' : 'Submit'} Response
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Your Response</label>
                    <textarea
                      rows={5}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="Write your answer here..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Attachment Files</label>
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer">
                      <Upload size={18} />
                      Click to upload files (PDF, image, doc, zip)
                      <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
                    </label>
                    {files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
                            <span className="flex items-center gap-2 text-blue-700"><Paperclip size={14} /> {f.name}</span>
                            <button type="button" className="text-red-500 hover:text-red-700 cursor-pointer" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                              <XCircle size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      className="bg-blue-600 text-white cursor-pointer"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      {sub ? 'Resubmit' : 'Submit Homework'}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                {selected.status === 'Closed' ? (
                  <p className="text-slate-500 text-sm">This homework has been closed by your teacher. Submissions are no longer accepted.</p>
                ) : sub?.status === 'Graded' ? (
                  <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" /> This submission has been graded. Thank you!
                  </p>
                ) : (
                  <p className="text-slate-500 text-sm">No submission pending for view.</p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">My Homework</h2>
          <p className="text-sm text-slate-500 mt-1">View and submit assignments published to your batches</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {([['all', 'All'], ['pending', 'Pending'], ['submitted', 'Submitted'], ['graded', 'Graded']] as const).map(([key, label]) => (
          <button
            key={key}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              filter === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm">Loading homework...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center text-slate-500">
          <ClipboardList className="w-10 h-10 text-slate-300 mb-3 mx-auto" />
          <p>No homework found for this filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(h => (
            <Card key={h.id} className="cursor-pointer hover:shadow-md transition-shadow border-slate-200">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <BookOpen size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wide">{h.subjectName}</span>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(h.mySubmission?.status || h.status)}`}>
                    {h.mySubmission?.status || (h.status === 'Published' ? 'Pending' : 'Closed')}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 mt-2 mb-1 truncate">{h.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{h.batchNames.join(', ')}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={13} /> Due {h.dueDate}</span>
                  {h.mySubmission?.status === 'Graded' && h.mySubmission.marksObtained !== null && (
                    <span className="font-semibold text-green-700">{h.mySubmission.marksObtained}{h.maxMarks ? ` / ${h.maxMarks}` : ''}</span>
                  )}
                </div>

                {/* Teacher attachment badge & quick download */}
                {h.files && getFileList(h.files).length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                      <FileText size={11} /> {getFileList(h.files).some(isPdfFile) ? 'PDF Attached' : 'File Attached'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const list = getFileList(h.files);
                        handleDownload(list[0], getFileDisplayName(list[0]));
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      <Download size={12} /> {getFileList(h.files).some(isPdfFile) ? 'Download PDF' : 'Download'}
                    </button>
                  </div>
                )}

                <Button
                  className="w-full mt-4 bg-blue-600 text-white cursor-pointer"
                  onClick={() => openDetail(h)}
                >
                  {h.mySubmission?.status === 'Graded' ? 'View Result' : h.mySubmission?.status === 'Submitted' ? 'View / Resubmit' : 'View & Submit'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}