import clsx from 'clsx'

interface ScoreCircleProps {
  score: number | null
  size?: number
}

function scoreColor(score: number | null): { stroke: string; text: string } {
  if (score === null) return { stroke: '#D4D4D8', text: 'text-ink-60' }
  if (score >= 92) return { stroke: '#16A34A', text: 'text-success' }
  if (score >= 82) return { stroke: '#2563EB', text: 'text-accent' }
  if (score >= 72) return { stroke: '#CA8A04', text: 'text-warning' }
  return { stroke: '#A1A1AA', text: 'text-ink-60' }
}

export default function ScoreCircle({ score, size = 44 }: ScoreCircleProps) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const progress = score !== null ? (score / 100) * circumference : 0
  const { stroke, text } = scoreColor(score)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F5F5F7"
          strokeWidth={3}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        />
      </svg>
      <div className={clsx('absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold', text)}>
        {score !== null ? score : '—'}
      </div>
    </div>
  )
}
