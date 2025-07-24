import { useEffect, useRef, useState } from "react"

const ScoreGauge = ({ score = 75 }) => {
  const [pathLength, setPathLength] = useState(0)
  const pathRef = useRef(null)
  const percentage = score / 100

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [])

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
        width="200"
        height="120"
        viewBox="0 0 200 120"
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Foreground arc with rounded ends */}
        <path
          ref={pathRef}
          d="M 30 100 A 70 70 0 0 1 170 100"
          stroke={scoreColor}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength - (pathLength * percentage)}
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Score markers */}
        <g className="text-xs fill-gray-400">
          <text x="25" y="115" textAnchor="middle">0</text>
          <text x="100" y="30" textAnchor="middle">50</text>
          <text x="175" y="115" textAnchor="middle">100</text>
        </g>
      </svg>
      
      {/* Score text overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <div 
          className="text-3xl font-bold mb-1"
          style={{ color: scoreColor }}
        >
          {score}
        </div>
        <div className="text-sm text-gray-500">
          /100
        </div>
      </div>
    </div>
  )
}

export default ScoreGauge
