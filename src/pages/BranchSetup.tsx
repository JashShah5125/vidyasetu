import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { MapPin, Users, Mail, Phone, Building, ArrowRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BranchSetup: React.FC = () => {
  const { branches } = useApp();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Branch Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and configure all physical centers and branches for your institute.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/branches/new')} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
          <Plus size={16} className="mr-2" /> Create New Branch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {branches.map(branch => (
          <div key={branch.id || branch.code} className="relative flex flex-col bg-white rounded-2xl border-2 transition-all duration-200 border-slate-200 hover:border-blue-300 hover:shadow-lg pt-6 p-6 group">
            
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-widest border ${
                branch.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                branch.status === 'Suspended' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {branch.status}
              </span>
            </div>
            
            <div className="flex flex-col flex-1 gap-5 mt-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{branch.name}</h3>
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{branch.code}</span>
              </div>

              <div className="space-y-3 flex-1 text-sm text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-tight">{branch.address || 'Address not configured'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-slate-400 shrink-0" />
                  <span>Admin: <strong className="text-slate-700">{branch.admin || 'Unassigned'}</strong></span>
                </div>
                {(branch.email || branch.phone) && (
                  <div className="flex items-center gap-2.5">
                    <Phone size={16} className="text-slate-400 shrink-0" />
                    <span>{branch.phone || branch.email}</span>
                  </div>
                )}
              </div>

              <Button 
                variant="secondary" 
                className="w-full justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                onClick={() => navigate(`/branches/${branch.id || branch.code}`)}
              >
                Manage Branch <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
