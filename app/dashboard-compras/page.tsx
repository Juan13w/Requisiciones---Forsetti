"use client";

import { useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Eye,
  XCircle,
  Download,
  Send,
  MoreVertical,
  History,
  Filter,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import RequisitionCharts from '@/components/charts/RequisitionCharts';
// Los estilos se cargan a través de la configuración global en layout.tsx

type Estado = 'pendiente' | 'aprobada' | 'rechazada' | 'correccion' | 'cerrada';

interface RequisicionDB {
  id: string;
  requisicion_id: number;
  consecutivo: string | null;
  empresa: string;
  fechaSolicitud: string;
  nombreSolicitante: string;
  proceso: string;
  justificacion: string | null;
  descripcion: string;
  cantidad: number;
  imagenes: string[];
  estado: Estado;
  fechaCreacion: number;
  intentosRevision: number;
  comentarioRechazo: string;
  fechaUltimoRechazo: string;
  fechaUltimaModificacion: string;
  coordinador_email?: string;
}

// Tipado de respuestas de la API
interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  fileUrl?: string;
}

export default function DashboardCompras() {
  const [requisiciones, setRequisiciones] = useState<RequisicionDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Estado | 'todos'>('todos');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendReportError, setSendReportError] = useState<string | null>(null);
  const [sendReportSuccess, setSendReportSuccess] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [empresasError, setEmpresasError] = useState<string | null>(null);

  // Historial modal state
  type HistEntry = {
    id: number;
    requisicion_id: number;
    estado: Estado | string;
    comentario: string | null;
    usuario: string | null;
    creado_en: string;
  };
  const [showHistoryModal, setShowHistoryModal] = useState<{ open: boolean; reqId: string | null }>({ open: false, reqId: null });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistEntry[]>([]);

  // Modal de detalle
  const [showDetailModal, setShowDetailModal] = useState<{ open: boolean; req: RequisicionDB | null }>({ open: false, req: null });

  // Abrir detalle en modal
  const openDetail = (id: string) => {
    const req = requisiciones.find((r) => r.id === id || r.requisicion_id.toString() === id) || null;
    setShowDetailModal({ open: true, req });
  };

  // Normalizador de datos
  const formatRequisicion = (req: any): RequisicionDB => ({
    id: req.id?.toString() || req.requisicion_id?.toString() || '',
    requisicion_id: req.requisicion_id || 0,
    consecutivo: req.consecutivo || null,
    empresa: req.empresa || '',
    fechaSolicitud: req.fechaSolicitud || req.fecha_solicitud || new Date().toISOString(),
    nombreSolicitante: req.nombreSolicitante || req.nombre_solicitante || '',
    proceso: req.proceso || '',
    justificacion: req.justificacion || null,
    descripcion: req.descripcion || '',
    cantidad: req.cantidad || 0,
    imagenes: req.imagenes || (req.img ? [req.img] : []),
    estado: (req.estado as Estado) || 'pendiente',
    fechaCreacion: req.fechaCreacion || Date.now(),
    intentosRevision: req.intentosRevision || 0,
    comentarioRechazo: req.comentarioRechazo || '',
    fechaUltimoRechazo: req.fechaUltimoRechazo || '',
    fechaUltimaModificacion: req.fechaUltimaModificacion || new Date().toISOString(),
    coordinador_email: req.coordinador_email || undefined,
  });

  // Cargar requisiciones
  useEffect(() => {
    const fetchRequisiciones = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/requisiciones');

        if (!response.ok) {
          throw new Error('Error al cargar las requisiciones');
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Formato de respuesta inválido');
        }

        setRequisiciones(data.map((req) => formatRequisicion(req)));
      } catch (err) {
        console.error('Error al cargar las requisiciones:', err);
        setReportError(err instanceof Error ? err.message : 'Error desconocido al cargar las requisiciones');
      } finally {
        setLoading(false);
      }
    };

    fetchRequisiciones();
  }, []);

  // Cargar empresas disponibles
  useEffect(() => {
    const cargarEmpresas = async () => {
      setEmpresasLoading(true);
      setEmpresasError(null);
      try {
        const res = await fetch('/api/empresas');
        if (!res.ok) throw new Error('Error al cargar empresas');
        const data: { nombre: string }[] = await res.json();
        const nombres = Array.from(new Set((data || []).map((e) => e.nombre).filter(Boolean)));
        // Respaldo: si API trae vacío, tomar de requisiciones
        if (nombres.length === 0 && requisiciones.length > 0) {
          const fallback = Array.from(new Set(requisiciones.map((r) => r.empresa).filter(Boolean))).sort();
          setEmpresas(fallback);
        } else {
          setEmpresas(nombres.sort());
        }
      } catch (e) {
        // Respaldo a partir de requisiciones cargadas
        const fallback = Array.from(new Set(requisiciones.map((r) => r.empresa).filter(Boolean))).sort();
        setEmpresas(fallback);
        setEmpresasError(e instanceof Error ? e.message : 'Error desconocido al cargar empresas');
      } finally {
        setEmpresasLoading(false);
      }
    };
    cargarEmpresas();
  }, [requisiciones]);

  // Obtener historial de una requisición
  const openHistory = async (reqId: string) => {
    setShowHistoryModal({ open: true, reqId });
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryEntries([]);
    try {
      const res = await fetch(`/api/requisiciones/${reqId}/historial`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'No se pudo obtener el historial');
      }
      setHistoryEntries(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Actualizar estado
  const updateRequisitionStatus = async (
    id: string,
    newStatus: Estado,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    let comentarioRechazo = '';

    if (newStatus === 'rechazada' || newStatus === 'correccion') {
      const comentario = prompt(
        `Por favor ingrese el motivo del ${
          newStatus === 'rechazada' ? 'rechazo' : 'rechazo parcial'
        }:`
      );
      if (comentario === null) return;
      if (comentario.trim() === '') {
        alert('Debe ingresar un motivo para el rechazo');
        return;
      }
      comentarioRechazo = comentario;
    } else if (newStatus === 'cerrada') {
      const req = requisiciones.find(r => r.id === id || r.requisicion_id.toString() === id);
      if (!req) return;
      if (!(req.estado === 'aprobada' || req.estado === 'rechazada')) {
        alert('Solo puede cerrar requisiciones que estén Aprobadas o Rechazadas.');
        return;
      }
      if (!confirm('¿Está seguro que desea cerrar esta requisición?')) {
        return;
      }
    } else if (!confirm(`¿Está seguro que desea ${newStatus} esta requisición?`)) {
      return;
    }

    setIsUpdating(id);

    try {
      const body: Partial<RequisicionDB> = { estado: newStatus };

      if (newStatus === 'rechazada' || newStatus === 'correccion') {
        body.comentarioRechazo = comentarioRechazo;
        body.fechaUltimoRechazo = new Date().toISOString();
      
        if (newStatus === 'correccion') {
          const requisicion = requisiciones.find(
            (r) => r.id === id || r.requisicion_id.toString() === id
          );
      
          body.intentosRevision = (requisicion?.intentosRevision || 0) + 1;
      
          // ✅ Campos adicionales requeridos por el backend
          body.descripcion = requisicion?.descripcion || '';
          body.cantidad = requisicion?.cantidad || 1;
          body.justificacion = requisicion?.justificacion || '';
          body.proceso = requisicion?.proceso || '';
          body.imagenes = requisicion?.imagenes || [];
        }
      }

      const response = await fetch(`/api/requisiciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // If there's an error, try to parse the JSON for a message
        const errorData: ApiResponse<null> = await response.json().catch(() => ({})); // Gracefully handle if error response is not JSON
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Error al actualizar (${response.status})`
        );
      }

      let updatedRequisition: Partial<RequisicionDB> | null = null;
      // Handle responses with no content (like 204)
      if (response.status !== 204) {
        const responseData: ApiResponse<Partial<RequisicionDB>> = await response.json();
        updatedRequisition = responseData.data || null;
      }

      setRequisiciones((prev) =>
        prev.map((req) => {
          if (req.id === id || req.requisicion_id.toString() === id) {
            // If we got data from the server, use it. Otherwise, use local data.
            return {
              ...req,
              ...(updatedRequisition || {}),
              estado: updatedRequisition?.estado || newStatus,
              comentarioRechazo:
                newStatus === 'rechazada' || newStatus === 'correccion'
                  ? (updatedRequisition?.comentarioRechazo || comentarioRechazo)
                  : req.comentarioRechazo,
              fechaUltimoRechazo:
                newStatus === 'rechazada' || newStatus === 'correccion'
                  ? (updatedRequisition?.fechaUltimoRechazo || new Date().toISOString())
                  : req.fechaUltimoRechazo,
              intentosRevision:
                updatedRequisition?.intentosRevision ||
                (newStatus === 'correccion'
                  ? (req.intentosRevision || 0) + 1
                  : req.intentosRevision),
            };
          }
          return req;
        })
      );
    } catch (error) {
      console.error('Error al actualizar:', error);

      try {
        const refreshResponse = await fetch('/api/requisiciones');
        if (refreshResponse.ok) {
          const refreshedData: any[] = await refreshResponse.json();
          setRequisiciones(refreshedData.map((req) => formatRequisicion(req)));
        }
      } catch (refreshError) {
        console.error('Error al refrescar:', refreshError);
      }

      alert(
        `Error al actualizar: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      );
    } finally {
      setIsUpdating(null);
    }
  };

  // Generar reporte
  const handleGenerateReport = async () => {
    try {
      setIsSendingReport(true);
      setReportError(null);
      setReportSuccess(null);

      const response = await fetch('/api/reportes/requisiciones');
      const data: ApiResponse<null> = await response.json();

      if (!response.ok || !data.success || !data.fileUrl) {
        throw new Error(data.error || data.message || 'Error al generar el reporte');
      }

      const link = document.createElement('a');
      link.href = data.fileUrl;
      // Usamos un nombre de archivo por defecto ya que data.filename no está definido en el tipo
      link.download = 'reporte-requisiciones.pdf';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReportSuccess('Reporte PDF generado correctamente');
      setTimeout(() => setReportSuccess(null), 5000);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Error desconocido');
      setTimeout(() => setReportError(null), 10000);
    } finally {
      setIsSendingReport(false);
    }
  };

  // Enviar reporte
  const handleSendReport = async () => {
    if (!recipientEmail) {
      setSendReportError('Por favor ingrese un correo electrónico');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setSendReportError('Por favor ingrese un correo electrónico válido');
      return;
    }

    try {
      setIsSendingReport(true);
      setSendReportError(null);
      setSendReportSuccess(null);

      // Preparar los datos de las requisiciones para el reporte
      const requisicionesParaReporte = filteredRequisiciones.map(req => ({
        consecutivo: req.consecutivo,
        empresa: req.empresa,
        nombreSolicitante: req.nombreSolicitante,
        proceso: req.proceso,
        estado: req.estado,
        fechaSolicitud: req.fechaSolicitud,
        descripcion: req.descripcion,
        cantidad: req.cantidad,
        justificacion: req.justificacion
      }));

      const response = await fetch('/api/reportes/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: 'Reporte de Requisiciones',
          message: emailMessage || 'Adjunto encontrará el reporte de requisiciones solicitado.',
          requisiciones: requisicionesParaReporte
        }),
      });

      const data: ApiResponse<null> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al enviar el correo');
      }

      setSendReportSuccess('El reporte ha sido enviado exitosamente');
      setRecipientEmail('');
      setEmailMessage('');

      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        setShowSendModal(false);
        setSendReportSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Error al enviar el reporte:', err);
      setSendReportError(
        err instanceof Error ? err.message : 'Error desconocido al enviar el reporte'
      );
    } finally {
      setIsSendingReport(false);
    }
  };

  // Renderizar estado con íconos
  const renderStatus = (status: Estado, requisicion: RequisicionDB) => {
    switch (status) {
      case 'cerrada':
        return (
          <span className="status-badge">
            <FileText className="icon" /> Cerrada
          </span>
        );
      case 'aprobada':
        return (
          <span className="status-badge success">
            <CheckCircle className="icon" /> Aprobada
          </span>
        );
      case 'rechazada':
        return (
          <div>
            <span className="status-badge error">
              <XCircle className="icon" /> Rechazada
            </span>
            {requisicion.comentarioRechazo && (
              <div className="mt-1 text-xs text-gray-600">
                <strong>Motivo:</strong> {requisicion.comentarioRechazo}
              </div>
            )}
          </div>
        );
      // En la función renderStatus, modifica el caso 'correccion':
case 'correccion':
  return (
    <div>
      <span className="status-badge warning">
        <AlertCircle className="icon" /> En corrección
      </span>
      {requisicion.comentarioRechazo && (
        <div className="mt-1 text-xs text-yellow-700">
          {requisicion.comentarioRechazo}
        </div>
      )}
    </div>
  );
      case 'pendiente':
      default:
        return (
          <span className="status-badge warning">
            <Clock className="icon" /> Pendiente
          </span>
        );
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando requisiciones...</p>
        </div>
      </div>
    );
  }

  // Error
  if (reportError) {
    return (
      <div className="dashboard-page">
        <div className="error-container">
          <AlertCircle size={48} className="error-icon" />
          <h2>Error al cargar las requisiciones</h2>
          <p>{reportError}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Stats
  const totalRequisiciones = requisiciones.length;
  const pendientes = requisiciones.filter((r) => r.estado === 'pendiente').length;
  const aprobadas = requisiciones.filter((r) => r.estado === 'aprobada').length;
  const rechazadas = requisiciones.filter((r) => r.estado === 'rechazada').length;
  const enCorreccion = requisiciones.filter((r) => r.estado === 'correccion').length;

  // Filtros combinados
  const filteredRequisiciones = requisiciones.filter((req) => {
    // Filtro por empresa
    if (selectedEmpresa && req.empresa !== selectedEmpresa) return false;
    
    // Filtro por estado
    if (statusFilter !== 'todos' && req.estado !== statusFilter) return false;
    
    // Filtro de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (req.consecutivo?.toLowerCase().includes(searchLower)) ||
        req.empresa.toLowerCase().includes(searchLower) ||
        req.nombreSolicitante.toLowerCase().includes(searchLower) ||
        req.proceso.toLowerCase().includes(searchLower) ||
        req.descripcion.toLowerCase().includes(searchLower) ||
        req.estado.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  const countByEmpresa = requisiciones.reduce<Record<string, number>>((acc, r) => {
    if (r.empresa) acc[r.empresa] = (acc[r.empresa] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>Panel de Compras</h1>
          <p className="subtitle">
            Gestiona todas las requisiciones de los coordinadores de la empresa
          </p>
        </div>
        <div className="header-actions">
          <button
            className="action-btn generate-report-btn"
            onClick={handleGenerateReport}
            disabled={isSendingReport}
          >
            <FileText className="btn-icon" />
            {isSendingReport ? 'Generando...' : 'Generar Reporte'}
          </button>
          <button
            className="action-btn send-report-btn"
            onClick={() => setShowSendModal(true)}
            disabled={isSendingReport}
          >
            <Send className="btn-icon" /> Enviar Reporte
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">TOTAL REQUISICIONES</span>
            <FileText className="stat-icon" />
          </div>
          <div className="stat-value">{totalRequisiciones}</div>
          <p className="stat-description">
            {totalRequisiciones > 0
              ? `${Math.round((aprobadas / totalRequisiciones) * 100)}% de efectividad`
              : 'No hay datos disponibles'}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">PENDIENTES</span>
            <Clock className="stat-icon" />
          </div>
          <div className="stat-value orange">{pendientes}</div>
          <p className="stat-description">
            {enCorreccion > 0 ? `${enCorreccion} en corrección` : 'Sin pendientes urgentes'}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">APROBADAS</span>
            <CheckCircle className="stat-icon" />
          </div>
          <div className="stat-value green">{aprobadas}</div>
          <p className="stat-description">{`Total histórico: ${aprobadas}`}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">RECHAZADAS</span>
            <AlertCircle className="stat-icon" />
          </div>
          <div className="stat-value red">{rechazadas}</div>
          <p className="stat-description">{`Total histórico: ${rechazadas}`}</p>
        </div>
      </div>

      {/* CHARTS */}
      <RequisitionCharts />

      {/* EMPRESAS - TARJETAS DE FILTRO */}
      <div className="mt-10">
        <div className="section-header">
          <h2>Empresas</h2>
          <p className="section-description">Selecciona una empresa para ver sus requisiciones</p>
        </div>
        {empresasError && (
          <div className="alert error mt-3">
            <AlertCircle className="icon" /> {empresasError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {/* Tarjeta: Todas */}
          <button
            onClick={() => setSelectedEmpresa(null)}
            className={`text-left p-4 rounded-lg border transition hover:shadow-sm ${
              selectedEmpresa === null ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
            }`}
            disabled={empresasLoading}
          >
            <div className="text-sm text-gray-500">Todas las empresas</div>
            <div className="text-2xl font-semibold mt-1">{totalRequisiciones}</div>
          </button>

          {/* Tarjetas por empresa */}
          {empresasLoading && (
            <div className="col-span-full text-sm text-gray-500">Cargando empresas...</div>
          )}
          {!empresasLoading && empresas
            .filter(empresa => empresa.toLowerCase() !== 'multiple')
            .map((e) => (
              <button
                key={e}
                onClick={() => setSelectedEmpresa(e === selectedEmpresa ? null : e)}
                className={`text-left p-4 rounded-lg border transition hover:shadow-sm ${
                  selectedEmpresa === e ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
                }`}
                title={`Ver requisiciones de ${e}`}
              >
                <div className="text-sm text-gray-500">{e}</div>
                <div className="text-2xl font-semibold mt-1">{countByEmpresa[e] || 0}</div>
              </button>
            ))}
        </div>
      </div>

      {/* LISTA DE REQUISICIONES */}
      <div className="recent-requisitions">
        <div className="section-header">
          <h2>{selectedEmpresa ? `Requisiciones - ${selectedEmpresa}` : 'Requisiciones Recientes'}</h2>
          <p className="section-description">
            {selectedEmpresa ? 'Filtradas por empresa seleccionada' : 'Últimas solicitudes enviadas por los coordinadores'}
          </p>
        </div>

        {/* Filtros de búsqueda */}
        <div className="filters-container mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            {/* Filtro de búsqueda */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por empresa, solicitante, proceso..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtro por estado */}
            <div className="w-full sm:w-48">
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Estado | 'todos')}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="correccion">En corrección</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </div>
            
            {/* Botón para limpiar filtros */}
            {(searchTerm || statusFilter !== 'todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
        
        <div className="requisition-grid">
          {filteredRequisiciones.map((req) => (
            <div key={req.id} className="requisition-card">
              <div className="requisition-card-header">
                <div className="requisition-card-title">
                  <div className="requisition-id">{req.consecutivo || req.id}</div>
                  <h3 className="requisition-solicitante">{req.nombreSolicitante}</h3>
                  <div className="requisition-date">
                    {new Date(req.fechaCreacion).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div className={`status-badge ${req.estado}`}>
                  {req.estado.charAt(0).toUpperCase() + req.estado.slice(1)}
                </div>
              </div>
              
              <div className="requisition-card-footer">
                <div className="requisition-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={() => {
                      setShowDetailModal({ open: true, req });
                    }}
                    title="Ver detalles"
                  >
                    <Eye className="action-icon" size={16} />
                    <span className="action-text"></span>
                  </button>
                  
                  {(req.estado === 'aprobada' || req.estado === 'rechazada') && (
                    <button
                      onClick={(e) => updateRequisitionStatus(req.id, 'cerrada', e)}
                      className="action-btn close-btn"
                      disabled={!!isUpdating && isUpdating === req.id}
                      title="Cerrar requisición"
                    >
                      <X className="action-icon" size={16} />
                      <span className="action-text"></span>
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => updateRequisitionStatus(req.id, 'aprobada', e)}
                    className="action-btn approve-btn"
                    disabled={!!isUpdating && isUpdating === req.id}
                    title="Aprobar"
                  >
                    <CheckCircle className="action-icon" size={16} />
                    <span className="action-text"></span>
                  </button>
                  
                  <button
                    onClick={(e) => updateRequisitionStatus(req.id, 'rechazada', e)}
                    className="action-btn reject-btn"
                    disabled={!!isUpdating && isUpdating === req.id}
                    title="Rechazar"
                  >
                    <X className="action-icon" size={16} />
                    <span className="action-text"></span>
                  </button>
                  
                  <button
                    onClick={(e) => updateRequisitionStatus(req.id, 'correccion', e)}
                    className="action-btn warning-btn"
                    disabled={!!isUpdating && isUpdating === req.id}
                    title="Solicitar corrección"
                  >
                    <AlertCircle className="action-icon" size={16} />
                    <span className="action-text"></span>
                  </button>
                  
                  <button
                    onClick={() => openHistory(req.id)}
                    className="action-btn history-btn"
                    title="Ver historial"
                    type="button"
                  >
                    <History className="action-icon" size={16} />
                    <span className="action-text"></span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredRequisiciones.length === 0 && (
            <div className="no-requisitions">
              {selectedEmpresa ? 'No hay requisiciones para esta empresa' : 'No hay requisiciones registradas'}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PARA ENVIAR REPORTE - NUEVO DISEÑO */}
      {showSendModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '28rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Encabezado */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Enviar Reporte por Correo</h2>
                <button
                  onClick={() => {
                    setShowSendModal(false);
                    setRecipientEmail('');
                    setEmailMessage('');
                    setSendReportError(null);
                    setSendReportSuccess(null);
                  }}
                  className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1"
                  disabled={isSendingReport}
                  aria-label="Cerrar modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-1 text-blue-100 text-sm">
                Complete los campos para enviar el reporte por correo electrónico.
              </p>
            </div>

            {/* Cuerpo del formulario */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:bg-gray-50"
                  placeholder="ejemplo@empresa.com"
                  disabled={isSendingReport}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mensaje (opcional)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[100px] disabled:opacity-50 disabled:bg-gray-50"
                  placeholder="Escriba un mensaje personalizado..."
                  disabled={isSendingReport}
                  aria-label="Mensaje opcional para el correo"
                />
              </div>

              {/* Mensajes de estado */}
              {sendReportError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="flex-shrink-0 w-5 h-5 mt-0.5" />
                  <span className="text-sm">{sendReportError}</span>
                </div>
              )}
              
              {sendReportSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-start space-x-2">
                  <CheckCircle className="flex-shrink-0 w-5 h-5 mt-0.5" />
                  <span className="text-sm">{sendReportSuccess}</span>
                </div>
              )}
            </div>

            {/* Pie del modal - Acciones */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowSendModal(false);
                  setRecipientEmail('');
                  setEmailMessage('');
                  setSendReportError(null);
                  setSendReportSuccess(null);
                }}
                disabled={isSendingReport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleSendReport}
                disabled={isSendingReport || !recipientEmail}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  isSendingReport || !recipientEmail
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSendingReport ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Reporte
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {showHistoryModal.open && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal({ open: false, reqId: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Historial de Requisición</h3>
              <button onClick={() => setShowHistoryModal({ open: false, reqId: null })} className="close-button">&times;</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-600 mb-4">Eventos desde la creación hasta el estado actual</p>

              {historyLoading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                  <p className="text-gray-600">Cargando historial...</p>
                </div>
              )}

              {historyError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{historyError}</p>
                    </div>
                  </div>
                </div>
              )}

              {!historyLoading && !historyError && (
                <div className="space-y-6">
                  {historyEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No hay eventos registrados para esta requisición.</p>
                    </div>
                  ) : (
                    <div className="border-l-2 border-gray-200 pl-4 space-y-6">
                      {historyEntries.map((h, index) => (
                        <div key={`${h.id}-${h.creado_en}`} className="relative pb-6">
                          {index !== historyEntries.length - 1 && (
                            <div className="absolute left-[-9px] top-4 h-full w-0.5 bg-gray-200"></div>
                          )}
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                                h.estado === 'aprobada' ? 'bg-green-100 text-green-600' :
                                h.estado === 'rechazada' ? 'bg-red-100 text-red-600' :
                                h.estado === 'correccion' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {h.estado === 'aprobada' ? (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                ) : h.estado === 'rechazada' ? (
                                  <XCircle className="h-3.5 w-3.5" />
                                ) : h.estado === 'correccion' ? (
                                  <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5" />
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900 capitalize">
                                  {h.estado}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {new Date(h.creado_en).toLocaleString()}
                                </span>
                              </div>
                              
                              {h.comentario && (
                                <div className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  <p>{h.comentario}</p>
                                </div>
                              )}
                              
                              {h.usuario && (
                                <div className="mt-1 text-xs text-gray-500">
                                  <span className="font-medium">Usuario:</span> {h.usuario}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowHistoryModal({ open: false, reqId: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE REQUISICIÓN */}
      {showDetailModal.open && showDetailModal.req && (
        <div className="modal-overlay" onClick={() => setShowDetailModal({ open: false, req: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles de Requisición</h3>
              <button onClick={() => setShowDetailModal({ open: false, req: null })} className="close-button">&times;</button>
            </div>
            <div className="modal-body">
              <div className="req-header">
                <div className="req-header-info">
                  <span className="req-consecutivo">{showDetailModal.req.consecutivo || showDetailModal.req.id}</span>
                  {showDetailModal.req.coordinador_email && (
                    <span className="coordinador-email" title="Correo del coordinador">
                      {showDetailModal.req.coordinador_email}
                    </span>
                  )}
                </div>
                <span className={`status-badge status-${showDetailModal.req.estado}`}>
                  {showDetailModal.req.estado.charAt(0).toUpperCase() + showDetailModal.req.estado.slice(1)}
                </span>
              </div>


              <div className="req-details-grid">
                <div className="detail-item">
                  <label>Holding:</label>
                  <p>{showDetailModal.req.empresa}</p>
                </div>
                <div className="detail-item">
                  <label>Fecha de Solicitud:</label>
                  <p>{new Date(showDetailModal.req.fechaSolicitud).toLocaleString()}</p>
                </div>
                <div className="detail-item">
                  <label>Nombre del Solicitante:</label>
                  <p>{showDetailModal.req.nombreSolicitante}</p>
                </div>
                <div className="detail-item">
                  <label>Proceso Solicitante:</label>
                  <p>{showDetailModal.req.proceso}</p>
                </div>
              </div>

              <div className="detail-item-full">
                <label>Descripción del Producto:</label>
                <p>{showDetailModal.req.descripcion}</p>
              </div>

              <div className="detail-item-full">
                <label>Cantidad:</label>
                <p>{showDetailModal.req.cantidad}</p>
              </div>

              {showDetailModal.req.justificacion && (
                <div className="detail-item-full">
                  <label>Justificación:</label>
                  <p>{showDetailModal.req.justificacion}</p>
                </div>
              )}

                          {/* Sección de estado de corrección o rechazo */}
              {(showDetailModal.req.estado === 'rechazada' || showDetailModal.req.estado === 'correccion') && (
                <div className={`status-alert ${showDetailModal.req.estado}`}>
                  <div className="alert-content">
                    <div className="alert-icon">
                      {showDetailModal.req.estado === 'correccion' ? (
                        <AlertTriangle className="icon" />
                      ) : (
                        <XCircle className="icon" />
                      )}
                    </div>
                    <div className="alert-details">
                      <h4>
                        {showDetailModal.req.estado === 'correccion' 
                          ? 'Enviado a corrección' 
                          : 'Requisición Rechazada'}
                      </h4>
                      {showDetailModal.req.comentarioRechazo && (
                        <div className="alert-message">
                          <p className="label">Motivo:</p>
                          <p className="message">{showDetailModal.req.comentarioRechazo}</p>
                        </div>
                      )}
                      {showDetailModal.req.fechaUltimoRechazo && (
                        <p className="alert-timestamp">
                          {new Date(showDetailModal.req.fechaUltimoRechazo).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {showDetailModal.req.imagenes && showDetailModal.req.imagenes.length > 0 ? (
                <div className="detail-item-full">
                  <label>Archivos adjuntos</label>
                  <div className="file-previews space-y-3">
                    {showDetailModal.req.imagenes.map((file, index) => {
                      const isPDF = file.startsWith('data:application/pdf') || 
                                  file.includes('application/pdf') ||
                                  (file.includes('JVBERi0') && file.includes('Qk0'));
                      const imageSrc = file.startsWith('data:') ? file : `data:image/jpeg;base64,${file}`;
                      
                      return (
                        <div key={index} className="file-item p-3 border rounded-lg bg-white shadow-sm">
                          <div className="file-item-header flex items-center gap-3 mb-2">
                            <div className={`file-icon ${isPDF ? 'text-red-500' : 'text-blue-500'}`}>
                              {isPDF ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="file-info">
                              <span className="file-name font-medium block">
                                {isPDF ? `Documento ${index + 1}.pdf` : `Imagen ${index + 1}.jpg`}
                              </span>
                              <span className="file-type text-sm text-gray-500">
                                {isPDF ? 'Archivo PDF' : 'Archivo de imagen'}
                              </span>
                            </div>
                          </div>

                          <div className="file-actions flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isPDF) {
                                  const pdfWindow = window.open("", "_blank");
                                  if (pdfWindow) {
                                    const html = `
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <title>Vista previa del PDF</title>
                                          <style>
                                            body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                                            iframe { width: 100%; height: 100%; border: none; }
                                          </style>
                                        </head>
                                        <body>
                                          <iframe src="${file}" type="application/pdf">
                                            <p>Tu navegador no soporta la visualización de PDFs. 
                                            <a href="${file}">Descarga el PDF</a>.</p>
                                          </iframe>
                                        </body>
                                      </html>
                                    `;
                                    pdfWindow.document.open();
                                    pdfWindow.document.write(html);
                                    pdfWindow.document.close();
                                  }
                                } else {
                                  const imgWindow = window.open('', '_blank');
                                  if (imgWindow) {
                                    imgWindow.document.write(`
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <title>Imagen ${index + 1}</title>
                                          <style>
                                            body { 
                                              margin: 0; 
                                              padding: 20px; 
                                              display: flex; 
                                              justify-content: center; 
                                              align-items: center; 
                                              height: 100vh; 
                                              background-color: #f5f5f5; 
                                            }
                                            img { 
                                              max-width: 90%; 
                                              max-height: 90vh; 
                                              object-fit: contain; 
                                              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                                              border-radius: 0.5rem;
                                            }
                                          </style>
                                        </head>
                                        <body>
                                          <img src="${imageSrc}" alt="Imagen ampliada" />
                                        </body>
                                      </html>
                                    `);
                                    imgWindow.document.close();
                                  }
                                }
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                            >
                              {isPDF ? 'Ver PDF' : 'Ver imagen'}
                            </button>

                            <a
                              href={file}
                              download={`${isPDF ? 'Documento' : 'Imagen'}_${(showDetailModal.req?.consecutivo || 'sin-numero').toString().replace(/[^a-zA-Z0-9-_]/g, '')}_${index + 1}${isPDF ? '.pdf' : file.includes('image/') ? '.jpg' : file.includes('application/') ? '.bin' : '.dat'}`}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Descargar
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="detail-item-full">
                  <label>Archivos adjuntos</label>
                  <p className="text-gray-500">No hay documentos adjuntos</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span>Últ. Modificación: {new Date(showDetailModal.req.fechaUltimaModificacion).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>

    
  );
}
      
