'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, FileText, BarChart2, Bell, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserData {
  email: string;
  // Add other user properties as needed
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

export function AdminNavbar() {
  const pathname = usePathname();
  
  const navItems: NavItem[] = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true
    },
    { 
      name: 'Usuarios', 
      href: '/admin/usuarios', 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      name: 'Solicitudes', 
      href: '/admin/solicitudes', 
      icon: <FileText className="h-5 w-5" /> 
    },

  ];

  const [user, setUser] = useState<{ email: string }>({ email: 'Admin' });
  const [userInitials, setUserInitials] = useState('A');

  useEffect(() => {
    // This code runs only on the client side
    const userData = localStorage.getItem('usuarioData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setUserInitials(parsedUser.email ? parsedUser.email.charAt(0).toUpperCase() : 'A');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('usuarioData');
    window.location.href = '/';
  };

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/admin" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Sistema de Requisiciones</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center space-x-2",
                  isActive(item) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-primary"></span>
          </Button>
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt="User" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}