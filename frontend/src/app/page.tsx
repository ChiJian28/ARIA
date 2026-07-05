import { Hero } from '@/components/landing/Hero';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { PipelineTimeline } from '@/components/landing/PipelineTimeline';
import { AgentCouncilShowcase } from '@/components/landing/AgentCouncilShowcase';
import { AriaLogo } from '@/components/brand/AriaLogo';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ArrowRight, ExternalLink, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-deep">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-bg-deep/80 backdrop-blur-sm border-b border-violet-500/[0.08]">
        <Link href="/" className="flex items-center gap-2 font-bold text-text-primary hover:opacity-90 transition-opacity">
          <AriaLogo size={24} priority />
          ARIA
        </Link>
        <div className="flex gap-3">
          <Link href="/observatory" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Observatory
          </Link>
          <Link href="/submit" className={cn(buttonVariants({ size: 'sm' }))}>
            Launch App
          </Link>
        </div>
      </nav>

      {/* Sections */}
      <Hero />
      <ProblemSolution />
      <PipelineTimeline />
      <AgentCouncilShowcase />

      {/* Final CTA Section */}
      <section className="px-6 py-16" id="cta-section">
        <div className="text-center bg-gradient-to-r from-violet-950/20 to-teal-950/20 border border-violet-500/10 rounded-3xl p-12 max-w-5xl mx-auto space-y-6 shadow-xl">
          <h2 className="text-3xl font-bold text-text-primary">Enter the Agent-Driven Economy</h2>
          <p className="text-text-secondary text-sm font-light max-w-xl mx-auto leading-relaxed">
            ARIA provides complete transparency, verifiable logic, and robust automated liquidations. Secure your financial assets natively on Casper Network.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/submit" className="w-full sm:w-auto">
              <span className={cn(
                buttonVariants({ size: 'lg' }),
                'w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-violet-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-text-primary font-semibold rounded-xl shadow-lg transition-all duration-300 inline-flex gap-2 items-center justify-center'
              )}>
                Open SME Submission Console
                <ArrowRight className="w-4.5 h-4.5" />
              </span>
            </Link>
            <Link href="/vault" className="w-full sm:w-auto">
              <span className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'w-full sm:w-auto px-8 py-3 bg-bg-deep border border-violet-500/10 hover:bg-bg-card-hover text-text-secondary hover:text-text-primary font-semibold rounded-xl transition-all duration-300 inline-flex items-center justify-center'
              )}>
                Access LP Liquidity Vault
              </span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-violet-500/10 bg-bg-deep/60 py-8 text-center text-xs text-text-muted mt-16 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
            <Shield className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-text-secondary font-semibold">ARIA Underwriting Council</span>
            <span className="text-text-muted/60 hidden sm:inline">|</span>
            <span>Agentic Liquidity for Real-World Assets on Casper Network</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://casper.network"
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-400 transition-colors flex items-center gap-1"
            >
              <span>Casper Network</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-text-muted/40">•</span>
            <span>Hackathon Built 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
