import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resumeService } from '../lib/supabase';
import { formatRelativeTime, extractFilename } from '../utils/utils';
import Navbar from '../components/Navbar';
import ScoreBadge from '../components/ScoreBadge';

const Submissions = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSubmissions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await resumeService.getAll(user.id);
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setError('Failed to load your submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Past Submissions
          </h1>
          <p className="text-gray-600">
            Track and review all your previous resume analyses
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <span>⚠️</span>
              <span className="font-medium">Error Loading Submissions</span>
            </div>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button 
              onClick={loadSubmissions} 
              className="text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Submissions Found
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't uploaded any resumes yet. Start by uploading your first resume to get AI-powered feedback.
              </p>
              <Link 
                to="/upload" 
                className="primary-button inline-flex items-center gap-2"
              >
                ⬆️ Upload Resume
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {submissions.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 truncate">
                              {item.job_title}
                            </h3>
                            <p className="text-gray-600">{item.company_name}</p>
                          </div>
                          {item.feedback?.overall_score != null && (
                            <ScoreBadge score={item.feedback.overall_score} />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>
                            <span className="font-medium">File:</span>{" "}
                            {extractFilename(item.resume_path)}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span>{" "}
                            {formatRelativeTime(item.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {item.feedback ? (
                          <div className="flex items-center gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-gray-900">
                                {item.feedback.overall_score}
                              </div>
                              <div className="text-xs text-gray-500">Overall</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-900">
                                {item.feedback.ats_score}
                              </div>
                              <div className="text-xs text-gray-500">ATS</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">
                            <div className="text-sm">Analysis</div>
                            <div className="text-xs">Pending</div>
                          </div>
                        )}
                        
                        <Link
                          to={`/resume/${item.id}`}
                          className="primary-button text-sm px-4 py-2"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="text-center space-x-4">
              <Link
                to="/upload"
                className="primary-button inline-flex items-center gap-2"
              >
                ⬆️ Upload Another Resume
              </Link>
              <Link
                to="/"
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                🏠 Back to Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Submissions;
