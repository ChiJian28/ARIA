'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';
import { RwaSubmitForm } from '@/components/rwa/RwaSubmitForm';
import { setObservatoryFocus } from '@/lib/observatory-focus';
import type { RwaSubmitInput } from '@/types/api.types';

export default function SubmitPage() {
  const router = useRouter();

  const handleSubmitted = (id: string, payload: RwaSubmitInput) => {
    setObservatoryFocus(id, payload);
    router.push(`/observatory?rwaId=${encodeURIComponent(id)}`);
  };

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible">
      <RwaSubmitForm onSubmitted={handleSubmitted} />
    </motion.div>
  );
}
