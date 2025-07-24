import { getBadgeColorClass, getBadgeText } from '../utils/utils'

const ScoreBadge = ({ score }) => {
  const badgeColor = getBadgeColorClass(score)
  const badgeText = getBadgeText(score)

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
      {badgeText}
    </span>
  )
}

export default ScoreBadge
