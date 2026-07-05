'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { LiveDot } from './LiveDot';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { GlobalTxTracker } from '@/components/vault/GlobalTxTracker';
import { AriaLogo } from '@/components/brand/AriaLogo';

const LABELS: Record<string, string> = {
  submit: 'Submit RWA',
  portfolio: 'Portfolio',
  vault: 'Vault',
  observatory: 'Observatory',
  rwa: 'RWA Detail',
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'rwa' && segments.length >= 2) {
    const rwaId = segments[1];
    return [
      { label: 'Observatory', href: '/observatory' },
      { label: 'RWA Detail' },
      { label: rwaId.length > 12 ? `${rwaId.slice(0, 8)}…` : rwaId },
    ];
  }

  return segments.map((seg, i) => {
    const isLast = i === segments.length - 1;
    const href = isLast ? undefined : `/${segments.slice(0, i + 1).join('/')}`;
    return {
      label: LABELS[seg] ?? (seg.length > 12 ? `${seg.slice(0, 8)}…` : seg.charAt(0).toUpperCase() + seg.slice(1)),
      href,
    };
  });
}

export function TopBar() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-violet-500/[0.12] bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-text-muted shrink-0 hover:text-text-primary transition-colors"
        >
          <AriaLogo size={18} />
          <span>ARIA</span>
        </Link>
        {crumbs.map((crumb, i) => (
          <div key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-text-secondary hover:text-text-primary transition-colors truncate"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  i === crumbs.length - 1
                    ? 'text-text-primary font-medium truncate'
                    : 'text-text-secondary truncate'
                }
              >
                {crumb.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <GlobalTxTracker />
        <LiveDot />
        <ConnectButton />
      </div>
    </header>
  );
}
