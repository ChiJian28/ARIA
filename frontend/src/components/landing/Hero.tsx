'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Play, Activity } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ParticleGrid } from '@/components/landing/ParticleGrid';
import { LiveStatsTicker } from '@/components/landing/LiveStatsTicker';
import { fadeUp } from '@/lib/animations';
import { cn } from '@/lib/cn';

export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-8 overflow-hidden bg-bg-deep">
      {/* Dynamic Interactive Mouse-Parallax Particle Field */}
      <ParticleGrid />

      {/* Decorative gradient radial overlay */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-4xl mx-auto w-full space-y-8">
        {/* Tag badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/30 py-1.5 px-4 rounded-full text-xs font-mono text-violet-300 mx-auto"
        >
          <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>Casper RWA Underwriting Engine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span>Live &amp; Deployed</span>
        </motion.div>

        {/* Epic Main Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary leading-none"
        >
          Agentic Liquidity for{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-teal-300">
            Real-World Assets
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed"
        >
          ARIA deploys an autonomous AI council on Casper Network to instantly underwrite, securitize, and fund SME invoices using dynamic CEP-78 reputation frameworks.
        </motion.p>

        {/* Call To Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link href="/submit" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-8 py-6 bg-gradient-to-r from-violet-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-text-primary font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
              <span>Submit Invoice to Council</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </Button>
          </Link>
          
          <Link href="/observatory" className="w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto px-8 py-4 bg-bg-card border border-violet-500/10 hover:bg-bg-card-hover text-text-primary font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 text-teal-400" />
              <span>Watch the Swarm</span>
            </button>
          </Link>
        </motion.div>

        {/* The Hook: Scrolling Live Pulse Ticker */}
        <LiveStatsTicker />
      </div>
    </section>
  );
}
