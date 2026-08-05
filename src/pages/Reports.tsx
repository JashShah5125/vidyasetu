import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award,
  Filter
} from 'lucide-react';

interface TenantData {
  admissions: string;
  revenue: string;
  avgMarks: string;
  ltv: string;
  admissionsChart: number[];
  revenueChart: number[];
}

const tenantMetrics: Record<string, TenantData> = {
  All: {
    admissions: '12 Students',
    revenue: 'Rs. 1.3L',
    avgMarks: '83.8%',
    ltv: '27.5%',
    admissionsChart: [50, 90, 140, 120, 180, 220],
    revenueChart: [70, 110, 160, 130, 190, 230]
  },
  'VS-001': {
    admissions: '7 Students',
    revenue: 'Rs. 95K',
    avgMarks: '85.2%',
    ltv: '29.1%',
    admissionsChart: [30, 50, 90, 70, 110, 150],
    revenueChart: [50, 80, 110, 90, 130, 170]
  },
  'VS-002': {
    admissions: '3 Students',
    revenue: 'Rs. 25K',
    avgMarks: '81.5%',
    ltv: '25.0%',
    admissionsChart: [15, 25, 35, 30, 45, 50],
    revenueChart: [15, 20, 35, 25, 40, 45]
  },
  'VS-003': {
    admissions: '2 Students',
    revenue: 'Rs. 10K',
    avgMarks: '84.0%',
    ltv: '28.5%',
    admissionsChart: [5, 15, 15, 20, 25, 20],
    revenueChart: [5, 10, 15, 15, 20, 15]
  }
};

export const Reports: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState('All');
  const currentMetrics = tenantMetrics[selectedTenant] || tenantMetrics.All;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Analytics &amp; Reports Desk</h2>
          <p className="text-sm text-slate-500 mt-1">Review long-term coaching revenue charts, attendance averages, and admission flows.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-500 flex items-center gap-1"><Filter size={14} /> Tenant Filter:</span>
          <Select 
            value={selectedTenant} 
            onChange={(e) => setSelectedTenant(e.target.value)} 
            options={[
              { value: 'All', label: 'All Tenants (Consolidated)' },
              { value: 'VS-001', label: 'Apex IIT Academy' },
              { value: 'VS-002', label: 'Vanguard Classes' },
              { value: 'VS-003', label: 'Bright Future Tuition' }
            ]} 
            style={{ padding: '4px 8px', fontSize: '12px', minWidth: '180px' }}
          />
        </div>
      </div>

      {/* Cards stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Admissions</span>
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.admissions}</div>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
              <Users size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</span>
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.revenue}</div>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100">
              <DollarSign size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Average Marks</span>
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.avgMarks}</div>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
              <Award size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">LTV Conversion</span>
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.ltv}</div>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center border border-purple-100">
              <TrendingUp size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Admissions Flow (2026)</CardTitle>
          </CardHeader>
          <div className="h-64 flex items-end justify-between gap-2 pt-6 border-b border-slate-100 px-4">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className={`w-full rounded-t-md hover:bg-blue-600 transition-colors ${idx === 5 ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-blue-600/30'}`} 
                  style={{ height: `${currentMetrics.admissionsChart[idx]}px` }}
                ></div>
                <span className={`text-xs font-bold ${idx === 5 ? 'text-slate-800' : 'text-slate-400'}`}>{month}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees Collection Ledger Trends</CardTitle>
          </CardHeader>
          <div className="h-64 flex items-end justify-between gap-2 pt-6 border-b border-slate-100 px-4">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className={`w-full rounded-t-md hover:bg-emerald-600 transition-colors ${idx === 5 ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-emerald-600/30'}`} 
                  style={{ height: `${currentMetrics.revenueChart[idx]}px` }}
                ></div>
                <span className={`text-xs font-bold ${idx === 5 ? 'text-slate-800' : 'text-slate-400'}`}>{month}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Per-Tenant Bifurcation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Performance Comparison Matrix</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Tenant Code</th>
                <th className="px-6 py-4">Institute Name</th>
                <th className="px-6 py-4 text-center">New Admissions</th>
                <th className="px-6 py-4 text-center">Gross Revenue</th>
                <th className="px-6 py-4 text-center">Avg Test Marks</th>
                <th className="px-6 py-4 text-center">LTV Conversion</th>
                <th className="px-6 py-4 text-center">Access Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {[
                { code: 'VS-001', name: 'Apex IIT Academy', admissions: '7 Students', revenue: '₹95,000', marks: '85.2%', ltv: '29.1%', status: 'Active' },
                { code: 'VS-002', name: 'Vanguard Classes', admissions: '3 Students', revenue: '₹25,000', marks: '81.5%', ltv: '25.0%', status: 'Active' },
                { code: 'VS-003', name: 'Bright Future Tuition', admissions: '2 Students', revenue: '₹10,000', marks: '84.0%', ltv: '28.5%', status: 'Suspended' }
              ].map((row) => (
                <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{row.code}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-center font-medium">{row.admissions}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800">{row.revenue}</td>
                  <td className="px-6 py-4 text-center font-medium text-slate-700">{row.marks}</td>
                  <td className="px-6 py-4 text-center font-medium text-slate-700">{row.ltv}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
