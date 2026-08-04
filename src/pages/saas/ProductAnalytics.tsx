import React from 'react';

interface ModuleMetric {
  moduleName: string;
  category: string;
  utilizationRate: number; // percentage
  status: 'High Adoption' | 'Moderate' | 'Low Utilization';
}

export const ProductAnalytics: React.FC = () => {
  const usageMetrics: ModuleMetric[] = [
    { moduleName: 'Attendance Manager & Registers', category: 'Core ERP', utilizationRate: 98, status: 'High Adoption' },
    { moduleName: 'Online Fees Checkout & Ledgers', category: 'Finance', utilizationRate: 85, status: 'High Adoption' },
    { moduleName: 'Leads CRM Pipeline', category: 'CRM', utilizationRate: 72, status: 'Moderate' },
    { moduleName: 'Assignments & Doubt Hub', category: 'Academic', utilizationRate: 40, status: 'Moderate' },
    { moduleName: 'Legacy SMS Broadcast System', category: 'Communication', utilizationRate: 15, status: 'Low Utilization' }
  ];

  const statusColors = {
    'High Adoption': 'bg-emerald-50 text-emerald-700',
    Moderate: 'bg-blue-50 text-blue-700',
    'Low Utilization': 'bg-red-50 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Product Usage &amp; Adoption Analytics</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review core telemetry metrics, database utilization rates, storage quotas and feature adoptions across all active customer portfolios.
        </p>
      </div>

      {/* Grid statistics metrics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Branches Registered</span>
          <span className="text-3xl font-extrabold text-slate-900 block">48 Branches</span>
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span>↑ 8.3% growth rate</span>
            <span className="text-slate-400 font-normal">this month</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Global SaaS Cloud Storage Load</span>
          <span className="text-3xl font-extrabold text-slate-900 block">34.8 GB / 200 GB</span>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[120px]">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '17%' }}></div>
            </div>
            <span>17.4% overall limit capacity</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Peak Active Concurrency Load</span>
          <span className="text-3xl font-extrabold text-slate-900 block">892 Active Users</span>
          <div className="text-xs text-emerald-600 font-semibold">
            <span>● 99.98% Service Level Agreement met</span>
          </div>
        </div>
      </div>

      {/* Usage metrics list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Feature &amp; Module Adoption Telemetry</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Module Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Feature Group</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usage Index Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Adoption Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {usageMetrics.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.moduleName}</td>
                  <td className="px-6 py-4 text-slate-500">{item.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-full max-w-[150px] bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.utilizationRate}%` }}></div>
                      </div>
                      <span className="font-bold text-slate-700 text-xs">{item.utilizationRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
