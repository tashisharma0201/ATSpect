import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X } from 'lucide-react'
import { formatSize } from '../utils/utils'
import { validatePDF } from '../utils/pdfProcessor'

const FileUploader = ({ onFileSelect, disabled = false }) => {
  const [validationErrors, setValidationErrors] = useState([])

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    // Clear previous errors
    setValidationErrors([])
    
    // Handle rejected files
    if (fileRejections.length > 0) {
      const errors = fileRejections.flatMap(rejection => 
        rejection.errors.map(error => error.message)
      )
      setValidationErrors(errors)
      onFileSelect?.(null)
      return
    }

    const file = acceptedFiles[0]
    if (!file) {
      onFileSelect?.(null)
      return
    }

    // Validate PDF
    const validation = validatePDF(file)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      onFileSelect?.(null)
      return
    }

    // File is valid
    setValidationErrors([])
    onFileSelect?.(file)
  }, [onFileSelect])

  const maxFileSize = 20 * 1024 * 1024 // 20MB in bytes

  const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: maxFileSize,
    disabled
  })

  const file = acceptedFiles[0] || null
  const hasErrors = validationErrors.length > 0 || fileRejections.length > 0

  const removeFile = (e) => {
    e.stopPropagation()
    setValidationErrors([])
    onFileSelect?.(null)
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : hasErrors
            ? 'border-red-300 bg-red-50 hover:border-red-400'
            : file
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={disabled} />
        
        {file ? (
          // File selected state
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
              <File className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="font-medium text-gray-900">{file.name}</span>
                <button
                  onClick={removeFile}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
            </div>
            
            <p className="text-sm text-green-600">
              ✓ File ready for upload
            </p>
          </div>
        ) : (
          // Default/drag state
          <div className="space-y-4">
            <div className={`flex items-center justify-center w-16 h-16 mx-auto rounded-full transition-colors ${
              isDragActive 
                ? 'bg-blue-100' 
                : hasErrors
                ? 'bg-red-100'
                : 'bg-gray-100'
            }`}>
              <Upload className={`w-8 h-8 ${
                isDragActive 
                  ? 'text-blue-600' 
                  : hasErrors
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`} />
            </div>
            
            <div className="space-y-2">
              <p className={`text-lg font-medium ${
                hasErrors ? 'text-red-700' : 'text-gray-900'
              }`}>
                {isDragActive
                  ? 'Drop your resume here'
                  : 'Click to upload or drag and drop'
                }
              </p>
              <p className={`text-sm ${
                hasErrors ? 'text-red-600' : 'text-gray-500'
              }`}>
                PDF (max {formatSize(maxFileSize)})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error messages */}
      {hasErrors && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <X className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Upload Error</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading state overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-sm">Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploader
