import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker
const pdfjsVersion = pdfjsLib.version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`
}

// Extract text content from PDF file
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map(item => {
          // Handle both string and object text items
          return typeof item === 'string' ? item : item.str || ''
        })
        .join(' ')
      
      fullText += pageText + '\n'
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

// Convert PDF first page to image for preview
export async function convertPdfToImage(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1) // Get first page
    
    // Set scale for good quality
    const scale = 1.5
    const viewport = page.getViewport({ scale })
    
    // Create canvas element
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // Render the page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    await page.render(renderContext).promise
    
    // Convert canvas to blob and create file
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const imageFile = new File([blob], `resume-preview-${Date.now()}.png`, { 
            type: 'image/png' 
          })
          const url = URL.createObjectURL(blob)
          resolve({ file: imageFile, url })
        } else {
          reject(new Error('Failed to create image blob'))
        }
      }, 'image/png', 0.8)
    })
  } catch (error) {
    console.error('Error converting PDF to image:', error)
    throw new Error('Failed to convert PDF to image')
  }
}

// Validate PDF file
export function validatePDF(file) {
  const errors = []
  
  // Check file type
  if (file.type !== 'application/pdf') {
    errors.push('File must be a PDF')
  }
  
  // Check file size (20MB limit)
  const maxSize = 20 * 1024 * 1024 // 20MB
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`)
  }
  
  // Check if file is empty
  if (file.size === 0) {
    errors.push('File cannot be empty')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get PDF metadata
export async function getPDFMetadata(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    const metadata = await pdf.getMetadata()
    
    return {
      numPages: pdf.numPages,
      title: metadata.info?.Title || '',
      author: metadata.info?.Author || '',
      creator: metadata.info?.Creator || '',
      producer: metadata.info?.Producer || '',
      creationDate: metadata.info?.CreationDate || '',
      modDate: metadata.info?.ModDate || ''
    }
  } catch (error) {
    console.error('Error getting PDF metadata:', error)
    return {
      numPages: 0,
      title: '',
      author: '',
      creator: '',
      producer: '',
      creationDate: '',
      modDate: ''
    }
  }
}

// Clean and format extracted text
export function cleanResumeText(text) {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters that might interfere with analysis
    .replace(/[^\w\s@.-]/g, ' ')
    // Clean up email and phone patterns
    .replace(/\s+@\s+/g, '@')
    .replace(/\s+\.\s+/g, '.')
    // Remove multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Trim
    .trim()
}
