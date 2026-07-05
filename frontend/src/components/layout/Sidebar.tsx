'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FilePlus,
  Landmark,
  Radio,
} from 'lucide-react';
import { AriaLogo } from '@/components/brand/AriaLogo';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/submit', label: 'Submit RWA', icon: FilePlus },
  // { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/vault', label: 'Vault', icon: Landmark },
  { href: '/observatory', label: 'Observatory', icon: Radio },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-bg-surface border-r border-violet-500/[0.12] flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-violet-500/[0.12]">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg transition-colors hover:opacity-90">
          <AriaLogo size={32} />
          <div>
            <p className="text-sm font-bold text-text-primary">ARIA</p>
            <p className="text-[10px] text-text-muted">RWA Intelligence Agent</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 3 }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Testnet badge */}
      <div className="px-5 py-4 border-t border-violet-500/[0.12]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-amber-400 font-medium">Testnet</span>
        </div>
      </div>
    </aside>
  );
}
