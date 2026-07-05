'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';

export function ProblemSolution() {
  return (
    <section className="py-20 px-6 bg-bg-deep">
      <div className="max-w-5xl mx-auto space-y-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto space-y-3"
        >
          <h2 className="text-xs font-mono text-teal-400 tracking-widest uppercase">THE PARADIGM SHIFT</h2>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">
            Replacing Manual Red-Tape with On-Chain AI
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* The TradFi Problem */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="p-8 rounded-2xl border border-red-950/30 bg-red-950/5 hover:border-red-900/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <span className="text-red-500 text-xs font-mono uppercase tracking-widest block mb-4">
                THE TRADFI PROBLEM
              </span>
              <h3 className="font-semibold text-lg text-red-300 mb-4">
                SMEs Rejected by Centralized Banks
              </h3>
              <ul className="space-y-4 text-sm text-text-secondary font-light">
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <span>Banks reject 45% of SME invoices due to overhead manual underwriting friction.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <span>Payment terms are slow (30 to 90 days), freezing critical cash flows.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <span>Traditional RWA models require massive administrative audit fees.</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 border-t border-red-950/40 pt-4 text-[11px] font-mono text-red-500/70">
              STAT: SMEs face $1.5 Trillion funding gap globally.
            </div>
          </motion.div>

          {/* The ARIA Solution */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-8 rounded-2xl border border-teal-500/20 bg-gradient-to-b from-teal-950/10 to-transparent hover:border-teal-500/35 transition-all duration-300 flex flex-col justify-between shadow-lg shadow-teal-500/5"
          >
            <div>
              <span className="text-teal-400 text-xs font-mono uppercase tracking-widest block mb-4">
                THE ARIA SOLUTION
              </span>
              <h3 className="font-semibold text-lg text-teal-300 mb-4">
                On-Chain Multi-Agent Underwriting
              </h3>
              <ul className="space-y-4 text-sm text-text-primary font-light">
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                  <span>ARIA deploys an autonomous AI council to underwrite, securitize, and fund invoices in minutes.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                  <span>DeFi investors deposit CSPR directly to the Liquidity Vault and earn premium yields.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                  <span>Each asset is mapped to a cryptographic CEP-78 NFT on Casper representing legal claim.</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 border-t border-teal-500/10 pt-4 text-[11px] font-mono text-teal-400">
              STAT: 100% automated decision paths with full cryptographic audit.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
