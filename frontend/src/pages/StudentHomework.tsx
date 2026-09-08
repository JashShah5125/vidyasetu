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

export const StudentHomework: React.FC = () => {
  const { addToast } = useApp();

  const [homeworks, setHomeworks] = useState<MyHomeworkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [selected, setSelected] = useState<MyHomeworkItem | null>(null);

  const [responseText, setResponseText] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
                <p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selected.description}</p>
              )}
              {selected.files.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-bold text-slate-700 mb-2">Attachments</p>
                  <div className="space-y-2">
                    {selected.files.map((f, i) => (
                      <a key={i} href={f} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <Paperclip size={14} /> {f.split('/').pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {sub && (
              <Card className={`p-5 border ${sub.status === 'Graded' ? 'border-green-200 bg-green-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-green-600" /> My Submission
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(sub.status)}`}>{sub.status}</span>
                  </div>
                  {sub.status === 'Graded' && (
                    <div className="flex justify-between"><span className="text-slate-500">Marks</span><span className="font-semibold text-slate-900">{sub.marksObtained ?? '—'} {selected.maxMarks ? `/ ${selected.maxMarks}` : ''}</span></div>
                  )}
                  {sub.feedback && (
                    <p className="text-slate-600 bg-white rounded-lg p-2 border border-slate-100 whitespace-pre-line">" {sub.feedback}"</p>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="font-medium">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}</span></div>
                  {sub.isLate && <p className="text-xs text-amber-600 font-semibold">Submitted after the due date</p>}
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
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