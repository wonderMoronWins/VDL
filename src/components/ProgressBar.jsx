export default function ProgressBar({ percent = 0, className = '' }) {
  return (
    <div className={`h-[3px] bg-white/[0.08] rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-300"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
