import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resumeService } from '../lib/supabase';
import Navbar from '../components/Navbar';
import ResumeCard from '../components/ResumeCard';


const Home = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadResumes = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await resumeService.getAll(user.id);
      setResumes(data);
    } catch (err) {
      console.error('Failed to load resumes:', err);
      setError('Failed to load your resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Optimize your resume performance & 
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
               stay ahead in your job search
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {resumes.length === 0 
              ? "No resumes found. Upload your first resume to get feedback." 
              : "Get AI-driven feedback on your applications in one place."
            }
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <span>⚠️</span>
              <span className="font-medium">Error Loading Resumes</span>
            </div>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button 
              onClick={loadResumes} 
              className="text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        )}

        {resumes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {resumes.map(resume => (
                <ResumeCard 
                  key={resume.id} 
                  resume={resume}
                  onDelete={loadResumes}
                />
              ))}
            </div>
            
            {/* Quick Actions - mobile responsive */}
            <div className="text-center space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Link
                to="/upload"
                className="primary-button inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                ⬆️ Upload Another Resume
              </Link>
              <Link
                to="/submissions"
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                📋 View All Submissions
              </Link>
            </div>
          </>
        ) : (
          !error && (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Resumes Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload your first resume to get started with AI-powered feedback and optimization tips.
                </p>
                <Link
                  to="/upload"
                  className="primary-button inline-flex items-center gap-2"
                >
                  ⬆️ Upload Resume
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Home;
