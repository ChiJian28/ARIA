import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const COSTS = [
  { label: 'Risk Check (x402)', cspr: '0.05' },
  { label: 'Valuation Analysis (x402)', cspr: '0.05' },
  { label: 'KYC / Compliance (x402)', cspr: '0.03' },
  { label: 'On-chain Vote Gas (×3)', cspr: '0.15' },
];

export function X402CostBreakdown() {
  const total = COSTS.reduce((sum, c) => sum + parseFloat(c.cspr), 0).toFixed(2);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-text-primary">Estimated Processing Cost</span>
        </div>
        <div className="space-y-2">
          {COSTS.map((c) => (
            <div key={c.label} className="flex justify-between text-xs">
              <span className="text-text-secondary">{c.label}</span>
              <span className="font-mono text-text-primary">{c.cspr} CSPR</span>
            </div>
          ))}
        </div>
        <div className="border-t border-violet-500/20 mt-3 pt-3 flex justify-between">
          <span className="text-sm font-semibold text-text-primary">Total</span>
          <span className="font-mono font-bold text-violet-400">{total} CSPR</span>
        </div>
      </CardContent>
    </Card>
  );
}
