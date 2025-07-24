import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'

const Insights = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Features data
  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Analysis',
      description: 'Our advanced AI analyzes your resume using the latest machine learning models to provide comprehensive feedback on content, structure, and ATS optimization.'
    },
    {
      icon: '📊',
      title: 'ATS Compatibility Score',
      description: 'Get a detailed score showing how well your resume will perform with Applicant Tracking Systems used by top companies worldwide.'
    },
    {
      icon: '🎯',
      title: 'Job-Specific Optimization',
      description: 'Tailor your resume for specific positions by analyzing job descriptions and matching requirements with your experience and skills.'
    },
    {
      icon: '💡',
      title: 'Smart Recommendations',
      description: 'Receive actionable tips and suggestions to improve each section of your resume, from formatting to keyword optimization.'
    },
    {
      icon: '📈',
      title: 'Performance Tracking',
      description: 'Monitor your resume improvements over time with detailed analytics and see how changes impact your overall score.'
    },
    {
      icon: '🔍',
      title: 'Detailed Breakdown',
      description: 'Get category-wise analysis covering formatting, content quality, keyword density, experience relevance, and skills alignment.'
    },
    {
      icon: '⚡',
      title: 'Instant Results',
      description: 'Upload your resume and receive comprehensive feedback within minutes, not days or weeks like traditional services.'
    },
    {
      icon: '🎨',
      title: 'Visual Insights',
      description: 'Interactive charts and visual representations help you understand your resume performance at a glance.'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your resume data is encrypted and securely stored. We never share your information with third parties or employers.'
    },
    {
      icon: '📱',
      title: 'Multi-Device Access',
      description: 'Access your resume analyses from any device - desktop, tablet, or mobile. Your data syncs seamlessly across platforms.'
    },
    {
      icon: '🌟',
      title: 'Industry Standards',
      description: 'Our analysis is based on current hiring trends and industry best practices from Fortune 500 companies.'
    },
    {
      icon: '🚀',
      title: 'Career Growth',
      description: 'Beyond just resume feedback, get insights into career development and skill gaps in your target industry.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Why Choose 
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              ATSpect?
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your resume into a job-winning document with our suite of smart features designed for modern job seekers.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Resume</h3>
              <p className="text-gray-600">
                Upload your resume in PDF format along with the job description you're targeting.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your resume against the job requirements and ATS best practices.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Feedback</h3>
              <p className="text-gray-600">
                Receive detailed feedback with actionable recommendations to improve your resume.
              </p>
            </div>
          </div>
        </div>

      {/* CTA Section */}
<div className="text-center bg-white rounded-lg shadow-md p-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    Ready to optimize your resume?
  </h2>
  <p className="text-gray-600 mb-6">
    Start your journey to landing your dream job with AI-powered resume optimization.
  </p>
  <div className="flex flex-col md:flex-row justify-center gap-4">
    <button
      onClick={() => navigate('/upload')}
      className="primary-button text-lg px-8 py-3 w-full md:w-auto"
    >
      🚀 Analyze My Resume
    </button>
    <button
      onClick={() => navigate('/')}
      className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-8 rounded-lg transition-colors w-full md:w-auto"
    >
      📊 View Dashboard
    </button>
  </div>
</div>


       {/* Footer */}
<div className="text-center mt-12 pt-8 border-t border-gray-200 space-y-2">
  <p className="text-gray-500">
    <strong>Project by Tashi Sharma</strong>
  </p>
  <p className="text-gray-500 flex justify-center gap-6">
    <a
      href="https://www.linkedin.com/in/tashi-sharma-97695b277/"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-blue-600 transition-colors"
      aria-label="LinkedIn"
    >
      LinkedIn
    </a>
    <span className="text-gray-400">|</span>
    <a
      href="https://github.com/tashisharma0201"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-blue-900 transition-colors"
      aria-label="GitHub"
    >
      GitHub
    </a>
     <span className="text-gray-400">|</span>
    <a
      href="https://tashiportfolio.netlify.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-blue-900 transition-colors"
      aria-label="Portfolio"
    >
     Portfolio
    </a>
  </p>
</div>

      </div>
    </div>
  )
}

export default Insights
