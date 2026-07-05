'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animations';
import { PIPELINE_STEPS } from '@/lib/demo/landing-mock';
import { Upload, Cpu, ShieldCheck, Activity } from 'lucide-react';

const STEP_ICONS = [
  <Upload key="1" className="w-4 h-4" />,
  <Cpu key="2" className="w-4 h-4 animate-pulse" />,
  <ShieldCheck key="3" className="w-4 h-4" />,
  <Activity key="4" className="w-4 h-4" />,
];

const STEP_ICON_COLORS = [
  'text-violet-400',
  'text-teal-400',
  'text-violet-400',
  'text-emerald-400',
];

export function PipelineTimeline() {
  return (
    <section className="py-20 px-6 bg-bg-deep">
      <div className="max-w-4xl mx-auto space-y-16">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center space-y-3"
        >
          <h2 className="text-xs font-mono text-violet-400 tracking-widest uppercase">
            PIPELINE EXECUTION
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">
            How ARIA Automates Asset Financing
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative pl-8 sm:pl-16 space-y-12"
        >
          {/* Timeline running line */}
          <div className="absolute left-[15px] sm:left-[31px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-violet-600 via-teal-500 to-violet-800" />

          {PIPELINE_STEPS.map((step, idx) => (
            <div key={step.step} className="relative flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Step number badge */}
              <div className="absolute -left-[32px] sm:-left-[48px] flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 border-4 border-bg-deep text-text-primary font-mono text-xs font-bold shadow-md">
                {step.step}
              </div>

              <div className="bg-bg-card border border-violet-500/10 p-6 rounded-2xl flex-1 hover:border-violet-500/20 transition-all duration-300 space-y-3">
                <div className={`flex items-center space-x-2 ${STEP_ICON_COLORS[idx]} font-mono text-xs uppercase tracking-wider`}>
                  {STEP_ICONS[idx]}
                  <span>{step.title}</span>
                </div>

                <h4 className="font-semibold text-text-primary text-base">
                  {idx === 0 && 'Invoice Data Parsed to JSON Schema'}
                  {idx === 1 && '4 AI Agents Analyze & Pay API Oracles'}
                  {idx === 2 && '3-of-4 Multi-Sig Consensus Threshold'}
                  {idx === 3 && 'CEP-18 LP Yield & SME Funding Disbursed'}
                </h4>

                <p className="text-sm text-text-secondary font-light leading-relaxed">
                  {step.desc}
                </p>

                {/* Step 2 extra: Micropayment receipt */}
                {idx === 1 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-bg-deep/60 p-3 rounded-lg border border-violet-500/10 w-fit font-mono text-[11px] text-text-secondary">
                    <span className="text-amber-400 font-semibold">x402 Micropayment receipt:</span>
                    <span>Compliance Agent paid 0.10 CSPR for KYC API verification.</span>
                  </div>
                )}

                {/* Step 3 extra: DeployHash */}
                {idx === 2 && (
                  <div className="bg-bg-deep/85 border border-violet-950/50 p-3 rounded-lg font-mono text-[10px] text-violet-400 truncate max-w-lg">
                    DeployHash: <span className="text-text-primary">0xbc840a12e345fcbf8bda1234ea7890cfbde12845c91f63ba8877bc98da716ef</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
