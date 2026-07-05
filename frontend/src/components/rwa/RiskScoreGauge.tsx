interface RiskScoreGaugeProps {
  score: number;
  size?: number;
}

export function RiskScoreGauge({ score, size = 100 }: RiskScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = 40;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  const color =
    clampedScore <= 33 ? '#10B981' : clampedScore <= 66 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 10} viewBox="0 0 100 60">
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#1E1E35"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.5s' }}
        />
        <text x="50" y="48" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold" fontFamily="monospace">
          {clampedScore}
        </text>
        <text x="50" y="57" textAnchor="middle" fill="#8B80B5" fontSize="7">
          Risk Score
        </text>
      </svg>
    </div>
  );
}
