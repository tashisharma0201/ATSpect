import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase' // Assuming you have this file
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth' // Assuming you have this hook
import { Rocket, Loader2 } from 'lucide-react'

const Auth = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const next = new URLSearchParams(location.search).get('next') || '/'

  useEffect(() => {
    if (user && !loading) {
      navigate(next)
    }
  }, [user, loading, navigate, next])

  // Enhanced auto-fill effect with proper React state updates
  useEffect(() => {
    const fillFormFields = () => {
      const emailInput = document.querySelector('input[type="email"]')
      const passwordInput = document.querySelector('input[type="password"]')

      if (emailInput && passwordInput) {
        // Use React's native input value setter to properly update the input
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set

        if (nativeInputValueSetter) {
          // Set values using React's internal setter
          nativeInputValueSetter.call(emailInput, 'tashisharma@gmail.com')
          nativeInputValueSetter.call(passwordInput, 'tashisharma')

          // Create and dispatch comprehensive events to trigger React state updates
          const createEvent = (type) => new Event(type, { 
            bubbles: true, 
            cancelable: true,
            composed: true 
          })

          // Dispatch multiple event types to ensure component recognizes changes
          const eventTypes = ['input', 'change', 'blur', 'focus']
          
          eventTypes.forEach(eventType => {
            emailInput.dispatchEvent(createEvent(eventType))
            passwordInput.dispatchEvent(createEvent(eventType))
          })

          // Additional React-specific events
          emailInput.dispatchEvent(new InputEvent('input', { 
            bubbles: true, 
            data: 'tashisharma@gmail.com',
            inputType: 'insertText'
          }))
          
          passwordInput.dispatchEvent(new InputEvent('input', { 
            bubbles: true, 
            data: 'tashisharma',
            inputType: 'insertText'
          }))

          console.log('Form fields auto-filled successfully')
        }
      } else {
        console.log('Form inputs not found, retrying...')
        return false
      }
      return true
    }

    // Retry mechanism with multiple attempts
    let attempts = 0
    const maxAttempts = 10
    const retryInterval = 300

    const tryFillForm = () => {
      attempts++
      if (fillFormFields() || attempts >= maxAttempts) {
        return
      }
      setTimeout(tryFillForm, retryInterval)
    }

    // Initial delay to ensure component is mounted
    const initialDelay = setTimeout(tryFillForm, 500)

    return () => clearTimeout(initialDelay)
  }, [])

  // Debug effect to monitor form state (remove in production)
  useEffect(() => {
    const debugTimer = setTimeout(() => {
      const emailInput = document.querySelector('input[type="email"]')
      const passwordInput = document.querySelector('input[type="password"]')
      
      if (emailInput && passwordInput) {
        console.log('Debug - Email value:', emailInput.value)
        console.log('Debug - Password value:', passwordInput.value)
        console.log('Debug - Email validity:', emailInput.validity.valid)
        console.log('Debug - Password validity:', passwordInput.validity.valid)
      }
    }, 2000)

    return () => clearTimeout(debugTimer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-sm text-slate-600">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">You are already signed in!</p>
          <button
            onClick={() => navigate(next)}
            className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Continue to App
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-center min-h-screen py-12 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Rocket className="text-indigo-600" size={24} />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ATSpect
              </h1>
            </div>
            <h2 className="text-xl font-medium text-slate-900 mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-slate-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Auth Form */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <SupabaseAuth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                style: {
                  button: {
                    background: 'rgb(15 23 42)', // slate-900
                    border: 'none',
                    borderRadius: '0.375rem', // rounded-md
                    padding: '0.625rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease-in-out',
                    width: '100%',
                  },
                  anchor: {
                    color: 'rgb(79 70 229)', // indigo-600
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                  },
                  message: {
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    border: '1px solid rgb(226 232 240)', // slate-200
                    backgroundColor: 'rgb(248 250 252)', // slate-50
                    color: 'rgb(71 85 105)', // slate-600
                  },
                  input: {
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid rgb(226 232 240)', // slate-200
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    width: '100%',
                    transition: 'border-color 0.2s ease-in-out',
                    backgroundColor: 'white',
                    color: 'rgb(15 23 42)', // slate-900
                  },
                  label: {
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'rgb(71 85 105)', // slate-600
                    marginBottom: '0.375rem',
                    display: 'block',
                  },
                  container: {
                    width: '100%',
                  },
                  divider: {
                    background: 'rgb(226 232 240)', // slate-200
                    margin: '1.5rem 0',
                    height: '1px',
                  }
                },
                variables: {
                  default: {
                    colors: {
                      brand: 'rgb(15 23 42)', // slate-900
                      brandAccent: 'rgb(71 85 105)', // slate-600
                      inputBackground: 'white',
                      inputBorder: 'rgb(226 232 240)', // slate-200
                      inputBorderHover: 'rgb(148 163 184)', // slate-400
                      inputBorderFocus: 'rgb(79 70 229)', // indigo-600
                    },
                  },
                },
                className: {
                  button: 'hover:bg-slate-800',
                  input: 'focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600',
                }
              }}
              providers={[]}
              redirectTo={`${window.location.origin}${next}`}
              onlyThirdPartyProviders={false}
              magicLink={false}
              showLinks={true}
              view="sign_in"
            />
          </div>

          {/* Footer */}
         <div className="text-center mt-6 space-y-2">
  <p className="text-xs text-slate-500">
    Project by Tashi Sharma
  </p>
  <p className="text-xs text-slate-500 flex justify-center gap-4">
    <a
      href="https://www.linkedin.com/in/tashi-sharma-97695b277/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-500 underline"
      aria-label="LinkedIn"
    >
      LinkedIn
    </a>
    <a
      href="https://github.com/tashisharma0201"
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-500 underline"
      aria-label="GitHub"
    >
      GitHub
    </a>
    <a
      href="https://tashiportfolio.netlify.app/"  
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-500 underline"
      aria-label="Portfolio"
    >
      Portfolio
    </a>
  </p>
</div>

        </div>
      </div>
    </div>
  )
}

export default Auth
