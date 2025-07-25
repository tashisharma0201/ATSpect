import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  resumeService, 
  storageService, 
  healthCheck, 
  connectionMonitor,
  createError,
  logger,
  promiseWithTimeout // Added new import
} from '../lib/supabase';
import { analyzeResumeWithPerplexity } from '../services/perplexityService';
import { extractTextFromPDF, convertPdfToImage, validatePDF } from '../utils/pdfProcessor';
import { 
  generateUUID, 
  generateFilePath, 
  formatSize,
  createProgressTracker,
  validateFormData,
  isValidPDF,
  isFileSizeValid,
  storage
} from '../utils/utils';
import Navbar from '../components/Navbar';
import FileUploader from '../components/FileUploader';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Upload = () => {
  const { user, loading, initialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Refs for cleanup and cancellation
  const uploadControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Core state
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(7); // Updated to 7 steps
  const [lastProgressUpdate, setLastProgressUpdate] = useState(Date.now());

  // Connection state
  const [isOnline, setIsOnline] = useState(connectionMonitor.isOnline);
  const [connectionHealthy, setConnectionHealthy] = useState(true);

  // Form data state with validation
  const [formData, setFormData] = useState({
    companyName: '',
    jobTitle: '',
    jobDescription: ''
  });

  // File validation state
  const [fileValidation, setFileValidation] = useState({
    isValid: false,
    errors: [],
    size: 0,
    type: ''
  });

  // Transaction state for cleanup
  const [transactionState, setTransactionState] = useState({
    resumeId: null,
    pdfPath: null,
    imagePath: null,
    dbRecordCreated: false,
    filesUploaded: []
  });

  // Zomato SDE1 sample data
  const zomatoSDE1Data = {
    companyName: "Zomato",
    jobTitle: "Software Development Engineer 1",
    jobDescription: `As a Software Development Engineer 1 at Zomato, you will be part of a highly collaborative team responsible for designing, developing, and maintaining scalable software solutions that support our global food delivery platform. You will be working closely with cross-functional teams including product managers, designers, and other engineers to deliver high-quality and performant features.

Key Responsibilities:
- Develop robust, efficient, and maintainable code in languages such as Python, Java, or Go
- Participate in the design and implementation of new features and improvements
- Collaborate in the full software development lifecycle from requirement gathering to deployment
- Write automated tests and contribute to ensure reliability and scalability of the platform
- Troubleshoot and resolve production issues rapidly
- Continuously learn and adopt new technologies and best practices

Requirements:
- Bachelor's degree in Computer Science or related field
- Strong foundation in data structures, algorithms, and object-oriented design
- Familiarity with microservices architecture and API development
- Experience with cloud platforms (AWS/GCP/Azure) is a plus
- Excellent communication skills and team-oriented mindset
- 0-2 years of professional software development experience
- Knowledge of databases (SQL/NoSQL) and caching mechanisms
- Understanding of version control systems (Git) and CI/CD pipelines`
  };

  // =====================================================
  // COMPONENT CLEANUP
  // =====================================================

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any ongoing uploads
      if (uploadControllerRef.current) {
        uploadControllerRef.current.abort();
      }
      // Cleanup on unmount if processing
      if (isProcessing && transactionState.resumeId) {
        cleanupFailedUpload(transactionState).catch(err => 
          logger.error('Cleanup on unmount failed:', err)
        );
      }
    };
  }, []);

  // =====================================================
  // DEBOUNCED HEALTH CHECK
  // =====================================================

  const debouncedHealthCheck = useCallback(
    debounce(async () => {
      if (!mountedRef.current) return;
      
      try {
        const health = await promiseWithTimeout(
          healthCheck.testAllConnections(),
          10000, // 10 second timeout
          'Health check timeout'
        );
        
        if (mountedRef.current) {
          setConnectionHealthy(health.overall);
          
          if (!health.overall) {
            logger.warn('Some services unhealthy:', health);
          }
        }
      } catch (err) {
        logger.warn('Health check failed or timed out:', err);
        if (mountedRef.current) {
          setConnectionHealthy(false);
        }
      }
    }, 2000), // 2 second debounce
    []
  );

  // =====================================================
  // CONNECTION MONITORING
  // =====================================================

  useEffect(() => {
    const cleanup = connectionMonitor.addListener((status) => {
      if (!mountedRef.current) return;
      
      setIsOnline(status === 'online');
      if (status === 'online') {
        logger.info('Connection restored - checking health');
        debouncedHealthCheck();
      } else {
        logger.warn('Connection lost');
        setConnectionHealthy(false);
      }
    });

    // Initial health check
    debouncedHealthCheck();

    return cleanup;
  }, [debouncedHealthCheck]);

  // =====================================================
  // STUCK DETECTION
  // =====================================================

  useEffect(() => {
    if (!isProcessing) return;

    const getStepTimeout = (step) => {
      switch(step) {
        case 0: return 15000; // Pre-flight checks: 15 seconds
        case 1: return 30000; // PDF text extraction: 30 seconds
        case 2: return 240000; // PDF upload: 4 minutes
        case 3: return 60000; // Image conversion: 1 minute
        case 4: return 30000; // Database record: 30 seconds
        case 5: return 120000; // AI analysis: 2 minutes
        case 6: return 30000; // Save results: 30 seconds
        default: return 45000; // Default: 45 seconds
      }
    };

    const stuckTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      
      logger.warn(`Step ${currentStep} appears stuck, attempting recovery`);
      
      if (currentStep === 0) {
        // Skip pre-flight checks if stuck
        setCurrentStep(1);
        setStatusText('Skipping health checks, proceeding with upload...');
        setLastProgressUpdate(Date.now());
      } else {
        // For other steps, show error and allow manual retry
        setError(`Upload appears stuck at step ${currentStep}. Please try again.`);
        handleCancel();
      }
    }, getStepTimeout(currentStep));

    return () => clearTimeout(stuckTimer);
  }, [isProcessing, currentStep]);

  // =====================================================
  // AUTHENTICATION GUARDS
  // =====================================================

  useEffect(() => {
    if (initialized && !loading && !isAuthenticated) {
      logger.info('User not authenticated, redirecting to login');
      navigate('/auth?next=' + encodeURIComponent(window.location.pathname));
    }
  }, [initialized, loading, isAuthenticated, navigate]);

  // =====================================================
  // FILE HANDLING
  // =====================================================

  const handleFileSelect = useCallback((selectedFile) => {
    setFile(selectedFile);
    setError('');

    if (selectedFile) {
      // Validate file
      const pdfValidation = validatePDF(selectedFile);
      const sizeValid = isFileSizeValid(selectedFile, 50); // 50MB limit
      const typeValid = isValidPDF(selectedFile);

      const validation = {
        isValid: pdfValidation.isValid && sizeValid && typeValid,
        errors: [
          ...pdfValidation.errors,
          ...(sizeValid ? [] : ['File size exceeds 50MB limit']),
          ...(typeValid ? [] : ['File must be a PDF document'])
        ],
        size: selectedFile.size,
        type: selectedFile.type
      };

      setFileValidation(validation);

      if (!validation.isValid) {
        setError(`File validation failed: ${validation.errors.join(', ')}`);
      }

      logger.debug('File selected:', {
        name: selectedFile.name,
        size: formatSize(selectedFile.size),
        type: selectedFile.type,
        valid: validation.isValid
      });
    } else {
      setFileValidation({ isValid: false, errors: [], size: 0, type: '' });
    }
  }, []);

  // =====================================================
  // FORM HANDLING
  // =====================================================

  const handleZomatoQuickFill = useCallback(() => {
    setFormData(zomatoSDE1Data);
    setError('');
    logger.info('Sample data loaded');
  }, []);

  const validateForm = useCallback(() => {
    const rules = {
      companyName: { 
        required: true, 
        minLength: 2, 
        maxLength: 100 
      },
      jobTitle: { 
        required: true, 
        minLength: 3, 
        maxLength: 200 
      },
      jobDescription: { 
        required: true, 
        minLength: 50, 
        maxLength: 5000 
      }
    };

    return validateFormData(formData, rules);
  }, [formData]);

  // =====================================================
  // CLEANUP FUNCTIONS
  // =====================================================

  const cleanupFailedUpload = useCallback(async (state) => {
    logger.info('Starting cleanup for failed upload:', state);
    
    const cleanupTasks = [];

    // Clean up database record
    if (state.dbRecordCreated && state.resumeId) {
      cleanupTasks.push(
        resumeService.delete(state.resumeId).catch(err => 
          logger.error('Failed to cleanup database record:', err)
        )
      );
    }

    // Clean up uploaded files
    if (state.filesUploaded && state.filesUploaded.length > 0) {
      state.filesUploaded.forEach(({ path, bucket }) => {
        cleanupTasks.push(
          storageService.deleteFile(path, { bucket, timeout: 15000 }).catch(err => 
            logger.error(`Failed to cleanup file ${path}:`, err)
          )
        );
      });
    }

    // Execute all cleanup tasks
    if (cleanupTasks.length > 0) {
      await Promise.allSettled(cleanupTasks);
      logger.info('Cleanup completed');
    }
  }, []);

  // =====================================================
  // PROGRESS TRACKING
  // =====================================================

  const progressTracker = createProgressTracker(totalSteps, (progressData) => {
    if (!mountedRef.current) return;
    
    setCurrentStep(progressData.step);
    setProgress(progressData.progress);
    setStatusText(progressData.message);
    setLastProgressUpdate(Date.now());
    
    logger.debug('Progress update:', progressData);
  });

  // =====================================================
  // MAIN UPLOAD PROCESS
  // =====================================================

  const handleAnalyze = useCallback(async ({ companyName, jobTitle, jobDescription, file }) => {
    // Authentication validation
    if (!user?.id) {
      setError('Please sign in to upload your resume.');
      navigate('/auth?next=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Create cancellation controller
    uploadControllerRef.current = new AbortController();

    const resumeId = generateUUID();
    let currentState = {
      resumeId,
      pdfPath: null,
      imagePath: null,
      dbRecordCreated: false,
      filesUploaded: []
    };

    try {
      setIsProcessing(true);
      setError('');
      setProgress(0);
      setCurrentStep(0);
      setLastProgressUpdate(Date.now());

      // STEP 0: Non-blocking pre-flight checks
      progressTracker.update(0, 'Performing pre-flight checks...');

      try {
        const healthStatus = await promiseWithTimeout(
          healthCheck.testAllConnections(),
          12000, // 12 second timeout
          'Pre-flight checks timed out'
        );
        
        if (!healthStatus.overall) {
          logger.warn('Some services unhealthy, proceeding with caution:', healthStatus);
          // Don't throw error, just log warning
        } else {
          logger.success('Pre-flight checks passed');
        }
      } catch (healthError) {
        logger.warn('Pre-flight checks failed, proceeding anyway:', healthError);
        // Continue with upload even if health checks fail
      }

      // Check if upload was cancelled
      if (uploadControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // STEP 1: Extract and validate PDF text
      progressTracker.increment('Extracting text from PDF...');
      
      const resumeText = await extractTextFromPDF(file);
      if (!resumeText || resumeText.length < 50) {
        throw createError(
          'Could not extract readable text from PDF. Please ensure your resume contains selectable text, not just images.',
          'PDF_TEXT_EXTRACTION_FAILED'
        );
      }

      logger.info(`Extracted ${resumeText.length} characters from PDF`);

      // Check if upload was cancelled
      if (uploadControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // STEP 2: Upload PDF with skipHealthCheck option
      progressTracker.increment('Uploading PDF file...');

      const pdfPath = generateFilePath(user.id, file.name, 'pdf');
      
      await storageService.uploadFile(file, pdfPath, {
        bucket: 'resumes',
        skipHealthCheck: true, // Skip redundant health check
        maxRetries: 3,
        timeout: 180000, // 3 minutes
        onProgress: (progressInfo) => {
          if (!mountedRef.current) return;
          if (progressInfo.stage === 'uploading') {
            setStatusText(`Uploading PDF... ${progressInfo.progress || 0}%`);
          } else if (progressInfo.stage === 'retrying') {
            setStatusText(`Upload failed, retrying in ${progressInfo.retryDelay}s...`);
          }
        },
        onRetry: (retryInfo) => {
          logger.warn(`Upload retry ${retryInfo.attempt}/${retryInfo.maxRetries}:`, retryInfo.error);
          if (mountedRef.current) {
            setStatusText(`Upload attempt ${retryInfo.attempt} failed, retrying...`);
          }
        }
      });

      currentState.pdfPath = pdfPath;
      currentState.filesUploaded.push({ path: pdfPath, bucket: 'resumes' });
      
      progressTracker.increment('PDF uploaded successfully');
      logger.success('PDF uploaded:', pdfPath);

      // Check if upload was cancelled
      if (uploadControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // STEP 3: Generate image preview (non-critical)
      progressTracker.increment('Creating image preview...');

      let imagePath = null;
      try {
        const result = await convertPdfToImage(file);
        const imageFile = result.file;
        
        if (imageFile && typeof imageFile.name === 'string') {
          imagePath = generateFilePath(user.id, imageFile.name, 'image');
          
          await storageService.uploadFile(imageFile, imagePath, { 
            bucket: 'resume-images',
            skipHealthCheck: true,
            timeout: 90000, // 1.5 minutes
            maxRetries: 2
          });
          
          currentState.imagePath = imagePath;
          currentState.filesUploaded.push({ path: imagePath, bucket: 'resume-images' });
          
          progressTracker.increment('Image preview created successfully');
        }
      } catch (imageError) {
        logger.warn('Image conversion failed (non-critical):', imageError);
        progressTracker.increment('PDF uploaded (preview generation failed)');
      }

      // Check if upload was cancelled
      if (uploadControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // STEP 4: Create database record
      progressTracker.increment('Saving resume information...');

      const resumeData = {
        id: resumeId,
        user_id: user.id,
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
        resume_path: pdfPath,
        image_path: imagePath,
        feedback: null,
        overall_score: null,
        ats_score: null
      };

      await resumeService.create(resumeData);
      currentState.dbRecordCreated = true;
      
      progressTracker.increment('Resume information saved');
      logger.success('Database record created:', resumeId);

      // Check if upload was cancelled
      if (uploadControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // STEP 5: AI Analysis
      progressTracker.increment('Analyzing resume with AI (this may take up to 90 seconds)...');

      let feedback;
      try {
        feedback = await analyzeResumeWithPerplexity(resumeText, jobTitle, jobDescription, companyName);
        logger.success('AI analysis completed');
      } catch (aiError) {
        logger.error('AI analysis failed:', aiError);
        
        // Create fallback feedback
        feedback = {
          overall_score: 0,
          ats_score: 0,
          categories: {
            formatting: { 
              score: 0, 
              tips: [{ 
                tip: "AI analysis temporarily unavailable", 
                explanation: "The analysis service is currently unavailable. Please try refreshing the page later." 
              }] 
            },
            content: { 
              score: 0, 
              tips: [{ 
                tip: "AI analysis temporarily unavailable", 
                explanation: "The analysis service is currently unavailable. Please try refreshing the page later." 
              }] 
            },
            keywords: { 
              score: 0, 
              tips: [{ 
                tip: "AI analysis temporarily unavailable", 
                explanation: "The analysis service is currently unavailable. Please try refreshing the page later." 
              }] 
            },
            experience: { 
              score: 0, 
              tips: [{ 
                tip: "AI analysis temporarily unavailable", 
                explanation: "The analysis service is currently unavailable. Please try refreshing the page later." 
              }] 
            },
            skills: { 
              score: 0, 
              tips: [{ 
                tip: "AI analysis temporarily unavailable", 
                explanation: "The analysis service is currently unavailable. Please try refreshing the page later." 
              }] 
            }
          },
          suggestions: [{
            category: "system",
            tip: "AI analysis temporarily unavailable",
            explanation: "Your resume has been uploaded successfully. The AI analysis service is currently unavailable, but you can try refreshing the page later to get your analysis."
          }]
        };
      }

      // STEP 6: Save analysis results
      progressTracker.increment('Saving analysis results...');

      await resumeService.updateFeedback(resumeId, feedback);
      
      // STEP 7: Complete
      progressTracker.complete('Analysis complete! Redirecting...');

      // Store successful upload info
      storage.set('lastSuccessfulUpload', {
        resumeId,
        timestamp: Date.now(),
        fileName: file.name,
        companyName,
        jobTitle
      });

      // Redirect after short delay
      setTimeout(() => {
        if (mountedRef.current) {
          navigate(`/resume/${resumeId}`);
        }
      }, 1500);

    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'Upload cancelled') {
        logger.info('Upload was cancelled by user');
        return;
      }

      logger.error('Upload process failed:', err);
      
      // Comprehensive error handling with cleanup
      await cleanupFailedUpload(currentState);
      
      if (!mountedRef.current) return;

      // Reset states
      setProgress(0);
      setStatusText('');
      setCurrentStep(0);
      setTransactionState({
        resumeId: null,
        pdfPath: null,
        imagePath: null,
        dbRecordCreated: false,
        filesUploaded: []
      });

      // Enhanced error categorization
      if (err.code === 'AUTH_REQUIRED' || err.message?.includes('Authentication')) {
        setError('Authentication issue detected. Please refresh the page and sign in again.');
        setTimeout(() => {
          if (mountedRef.current) {
            navigate('/auth?next=' + encodeURIComponent(window.location.pathname));
          }
        }, 3000);
      } else if (err.code === 'CONNECTIVITY_FAILED' || err.code === 'CONNECTION_FAILED') {
        setError('Connection issues detected. Please check your internet connection and try again.');
      } else if (err.code === 'UPLOAD_TIMEOUT' || err.message?.includes('timeout')) {
        setError('Upload timed out. Please check your internet connection and try again.');
      } else if (err.code === 'FILE_TOO_LARGE') {
        setError('File size too large. Please use a file smaller than 50MB.');
      } else if (err.code === 'PDF_TEXT_EXTRACTION_FAILED') {
        setError('Could not read your PDF. Please ensure it contains selectable text, not just images.');
      } else if (err.code?.includes('DB_')) {
        setError('Database error occurred. Please try again or contact support if the issue persists.');
      } else {
        setError(`Upload failed: ${err.message || 'An unexpected error occurred. Please try again.'}`);
      }

      setIsProcessing(false);
    } finally {
      uploadControllerRef.current = null;
    }
  }, [user, navigate, cleanupFailedUpload, progressTracker]);

  // =====================================================
  // FORM SUBMISSION
  // =====================================================

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    // Authentication check
    if (!user?.id) {
      setError('Please sign in to upload your resume.');
      navigate('/auth?next=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // File validation
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    if (!fileValidation.isValid) {
      setError(`File validation failed: ${fileValidation.errors.join(', ')}`);
      return;
    }

    // Form validation
    const validation = validateForm();
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      return;
    }

    // Start upload process
    const { companyName, jobTitle, jobDescription } = formData;
    handleAnalyze({ 
      companyName: companyName.trim(), 
      jobTitle: jobTitle.trim(), 
      jobDescription: jobDescription.trim(), 
      file 
    });
  }, [user, file, formData, fileValidation, validateForm, handleAnalyze, navigate]);

  // =====================================================
  // CANCEL UPLOAD
  // =====================================================

  const handleCancel = useCallback(async () => {
    if (isProcessing) {
      const confirmCancel = window.confirm('Are you sure you want to cancel the upload? This will delete any uploaded files.');
      if (!confirmCancel) return;

      logger.info('User cancelled upload');
      
      // Cancel ongoing operations
      if (uploadControllerRef.current) {
        uploadControllerRef.current.abort();
      }
      
      // Cleanup uploaded files
      await cleanupFailedUpload(transactionState);
      
      // Reset states
      setIsProcessing(false);
      setProgress(0);
      setStatusText('');
      setCurrentStep(0);
      setError('');
      setTransactionState({
        resumeId: null,
        pdfPath: null,
        imagePath: null,
        dbRecordCreated: false,
        filesUploaded: []
      });
    }
  }, [isProcessing, transactionState, cleanupFailedUpload]);

  // =====================================================
  // RENDER LOADING STATES
  // =====================================================

  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600">Initializing application...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-medium text-slate-900 mb-4">Authentication Required</h2>
            <p className="text-slate-600 mb-6">You need to sign in to upload and analyze your resume.</p>
            <button
              onClick={() => navigate('/auth?next=' + encodeURIComponent(window.location.pathname))}
              className="px-6 py-3 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        {(!isOnline || !connectionHealthy) && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="font-medium">Connection Issue</span>
            </div>
            <p className="text-yellow-600 text-sm">
              {!isOnline 
                ? 'You appear to be offline. Please check your internet connection.'
                : 'Service connectivity issues detected. Some features may not work properly.'
              }
            </p>
          </div>
        )}

        {/* Circuit Breaker Status & Reset */}
        {!isProcessing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-700">
                <span className="font-medium">System Status:</span>
                {connectionHealthy ? (
                  <span className="text-green-600 ml-2">✓ All systems operational</span>
                ) : (
                  <span className="text-yellow-600 ml-2">⚠ Some services degraded</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  healthCheck.resetCircuitBreaker();
                  debouncedHealthCheck();
                }}
                className="flex items-center gap-2 text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Smart feedback for your dream job
          </h1>
          
          {isProcessing ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-blue-700 font-medium">Processing...</span>
              </div>
              
              <div className="w-full bg-blue-200 rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min(progress, 100)}%`,
                    maxWidth: '100%'
                  }}
                ></div>
              </div>

              <p className="text-blue-600 text-sm mb-2">{statusText}</p>
              <div className="flex items-center justify-center gap-2 text-blue-500 text-xs mb-3">
                <Clock className="w-3 h-3" />
                <span>Step {Math.min(currentStep, totalSteps)} of {totalSteps}</span>
              </div>
              
              {/* Cancel button */}
              <button
                onClick={handleCancel}
                className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
              >
                Cancel Upload
              </button>
            </div>
          ) : (
            <p className="text-gray-600">
              Drop your resume for an ATS score and improvement tips
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Upload Failed</span>
            </div>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Form */}
        {!isProcessing && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Fill Button */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-900 mb-1">
                    🚀 Try with Sample Data
                  </h3>
                  <p className="text-sm text-red-700">
                    Test the analysis with a real Zomato Software Engineer position
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleZomatoQuickFill}
                  className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Load Sample
                </button>
              </div>
            </div>

            {/* Company Name Input */}
            <div>
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="company-name"
                name="company-name"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
                minLength={2}
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Google, Microsoft, Apple"
              />
            </div>

            {/* Job Title Input */}
            <div>
              <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                id="job-title"
                name="job-title"
                value={formData.jobTitle}
                onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                required
                minLength={3}
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Software Engineer, Product Manager"
              />
            </div>

            {/* Job Description Input */}
            <div>
              <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                id="job-description"
                name="job-description"
                value={formData.jobDescription}
                onChange={(e) => setFormData({...formData, jobDescription: e.target.value})}
                required
                minLength={50}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="Paste the complete job description here for better analysis. Include requirements, responsibilities, and qualifications."
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 50 characters required for accurate analysis ({formData.jobDescription.length}/50)
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Resume *
              </label>
              <FileUploader 
                onFileSelect={handleFileSelect} 
                disabled={isProcessing} 
              />
              
              {/* File Validation Display */}
              {file && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {fileValidation.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {file.name} ({formatSize(file.size)})
                    </span>
                  </div>
                  
                  {!fileValidation.isValid && fileValidation.errors.length > 0 && (
                    <ul className="text-sm text-red-600 space-y-1">
                      {fileValidation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isProcessing || !file || !fileValidation.isValid}
                className={`
                  w-full py-3 px-6 text-lg font-medium rounded-lg transition-all duration-200
                  ${(!file || !fileValidation.isValid || isProcessing)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                  }
                `}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </span>
                ) : (
                  '🚀 Analyze Resume'
                )}
              </button>
            </div>

            {/* File Info Display */}
            {file && !isProcessing && fileValidation.isValid && (
              <div className="text-center text-sm text-gray-600">
                <p>✓ Ready to analyze: <strong>{file.name}</strong></p>
                <p>File size: {formatSize(file.size)}</p>
                <p>Type: {file.type}</p>
              </div>
            )}
          </form>
        )}

        {/* Help Section */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">💡 Upload Tips</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ensure your PDF contains selectable text (not just images)</li>
            <li>• File size limit is 50MB for optimal performance</li>
            <li>• Include detailed job requirements for better analysis</li>
            <li>• Upload will continue even if preview generation fails</li>
            <li>• Analysis may take up to 90 seconds - please be patient</li>
            <li>• Click "Load Sample" to try with Zomato SDE1 position</li>
            <li>• Your resume data is processed securely and privately</li>
            <li>• If upload gets stuck, it will auto-recover or allow cancellation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Upload;
