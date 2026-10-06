import React from 'react';
import { AcademicCalendarManager } from '../components/institute/AcademicCalendarManager';

export const AcademicCalendarPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <AcademicCalendarManager />
    </div>
  );
};
