import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus } from 'lucide-react';

export interface ExamItem {
  name: string;
  batch: string;
  totalMarks: number;
  passingMarks: number;
  average: string;
  status: string;
}

export const Exams: React.FC = () => {
  const { batches } = useApp();
  const [exams, setExams] = useState<ExamItem[]>([
    { name: 'Periodic Chemistry Evaluation Test #3', batch: 'JEE-Morning-A', totalMarks: 100, passingMarks: 40, average: '88.5%', status: 'Marks Published' },
    { name: 'Physics Mechanics Weekly Quiz #2', batch: 'JEE-Evening-B', totalMarks: 50, passingMarks: 20, average: '79.2%', status: 'Marks Published' }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [name, setName] = useState('');
  const [batch, setBatch] = useState(batches[0]?.name || 'JEE-Morning-A');
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);

  const handleOpenAddModal = () => {
    if (batches.length > 0 && !batch) {
      setBatch(batches[0].name);
    }
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setExams(prev => [...prev, {
      name,
      batch,
      totalMarks,
      passingMarks,
      average: 'TBD',
      status: 'Scheduled'
    }]);
    setName('');
    setShowAddModal(false);
    setSuccessMessage('New classroom evaluation test scheduled successfully!');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Exams & Grading Registers</h2>
          <p className="text-sm text-slate-500 mt-1">Schedule offline classroom exams, enter test marks sheets, and publish report cards.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddModal}>
          <Plus size={16} /> Schedule Test
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Completed Exams</CardTitle>
        </CardHeader>
        <Table headers={['Test Name', 'Batch', 'Total Marks', 'Passing Threshold', 'Class average', 'Status']}>
          {exams.map((e, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-semibold text-slate-800">{e.name}</td>
              <td className="px-6 py-4">{e.batch}</td>
              <td className="px-6 py-4 font-mono text-xs">{e.totalMarks} Marks</td>
              <td className="px-6 py-4 font-mono text-xs">{e.passingMarks} Marks</td>
              <td className="px-6 py-4 font-mono text-xs text-blue-600">{e.average}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  e.status === 'Marks Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {e.status}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Creation Modal */}
      {showAddModal && (
        <Modal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          title="Schedule Classroom offline test"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <Input label="Test Name Title" required placeholder="e.g. Periodic Chemistry Evaluation Test #4" value={name} onChange={(e) => setName(e.target.value)} />
            <Select 
              label="Allocate Target Batch" 
              value={batch} 
              onChange={(e) => setBatch(e.target.value)} 
              options={batches.map(b => ({ value: b.name, label: b.name }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Total Score Marks" type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
              <Input label="Passing Threshold" type="number" value={passingMarks} onChange={(e) => setPassingMarks(Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Schedule Test</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
