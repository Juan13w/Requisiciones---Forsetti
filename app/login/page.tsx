// app/login/page.tsx
"use client"

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoginForm from '../../components/LoginForm'

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = (userData: any) => {
    // Almacenar datos del usuario en sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(userData))
    }
    
    // Redirigir según el rol
    if (userData.rol === 'admin') {
      router.push('/admin')
    } else if (userData.rol === 'coordinador') {
      router.push('/dashboard')
    } else if (userData.rol === 'compras') {
      router.push('/dashboard-compras')
    } else {
      router.push('/')
    }
  }

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = sessionStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        handleLogin(user)
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <LoginForm 
          isOpen={true} 
          onClose={() => router.push('/')} 
          onLogin={handleLogin} 
        />
      </div>
    </div>
  )
}