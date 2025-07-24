import { createClient } from '@supabase/supabase-js'
import { 
  formatSize, 
  sleep, 
  retryWithBackoff, 
  createError, 
  isNetworkError, 
  isRetryableError, 
  createTimer,
  logger 
} from '../utils/utils'

// =====================================================
// ENVIRONMENT VALIDATION & CLIENT SETUP
// =====================================================

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('REACT_APP_SUPABASE_URL is required in environment variables')
}

if (!supabaseAnonKey) {
  throw new Error('REACT_APP_SUPABASE_ANON_KEY is required in environment variables')
}

// Enhanced Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'atspect-app@1.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// =====================================================
// ENHANCED TIMEOUT UTILITY
// =====================================================

const promiseWithTimeout = (promise, ms, message = 'Operation timed out') => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise])
    .finally(() => {
      clearTimeout(timeoutId);
    });
};

// Enhanced timeout with cancellation support
const promiseWithTimeoutAndCancel = (promise, ms, message = 'Operation timed out') => {
  let timeoutId;
  let controller = new AbortController();
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(message));
    }, ms);
  });

  return {
    promise: Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    }),
    cancel: () => {
      controller.abort();
      clearTimeout(timeoutId);
    },
    signal: controller.signal
  };
};

// =====================================================
// ENHANCED STORAGE SERVICE
// =====================================================

export const storageService = {
  // Enhanced upload with comprehensive retry logic and progress tracking
  async uploadFile(file, path, options = {}) {
    const {
      bucket = 'resumes',
      timeout = 120000, // 2 minutes
      cacheControl = '3600',
      upsert = false,
      maxRetries = 3,
      onProgress = null,
      onRetry = null,
      skipHealthCheck = false // New option to skip health checks
    } = options

    // Pre-upload validation
    if (!file || file.size === 0) {
      throw createError('Invalid file provided', 'INVALID_FILE')
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw createError('File too large. Maximum size is 50MB', 'FILE_TOO_LARGE')
    }

    const timer = createTimer(`Upload ${path}`)
    logger.info('Starting enhanced file upload:', {
      path,
      bucket,
      size: formatSize(file.size),
      type: file.type
    })

    // Optional non-blocking health check
    if (!skipHealthCheck) {
      try {
        const isHealthy = await promiseWithTimeout(
          healthCheck.testStorageConnection(),
          5000, // Shorter timeout for health check
          'Health check timeout'
        )
        
        if (!isHealthy) {
          logger.warn('Storage health check failed, proceeding with upload anyway')
        } else {
          logger.debug('Storage health check passed')
        }
      } catch (healthError) {
        logger.warn('Health check error, proceeding with upload anyway:', healthError)
      }
    }

    return await retryWithBackoff(
      async (attempt) => {
        const controller = new AbortController()
        
        try {
          if (onProgress) {
            onProgress({ 
              stage: 'uploading', 
              attempt, 
              progress: 0,
              message: `Uploading... (attempt ${attempt}/${maxRetries})`
            })
          }

          logger.debug(`Upload attempt ${attempt}/${maxRetries}`)

          // Use promiseWithTimeout for consistent timeout handling
          const uploadPromise = supabase.storage
            .from(bucket)
            .upload(path, file, {
              cacheControl,
              upsert,
              contentType: file.type || 'application/pdf',
              signal: controller.signal,
            })

          const { data, error } = await promiseWithTimeout(
            uploadPromise,
            timeout,
            `Upload timeout after ${timeout}ms`
          )

          if (error) {
            if (error.message?.includes('already exists') && !upsert) {
              throw createError('File already exists. Enable overwrite or use a different name.', 'FILE_EXISTS')
            }
            throw createError(`Upload failed: ${error.message}`, 'UPLOAD_FAILED', { originalError: error })
          }

          if (onProgress) {
            onProgress({ 
              stage: 'complete', 
              attempt, 
              progress: 100,
              message: 'Upload completed successfully'
            })
          }

          timer.stop()
          logger.success('File uploaded successfully:', data?.path)
          return data

        } catch (err) {
          controller.abort() // Cancel any ongoing request
          
          // Don't retry for certain errors
          if (
            err.code === 'INVALID_FILE' ||
            err.code === 'FILE_TOO_LARGE' ||
            err.code === 'FILE_EXISTS' ||
            err.message?.includes('Permission denied') ||
            err.message?.includes('Authentication')
          ) {
            throw err
          }

          if (onRetry && attempt < maxRetries) {
            onRetry({ 
              attempt, 
              maxRetries, 
              error: err.message,
              willRetry: true
            })
          }

          throw err
        }
      },
      maxRetries,
      1000, // 1 second base delay
      10000, // 10 second max delay
      2 // exponential backoff factor
    )
  },

  // Enhanced file URL generation with retry and timeout
  async getFileUrl(path, options = {}) {
    const { bucket = 'resumes', maxRetries = 2, signed = false, expiresIn = 3600, timeout = 10000 } = options
    
    return await retryWithBackoff(
      async (attempt) => {
        try {
          logger.debug(`Getting file URL (attempt ${attempt}):`, { path, bucket, signed })
          
          let urlPromise
          if (signed) {
            urlPromise = supabase.storage
              .from(bucket)
              .createSignedUrl(path, expiresIn)
          } else {
            // Public URLs are synchronous, but wrap for consistency
            urlPromise = Promise.resolve(supabase.storage
              .from(bucket)
              .getPublicUrl(path))
          }

          const result = await promiseWithTimeout(
            urlPromise,
            timeout,
            `URL generation timeout after ${timeout}ms`
          )

          if (result.error) {
            throw createError(`Failed to create URL: ${result.error.message}`, 'URL_GENERATION_FAILED')
          }

          const url = result.data?.signedUrl || result.data?.publicUrl
          if (!url) {
            throw createError('Failed to generate file URL', 'URL_GENERATION_FAILED')
          }

          logger.success('File URL generated successfully')
          return url

        } catch (err) {
          if (!isRetryableError(err)) {
            throw err
          }
          throw createError(`URL generation attempt ${attempt} failed: ${err.message}`, 'URL_RETRY_FAILED')
        }
      },
      maxRetries
    )
  },

  // Enhanced download with retry, progress, and timeout
  async downloadFile(path, options = {}) {
    const { bucket = 'resumes', timeout = 60000, maxRetries = 3, onProgress = null } = options
    
    return await retryWithBackoff(
      async (attempt) => {
        const controller = new AbortController()
        
        try {
          logger.debug(`Downloading file (attempt ${attempt}):`, { path, bucket })

          if (onProgress) {
            onProgress({ stage: 'downloading', attempt, progress: 0 })
          }

          const downloadPromise = supabase.storage
            .from(bucket)
            .download(path, {
              signal: controller.signal,
            })

          const { data, error } = await promiseWithTimeout(
            downloadPromise,
            timeout,
            `Download timeout after ${timeout}ms`
          )

          if (error) {
            throw createError(`Download failed: ${error.message}`, 'DOWNLOAD_FAILED', { originalError: error })
          }

          if (onProgress) {
            onProgress({ stage: 'complete', attempt, progress: 100 })
          }

          logger.success('File downloaded successfully')
          return data

        } catch (err) {
          controller.abort()
          if (!isRetryableError(err)) {
            throw err
          }
          throw createError(`Download attempt ${attempt} failed: ${err.message}`, 'DOWNLOAD_RETRY_FAILED')
        }
      },
      maxRetries
    )
  },

  // Enhanced delete with retry and timeout
  async deleteFile(path, options = {}) {
    const { bucket = 'resumes', maxRetries = 3, timeout = 30000 } = options
    
    return await retryWithBackoff(
      async (attempt) => {
        try {
          logger.debug(`Deleting file (attempt ${attempt}):`, { path, bucket })

          const deletePromise = supabase.storage
            .from(bucket)
            .remove([path])

          const { error } = await promiseWithTimeout(
            deletePromise,
            timeout,
            `Delete timeout after ${timeout}ms`
          )

          if (error) {
            throw createError(`File deletion failed: ${error.message}`, 'DELETE_FAILED', { originalError: error })
          }

          logger.success('File deleted successfully')

        } catch (err) {
          if (!isRetryableError(err)) {
            throw err
          }
          throw createError(`Delete attempt ${attempt} failed: ${err.message}`, 'DELETE_RETRY_FAILED')
        }
      },
      maxRetries
    )
  },

  // Enhanced file existence check with timeout
  async fileExists(path, options = {}) {
    const { bucket = 'resumes', maxRetries = 2, timeout = 15000 } = options
    
    return await retryWithBackoff(
      async (attempt) => {
        try {
          const pathParts = path.split('/')
          const filename = pathParts.pop()
          const folderPath = pathParts.join('/')

          const listPromise = supabase.storage
            .from(bucket)
            .list(folderPath || undefined)

          const { data: fileList, error } = await promiseWithTimeout(
            listPromise,
            timeout,
            `File existence check timeout after ${timeout}ms`
          )

          if (error) {
            throw createError(`File existence check failed: ${error.message}`, 'EXISTS_CHECK_FAILED')
          }

          return fileList?.some(file => file.name === filename) || false

        } catch (err) {
          if (!isRetryableError(err)) {
            return false
          }
          throw createError(`Existence check attempt ${attempt} failed: ${err.message}`, 'EXISTS_RETRY_FAILED')
        }
      },
      maxRetries
    )
  },

  // List files in a folder with timeout
  async listFiles(folderPath = '', options = {}) {
    const { bucket = 'resumes', limit = 100, offset = 0, sortBy = { column: 'name', order: 'asc' }, timeout = 20000 } = options
    
    try {
      logger.debug('Listing files:', { bucket, folderPath, limit, offset })

      const listPromise = supabase.storage
        .from(bucket)
        .list(folderPath, {
          limit,
          offset,
          sortBy
        })

      const { data, error } = await promiseWithTimeout(
        listPromise,
        timeout,
        `File list timeout after ${timeout}ms`
      )

      if (error) {
        throw createError(`Failed to list files: ${error.message}`, 'LIST_FAILED', { originalError: error })
      }

      logger.debug(`Found ${data?.length || 0} files`)
      return data || []

    } catch (err) {
      logger.error('List files failed:', err)
      throw err
    }
  },

  // Get file metadata with timeout
  async getFileMetadata(path, options = {}) {
    const { bucket = 'resumes', timeout = 15000 } = options
    
    try {
      const pathParts = path.split('/')
      const filename = pathParts.pop()
      const folderPath = pathParts.join('/')

      const listPromise = supabase.storage
        .from(bucket)
        .list(folderPath || undefined)

      const { data: fileList, error } = await promiseWithTimeout(
        listPromise,
        timeout,
        `Metadata fetch timeout after ${timeout}ms`
      )

      if (error) {
        throw createError(`Failed to get file metadata: ${error.message}`, 'METADATA_FAILED')
      }

      const fileInfo = fileList?.find(file => file.name === filename)
      if (!fileInfo) {
        throw createError('File not found', 'FILE_NOT_FOUND')
      }

      return {
        name: fileInfo.name,
        size: fileInfo.metadata?.size || 0,
        lastModified: fileInfo.updated_at,
        contentType: fileInfo.metadata?.mimetype,
        ...fileInfo
      }

    } catch (err) {
      logger.error('Get file metadata failed:', err)
      throw err
    }
  }
}

// =====================================================
// ENHANCED DATABASE SERVICE
// =====================================================

export const resumeService = {
  // Create a new resume record with retry and timeout
  async create(resumeData) {
    return await retryWithBackoff(
      async (attempt) => {
        try {
          logger.info('Creating resume record:', resumeData.id)

          const insertPromise = supabase
            .from('resumes')
            .insert([resumeData])
            .select()
            .single()

          const { data, error } = await promiseWithTimeout(
            insertPromise,
            30000, // 30 second timeout for database operations
            'Database insert timeout'
          )

          if (error) {
            throw createError(`Failed to create resume record: ${error.message}`, 'DB_CREATE_FAILED', { originalError: error })
          }

          logger.success('Resume record created successfully')
          return data

        } catch (err) {
          if (!isRetryableError(err)) {
            throw err
          }
          throw createError(`Create attempt ${attempt} failed: ${err.message}`, 'CREATE_RETRY_FAILED')
        }
      },
      2 // Only 2 retries for database operations
    )
  },

  // Get all resumes for current user with enhanced error handling and timeout
  async getAll(userId) {
    if (!userId) {
      throw createError('User ID is required', 'INVALID_USER_ID')
    }

    try {
      logger.debug('Fetching resumes for user:', userId)

      const selectPromise = supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const { data, error } = await promiseWithTimeout(
        selectPromise,
        20000, // 20 second timeout
        'Database fetch timeout'
      )

      if (error) {
        throw createError(`Failed to fetch resumes: ${error.message}`, 'DB_FETCH_FAILED', { originalError: error })
      }

      logger.debug(`Found ${data?.length || 0} resumes`)
      return data || []

    } catch (err) {
      logger.error('Resume fetch failed:', err)
      throw err
    }
  },

  // Get single resume by ID with enhanced validation and timeout
  async getById(id) {
    if (!id) {
      throw createError('Resume ID is required', 'INVALID_RESUME_ID')
    }

    try {
      logger.debug('Fetching resume by ID:', id)

      const selectPromise = supabase
        .from('resumes')
        .select('*')
        .eq('id', id)
        .single()

      const { data, error } = await promiseWithTimeout(
        selectPromise,
        15000, // 15 second timeout
        'Database get timeout'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          throw createError('Resume not found', 'RESUME_NOT_FOUND')
        }
        throw createError(`Failed to get resume: ${error.message}`, 'DB_GET_FAILED', { originalError: error })
      }

      logger.success('Resume fetched successfully')
      return data

    } catch (err) {
      logger.error('Resume get failed:', err)
      throw err
    }
  },

  // Update resume feedback with retry and timeout
  async updateFeedback(id, feedback) {
    if (!id || !feedback) {
      throw createError('Resume ID and feedback are required', 'INVALID_UPDATE_DATA')
    }

    return await retryWithBackoff(
      async (attempt) => {
        try {
          logger.info('Updating feedback for resume:', id)

          const updatePromise = supabase
            .from('resumes')
            .update({
              feedback,
              overall_score: feedback.overall_score,
              ats_score: feedback.ats_score,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

          const { data, error } = await promiseWithTimeout(
            updatePromise,
            30000, // 30 second timeout
            'Database update timeout'
          )

          if (error) {
            if (error.code === 'PGRST116') {
              throw createError('Resume not found for update', 'RESUME_NOT_FOUND')
            }
            throw createError(`Failed to update feedback: ${error.message}`, 'DB_UPDATE_FAILED', { originalError: error })
          }

          logger.success('Feedback updated successfully')
          return data

        } catch (err) {
          if (!isRetryableError(err)) {
            throw err
          }
          throw createError(`Update attempt ${attempt} failed: ${err.message}`, 'UPDATE_RETRY_FAILED')
        }
      },
      2
    )
  },

  // Delete resume with enhanced cleanup and timeout
  async delete(id) {
    if (!id) {
      throw createError('Resume ID is required', 'INVALID_RESUME_ID')
    }

    try {
      logger.info('Deleting resume:', id)

      // First get the resume to check file paths
      const resume = await this.getById(id)
      
      // Delete database record with timeout
      const deletePromise = supabase
        .from('resumes')
        .delete()
        .eq('id', id)

      const { error } = await promiseWithTimeout(
        deletePromise,
        20000, // 20 second timeout
        'Database delete timeout'
      )

      if (error) {
        throw createError(`Failed to delete resume: ${error.message}`, 'DB_DELETE_FAILED', { originalError: error })
      }

      // Clean up associated files (non-blocking with shorter timeouts)
      if (resume.resume_path) {
        storageService.deleteFile(resume.resume_path, { 
          bucket: 'resumes',
          timeout: 15000 // Shorter timeout for cleanup
        })
          .catch(err => logger.warn('Failed to delete resume file:', err))
      }
      
      if (resume.image_path) {
        storageService.deleteFile(resume.image_path, { 
          bucket: 'resume-images',
          timeout: 15000 // Shorter timeout for cleanup
        })
          .catch(err => logger.warn('Failed to delete image file:', err))
      }

      logger.success('Resume deleted successfully')

    } catch (err) {
      logger.error('Resume deletion failed:', err)
      throw err
    }
  }
}

// =====================================================
// ENHANCED AUTH SERVICE
// =====================================================

export const authService = {
  // Get current user with enhanced error handling and timeout
  async getCurrentUser() {
    try {
      const userPromise = supabase.auth.getUser()
      
      const { data: { user }, error } = await promiseWithTimeout(
        userPromise,
        10000, // 10 second timeout
        'Get user timeout'
      )

      if (error) {
        throw createError(`Failed to get current user: ${error.message}`, 'AUTH_GET_USER_FAILED', { originalError: error })
      }

      return user

    } catch (err) {
      logger.error('Get current user failed:', err)
      throw err
    }
  },

  // Enhanced sign out with timeout
  async signOut() {
    try {
      logger.info('Signing out user')

      const signOutPromise = supabase.auth.signOut()
      
      const { error } = await promiseWithTimeout(
        signOutPromise,
        10000, // 10 second timeout
        'Sign out timeout'
      )
      
      if (error) {
        throw createError(`Sign out failed: ${error.message}`, 'AUTH_SIGNOUT_FAILED', { originalError: error })
      }

      logger.success('User signed out successfully')

    } catch (err) {
      logger.error('Sign out failed:', err)
      throw err
    }
  },

  // Enhanced authentication check with timeout
  async isAuthenticated() {
    try {
      const sessionPromise = supabase.auth.getSession()
      
      const { data: { session }, error } = await promiseWithTimeout(
        sessionPromise,
        8000, // 8 second timeout
        'Session check timeout'
      )

      if (error) {
        logger.warn('Session check error:', error)
        return false
      }

      return !!session?.user

    } catch (err) {
      logger.error('Authentication check failed:', err)
      return false
    }
  },

  // Get current session with timeout
  async getSession() {
    try {
      const sessionPromise = supabase.auth.getSession()
      
      const { data: { session }, error } = await promiseWithTimeout(
        sessionPromise,
        8000, // 8 second timeout
        'Get session timeout'
      )

      if (error) {
        throw createError(`Failed to get session: ${error.message}`, 'AUTH_SESSION_FAILED', { originalError: error })
      }

      return session

    } catch (err) {
      logger.error('Get session failed:', err)
      throw err
    }
  }
}

// =====================================================
// ENHANCED HEALTH CHECK SERVICE WITH CIRCUIT BREAKER
// =====================================================

export const healthCheck = {
  // Circuit breaker state
  _circuitBreaker: {
    failures: 0,
    lastFailure: null,
    isOpen: false,
    threshold: 3,
    resetTime: 30000 // 30 seconds
  },

  _checkCircuit() {
    const { failures, lastFailure, threshold, resetTime } = this._circuitBreaker
    
    if (failures >= threshold) {
      const timeSinceLastFailure = Date.now() - lastFailure
      if (timeSinceLastFailure > resetTime) {
        // Reset circuit
        this._circuitBreaker.failures = 0
        this._circuitBreaker.isOpen = false
        logger.info('Health check circuit breaker reset')
      } else {
        this._circuitBreaker.isOpen = true
        return false // Circuit is open
      }
    }
    
    return true // Circuit is closed
  },

  _recordFailure() {
    this._circuitBreaker.failures++
    this._circuitBreaker.lastFailure = Date.now()
    if (this._circuitBreaker.failures >= this._circuitBreaker.threshold) {
      this._circuitBreaker.isOpen = true
      logger.warn('Health check circuit breaker opened')
    }
  },

  _recordSuccess() {
    this._circuitBreaker.failures = 0
    this._circuitBreaker.isOpen = false
  },

  // Test database connection with circuit breaker and timeout
  async testConnection() {
    // Check circuit breaker first
    if (!this._checkCircuit()) {
      logger.debug('Health check circuit breaker is open, skipping database check')
      return false
    }

    try {
      logger.debug('Testing Supabase connection...')
      
      const startTime = performance.now()
      const checkPromise = supabase
        .from('resumes')
        .select('count', { count: 'exact', head: true })
        .limit(1)

      const { error } = await promiseWithTimeout(
        checkPromise, 
        5000, 
        'Database health check timed out'
      )
      
      const responseTime = Math.round(performance.now() - startTime)
      
      if (error) {
        logger.error('Database health check failed:', error)
        this._recordFailure()
        return false
      }

      logger.success(`Database connection healthy (${responseTime}ms)`)
      this._recordSuccess()
      return true
      
    } catch (err) {
      logger.error('Database health check error:', err)
      this._recordFailure()
      return false
    }
  },

  // Test storage connection with circuit breaker and timeout
  async testStorageConnection() {
    // Check circuit breaker first
    if (!this._checkCircuit()) {
      logger.debug('Health check circuit breaker is open, skipping storage check')
      return false
    }

    try {
      logger.debug('Testing storage connection...')
      
      const startTime = performance.now()
      const checkPromise = supabase.storage.listBuckets()

      const { data, error } = await promiseWithTimeout(
        checkPromise, 
        5000, 
        'Storage health check timed out'
      )
      
      const responseTime = Math.round(performance.now() - startTime)
      
      if (error) {
        logger.error('Storage health check failed:', error)
        this._recordFailure()
        return false
      }

      logger.success(`Storage connection healthy (${responseTime}ms)`)
      this._recordSuccess()
      return true
      
    } catch (err) {
      logger.error('Storage health check error:', err)
      this._recordFailure()
      return false
    }
  },

  // Comprehensive health check with faster timeouts
  async testAllConnections() {
    const results = await Promise.allSettled([
      promiseWithTimeout(this.testConnection(), 6000, 'Database health check timeout'),
      promiseWithTimeout(this.testStorageConnection(), 6000, 'Storage health check timeout')
    ])

    const dbHealthy = results[0].status === 'fulfilled' && results[0].value
    const storageHealthy = results[1].status === 'fulfilled' && results[1].value

    return {
      database: dbHealthy,
      storage: storageHealthy,
      overall: dbHealthy && storageHealthy
    }
  },

  // Test network connectivity with shorter timeout
  async testNetworkConnectivity() {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000) // Reduced to 3 seconds

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      })

      clearTimeout(timeout)
      logger.success('Network connectivity test passed')
      return true

    } catch (err) {
      logger.warn('Network connectivity test failed:', err)
      return false
    }
  },

  // Reset circuit breaker manually
  resetCircuitBreaker() {
    this._circuitBreaker.failures = 0
    this._circuitBreaker.isOpen = false
    this._circuitBreaker.lastFailure = null
    logger.info('Health check circuit breaker manually reset')
  },

  // Get circuit breaker status
  getCircuitBreakerStatus() {
    return {
      ...this._circuitBreaker,
      timeSinceLastFailure: this._circuitBreaker.lastFailure 
        ? Date.now() - this._circuitBreaker.lastFailure 
        : null
    }
  }
}

// =====================================================
// ENHANCED CONNECTION MONITOR
// =====================================================

export const connectionMonitor = {
  isOnline: navigator.onLine,
  listeners: new Set(),
  _debounceTimer: null,

  init() {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  },

  handleOnline() {
    this.isOnline = true
    logger.info('Connection restored')
    this.notifyListenersDebounced('online')
  },

  handleOffline() {
    this.isOnline = false
    logger.warn('Connection lost')
    this.notifyListeners('offline')
  },

  // Debounced notification to prevent spam
  notifyListenersDebounced(status) {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
    }
    
    this._debounceTimer = setTimeout(() => {
      this.notifyListeners(status)
    }, 1000) // 1 second debounce
  },

  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  },

  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status)
      } catch (err) {
        logger.error('Connection listener error:', err)
      }
    })
  },

  async waitForConnection(timeout = 30000) {
    if (this.isOnline) return true

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('Connection timeout'))
      }, timeout)

      const cleanup = this.addListener((status) => {
        if (status === 'online') {
          clearTimeout(timeoutId)
          cleanup()
          resolve(true)
        }
      })
    })
  },

  // Test actual connection (not just navigator.onLine)
  async testActualConnection() {
    try {
      const response = await promiseWithTimeout(
        fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        }),
        5000,
        'Connection test timeout'
      )
      return true
    } catch (err) {
      logger.warn('Actual connection test failed:', err)
      return false
    }
  }
}

// Initialize connection monitor
connectionMonitor.init()

// =====================================================
// UTILITY EXPORTS
// =====================================================

export { createError, isNetworkError, isRetryableError, logger, promiseWithTimeout, promiseWithTimeoutAndCancel }

// Default export
export default {
  supabase,
  resumeService,
  storageService,
  authService,
  healthCheck,
  connectionMonitor
}
