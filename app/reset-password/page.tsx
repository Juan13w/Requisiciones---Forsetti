"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import './ResetPassword.css'

export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setMessage('Token no proporcionado')
      setIsValidating(false)
      setTokenValid(false)
    } else {
      setToken(tokenParam)
      validateToken(tokenParam)
    }
  }, [searchParams])

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(tokenToValidate)}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setTokenValid(true)
      } else {
        setMessage(data.error || 'Token inválido o expirado')
        setTokenValid(false)
      }
    } catch (error) {
      console.error('Error validando token:', error)
      setMessage('Error de conexión al validar el token')
      setTokenValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas no coinciden')
      setIsSuccess(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres')
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage('')
    setIsSuccess(false)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setMessage(data.message || 'Contraseña actualizada exitosamente')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setMessage(data.error || 'Ocurrió un error al actualizar tu contraseña')
        setIsSuccess(false)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error de conexión. Por favor, intenta nuevamente.')
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-form">
            <div className="validation-loading">
              <div className="spinner"></div>
              <p>Validando token...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-form">
            <div className="token-invalid">
              <div className="error-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.3 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2>Token Inválido o Expirado</h2>
              <p>{message || 'El enlace de recuperación ha expirado o no es válido.'}</p>
              <div className="action-links">
                <Link href="/forgot-password" className="primary-link">
                  Solicitar un nuevo enlace
                </Link>
                <Link href="/" className="secondary-link">
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-form">
          <div className="form-header">
            <div className="icon-container success">
              <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2>Restablecer Contraseña</h2>
            <p className="form-description">
              Ingresa tu nueva contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">Nueva Contraseña</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                disabled={isLoading}
                className="form-input"
                required
              />
            </div>
            
            {message && (
              <div className={`message-box ${isSuccess ? 'success' : 'error'}`}>
                <div className="message-icon">
                  {isSuccess ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="message-text">{message}</p>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={isLoading || isSuccess}
              className="submit-button success"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Actualizando...</span>
                </>
              ) : isSuccess ? (
                'Contraseña Actualizada ✓'
              ) : (
                'Restablecer Contraseña'
              )}
            </button>
          </form>

          <div className="back-to-login">
            <Link href="/" className="back-link">
              ← Volver al inicio de sesión
            </Link>
          </div>

          <div className="security-info">
            <div className="divider">
              <span>Requisitos de seguridad</span>
            </div>
            <div className="info-box">
              <ul>
                <li>La contraseña debe tener al menos 6 caracteres</li>
                <li>Usa una contraseña que no hayas usado antes</li>
                <li>Guarda tu nueva contraseña en un lugar seguro</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
