'use client';

import DashboardView from '@/components/views/DashboardView';
import MasterKeyModal from '@/components/MasterKeyModal';
import { useFleet } from '@/context/FleetContext';

export default function DashboardPage() {
  const { setMasterPassphrase } = useFleet();

  return (
    <>
      <MasterKeyModal onSetKey={setMasterPassphrase} />
      <DashboardView />
    </>
  );
}
