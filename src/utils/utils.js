// =====================================================
// ALL IMPORTS AT THE TOP (ESLint import/first fix)
// =====================================================

import { clsx } from 'clsx'

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Utility function for combining class names
export function cn(...inputs) {
  return clsx(inputs)
}

// Generate UUID v4
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : ((r & 0x3) | 0x8)
    return v.toString(16)
  })
}

// Format file size in human readable format
export function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Extract filename from file path
export function extractFilename(path) {
  if (!path) return ''
  return path.split('/').pop() || path
}

// Format date for display
export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ]

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`
    }
  }
  return 'just now'
}

// Generate file path for Supabase storage with enhanced security
export function generateFilePath(userId, filename, type = 'resume') {
  if (!userId || !filename) {
    throw new Error('UserId and filename are required for file path generation')
  }
  
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  
  // Enhanced filename sanitization
  const cleanFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  
  return `${userId}/${type}/${timestamp}_${randomSuffix}_${cleanFilename}`
}

// Calculate badge color class
export function getBadgeColorClass(score) {
  if (score > 70) return 'bg-badge-green text-badge-green-text'
  if (score > 49) return 'bg-badge-yellow text-badge-yellow-text'
  return 'bg-badge-red text-badge-red-text'
}

// Get badge text based on score
export function getBadgeText(score) {
  if (score > 70) return 'Strong'
  if (score > 49) return 'Good Start'
  return 'Needs Work'
}

// Calculate score color class
export function getScoreColorClass(score) {
  if (score > 70) return 'text-green-600'
  if (score > 49) return 'text-yellow-600'
  return 'text-red-600'
}

// Truncate text to specified length
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Enhanced debounce function with immediate option
export function debounce(func, wait, immediate = false) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

// Sleep function with cancellation support
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Enhanced copy to clipboard with fallback
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (err) {
    console.error('Failed to copy text:', err)
    return false
  }
}

// Enhanced download file function
export function downloadFile(content, filename, contentType = 'text/plain') {
  try {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL object after a delay
    setTimeout(() => URL.revokeObjectURL(url), 100)
  } catch (err) {
    console.error('Failed to download file:', err)
    throw new Error('File download failed')
  }
}

// Enhanced form validation
export function validateFormData(data, rules) {
  const errors = {}
  
  Object.keys(rules).forEach(field => {
    const value = data[field]
    const rule = rules[field]
    
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${field} is required`
      return
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !rule.required) return
    
    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters`
        return
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${field} must be no more than ${rule.maxLength} characters`
        return
      }
      
      if (rule.email && !isValidEmail(value)) {
        errors[field] = 'Please enter a valid email address'
        return
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.patternMessage || `${field} format is invalid`
        return
      }
    }
    
    // Number validations
    if (typeof value === 'number' || rule.type === 'number') {
      const numValue = typeof value === 'number' ? value : parseFloat(value)
      
      if (isNaN(numValue)) {
        errors[field] = `${field} must be a valid number`
        return
      }
      
      if (rule.min !== undefined && numValue < rule.min) {
        errors[field] = `${field} must be at least ${rule.min}`
        return
      }
      
      if (rule.max !== undefined && numValue > rule.max) {
        errors[field] = `${field} must be no more than ${rule.max}`
        return
      }
    }
    
    // Custom validation function
    if (rule.validator && typeof rule.validator === 'function') {
      const customError = rule.validator(value, data)
      if (customError) {
        errors[field] = customError
        return
      }
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// =====================================================
// FILE HANDLING UTILITIES
// =====================================================

// Check if file is valid PDF
export function isValidPDF(file) {
  if (!file) return false
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

// Check if file size is acceptable
export function isFileSizeValid(file, maxSizeMB = 20) {
  if (!file) return false
  const maxBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxBytes && file.size > 0
}

// Get file extension from filename
export function getFileExtension(filename) {
  if (!filename) return ''
  return filename.split('.').pop()?.toLowerCase() || ''
}

// Generate safe filename
export function generateSafeFilename(originalName, prefix = '') {
  const timestamp = Date.now()
  const extension = getFileExtension(originalName)
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
  
  return `${prefix}${timestamp}_${safeName}.${extension}`
}

// =====================================================
// NETWORK UTILITIES
// =====================================================

// Check internet connectivity
export async function checkInternetConnection() {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    })
    return true
  } catch {
    return false
  }
}

// Retry function with exponential backoff
export async function retryWithBackoff(
  fn, 
  maxRetries = 3, 
  baseDelay = 1000, 
  maxDelay = 10000,
  backoffFactor = 2
) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1) + Math.random() * 1000,
        maxDelay
      )
      
      console.log(`Attempt ${attempt} failed, retrying in ${Math.ceil(delay)}ms:`, error.message)
      await sleep(delay)
    }
  }
  
  throw lastError
}

// =====================================================
// ERROR HANDLING UTILITIES
// =====================================================

// Create standardized error objects
export function createError(message, code, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  error.timestamp = new Date().toISOString()
  return error
}

// Check if error is network-related
export function isNetworkError(error) {
  const networkErrorMessages = [
    'network',
    'fetch',
    'timeout',
    'connection',
    'offline',
    'unreachable'
  ]
  
  const errorMessage = error.message.toLowerCase()
  return networkErrorMessages.some(keyword => errorMessage.includes(keyword))
}

// Check if error is retryable
export function isRetryableError(error) {
  const retryableErrors = [
    'timeout',
    'network',
    'fetch',
    'connection',
    'service temporarily unavailable',
    'internal server error',
    'bad gateway',
    'service unavailable',
    'gateway timeout'
  ]
  
  const errorMessage = error.message.toLowerCase()
  return retryableErrors.some(keyword => errorMessage.includes(keyword))
}

// =====================================================
// PROGRESS TRACKING UTILITIES
// =====================================================

// Create progress tracker
export function createProgressTracker(totalSteps, onProgress = null) {
  let currentStep = 0
  
  return {
    update(step, message, details = {}) {
      currentStep = step
      const progress = Math.round((step / totalSteps) * 100)
      
      const progressData = {
        step: currentStep,
        totalSteps,
        progress,
        message,
        ...details
      }
      
      if (onProgress) {
        onProgress(progressData)
      }
      
      return progressData
    },
    
    increment(message, details = {}) {
      return this.update(currentStep + 1, message, details)
    },
    
    complete(message = 'Complete') {
      return this.update(totalSteps, message, { completed: true })
    },
    
    getCurrentProgress() {
      return {
        step: currentStep,
        totalSteps,
        progress: Math.round((currentStep / totalSteps) * 100)
      }
    }
  }
}

// =====================================================
// LOCAL STORAGE UTILITIES
// =====================================================

// Safe localStorage operations with error handling
export const storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (err) {
      console.error('Failed to save to localStorage:', err)
      return false
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (err) {
      console.error('Failed to read from localStorage:', err)
      return defaultValue
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (err) {
      console.error('Failed to remove from localStorage:', err)
      return false
    }
  },
  
  clear() {
    try {
      localStorage.clear()
      return true
    } catch (err) {
      console.error('Failed to clear localStorage:', err)
      return false
    }
  }
}

// =====================================================
// PERFORMANCE UTILITIES
// =====================================================

// Simple performance timer
export function createTimer(label) {
  const start = performance.now()
  
  return {
    stop() {
      const end = performance.now()
      const duration = end - start
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
      return duration
    }
  }
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// =====================================================
// URL UTILITIES
// =====================================================

// Parse URL parameters
export function parseUrlParams(url = window.location.href) {
  const urlObj = new URL(url)
  const params = {}
  
  for (const [key, value] of urlObj.searchParams) {
    params[key] = value
  }
  
  return params
}

// Build URL with parameters
export function buildUrl(baseUrl, params = {}) {
  const url = new URL(baseUrl)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, value)
    }
  })
  
  return url.toString()
}

// =====================================================
// ENVIRONMENT UTILITIES
// =====================================================

// Check if running in development
export function isDevelopment() {
  return process.env.NODE_ENV === 'development'
}

// Check if running in production
export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

// Get environment variable with fallback
export function getEnvVar(name, fallback = null) {
  return process.env[name] || fallback
}

// =====================================================
// LOGGING UTILITIES
// =====================================================

// Enhanced console logging with levels
export const logger = {
  debug(...args) {
    if (isDevelopment()) {
      console.debug('🐛', ...args)
    }
  },
  
  info(...args) {
    console.info('ℹ️', ...args)
  },
  
  warn(...args) {
    console.warn('⚠️', ...args)
  },
  
  error(...args) {
    console.error('❌', ...args)
  },
  
  success(...args) {
    console.log('✅', ...args)
  }
}
