import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { INITIAL_COURSES, INITIAL_BUNDLES_MAP, INITIAL_SUBJECTS_MAP, INITIAL_FEE_PLANS } from '../data/mockData';
import type { FeePlan } from '../data/mockData';
export type { FeePlan };

export interface CustomBundle {
  id: string;
  name: string;
  courseName: string;
  programDetails: string;
  levelDetails: string;
  category: string;
  fee: number;
  downPayment?: number;
  months?: number;
  installment?: number;
}

export interface SubjectFee {
  id: string;
  name: string;
  code: string;
  type: string;
  category: string;
  fee: number;
}

interface FeeConfigContextType {
  plans: FeePlan[];
  setPlans: React.Dispatch<React.SetStateAction<FeePlan[]>>;
  customBundles: CustomBundle[];
  setCustomBundles: React.Dispatch<React.SetStateAction<CustomBundle[]>>;
  subjectsData: SubjectFee[];
  setSubjectsData: React.Dispatch<React.SetStateAction<SubjectFee[]>>;
}

const FeeConfigContext = createContext<FeeConfigContextType | undefined>(undefined);

export const FeeConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Standard Plans
  const [plans, setPlans] = useState<FeePlan[]>(INITIAL_FEE_PLANS);

  // 2. Custom Bundles
  const [customBundles, setCustomBundles] = useState<CustomBundle[]>(() => {
    const list: any[] = [];
    Object.entries(INITIAL_BUNDLES_MAP).forEach(([category, bundles]) => {
      const course = INITIAL_COURSES.find(c => category.startsWith(c.code));
      let courseName = 'Unknown Course';
      let programDetails = category;
      let levelDetails = '-';

      if (course) {
        courseName = course.name;
        let rest = category.substring(course.code.length);
        if (rest.startsWith('-')) rest = rest.substring(1);
        
        const parts = rest.split('-');
        if (parts.length >= 2) {
          programDetails = parts[0].trim();
          levelDetails = parts.slice(1).join('-').trim();
        } else {
          programDetails = rest.replace(/-/g, ' ').trim();
        }
      }

      bundles.forEach((b: any) => {
        list.push({
          id: b.id,
          name: b.name,
          courseName,
          programDetails,
          levelDetails,
          category,
          fee: b.fee || 0,
          downPayment: b.downPayment || 0,
          months: b.months || 0,
          installment: b.installment || 0
        });
      });
    });
    return list;
  });

  // 3. Subjects Data
  const [subjectsData, setSubjectsData] = useState<SubjectFee[]>(() => {
    const list: any[] = [];
    Object.entries(INITIAL_SUBJECTS_MAP).forEach(([category, subjects]) => {
      subjects.forEach(s => {
        list.push({ ...s, category });
      });
    });
    return list;
  });

  return (
    <FeeConfigContext.Provider value={{
      plans, setPlans,
      customBundles, setCustomBundles,
      subjectsData, setSubjectsData
    }}>
      {children}
    </FeeConfigContext.Provider>
  );
};

export const useFeeConfig = () => {
  const context = useContext(FeeConfigContext);
  if (!context) {
    throw new Error('useFeeConfig must be used within a FeeConfigProvider');
  }
  return context;
};
