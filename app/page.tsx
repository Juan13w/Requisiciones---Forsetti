'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Importaciones dinámicas para evitar problemas de SSR
const MainPage = dynamic(() => import('@/components/MainPage'), { ssr: false });
const Navbar = dynamic(() => import('@/components/Navbar'), { ssr: false });
const Footer = dynamic(
  () => import('@/components/Footer').then((mod) => mod.Footer),
  { ssr: false }
);

interface UserData {
  id: number;
  email: string;
  rol: 'admin' | 'coordinador' | 'compras';
  empresa?: string;
  isAdmin?: boolean;
  nombreCoordinador?: string;
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar autenticación al cargar
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === 'undefined') return;
    
    const checkAuth = () => {
      const usuarioLogueado = localStorage.getItem('usuarioLogueado') === 'true';
      const usuarioData = localStorage.getItem('usuarioData');
      
      if (usuarioLogueado && usuarioData) {
        try {
          const user = JSON.parse(usuarioData);
          const rutas: Record<string, string> = {
            admin: '/admin',
            coordinador: '/dashboard',
            compras: '/dashboard-compras',
          };
          router.replace(rutas[user.rol] ?? '/dashboard');
        } catch (error) {
          console.error('Error al analizar los datos del usuario:', error);
          router.replace('/');
        }
      } else {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  // Manejar el inicio de sesión exitoso
  const handleLogin = (userData: UserData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('usuarioLogueado', 'true');
      localStorage.setItem('usuarioData', JSON.stringify(userData));

      const rutas: Record<string, string> = {
        admin: '/admin',
        coordinador: '/dashboard',
        compras: '/dashboard-compras',
      };
      router.replace(rutas[userData.rol] ?? '/dashboard');
    }
  };

  // Mostrar un estado de carga mientras se verifica la autenticación
  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Mostrar la página principal con el formulario de login
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <MainPage onLogin={handleLogin} />
      </main>
      <Footer />
    </div>
  );
}

