import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

interface AttendanceProps {
  initialTab?: 'sheet' | 'timetable';
}

export const Attendance: React.FC<AttendanceProps> = ({ initialTab = 'sheet' }) => {
  const { students, updateAttendance } = useApp();
  const [subTab, setSubTab] = useState<'sheet' | 'timetable'>(initialTab);
  const [showSaved, setShowSaved] = useState(false);
  
  const [branch, setBranch] = useState('Mumbai West');
  const [course, setCourse] = useState('JEE Prep');
  const [batch, setBatch] = useState('JEE-Morning-A');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [records, setRecords] = useState<{ [key: string]: 'Present' | 'Absent' | 'Late' }>({
    'S-201': 'Present',
    'S-202': 'Present'
  });

  React.useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const handleMark = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    updateAttendance(studentId, status);
  };

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 4000);
  };

  return (
    <div className="space-y-6">
      {showSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ Daily classroom sheets successfully saved and synced to student report cards.
        </div>
      )}
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          {subTab === 'sheet' ? 'Attendance registers' : 'Class Timetable Schedules'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {subTab === 'sheet' 
            ? 'Select class rosters, mark daily student attendance parameters, and export logs.'
            : 'Track weekly lecture sessions, classroom allotments, and teacher schedules.'}
        </p>
      </div>

      {subTab === 'sheet' ? (
        <>
          {/* Selectors grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
            <Select 
              label="Branch" 
              value={branch} 
              onChange={(e) => setBranch(e.target.value)} 
              options={[
                { value: 'Mumbai West', label: 'Mumbai West' },
                { value: 'Pune Camp', label: 'Pune Camp' }
              ]} 
            />
            <Select 
              label="Course" 
              value={course} 
              onChange={(e) => setCourse(e.target.value)} 
              options={[
                { value: 'JEE Prep', label: 'JEE Prep' },
                { value: 'NEET Batch', label: 'NEET Batch' }
              ]} 
            />
            <Select 
              label="Batch" 
              value={batch} 
              onChange={(e) => setBatch(e.target.value)} 
              options={[
                { value: 'JEE-Morning-A', label: 'JEE-Morning-A' },
                { value: 'NEET-Regular-B', label: 'NEET-Regular-B' }
              ]} 
            />
            <Input 
              label="Lecture Date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Sheet Checklist</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {students.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center py-4">
                  <div>
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.studentId} | {s.batch}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMark(s.id, 'Present')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        records[s.id] === 'Present'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMark(s.id, 'Absent')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        records[s.id] === 'Absent'
                          ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMark(s.id, 'Late')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        records[s.id] === 'Late'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Late
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <Button variant="primary" onClick={handleSave}>
                Save Daily Sheets
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Daily Lecture & Timetable Planner</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-slate-50 border border-slate-200/60 rounded-xl gap-4">
              <div className="w-24 font-display font-bold text-blue-600 text-sm flex flex-col">
                09:00 AM
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">1.5 Hours</span>
              </div>
              <div className="w-[1px] h-10 bg-slate-200"></div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">Organic Chemistry Mechanisms</div>
                <div className="text-xs text-slate-500 mt-0.5">Batch: JEE-Morning-A | Classroom: Room 101 | Teacher: Prof. Arvind Kelkar</div>
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-50 border border-slate-200/60 rounded-xl gap-4">
              <div className="w-24 font-display font-bold text-blue-600 text-sm flex flex-col">
                11:00 AM
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">1.5 Hours</span>
              </div>
              <div className="w-[1px] h-10 bg-slate-200"></div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">Electromagnetism Fundamentals</div>
                <div className="text-xs text-slate-500 mt-0.5">Batch: NEET-Regular-B | Classroom: Room 102 | Teacher: Prof. Arvind Kelkar</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
