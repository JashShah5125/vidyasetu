import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { feeApi, type ProgramFeePlan } from '../services/feeApi';
import { bundleApi, type SubjectBundle } from '../services/bundleApi';

export type { ProgramFeePlan };

export interface CustomBundle {
  id: string;
  name: string;
  courseName: string;
  programDetails: string;
  levelDetails: string;
  category: string;
  branchName?: string;
  branchId?: string;
  levelId?: string;
  fee: number;
  downPayment?: number;
  months?: number;
  installment?: number;
}

interface FeeConfigContextType {
  plans: ProgramFeePlan[];
  setPlans: React.Dispatch<React.SetStateAction<ProgramFeePlan[]>>;
  customBundles: CustomBundle[];
  setCustomBundles: React.Dispatch<React.SetStateAction<CustomBundle[]>>;
  isLoadingFees: boolean;
  refreshFees: () => Promise<void>;
}

const FeeConfigContext = createContext<FeeConfigContextType | undefined>(undefined);

const mapBundle = (b: SubjectBundle): CustomBundle => ({
  id: b.id,
  name: b.name,
  courseName: b.course_name || '',
  programDetails: b.program_name || '',
  levelDetails: b.level_name || '',
  category: b.level_id ? String(b.level_id) : '',
  branchId: b.branch_id,
  branchName: b.branch_name || '',
  levelId: b.level_id,
  fee: b.fee_amount ?? 0,
  downPayment: 0,
  months: 0,
  installment: 0
});

export const FeeConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<ProgramFeePlan[]>([]);
  const [customBundles, setCustomBundles] = useState<CustomBundle[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(true);

  const refreshFees = useCallback(async () => {
    setIsLoadingFees(true);
    try {
      const planResponse = await feeApi.listFeePlans({ page: 1, limit: 500 });
      setPlans(planResponse.data || []);

      const bundleResponse = await bundleApi.list({ page: 1, limit: 500 });
      setCustomBundles((bundleResponse.data || []).map(mapBundle));
    } catch (error) {
      console.error('Failed to load fee structures:', error);
    } finally {
      setIsLoadingFees(false);
    }
  }, []);

  useEffect(() => {
    refreshFees();
  }, [refreshFees, currentUser?.id, currentUser?.role, currentUser?.branch]);

  return (
    <FeeConfigContext.Provider value={{
      plans, setPlans,
      customBundles, setCustomBundles,
      isLoadingFees, refreshFees
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