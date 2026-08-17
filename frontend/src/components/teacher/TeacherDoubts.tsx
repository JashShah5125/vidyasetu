import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { HelpCircle, CheckCircle2, MessageCircle, Send, Paperclip, Clock, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { TEACHER_ASSIGNED_BATCHES } from '../../data/mockData';

export const TeacherDoubts: React.FC = () => {
  const { doubts, addDoubtMessage, updateDoubtStatus, batches, students } = useApp();
  
  // States
  const [activeDoubtId, setActiveDoubtId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message or doubt selection
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeDoubtId, doubts]);

  // Derived Data (Scope to teacher's assigned batches)
  const teacherBatchesInfo = useMemo(() => {
    return batches.filter(b => TEACHER_ASSIGNED_BATCHES.includes(b.name));
  }, [batches]);

  const uniqueCourses = Array.from(new Set(teacherBatchesInfo.map(b => b.course)));
  const uniquePrograms = Array.from(new Set(teacherBatchesInfo.filter(b => filterCourse === 'All' || b.course === filterCourse).map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(teacherBatchesInfo.filter(b => (filterCourse === 'All' || b.course === filterCourse) && (filterProgram === 'All' || b.program === filterProgram)).map(b => b.level).filter(Boolean))) as string[];
  const availableBatches = teacherBatchesInfo.filter(b => {
      const matchC = filterCourse === 'All' || b.course === filterCourse;
      const matchP = filterProgram === 'All' || b.program === filterProgram;
      const matchL = filterLevel === 'All' || b.level === filterLevel;
      return matchC && matchP && matchL;
  });
  const uniqueBatches = Array.from(new Set(availableBatches.map(b => b.name)));
  
  const allowedBatchesSet = new Set(uniqueBatches);

  const teacherDoubts = useMemo(() => {
    return doubts.filter(d => TEACHER_ASSIGNED_BATCHES.includes(d.batch));
  }, [doubts]);

  const uniqueSubjects = Array.from(new Set(teacherDoubts.filter(d => allowedBatchesSet.has(d.batch)).map(d => d.subject)));

  // Filtered Doubts
  const filteredDoubts = useMemo(() => {
    return teacherDoubts.filter(d => {
      const matchSearch = d.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.messages.some(m => m.text.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filterStatus === 'All' || d.status === filterStatus;
      const matchSubject = filterSubject === 'All' || d.subject === filterSubject;
      const matchBatch = filterBatch === 'All' ? allowedBatchesSet.has(d.batch) : d.batch === filterBatch;
      
      return matchSearch && matchStatus && matchSubject && matchBatch;
    });
  }, [teacherDoubts, searchTerm, filterStatus, filterSubject, filterBatch, allowedBatchesSet]);

  // Grouped Doubts for Inbox
  const reopenedDoubts = filteredDoubts.filter(d => d.status === 'Reopened');
  const pendingDoubts = filteredDoubts.filter(d => d.status === 'Pending');
  const inProgressDoubts = filteredDoubts.filter(d => d.status === 'In Progress');
  const resolvedDoubts = filteredDoubts.filter(d => d.status === 'Resolved');

  const orderedDoubts = [
    ...reopenedDoubts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    ...pendingDoubts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    ...inProgressDoubts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    ...resolvedDoubts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  ];

  const activeDoubt = teacherDoubts.find(d => d.id === activeDoubtId);
  const activeStudentInfo = activeDoubt ? students.find(s => s.id === activeDoubt.studentId || s.studentId === activeDoubt.studentId) : null;
  const activeBatchInfo = activeDoubt ? batches.find(b => b.name === activeDoubt.batch) : null;

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDoubtId && replyText.trim()) {
      addDoubtMessage(activeDoubtId, 'teacher', replyText.trim());
      setReplyText('');
    }
  };

  const handleAttachment = () => {
    // Mock attachment handler
    if (activeDoubtId) {
      addDoubtMessage(activeDoubtId, 'teacher', 'Please refer to the attached reference material.', ['reference_material.pdf']);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>;
      case 'In Progress': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">In Progress</span>;
      case 'Reopened': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Reopened</span>;
      case 'Resolved': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Resolved</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Doubt Resolution</h2>
        <p className="text-sm text-slate-500 mt-1">Answer student academic queries and manage doubt conversations.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT PANE: INBOX */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3 flex-none">
            <Input 
              label="Search"
              placeholder="Search student, doubt, subject..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select 
                label="Course" 
                value={filterCourse} 
                onChange={e => { setFilterCourse(e.target.value); setFilterProgram('All'); setFilterLevel('All'); setFilterBatch('All'); }}
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select 
                label="Program" 
                value={filterProgram} 
                onChange={e => { setFilterProgram(e.target.value); setFilterLevel('All'); setFilterBatch('All'); }}
                options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
              />
              <Select 
                label="Level" 
                value={filterLevel} 
                onChange={e => { setFilterLevel(e.target.value); setFilterBatch('All'); }}
                options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
              />
              <Select 
                label="Batch" 
                value={filterBatch} 
                onChange={e => setFilterBatch(e.target.value)}
                options={[{ value: 'All', label: 'All Batches' }, ...uniqueBatches.map(b => ({ value: b, label: b }))]}
              />
              <Select 
                label="Subject" 
                value={filterSubject} 
                onChange={e => setFilterSubject(e.target.value)}
                options={[{ value: 'All', label: 'All Subjects' }, ...uniqueSubjects.map(s => ({ value: s, label: s }))]}
              />
              <Select 
                label="Status" 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Reopened', label: 'Reopened' },
                  { value: 'Resolved', label: 'Resolved' },
                ]}
              />
            </div>
            {(searchTerm || filterStatus !== 'All' || filterCourse !== 'All' || filterProgram !== 'All' || filterLevel !== 'All' || filterSubject !== 'All' || filterBatch !== 'All') && (
              <div className="text-right">
                <button 
                  onClick={() => { setSearchTerm(''); setFilterStatus('All'); setFilterCourse('All'); setFilterProgram('All'); setFilterLevel('All'); setFilterSubject('All'); setFilterBatch('All'); }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {orderedDoubts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="font-medium">No doubts found.</p>
              </div>
            ) : (
              orderedDoubts.map(d => (
                <div 
                  key={d.id}
                  onClick={() => setActiveDoubtId(d.id)}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
                    activeDoubtId === d.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  } ${d.status === 'Resolved' ? 'opacity-75' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">{d.studentName}</span>
                    <span className="whitespace-nowrap">{getStatusBadge(d.status)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-slate-500 font-medium truncate">{d.subject} • <span className="text-blue-700">{d.batch}</span></div>
                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(d.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {d.messages[d.messages.length - 1]?.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE: WORKSPACE */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative">
          {activeDoubt ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 flex-none">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-display font-bold text-slate-900">{activeDoubt.studentName}</h3>
                    <span className="text-xs font-mono font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded bg-white">
                      {activeDoubt.studentId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600 font-medium">
                    <span>{activeDoubt.subject}</span>
                    {activeBatchInfo && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{activeBatchInfo.course}</span>
                        <span className="text-slate-300">•</span>
                        <span>{activeBatchInfo.program}</span>
                        <span className="text-slate-300">•</span>
                        <span>{activeBatchInfo.level}</span>
                      </>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-700 font-bold">{activeDoubt.batch}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                    {getStatusBadge(activeDoubt.status)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    Received: {new Date(activeDoubt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
              
              {/* Conversation Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30" ref={chatScrollRef}>
                
                {/* Original Question Segment */}
                {activeDoubt.messages.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <HelpCircle size={12} /> Student Question
                      </div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    <div className="bg-white border border-indigo-100 shadow-sm rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-indigo-900">{activeDoubt.studentName}</div>
                        <div className="text-xs font-medium text-slate-400">{activeDoubt.messages[0].time}</div>
                      </div>
                      <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{activeDoubt.messages[0].text}</p>
                      {activeDoubt.messages[0].attachments && activeDoubt.messages[0].attachments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {activeDoubt.messages[0].attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded border border-indigo-100 text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors">
                              <Paperclip size={14} /> {att}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Follow up conversation */}
                {activeDoubt.messages.length > 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversation</div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    {activeDoubt.messages.slice(1).map((m) => (
                      <div key={m.id} className={`flex ${m.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                          m.sender === 'teacher' 
                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-900/10' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                        }`}>
                          <div className={`text-[10px] font-bold mb-1 flex justify-between gap-4 ${m.sender === 'teacher' ? 'text-blue-200' : 'text-slate-400'}`}>
                            <span>{m.sender === 'teacher' ? 'YOU' : activeDoubt.studentName.toUpperCase()}</span>
                            <span>{m.time}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {m.attachments.map((att, i) => (
                                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer transition-colors ${
                                  m.sender === 'teacher' 
                                    ? 'bg-blue-700/50 border-blue-500/50 hover:bg-blue-700' 
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}>
                                  <Paperclip size={14} /> {att}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="p-4 bg-white border-t border-slate-200 flex-none">
                {activeDoubt.status === 'Resolved' ? (
                  <div className="text-center py-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                    <p className="text-sm font-medium text-slate-500 mb-2">This doubt is marked as resolved.</p>
                    <Button variant="secondary" size="sm" onClick={() => updateDoubtStatus(activeDoubt.id, 'Reopened')} className="gap-2">
                      <RefreshCw size={14} /> Reopen Thread
                    </Button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleReplySubmit} className="flex flex-col gap-3">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your response..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={handleAttachment} className="gap-2">
                            <Paperclip size={16} /> Attach
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => updateDoubtStatus(activeDoubt.id, 'Resolved')}
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                          >
                            Mark as Resolved
                          </Button>
                          <Button type="submit" variant="primary" className="px-6 gap-2" disabled={!replyText.trim()}>
                            <Send size={16} /> Send
                          </Button>
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <MessageCircle size={48} className="mb-4 text-slate-300" />
              <p className="font-medium text-slate-600 text-lg">Select a doubt thread</p>
              <p className="text-sm mt-1">Choose a student question from the inbox to read and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
