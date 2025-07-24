const ScoreCircle = ({ score = 75 }) => {
  const radius = 40
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const progress = score / 100
  const strokeDashoffset = circumference * (1 - progress)

  // Determine color based on score
  const getScoreColor = (score) => {
    if (score > 70) return '#10b981' // green-500
    if (score > 49) return '#f59e0b' // amber-500
    return '#ef4444' // red-500
  }

  const scoreColor = getScoreColor(score)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        
        {/* Progress circle */}
        <circle
          stroke={scoreColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      
      {/* Score text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="text-sm font-bold"
          style={{ color: scoreColor }}
        >
          {score}
        </span>
      </div>
    </div>
  )
}

export default ScoreCircle
