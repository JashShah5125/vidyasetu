import React from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award 
} from 'lucide-react';

export const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Analytics & Reports Desk</h2>
        <p className="text-sm text-slate-500 mt-1">Review long-term coaching revenue charts, attendance averages, and admission flows.</p>
      </div>

      {/* Cards stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Admissions</span>
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">12 Students</div>
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
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">Rs. 1.3L</div>
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
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">83.8%</div>
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
              <div className="text-2xl font-display font-bold text-slate-900 mt-1">27.5%</div>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center border border-purple-100">
              <TrendingUp size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* Custom responsive CSS flexbox charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Admissions Flow (2026)</CardTitle>
          </CardHeader>
          <div className="h-64 flex items-end justify-between gap-2 pt-6 border-b border-slate-100 px-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-blue-600/30 rounded-t-md hover:bg-blue-600 transition-colors" style={{ height: '50px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Jan</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-blue-600/30 rounded-t-md hover:bg-blue-600 transition-colors" style={{ height: '90px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Feb</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-blue-600/30 rounded-t-md hover:bg-blue-600 transition-colors" style={{ height: '140px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Mar</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-blue-600/30 rounded-t-md hover:bg-blue-600 transition-colors" style={{ height: '120px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Apr</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-blue-600/30 rounded-t-md hover:bg-blue-600 transition-colors" style={{ height: '180px' }}></div>
              <span className="text-xs text-slate-400 font-bold">May</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-blue-600 rounded-t-md shadow-lg shadow-blue-500/20" style={{ height: '220px' }}></div>
              <span className="text-xs text-slate-800 font-bold">Jun</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees Collection Ledger Trends</CardTitle>
          </CardHeader>
          <div className="h-64 flex items-end justify-between gap-2 pt-6 border-b border-slate-100 px-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-emerald-600/30 rounded-t-md hover:bg-emerald-600 transition-colors" style={{ height: '70px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Jan</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-emerald-600/30 rounded-t-md hover:bg-emerald-600 transition-colors" style={{ height: '110px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Feb</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-emerald-600/30 rounded-t-md hover:bg-emerald-600 transition-colors" style={{ height: '160px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Mar</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-emerald-600/30 rounded-t-md hover:bg-emerald-600 transition-colors" style={{ height: '130px' }}></div>
              <span className="text-xs text-slate-400 font-bold">Apr</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-emerald-600/30 rounded-t-md hover:bg-emerald-600 transition-colors" style={{ height: '190px' }}></div>
              <span className="text-xs text-slate-400 font-bold">May</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-emerald-600 rounded-t-md shadow-lg shadow-emerald-500/20" style={{ height: '230px' }}></div>
              <span className="text-xs text-slate-800 font-bold">Jun</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
