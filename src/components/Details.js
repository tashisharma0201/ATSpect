import { cn } from '../utils/utils'
import { Accordion, AccordionContent, AccordionHeader, AccordionItem } from './Accordion'

const ScoreBadge = ({ score }) => {
  return (
    <span
      className={cn(
        "px-2 py-1 rounded text-xs font-medium",
        score > 69 
          ? "bg-badge-green text-badge-green-text" 
          : score > 39 
          ? "bg-badge-yellow text-badge-yellow-text" 
          : "bg-badge-red text-badge-red-text"
      )}
    >
      {score}/100
    </span>
  )
}

const Details = ({ feedback }) => {
  if (!feedback || !feedback.categories) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { categories } = feedback

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Detailed Feedback
        </h2>
        <p className="text-gray-600">
          Expand each section below to see specific recommendations for improvement.
        </p>
      </div>

      {/* Categories Accordion */}
      <Accordion defaultOpen="formatting" allowMultiple={true}>
        {Object.entries(categories).map(([categoryName, categoryData]) => {
          const { score, tips = [] } = categoryData
          const formattedCategoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
          
          return (
            <AccordionItem key={categoryName} id={categoryName} className="mb-4">
              <AccordionHeader 
                itemId={categoryName}
                className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formattedCategoryName}
                    </h3>
                    <ScoreBadge score={score} />
                  </div>
                </div>
              </AccordionHeader>
              
              <AccordionContent 
                itemId={categoryName}
                className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="space-y-4">
                  {/* Category Overview */}
                  <div className="pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Score:</span>
                      <span className={cn(
                        "font-bold text-lg",
                        score > 70 ? "text-green-600" : 
                        score > 49 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {score}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full transition-all duration-500",
                          score > 70 ? "bg-green-500" : 
                          score > 49 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Tips Section */}
                  {tips.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 mb-3">
                        💡 Improvement Tips:
                      </h4>
                      {tips.map((tip, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-xs font-bold min-w-[24px] h-6 flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-2">
                                {typeof tip === 'string' ? tip : tip.tip}
                              </h5>
                              {typeof tip === 'object' && tip.explanation && (
                                <p className="text-sm text-gray-600">
                                  {tip.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No specific tips available for this category.</p>
                    </div>
                  )}

                  {/* Performance Indicator */}
                  <div className={cn(
                    "p-3 rounded-lg border-l-4",
                    score > 70 
                      ? "bg-green-50 border-green-400" 
                      : score > 49 
                      ? "bg-yellow-50 border-yellow-400" 
                      : "bg-red-50 border-red-400"
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {score > 70 ? '🎉' : score > 49 ? '⚡' : '🎯'}
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        score > 70 ? "text-green-700" : 
                        score > 49 ? "text-yellow-700" : "text-red-700"
                      )}>
                        {score > 70 
                          ? "Excellent work in this area!" 
                          : score > 49 
                          ? "Good foundation, room for improvement." 
                          : "Focus on this area for maximum impact."
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Bottom Action */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 mb-2">
            🚀 Ready to improve your resume?
          </h3>
          <p className="text-sm text-gray-600">
            Use the feedback above to make targeted improvements. 
            Each small change can significantly boost your overall score!
          </p>
        </div>
      </div>
    </div>
  )
}

export default Details
