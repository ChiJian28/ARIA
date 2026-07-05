'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animations';
import { FilePlus, Brain, Landmark } from 'lucide-react';

const STEPS = [
  {
    icon: FilePlus,
    title: 'Submit RWA',
    desc: 'Upload trade finance invoice or purchase order. Pay x402 micropayment per agent check.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/30',
  },
  {
    icon: Brain,
    title: 'Agents Evaluate',
    desc: 'Risk, Valuation, and Compliance agents analyze concurrently using Gemini AI. Each votes on-chain with reasoning.',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
  },
  {
    icon: Landmark,
    title: 'Get Financed',
    desc: 'On 3/3 consensus, CEP-78 NFT minted as collateral. LiquidityVault releases CSPR funding.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-3xl font-bold text-center text-text-primary mb-12"
        >
          How ARIA Works
        </motion.h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
        >
          {STEPS.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <motion.div key={title} variants={fadeUp} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-violet-500/30 to-transparent z-10" />
              )}
              <div className={`rounded-xl border p-6 ${bg}`}>
                <div className={`rounded-lg w-12 h-12 flex items-center justify-center mb-4 ${bg}`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div className="text-xs font-mono text-text-muted mb-2">Step {i + 1}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
