'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, LogOut } from 'lucide-react';
import StyleProvider from '@/components/StyleProvider';

// Importar estilos globales
import '@/styles/ComprasDashboard.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = localStorage.getItem('usuarioLogueado') === 'true';
      const userData = localStorage.getItem('usuarioData');

      if (!isAuthenticated || !userData) {
        router.push('/');
        return;
      }

      try {
        const res = await fetch('/api/auth/session');
        const { user } = await res.json();

        if (!user) {
          localStorage.removeItem('usuarioLogueado');
          localStorage.removeItem('usuarioData');
          router.push('/');
          return;
        }

        const userDataParsed = JSON.parse(userData);
        if (userDataParsed.rol !== 'compras') {
          router.push('/dashboard');
          return;
        }
        setUser(userDataParsed);
      } catch (error) {
        console.error('Error al analizar los datos del usuario:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('usuarioData');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="animate-spin"></div>
      </div>
    );
  }

  return (
    <StyleProvider>
      <div className="dashboard-container">
        <div className="main-content">
          {/* Navbar superior */}
          <nav className="navbar">
            <div className="nav-container">
              <div className="nav-brand">
                <Link href="/dashboard-compras" className="brand-link">
                  Sistema de Requisiciones
                </Link>
              </div>
              <div className="nav-links">
                <div className="user-info">
                  <span className="user-email">{user?.email}</span>
                  <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={16} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <main className="content-wrapper">
            {children}
          </main>
        </div>
      </div>
    </StyleProvider>
  );
}
