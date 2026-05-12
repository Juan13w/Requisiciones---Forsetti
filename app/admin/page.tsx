'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, UserCog, Settings, Users, FileCheck, FileClock, FileBarChart2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsData {
  totalUsers: number;
  todayRequisitions: number;
  totalRequisitions: number;
  completedRequisitions: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Solicitando estadísticas...');
        const response = await fetch('/api/admin/estadisticas', {
          cache: 'no-store' // Evitar caché para obtener datos actualizados
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Error en la respuesta de la API:', data);
          throw new Error(data.error || 'Error al obtener estadísticas');
        }
        
        console.log('Datos recibidos de la API (admin/estadisticas):', data);

        // El endpoint /api/admin/estadisticas devuelve tanto campos
        // genéricos (hoy, completadas, etc.) como los específicos
        // que espera este dashboard (hoyRequisiciones, totalRequisiciones, etc.).
        setStats({
          totalUsers: data.totalUsuarios || 0,
          todayRequisitions: data.hoyRequisiciones ?? data.hoy ?? 0,
          totalRequisitions: data.totalRequisiciones ?? 0,
          completedRequisitions: data.completadasRequisiciones ?? data.completadas ?? 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Mostrar datos de ejemplo en desarrollo para facilitar pruebas
        if (process.env.NODE_ENV === 'development') {
          setStats({
            totalUsers: 42,
            todayRequisitions: 8,
            totalRequisitions: 156,
            completedRequisitions: 128
          });
        } else {
          setStats({
            totalUsers: 0,
            todayRequisitions: 0,
            totalRequisitions: 0,
            completedRequisitions: 0
          });
        }
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
    
    // Opcional: Actualizar estadísticas cada 5 minutos
    const intervalId = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const generatePdf = async () => {
    setLoading(true);
    try {
      // 1. Obtener datos de la API
      const response = await fetch('/api/requisiciones/list');
      if (!response.ok) throw new Error('Error al obtener los datos');
      const data = await response.json();

      // 2. Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      // 3. Crear documento con configuración
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 4. Configuración de márgenes y estilos
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const tableStartY = 40;
      
      // 5. Encabezado del reporte
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(40, 62, 80);
      doc.text('REPORTE DE REQUISICIONES', pageWidth / 2, 20, { align: 'center' });
      
      // 6. Información de la empresa y fecha
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Empresa: Todas las empresas`, margin, 30);
      doc.text(
        `Generado el: ${new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, 
        pageWidth - margin, 
        30, 
        { align: 'right' }
      );

      // 7. Configuración de la tabla
      const headers = [
    
        'CONSECUTIVO', 
        'EMPRESA', 
        'FECHA', 
        'PROCESO', 
        'CANTIDAD',
        'ESTADO'
      ];

      // 8. Formatear datos para la tabla
      const tableData = data.map((item: any, index: number) => [
       
        item.consecutivo?.toString() || 'N/A',
        item.empresa?.toString() || 'N/A',
        item.fecha_solicitud ? new Date(item.fecha_solicitud).toLocaleDateString('es-ES') : 'N/A',
        item.proceso?.toString() || 'N/A',
        (item.cantidad !== null && item.cantidad !== undefined) ? item.cantidad.toString() : '0',
        item.estado ? (item.estado.charAt(0).toUpperCase() + item.estado.slice(1)) : 'N/A'
      ]);
      // 9. Agregar tabla al documento
      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: tableStartY,
        margin: { 
          top: tableStartY,
          left: 20,
          right: 20
        },
        tableWidth: 'wrap',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8
        },
        styles: {
          overflow: 'linebreak',
          lineColor: [221, 221, 221],
          lineWidth: 0.2,
          fontSize: 8,
          cellPadding: 2,
          cellWidth: 'wrap'
        },
        alternateRowStyles: {
          fillColor: [245, 249, 255]
        },
        columnStyles: {
          0: { cellWidth: 30, halign: 'center' }, // Consecutivo
          1: { cellWidth: 25, halign: 'center' }, // Empresa
          2: { cellWidth: 20, halign: 'center' }, // Fecha
          3: { cellWidth: 45, halign: 'left' },   // Proceso
          4: { cellWidth: 20, halign: 'center' }, // Cantidad
          5: { cellWidth: 25, halign: 'center' }  // Estado
        },
        didDrawPage: (data: any) => {
          // Pie de página
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth - margin,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
          );
        }
      });

      // 10. Guardar el documento
      const date = new Date().toISOString().split('T')[0];
      doc.save(`reporte-requisiciones-${date}.pdf`);

    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Ocurrió un error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-gray-500">
            Gestión de usuarios, solicitudes y configuración del sistema
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingStats ? (
          // Skeleton loaders while loading
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))
        ) : stats ? (
          // Actual stats cards
          <>
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-blue-800">Total de Usuarios</h3>
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                <p className="text-xs text-blue-600">Usuarios registrados</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-green-50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-green-800">Hoy</h3>
                <FileClock className="h-5 w-5 text-green-600" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-green-900">{stats.todayRequisitions}</p>
                <p className="text-xs text-green-600">Requisiciones de hoy</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-purple-50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-purple-800">Total Requisiciones</h3>
                <FileBarChart2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-purple-900">{stats.totalRequisitions}</p>
                <p className="text-xs text-purple-600">Total de solicitudes</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-emerald-50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-emerald-800">Completadas</h3>
                <FileCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-900">{stats.completedRequisitions}</p>
                <p className="text-xs text-emerald-600">Requisiciones finalizadas</p>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-4 text-center py-4 text-red-500">
            Error al cargar las estadísticas
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 my-6"></div>

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Button 
            variant="outline" 
            className="h-24 flex flex-col items-center justify-center"
            asChild
          >
            <Link href="/admin/usuarios/nuevo">
              <UserCog className="h-6 w-6 text-blue-600 mb-2" />
              <span>Nuevo Usuario</span>
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-24 flex flex-col items-center justify-center"
            onClick={generatePdf}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600 mb-2" />
            ) : (
              <FileText className="h-6 w-6 text-green-600 mb-2" />
            )}
            <span>Generar Reporte</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-24 flex flex-col items-center justify-center"
            asChild
          >
            <Link href="/admin/configuracion">
              <Settings className="h-6 w-6 text-purple-600 mb-2" />
              <span>Ajustes del Sistema</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}