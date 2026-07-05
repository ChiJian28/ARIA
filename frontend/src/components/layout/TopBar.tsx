'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
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

const RWA_PARENT_FROM: Record<string, { label: string; href: string }> = {
  vault: { label: 'Vault', href: '/vault' },
  portfolio: { label: 'Portfolio', href: '/portfolio' },
  observatory: { label: 'Observatory', href: '/observatory' },
  submit: { label: 'Submit RWA', href: '/submit' },
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function buildBreadcrumbs(pathname: string, from?: string | null): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'rwa' && segments.length >= 2) {
    const rwaId = segments[1];
    const parent = (from ? RWA_PARENT_FROM[from] : undefined) ?? RWA_PARENT_FROM.observatory;
    return [
      { label: parent.label, href: parent.href },
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

function TopBarBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const crumbs = buildBreadcrumbs(pathname, searchParams.get('from'));

  return (
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
  );
}

export function TopBar() {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-violet-500/[0.12] bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
      <Suspense
        fallback={
          <div className="flex items-center gap-1.5 text-sm text-text-muted min-w-0">
            <AriaLogo size={18} />
            <span>ARIA</span>
          </div>
        }
      >
        <TopBarBreadcrumbs />
      </Suspense>

      <div className="flex items-center gap-3">
        <GlobalTxTracker />
        <LiveDot />
        <ConnectButton />
      </div>
    </header>
  );
}
