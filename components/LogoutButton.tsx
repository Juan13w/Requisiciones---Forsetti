// components/LogoutButton.tsx
"use client"

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user')
      localStorage.removeItem('usuarioLogueado')
      localStorage.removeItem('usuarioData')
    }
    router.push('/')
  }

  return (
    <button 
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
    >
      Cerrar Sesión
    </button>
  )
}