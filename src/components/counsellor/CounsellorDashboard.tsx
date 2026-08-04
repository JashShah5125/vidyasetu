import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { Phone, Users, CheckSquare, RefreshCw } from 'lucide-react';

export const CounsellorDashboard: React.FC = () => {
  const { currentUser, leads } = useApp();

  // Filter callback leads and lead conversions
  const newLeads = leads.filter(l => l.status === 'New Enquiry');
  const followups = leads.filter(l => l.status === 'Follow-up');
  const interested = leads.filter(l => l.status === 'Interested');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Admissions & Enquiry CRM Desk
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <strong className="font-semibold text-slate-800">{currentUser?.name}</strong>. Log client enquiries and manage registration followups.
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Enquiries</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{newLeads.length}</div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Users size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Callbacks</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{followups.length}</div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
              <Phone size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interested Leads</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{interested.length}</div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
              <CheckSquare size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admissions Conversion</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">75.0%</div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
              <RefreshCw size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Client Enquiries Registry</CardTitle>
            </CardHeader>
            <Table headers={['Student Name', 'Mobile Contact', 'Course Target', 'Source Channel', 'Status']}>
              {leads.map((l, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{l.mobile}</td>
                  <td className="px-6 py-4 text-xs">{l.course}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.source}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      l.status === 'New Enquiry' ? 'bg-blue-50 text-blue-600' :
                      l.status === 'Follow-up' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Admissions Callback Queue</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {followups.map((l, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                    <span>{l.name}</span>
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-bold">
                      Callback
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">Mobile: {l.mobile}</div>
                  <div className="text-[11px] text-slate-400">Next Call: {l.nextFollowUp}</div>
                </div>
              ))}
              {followups.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No callbacks scheduled for today!
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
