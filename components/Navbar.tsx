"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import Link from 'next/link';
import { LayoutDashboard, Settings } from 'lucide-react';
import LoginForm from "./LoginForm"
import "./Navbar.css"

interface UserInfo {
  id: number
  email: string
  rol?: 'admin' | 'coordinador' | 'compras'
  isAdmin?: boolean
  empresa?: string
  nombreCoordinador?: string
}

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  // Verificar si el usuario ya está autenticado al cargar
  useEffect(() => {
    const usuarioLogueado = localStorage.getItem("usuarioLogueado") === "true"
    const usuarioData = localStorage.getItem("usuarioData")
    
    if (usuarioLogueado && usuarioData) {
      try {
        const user = JSON.parse(usuarioData)
        setUserInfo(user)
        setIsLoggedIn(true)
      } catch (error) {
        console.error("Error al analizar los datos del usuario:", error)
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled)
      }
    }

    document.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      document.removeEventListener('scroll', handleScroll)
    }
  }, [scrolled])

  const handleLoginClick = () => {
    setShowLoginForm(true)
  }

  const handleLogin = (userData: UserInfo) => {
    // Guardar datos en el estado local
    setUserInfo(userData)
    setIsLoggedIn(true)
    setShowLoginForm(false)
    
    // Guardar en localStorage
    localStorage.setItem("usuarioLogueado", "true")
    localStorage.setItem("usuarioData", JSON.stringify(userData))
    
    // Redirigir según el rol del usuario
    if (userData.rol === 'admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsLoggedIn(false)
    setUserInfo(null)
    localStorage.removeItem("usuarioLogueado")
    localStorage.removeItem("usuarioData")
    router.push('/')
  }

  const handleCloseForm = () => {
    setShowLoginForm(false)
  }

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-brand">
            <h2>Requisiciones</h2>
          </div>
          <div className="navbar-logos">
            {/* Logos have been moved to the footer */}
          </div>
          <div className="navbar-menu">
            {!isLoggedIn ? (
              <button className="navbar-button login-btn" onClick={handleLoginClick}>
                Inicio de sesión
              </button>
            ) : (
              <div className="flex items-center gap-4">
                {userInfo?.rol === 'admin' && (
                  <Link 
                    href="/admin" 
                    className="flex items-center gap-1 text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-1 text-sm font-medium hover:text-blue-600 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <div className="user-menu">
                  <span className="user-greeting">
                    {userInfo?.email}
                    {userInfo?.rol === 'admin' && ' (Admin)'}
                  </span>
                  <button className="navbar-button logout-btn" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {showLoginForm && (
        <LoginForm 
          isOpen={showLoginForm} 
          onClose={handleCloseForm} 
          onLogin={handleLogin} 
        />
      )}
    </>
  )
}

export default Navbar
