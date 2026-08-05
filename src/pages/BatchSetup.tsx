import React from 'react';

export const BatchSetup: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Batch Management</h2>
          <p className="text-sm text-slate-500 mt-1">Configure and manage batches across programs and levels.</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        Blank page ready for batch management UI.
      </div>
    </div>
  );
};
