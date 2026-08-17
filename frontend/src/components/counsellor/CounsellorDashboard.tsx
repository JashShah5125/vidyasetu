import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { Phone, Users, CheckSquare, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CounsellorDashboard: React.FC = () => {
  const { currentUser, leads } = useApp();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Filter callback leads and lead conversions
  const newLeads = leads.filter(l => l.status === 'New Enquiry');
  const followups = leads.filter(l => l.status === 'Follow-up');
  const interested = leads.filter(l => l.status === 'Interested');

  const paginatedLeads = leads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(leads.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Admissions &amp; Enquiry CRM Desk
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Active Client Enquiries Registry</CardTitle>
            </CardHeader>
            <Table headers={['Student Name', 'Mobile Contact', 'Course Target', 'Source Channel', 'Status']} className="[&_th]:px-3.5 [&_th]:py-3">
              {paginatedLeads.map((l, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-3 font-semibold text-blue-600 hover:underline cursor-pointer animate-fade-in" onClick={() => navigate('/leads', { state: { activeLeadId: l.id } })}>{l.name}</td>
                  <td className="px-3.5 py-3 font-mono text-xs">{l.mobile}</td>
                  <td className="px-3.5 py-3 text-xs">{l.course}</td>
                  <td className="px-3.5 py-3 text-xs text-slate-500">{l.source}</td>
                  <td className="px-3.5 py-3">
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
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 shadow-sm select-none">
                <div>
                  Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, leads.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, leads.length)}</span> of <span className="text-slate-855 font-bold">{leads.length}</span> leads
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

        <div className="lg:col-span-1">
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
