import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { BookOpen, Calendar, HelpCircle, GraduationCap } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { currentUser, doubts, sendDoubtReply, addToast } = useApp();

  const unresolvedDoubts = doubts.filter(d => d.status === 'Pending');

  // Modal and response states
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [activeDoubtId, setActiveDoubtId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const paginatedDoubts = doubts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(doubts.length / itemsPerPage);

  const handleQuickAnswer = (id: string) => {
    setActiveDoubtId(id);
    setResponseText('');
    setShowAnswerModal(true);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDoubtId && responseText.trim()) {
      sendDoubtReply(activeDoubtId, responseText);
      setShowAnswerModal(false);
      setActiveDoubtId(null);
      setResponseText('');
      addToast('Academic response submitted successfully!');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Faculty Academic Portal
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <strong className="font-semibold text-slate-800">{currentUser?.name}</strong>. Answer student questions and review schedule timelines.
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Batches</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">2</div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
              <BookOpen size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lectures Today</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">3</div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Calendar size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Doubts</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{unresolvedDoubts.length}</div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
              <HelpCircle size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Average Score</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">83.8%</div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Academic doubts forum Q&amp;A</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {paginatedDoubts.map((d, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>STUDENT: {d.studentName} ({d.subject})</span>
                    <span className={`px-2 py-0.5 rounded border ${
                      d.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">Q: "{d.messages[0]?.text}"</div>
                  
                  {d.messages.slice(1).map((r, rIdx) => (
                    <div key={rIdx} className="pl-4 border-l-2 border-slate-300 py-1 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{r.sender} • {r.time}</div>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">"{r.text}"</p>
                    </div>
                  ))}

                  {d.status !== 'Resolved' && (
                    <div className="flex justify-end pt-1">
                      <Button variant="secondary" size="sm" onClick={() => handleQuickAnswer(d.id)}>
                        Answer Question
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-semibold text-slate-500 shadow-sm select-none mt-4">
                <div>
                  Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, doubts.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, doubts.length)}</span> of <span className="text-slate-855 font-bold">{doubts.length}</span> doubts
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        currentPage === i + 1
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Timetable Schedule Today</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-slate-800">JEE-Morning-A (Lecture #1)</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">09:00 AM - 10:30 AM</div>
                  <div className="text-xs text-slate-500 mt-1">Topic: Carbonyl Compounds Quiz</div>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">Room 101</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-slate-800">NEET-Regular-B (Lecture #2)</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">11:00 AM - 12:30 PM</div>
                  <div className="text-xs text-slate-500 mt-1">Topic: Organic Nomenclature</div>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">Room 102</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-slate-800">JEE-Evening-B (Lecture #3)</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">04:30 PM - 06:00 PM</div>
                  <div className="text-xs text-slate-500 mt-1">Topic: Chemical Equilibrium</div>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">Room 101</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Answer Doubt Modal */}
      {showAnswerModal && (
        <Modal 
          isOpen={showAnswerModal} 
          onClose={() => setShowAnswerModal(false)} 
          title="Compose Academic Response"
        >
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Teacher Answer text</label>
              <textarea 
                required 
                rows={5}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 font-medium"
                placeholder="Type your explanation or response details here..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAnswerModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Response</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
