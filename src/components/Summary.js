import ScoreGauge from './ScoreGauge'
import ScoreBadge from './ScoreBadge'

// Utility component for category display with enhanced data structure
const Category = ({ title, score, weight, description }) => {
  // Traffic-light color system for the score number
  const textColor = score > 70 
    ? "text-green-600" 
    : score > 49 
    ? "text-yellow-600" 
    : "text-red-600"

  return (
    <div className="text-center p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="text-sm font-medium text-gray-700 mb-1">
        {title}
      </div>
      <div className={`text-2xl font-bold ${textColor} mb-1`}>
        {score}/100
      </div>
      {weight && (
        <div className="text-xs text-gray-500 mb-2">
          Weight: {weight}%
        </div>
      )}
      {description && (
        <div className="text-xs text-gray-600 leading-tight">
          {description}
        </div>
      )}
    </div>
  )
}

// Score interpretation helper component
const ScoreInterpretation = ({ score, scoreInterpretation }) => {
  if (!scoreInterpretation) return null;

  const getScoreRange = (score) => {
    if (score >= 90) return "90-100";
    if (score >= 80) return "80-89";
    if (score >= 70) return "70-79";
    if (score >= 60) return "60-69";
    if (score >= 50) return "50-59";
    return "0-49";
  };

  const currentRange = getScoreRange(score);
  const interpretation = scoreInterpretation[currentRange];

  const getInterpretationColor = (score) => {
    if (score >= 80) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 70) return "text-blue-700 bg-blue-50 border-blue-200";
    if (score >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  return (
    <div className={`p-3 rounded-lg border ${getInterpretationColor(score)} text-center mb-4`}>
      <div className="font-medium text-sm">
        {interpretation}
      </div>
    </div>
  );
};

const Summary = ({ feedback }) => {
  if (!feedback) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  const { 
    overall_score, 
    ats_score, 
    categories, 
    score_interpretation,
    competitive_analysis 
  } = feedback

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Resume Analysis Summary
        </h2>
        <p className="text-gray-600">
          This score is calculated based on the variables listed below.
        </p>
      </div>

      {/* Main Score Display */}
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4">
          <ScoreGauge score={overall_score} />
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            Overall Score
          </div>
          <ScoreBadge score={overall_score} />
        </div>
        
        {/* Score Interpretation */}
        <ScoreInterpretation 
          score={overall_score} 
          scoreInterpretation={score_interpretation} 
        />
      </div>

      {/* ATS Score Display (if available) */}
      {ats_score !== undefined && (
        <div className="flex justify-center mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm font-medium text-gray-700 mb-1">
              ATS Compatibility
            </div>
            <div className={`text-xl font-bold ${
              ats_score > 70 ? "text-green-600" : 
              ats_score > 49 ? "text-yellow-600" : "text-red-600"
            }`}>
              {ats_score}/100
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Applicant Tracking System
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Category Breakdown
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(categories || {}).map(([categoryName, categoryData]) => (
            <Category
              key={categoryName}
              title={categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
              score={categoryData.score || 0}
              weight={categoryData.weight}
              description={categoryData.description}
            />
          ))}
        </div>
      </div>

      {/* Competitive Analysis (if available) */}
      {competitive_analysis?.market_position && (
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-start gap-3">
            <div className="text-purple-500 text-xl">📊</div>
            <div>
              <h4 className="font-medium text-purple-900 mb-1">
                Market Position
              </h4>
              <p className="text-sm text-purple-700">
                {competitive_analysis.market_position}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Improvement Guidance */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">💡</div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              How to improve your score
            </h4>
            <p className="text-sm text-blue-700">
              Check the detailed feedback sections below for specific recommendations 
              to enhance each category and boost your overall resume performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Summary