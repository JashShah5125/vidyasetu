import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

export const Notifications: React.FC = () => {
  const { logAction, branches } = useApp();
  
  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [schedule, setSchedule] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    
    logAction('BROADCAST_NOTIFICATION', `Sent alert: "${title}" to audience group: ${audience}`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
    setTitle('');
    setMessage('');
    setSchedule('');
  };

  const audienceOptions = [
    { value: 'all', label: 'All' },
    { value: 'students', label: 'Student Only' },
    { value: 'parents', label: 'Parents Only' },
    { value: 'teachers', label: 'Teachers / Faculty Only' },
    { value: 'staff', label: 'All Staff / Employees' },
    { value: 'admins', label: 'Admins Only' },
    ...branches.map(b => ({
      value: `branch-${b.name}`,
      label: `${b.name} Branch Only`
    }))
  ];

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ Broadcast campaign circular successfully queued and dispatched to all targeted recipients.
        </div>
      )}
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Broadcast Notification</h2>
        <p className="text-sm text-slate-500 mt-1">Compose circulars, target audience groups, and schedule automatic push messages.</p>
      </div>

      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Create Broadcast Notification</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Target Audience Group" 
                value={audience} 
                onChange={(e) => setAudience(e.target.value)}
                options={audienceOptions}
              />
              <Input 
                label="Schedule Time (Leave blank for instant)" 
                type="datetime-local" 
                value={schedule} 
                onChange={(e) => setSchedule(e.target.value)} 
              />
            </div>
            
            <Input 
              label="Notification Alert Title" 
              required 
              placeholder="e.g. Schedule Change: Midterm Chemistry Exam Postponed" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Message Content Body</label>
              <textarea 
                required 
                rows={4} 
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" 
                placeholder="Type the message body here..." 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Dispatch Broadcast Alert
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
