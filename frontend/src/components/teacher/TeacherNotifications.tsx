import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Bell, Mail, Send, X, Paperclip } from 'lucide-react';
import type { AppNotification, NotificationRecipient } from '../../data/mockData';
import { TEACHER_ASSIGNED_BATCHES } from '../../data/mockData';

export const TeacherNotifications: React.FC = () => {
  const { notifications, markNotificationRead, sendNotification, currentUser, batches, students } = useApp();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Composer State
  const [composeType, setComposeType] = useState<'Batch' | 'Level' | 'Program' | 'Course' | 'Specific Student'>('Batch');
  const [composeCourse, setComposeCourse] = useState('All');
  const [composeProgram, setComposeProgram] = useState('All');
  const [composeLevel, setComposeLevel] = useState('All');
  const [composeBatch, setComposeBatch] = useState('All');
  const [composeStudent, setComposeStudent] = useState('');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeCategory, setComposeCategory] = useState('Academic');
  const [composeMessage, setComposeMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<NotificationRecipient[]>([]);

  // ---- DERIVATIONS ---- //
  const teacherBatchesInfo = useMemo(() => {
    return batches.filter(b => TEACHER_ASSIGNED_BATCHES.includes(b.name));
  }, [batches]);

  const uniqueCourses = Array.from(new Set(teacherBatchesInfo.map(b => b.course)));
  const uniquePrograms = Array.from(new Set(teacherBatchesInfo.filter(b => composeCourse === 'All' || b.course === composeCourse).map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(teacherBatchesInfo.filter(b => (composeCourse === 'All' || b.course === composeCourse) && (composeProgram === 'All' || b.program === composeProgram)).map(b => b.level).filter(Boolean))) as string[];
  const availableBatches = teacherBatchesInfo.filter(b => {
      const matchC = composeCourse === 'All' || b.course === composeCourse;
      const matchP = composeProgram === 'All' || b.program === composeProgram;
      const matchL = composeLevel === 'All' || b.level === composeLevel;
      return matchC && matchP && matchL;
  });
  const uniqueBatches = Array.from(new Set(availableBatches.map(b => b.name)));

  const teacherStudents = useMemo(() => {
    return students.filter(s => s.batch && TEACHER_ASSIGNED_BATCHES.includes(s.batch));
  }, [students]);

  // List processing
  const displayList = useMemo(() => {
    return notifications
      .filter(n => {
        if (activeTab === 'inbox' && n.direction !== 'Incoming') return false;
        if (activeTab === 'sent' && n.direction !== 'Outgoing') return false;
        
        const matchSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'All' || n.status === filterStatus;
        const matchCategory = filterCategory === 'All' || n.category === filterCategory;
        
        return matchSearch && matchStatus && matchCategory;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, activeTab, searchTerm, filterStatus, filterCategory]);

  const selectedNotification = useMemo(() => {
    return notifications.find(n => n.id === selectedNotificationId) || null;
  }, [notifications, selectedNotificationId]);

  // Handlers
  const handleSelectNotification = (id: string) => {
    setIsComposerOpen(false);
    setSelectedNotificationId(id);
    const notif = notifications.find(n => n.id === id);
    if (notif && notif.direction === 'Incoming' && notif.status === 'Unread') {
      markNotificationRead(id);
    }
  };

  const handleOpenComposer = () => {
    setSelectedNotificationId(null);
    setIsComposerOpen(true);
    setSelectedRecipients([]);
    setComposeTitle('');
    setComposeMessage('');
  };

  const handleAddRecipient = () => {
    if (composeType === 'Batch' && composeBatch !== 'All') {
      if (!selectedRecipients.find(r => r.id === composeBatch)) {
        setSelectedRecipients([...selectedRecipients, { type: 'Batch', id: composeBatch, name: composeBatch }]);
      }
    } else if (composeType === 'Specific Student' && composeStudent) {
      const student = teacherStudents.find(s => s.studentId === composeStudent);
      if (student && !selectedRecipients.find(r => r.id === student.studentId)) {
        setSelectedRecipients([...selectedRecipients, { type: 'Specific Student', id: student.studentId, name: student.name }]);
      }
    } else if (composeType === 'Course' && composeCourse !== 'All') {
        if (!selectedRecipients.find(r => r.id === composeCourse)) {
            setSelectedRecipients([...selectedRecipients, { type: 'Course', id: composeCourse, name: composeCourse }]);
        }
    }
  };

  const handleRemoveRecipient = (id: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== id));
  };

  const calculateRecipientCount = () => {
    let count = 0;
    const countedStudentIds = new Set<string>();

    selectedRecipients.forEach(r => {
      if (r.type === 'Specific Student') {
        if (!countedStudentIds.has(r.id)) {
          countedStudentIds.add(r.id);
          count++;
        }
      } else if (r.type === 'Batch') {
        teacherStudents.forEach(s => {
          if (s.batch === r.id && !countedStudentIds.has(s.studentId)) {
            countedStudentIds.add(s.studentId);
            count++;
          }
        });
      } else if (r.type === 'Course') {
         teacherStudents.forEach(s => {
          if (s.course === r.id && !countedStudentIds.has(s.studentId)) {
            countedStudentIds.add(s.studentId);
            count++;
          }
        });
      }
    });
    return count;
  };

  const handleSend = () => {
    if (!composeTitle || !composeMessage || selectedRecipients.length === 0) {
      alert("Please fill in all fields and select at least one recipient.");
      return;
    }

    const newNotif: AppNotification = {
      id: `N-${Date.now()}`,
      title: composeTitle,
      message: composeMessage,
      category: composeCategory as any,
      sender: currentUser?.name || 'Teacher',
      senderRole: 'Teacher',
      createdAt: new Date().toISOString(),
      direction: 'Outgoing',
      status: 'Read', // irrelevant for outgoing
      recipients: selectedRecipients,
      recipientCount: calculateRecipientCount()
    };

    sendNotification(newNotif);
    setIsComposerOpen(false);
    setActiveTab('sent');
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-none">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Communication Center</h2>
          <p className="text-sm text-slate-500 mt-1">Manage incoming announcements and communicate with your assigned batches.</p>
        </div>
        <Button onClick={handleOpenComposer} className="gap-2 shrink-0">
          <Mail size={16} />
          New Notification
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT PANE: LIST */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button 
              onClick={() => { setActiveTab('inbox'); setIsComposerOpen(false); setSelectedNotificationId(null); }}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'inbox' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Inbox
            </button>
            <button 
              onClick={() => { setActiveTab('sent'); setIsComposerOpen(false); setSelectedNotificationId(null); }}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'sent' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Sent
            </button>
          </div>

          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3 flex-none">
            <Input 
              placeholder="Search notifications..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'All', label: 'All Status' },
                  ...(activeTab === 'inbox' ? [{ value: 'Unread', label: 'Unread' }, { value: 'Read', label: 'Read' }] : [])
                ]}
              />
              <Select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                options={[
                  { value: 'All', label: 'All Categories' },
                  { value: 'Academic', label: 'Academic' },
                  { value: 'Administrative', label: 'Administrative' },
                  { value: 'Announcement', label: 'Announcement' },
                  { value: 'Schedule', label: 'Schedule' },
                  { value: 'Examination', label: 'Examination' },
                ]}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar bg-white p-2">
            {displayList.length > 0 ? (
              <div className="space-y-1">
                {displayList.map((n) => (
                  <button 
                    key={n.id}
                    onClick={() => handleSelectNotification(n.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedNotificationId === n.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : (activeTab === 'inbox' && n.status === 'Unread') 
                          ? 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                          : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {activeTab === 'inbox' && n.status === 'Unread' && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{n.category}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={`text-sm mb-1 line-clamp-1 ${(activeTab === 'inbox' && n.status === 'Unread') ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {n.title}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1 mb-2">
                      {n.message}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {activeTab === 'inbox' ? `From: ${n.sender}` : `To: ${n.recipients.map(r => r.name).join(', ')}`}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Bell size={40} className="mb-3 opacity-20" />
                <p className="font-semibold text-sm">No notifications found.</p>
                <p className="text-xs mt-1 opacity-75">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: WORKSPACE */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative">
          
          {isComposerOpen ? (
            <div className="flex flex-col h-full bg-slate-50/50">
              <div className="p-5 border-b border-slate-200 bg-white flex justify-between items-center flex-none">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Compose Notification</h3>
                  <p className="text-xs text-slate-500 mt-1">Send a notification to your assigned batches or students.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setIsComposerOpen(false)}>
                  <X size={16} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 1. Recipient Selection */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-2">1. Select Recipients</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Select label="Recipient Type" value={composeType} onChange={(e) => setComposeType(e.target.value as any)}
                      options={['Batch', 'Course', 'Program', 'Level', 'Specific Student'].map(o => ({value: o, label: o}))}
                    />
                    <Select label="Course" value={composeCourse} onChange={(e) => {setComposeCourse(e.target.value); setComposeProgram('All'); setComposeLevel('All'); setComposeBatch('All');}}
                      options={[{value:'All',label:'All Courses'}, ...uniqueCourses.map(c => ({value:c,label:c}))]}
                    />
                    
                    {composeType !== 'Course' && (
                      <>
                        <Select label="Program" value={composeProgram} onChange={(e) => {setComposeProgram(e.target.value); setComposeLevel('All'); setComposeBatch('All');}}
                          options={[{value:'All',label:'All Programs'}, ...uniquePrograms.map(p => ({value:p,label:p}))]}
                        />
                        <Select label="Level" value={composeLevel} onChange={(e) => {setComposeLevel(e.target.value); setComposeBatch('All');}}
                          options={[{value:'All',label:'All Levels'}, ...uniqueLevels.map(l => ({value:l,label:l}))]}
                        />
                      </>
                    )}

                    {composeType === 'Batch' && (
                      <Select label="Batch" value={composeBatch} onChange={(e) => setComposeBatch(e.target.value)}
                        options={[{value:'All',label:'Select Batch...'}, ...uniqueBatches.map(b => ({value:b,label:b}))]}
                      />
                    )}
                    {composeType === 'Specific Student' && (
                       <Select label="Student" value={composeStudent} onChange={(e) => setComposeStudent(e.target.value)}
                        options={[{value:'',label:'Select Student...'}, ...teacherStudents.filter(s => (composeBatch === 'All' || s.batch === composeBatch)).map(s => ({value:s.studentId,label:`${s.name} (${s.batch})`}))]}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <Button variant="secondary" size="sm" onClick={handleAddRecipient} className="gap-2 bg-white">
                        Add Recipient Group
                     </Button>
                  </div>

                  {selectedRecipients.length > 0 && (
                    <div className="p-4 bg-slate-100 rounded-lg space-y-3">
                       <div className="flex flex-wrap gap-2">
                         {selectedRecipients.map((r, idx) => (
                           <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                              {r.type}: {r.name}
                              <button onClick={() => handleRemoveRecipient(r.id)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                           </div>
                         ))}
                       </div>
                       <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 inline-block px-3 py-1 rounded-md border border-emerald-100">
                          {calculateRecipientCount()} students will receive this notification.
                       </div>
                    </div>
                  )}
                </div>

                {/* 2. Message Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-2">2. Notification Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                       <Input label="Title" placeholder="e.g., Tomorrow's Chemistry Test" value={composeTitle} onChange={(e) => setComposeTitle(e.target.value)} />
                    </div>
                    <Select label="Category" value={composeCategory} onChange={(e) => setComposeCategory(e.target.value)}
                      options={['Academic', 'Announcement', 'Schedule', 'Examination'].map(o => ({value: o, label: o}))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Message</label>
                    <textarea 
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      placeholder="Write your notification..."
                      className="w-full h-32 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none shadow-sm"
                    />
                  </div>

                  <div>
                     <Button variant="secondary" size="sm" className="gap-2 bg-white">
                        <Paperclip size={16} className="text-slate-400" />
                        Attach File (Optional)
                     </Button>
                  </div>

                </div>
              </div>

              <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 flex-none">
                 <Button variant="secondary" onClick={() => setIsComposerOpen(false)}>Cancel</Button>
                 <Button onClick={handleSend} className="gap-2" disabled={!composeTitle || !composeMessage || selectedRecipients.length === 0}>
                   <Send size={16} />
                   Send Notification
                 </Button>
              </div>
            </div>
          ) : selectedNotification ? (
            <div className="flex flex-col h-full bg-white animate-fade-in">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex-none space-y-4">
                 <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-display font-bold text-slate-900 leading-tight pr-8">{selectedNotification.title}</h3>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right shrink-0">
                      {new Date(selectedNotification.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-100">
                      <span className="opacity-75 uppercase">Category:</span> {selectedNotification.category}
                    </div>
                    {activeTab === 'inbox' ? (
                       <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-md text-slate-700">
                          <span className="text-slate-400 uppercase">From:</span> {selectedNotification.sender} <span className="opacity-50 font-normal">({selectedNotification.senderRole})</span>
                       </div>
                    ) : (
                       <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-md text-slate-700">
                          <span className="text-slate-400 uppercase">Recipients:</span> {selectedNotification.recipients.map(r => r.name).join(', ')} <span className="opacity-50 font-normal">({selectedNotification.recipientCount} students)</span>
                       </div>
                    )}
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-white">
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedNotification.message}
                </div>
                
                {selectedNotification.attachments && selectedNotification.attachments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Attachments</h4>
                    <div className="flex gap-3">
                      {selectedNotification.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors group">
                           <Paperclip size={14} className="text-slate-400 group-hover:text-blue-500" />
                           <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{att}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center bg-slate-50/50">
              <Mail size={48} className="mb-4 opacity-20" />
              <p className="font-semibold text-lg text-slate-500">No notification selected</p>
              <p className="text-sm mt-1 opacity-75 max-w-xs">Choose a notification from the list to view its details, or click "New Notification" to send a message.</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
