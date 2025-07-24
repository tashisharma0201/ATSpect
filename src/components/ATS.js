import ScoreGauge from './ScoreGauge'
import ScoreBadge from './ScoreBadge'

const ATS = ({ feedback }) => {
  if (!feedback) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  const { ats_score, suggestions = [] } = feedback
  const atsSpecificSuggestions = suggestions.filter(s => 
    s.category === 'keywords' || 
    s.category === 'formatting' || 
    s.tip.toLowerCase().includes('ats')
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ATS Compatibility Score
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This score represents how well your resume is likely to perform in 
          Applicant Tracking Systems used by employers.
        </p>
      </div>

      {/* ATS Score Display */}
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4">
          <ScoreGauge score={ats_score} />
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            ATS Score
          </div>
          <ScoreBadge score={ats_score} />
        </div>
      </div>

      {/* ATS-Specific Information */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            🤖 What is ATS?
          </h3>
          <p className="text-sm text-blue-800">
            Applicant Tracking Systems (ATS) are software tools used by employers 
            to scan and filter resumes before they reach human recruiters. A higher 
            ATS score means better chances of passing these automated filters.
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          ats_score > 70 
            ? 'bg-green-50' 
            : ats_score > 49 
            ? 'bg-yellow-50' 
            : 'bg-red-50'
        }`}>
          <h3 className={`font-semibold mb-2 flex items-center gap-2 ${
            ats_score > 70 
              ? 'text-green-900' 
              : ats_score > 49 
              ? 'text-yellow-900' 
              : 'text-red-900'
          }`}>
            {ats_score > 70 ? '✅' : ats_score > 49 ? '⚠️' : '❌'} 
            ATS Performance
          </h3>
          <p className={`text-sm ${
            ats_score > 70 
              ? 'text-green-800' 
              : ats_score > 49 
              ? 'text-yellow-800' 
              : 'text-red-800'
          }`}>
            {ats_score > 70 
              ? 'Excellent! Your resume is well-optimized for ATS systems.'
              : ats_score > 49 
              ? 'Good start, but there\'s room for improvement in ATS compatibility.'
              : 'Your resume needs significant improvements to pass ATS filters effectively.'
            }
          </p>
        </div>
      </div>

      {/* ATS-Specific Suggestions */}
      {atsSpecificSuggestions.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ATS Optimization Tips
          </h3>
          <div className="space-y-4">
            {atsSpecificSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[32px] h-8 flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {suggestion.tip}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {suggestion.explanation}
                    </p>
                    {suggestion.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                        {suggestion.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General ATS Tips */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          💡 Quick ATS Tips
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Use standard section headings (Experience, Education, Skills)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Include relevant keywords from the job description</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Use standard fonts like Arial, Calibri, or Times New Roman</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Avoid images, graphics, and complex formatting</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Save and submit as a .pdf or .docx file</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Spell out abbreviations and acronyms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Message */}
      <div className="text-center mt-6 text-sm text-gray-600">
        <p>
          Keep refining your resume to improve your chances of getting past ATS filters 
          and into the hands of recruiters.
        </p>
      </div>
    </div>
  )
}

export default ATS
