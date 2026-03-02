// components/LoginForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import "./LoginForm.css"

interface LoginFormProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (userData: any) => void
}

const LoginForm = ({ isOpen, onClose, onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError("Por favor ingresa tu correo electrónico y contraseña")
      return
    }
    
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Error en la autenticación")
      }
      
      // Guardar datos del usuario en sessionStorage
      if (data.user) {
        sessionStorage.setItem('user', JSON.stringify(data.user));
        // Llamar a onLogin para manejar la redirección
        onLogin(data.user);
        
        // Forzar recarga después de un breve retraso para asegurar que la redirección se complete
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="login-overlay">
      <div className="login-form-container">
        <div className="login-form">
          <button className="close-button" onClick={onClose}>×</button>
          <h2>Iniciar Sesión</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu correo electrónico"
                disabled={loading}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={loading}
                className="form-input"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              disabled={loading} 
              className="login-button"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>
          
          <div className="forgot-password-link">
            <Link href="/forgot-password" className="forgot-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm