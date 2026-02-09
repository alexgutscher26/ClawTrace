'use client';

import AgentDetailView from '@/components/views/AgentDetailView';
import MasterKeyModal from '@/components/MasterKeyModal';
import { useFleet } from '@/context/FleetContext';

export default function AgentDetailPage() {
  const { setMasterPassphrase } = useFleet();

  return (
    <>
      <MasterKeyModal onSetKey={setMasterPassphrase} />
      <AgentDetailView />
    </>
  );
}
