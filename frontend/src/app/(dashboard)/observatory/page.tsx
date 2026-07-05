'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';
import { ActiveCouncilPanel } from '@/components/observatory/ActiveCouncilPanel';
import { MeritocracyPanel } from '@/components/observatory/MeritocracyPanel';
import { AuditTrailTable } from '@/components/observatory/AuditTrailTable';
import { RwaDetailModal } from '@/components/rwa/RwaDetailModal';
import { useObservatoryAuditTrail } from '@/hooks/useObservatory';
import { Skeleton } from '@/components/ui/skeleton';

function ObservatoryContent() {
  const searchParams = useSearchParams();
  const focusRwaId = searchParams.get('rwaId');
  const [modalRwaId, setModalRwaId] = useState<string | null>(null);
  const { data: auditTrail } = useObservatoryAuditTrail(50);

  const apyByRwaId = useMemo(
    () => new Map((auditTrail ?? []).map((e) => [e.id, e.apy])),
    [auditTrail],
  );

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      className="space-y-8"
      id="observatory-container"
    >
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono text-violet-400 uppercase tracking-widest mb-1">
          <span>Cognitive Swarm System</span>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Council Observatory</h1>
        <p className="text-sm text-text-secondary font-light mt-1 max-w-3xl">
          ARIA eliminates black-box lending. Watch our AI swarm analyze credit parameters, dispatch
          micro-payments, and sign multisig Casper transactions in real time.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        <div className="lg:col-span-3" id="active-council-panel">
          <ActiveCouncilPanel
            focusRwaId={focusRwaId}
            apyByRwaId={apyByRwaId}
            onViewDetail={setModalRwaId}
          />
        </div>
        <div className="lg:col-span-2" id="leaderboard-panel">
          <MeritocracyPanel />
        </div>
      </div>

      <div id="consensus-history-panel">
        <AuditTrailTable onSelectRwa={setModalRwaId} />
      </div>

      <RwaDetailModal rwaId={modalRwaId} onClose={() => setModalRwaId(null)} />
    </motion.div>
  );
}

export default function ObservatoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <ObservatoryContent />
    </Suspense>
  );
}
