import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resumeService, storageService } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Summary from '../components/Summary';
import ATS from '../components/ATS';
import Details from '../components/Details';

const Resume = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ✅ SIMPLIFIED: Single state object instead of multiple states
  const [state, setState] = useState({
    resume: null,
    feedback: null,
    imageUrl: '',
    resumeUrl: '',
    loading: true,
    error: null,
    initialized: false
  });

  // ✅ SIMPLIFIED: Single effect with all logic
  useEffect(() => {
    let mounted = true;
    let resumeObjectUrl = null;

    const loadResumeData = async () => {
      // Don't load if no user or ID
      if (!user?.id || !id) {
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: !user ? 'Authentication required' : 'Invalid resume ID' 
          }));
        }
        return;
      }

      // Don't reload if already initialized with same ID
      if (state.initialized && state.resume?.id === id && !state.error) {
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
        return;
      }

      try {
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            loading: true, 
            error: null,
            // Reset data when loading new resume
            resume: null,
            feedback: null,
            imageUrl: '',
            resumeUrl: ''
          }));
        }

        console.log('Loading resume:', id);

        // Fetch resume data
        const resumeData = await resumeService.getById(id);
        
        if (!mounted) return;

        if (!resumeData) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Resume not found. It may have been deleted or the link is incorrect.',
            initialized: true
          }));
          return;
        }

        if (resumeData.user_id !== user.id) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'You do not have permission to view this resume.',
            initialized: true
          }));
          return;
        }

        // Load image URL if available
        let imageUrl = '';
        if (resumeData.image_path) {
          try {
            imageUrl = await storageService.getFileUrl(resumeData.image_path, { bucket: 'resume-images' });
          } catch (err) {
            console.error('Error loading resume image:', err);
            // Don't fail the whole load for image errors
          }
        }

        // Load PDF blob if available
        let resumeUrl = '';
        if (resumeData.resume_path) {
          try {
            const resumeBlob = await storageService.downloadFile(resumeData.resume_path, { bucket: 'resumes' });
            resumeObjectUrl = URL.createObjectURL(resumeBlob);
            resumeUrl = resumeObjectUrl;
          } catch (err) {
            console.error('Error loading resume PDF:', err);
            // Don't fail the whole load for PDF errors
          }
        }

        if (mounted) {
          setState(prev => ({ 
            ...prev,
            resume: resumeData,
            feedback: resumeData.feedback,
            imageUrl,
            resumeUrl,
            loading: false,
            error: null,
            initialized: true
          }));
        }

        console.log('Resume loaded successfully');

      } catch (err) {
        console.error('Error loading resume:', err);
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'A network error occurred. Please check your connection and try again.',
            initialized: true
          }));
        }
      }
    };

    loadResumeData();

    // Cleanup function
    return () => {
      mounted = false;
      if (resumeObjectUrl) {
        URL.revokeObjectURL(resumeObjectUrl);
      }
    };
  }, [user?.id, id]); // ✅ SIMPLIFIED: Only essential dependencies

  // ✅ SIMPLIFIED: Single retry function
  const handleRetry = () => {
    setState(prev => ({ 
      ...prev, 
      initialized: false, 
      error: null 
    }));
  };

  // ✅ SIMPLIFIED: Clear loading and error states
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Resume...</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{state.error}</p>
            <div className="space-x-4">
              <button
                onClick={handleRetry}
                className="primary-button"
              >
                Try Again
              </button>
              <Link
                to="/"
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ SIMPLIFIED: Main render with destructured state
  const { resume, feedback, imageUrl, resumeUrl } = state;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            ← Return Home
          </Link>
          
          {resume && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {resume.job_title} at {resume.company_name}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Resume Analysis Report
                  </p>
                </div>
                
                {/* Resume Preview & Download */}
                {imageUrl && resumeUrl && (
                  <div className="mt-4 md:mt-0 flex items-center gap-4">
                    <div className="w-16 h-20 rounded border shadow-sm overflow-hidden">
                      <img
                        src={imageUrl}
                        alt="Resume preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-button text-sm"
                    >
                      📄 View PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Resume Review
          </h2>

          {feedback ? (
            <>
              {/* Summary Section */}
              <Summary feedback={feedback} />
              
              {/* ATS Section */}
              <ATS feedback={feedback} />
              
              {/* Details Section */}
              <Details feedback={feedback} />
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Analysis in Progress
              </h3>
              <p className="text-gray-600 mb-6">
                The AI analysis for this resume has not been completed yet.
              </p>
              <button
                onClick={handleRetry}
                className="primary-button"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-12 text-center space-x-4">
          <Link
            to="/upload"
            className="primary-button"
          >
            📤 Upload Another Resume
          </Link>
          <Link
            to="/submissions"
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📋 View All Submissions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Resume;
