import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { storageService, resumeService } from '../lib/supabase';
import { formatRelativeTime, getBadgeColorClass, getBadgeText } from '../utils/utils';
import ScoreCircle from './ScoreCircle';
import { Trash2, ExternalLink, Calendar } from 'lucide-react';

const ResumeCard = ({ resume, onDelete }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const {
    id,
    company_name,
    job_title,
    feedback,
    image_path,
    created_at
  } = resume;

  useEffect(() => {
    // Keep track of whether the component is still mounted to prevent state updates after unmounting.
    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (image_path) {
          // FIX: Explicitly specify the 'resume-images' bucket.
          // This ensures the URL is generated for the correct public bucket.
          const url = await storageService.getFileUrl(image_path, { bucket: 'resume-images' });
          if (isMounted) {
            setImageUrl(url);
          }
        }
      } catch (err) {
        console.error('Error loading resume image:', err);
        if (isMounted) {
          setError('Failed to load image');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();
    
    // Cleanup function to run when the component unmounts.
    return () => {
      isMounted = false;
    };
  }, [image_path]);

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      
      // Delete files from storage from their specific buckets.
      if (resume.resume_path) {
        await storageService.deleteFile(resume.resume_path, { bucket: 'resumes' });
      }
      if (resume.image_path) {
        await storageService.deleteFile(resume.image_path, { bucket: 'resume-images' });
      }
      
      await resumeService.delete(id);
      
      // Notify the parent component (Home.js) to refresh the list.
      onDelete?.();
    } catch (err) {
      console.error('Error deleting resume:', err);
      alert('Failed to delete resume. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const overallScore = feedback?.overall_score || 0;
  const atsScore = feedback?.ats_score || 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {company_name}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {job_title}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Calendar size={12} />
              <span>{formatRelativeTime(created_at)}</span>
            </div>
          </div>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete resume"
          >
            {deleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="relative h-48 bg-gray-100">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500">
            <div>
              <div className="text-2xl mb-2">📄</div>
              <p className="text-xs">Preview unavailable</p>
            </div>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`Resume for ${job_title} at ${company_name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500">
            <div>
              <div className="text-2xl mb-2">📄</div>
              <p className="text-xs">No preview</p>
            </div>
          </div>
        )}

        {feedback && (
          <div className="absolute top-3 right-3">
            <ScoreCircle score={overallScore} />
          </div>
        )}
      </div>

      {feedback ? (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {overallScore}
                </div>
                <div className="text-xs text-gray-500">Overall</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {atsScore}
                </div>
                <div className="text-xs text-gray-500">ATS</div>
              </div>
            </div>
            
            <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColorClass(overallScore)}`}>
              {getBadgeText(overallScore)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(feedback.categories || {}).slice(0, 4).map(([category, data]) => (
              <div key={category} className="text-center">
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {category}
                </div>
                <div className={`text-sm font-bold ${
                  data.score > 70 ? 'text-green-600' : 
                  data.score > 49 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {data.score}/100
                </div>
              </div>
            ))}
          </div>

          <Link
            to={`/resume/${id}`}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={14} />
            View Details
          </Link>
        </div>
      ) : (
        <div className="p-4">
          <div className="text-center text-gray-500">
            <p className="text-sm mb-3">Analysis pending...</p>
            <Link
              to={`/resume/${id}`}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={14} />
              View Status
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeCard;