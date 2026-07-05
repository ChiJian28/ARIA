import { ASSET_TYPES } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface AssetTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssetTypeSelector({ value, onChange }: AssetTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ASSET_TYPES.map(({ value: v, label, icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200',
            value === v
              ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
              : 'border-violet-500/20 bg-bg-elevated text-text-secondary hover:border-violet-500/40',
          )}
        >
          <span className="text-2xl">{icon}</span>
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
