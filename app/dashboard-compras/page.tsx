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

type Estado = 'pendiente' | 'en_gestion' | 'aprobada' | 'rechazada' | 'correccion' | 'completada';

interface RequisicionDB {
  id: string;
  requisicion_id: number;
  consecutivo: string | null;
  justificacion_ti?: string;
  empresa: string;
  fechaSolicitud: string;
  nombreSolicitante: string;
  proceso: string;
  justificacion: string | null;
  descripcion: string;
  cantidad: number;
  imagenes: string[];
  archivos: Array<{
    archivo_id: number;
    nombre_archivo: string;
    tipo_mime: string;
    tamano: number;
    fecha_creacion: Date;
    url: string;
  }>;
  estado: Estado;
  fechaCreacion: number;
  intentosRevision: number;
  comentarioRechazo: string;
  comentarioRechazoFinal?: string;
  fechaUltimoRechazo: string;
  fechaUltimaModificacion: string;
  usuarioActual?: string; // Campo para el usuario que aprueba/rechaza
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
  const [currentPage, setCurrentPage] = useState(1);

  const formatEstadoLabel = (estado: string) => {
    if (estado === 'en_gestion') return 'En gestión';
    return estado.charAt(0).toUpperCase() + estado.slice(1);
  };

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

  // Modal de filtros para reporte PDF
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFilterMes, setReportFilterMes] = useState('');
  const [reportFilterEmpresa, setReportFilterEmpresa] = useState('');
  const [reportFilterProceso, setReportFilterProceso] = useState('');
  const [reportFilterEstado, setReportFilterEstado] = useState('');
  const [pdfReportError, setPdfReportError] = useState<string | null>(null);

  // Detectar soporte para input type="month" (para compatibilidad con Edge)
  const [supportsMonthInput, setSupportsMonthInput] = useState(true);

  useEffect(() => {
    // Comprobar si el navegador soporta input type="month"
    const input = document.createElement('input');
    input.type = 'month';
    setSupportsMonthInput(input.type === 'month');
  }, []);

  // Asegurar que reportFilterMes tenga un valor válido en Edge
  useEffect(() => {
    if (showReportModal && !reportFilterMes && supportsMonthInput) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setReportFilterMes(`${year}-${month}`);
    }
  }, [showReportModal, reportFilterMes, supportsMonthInput]);

  // Helpers para el fallback de mes/año
  const getYearFromMonthString = (monthStr: string) => monthStr.split('-')[0] || '';
  const getMonthFromMonthString = (monthStr: string) => monthStr.split('-')[1] || '';
  const buildMonthString = (year: string, month: string) => `${year}-${month}`;

  const [fallbackYear, setFallbackYear] = useState(() => getYearFromMonthString(reportFilterMes) || new Date().getFullYear().toString());
  const [fallbackMonth, setFallbackMonth] = useState(() => getMonthFromMonthString(reportFilterMes) || String(new Date().getMonth() + 1).padStart(2, '0'));

  useEffect(() => {
    setFallbackYear(getYearFromMonthString(reportFilterMes) || new Date().getFullYear().toString());
    setFallbackMonth(getMonthFromMonthString(reportFilterMes) || String(new Date().getMonth() + 1).padStart(2, '0'));
  }, [reportFilterMes]);

  const handleFallbackChange = () => {
    const newMonthStr = buildMonthString(fallbackYear, fallbackMonth);
    setReportFilterMes(newMonthStr);
  };

  useEffect(() => {
    handleFallbackChange();
  }, [fallbackYear, fallbackMonth]);

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
    justificacion_ti: req.justificacion_ti || '',
    descripcion: req.descripcion || '',
    cantidad: req.cantidad || 0,
    imagenes: req.imagenes || (req.img ? [req.img] : []),
    // Incluir el campo archivos que viene de la API
    archivos: req.archivos || [],
    estado: (req.estado as Estado) || 'pendiente',
    fechaCreacion: req.fechaCreacion || Date.now(),
    intentosRevision: req.intentosRevision || 0,
    comentarioRechazo: req.comentarioRechazo || '',
    comentarioRechazoFinal: req.comentarioRechazoFinal || '',
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

        const formattedData = data.map((req) => formatRequisicion(req));
        setRequisiciones(formattedData);
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
        const nombresBase = Array.from(new Set((data || []).map((e) => e.nombre).filter(Boolean)));

        // Empresas que siempre deben estar disponibles en los filtros
        const empresasFijas = ['SERVISALUD', 'ACCESALUD', 'INPROSALUDPLUS'];

        // Combinar resultados de la API con las empresas fijas y evitar duplicados
        const nombresConFijas = Array.from(new Set([...nombresBase, ...empresasFijas]));

        // Respaldo: si API trae vacío, tomar de requisiciones
        if (nombresConFijas.length === 0 && requisiciones.length > 0) {
          const fallbackBase = Array.from(new Set(requisiciones.map((r) => r.empresa).filter(Boolean)));
          const fallbackConFijas = Array.from(new Set([...fallbackBase, ...empresasFijas]));
          setEmpresas(fallbackConFijas.sort());
        } else {
          setEmpresas(nombresConFijas.sort());
        }
      } catch (e) {
        // Respaldo a partir de requisiciones cargadas
        const fallbackBase = Array.from(new Set(requisiciones.map((r) => r.empresa).filter(Boolean)));
        const empresasFijas = ['SERVISALUD', 'ACCESALUD', 'INPROSALUDPLUS'];
        const fallbackConFijas = Array.from(new Set([...fallbackBase, ...empresasFijas]));
        setEmpresas(fallbackConFijas.sort());
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

  // Función para obtener el email del usuario actual
const getCurrentUserEmail = () => {
  if (typeof window === 'undefined') return 'Sistema';
  
  try {
    const usuarioData = localStorage.getItem('usuarioData');
    console.log('DEBUG: usuarioData de localStorage:', usuarioData);
    
    if (usuarioData) {
      const user = JSON.parse(usuarioData);
      console.log('DEBUG: usuario parseado:', user);
      
      // Intentar obtener email o nombre, fallback a otros campos
      const email = user.email || user.correo || user.nombre || user.username || 'Usuario desconocido';
      console.log('DEBUG: email final:', email);
      return email;
    } else {
      console.log('DEBUG: No hay usuarioData en localStorage');
    }
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
  }
  return 'Sistema';
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
    } else if (newStatus === 'completada') {
      const req = requisiciones.find(r => r.id === id || r.requisicion_id.toString() === id);
      if (!req) return;
      if (!(req.estado === 'aprobada' || req.estado === 'rechazada')) {
        alert('Solo puede cerrar requisiciones que estén Aprobadas o Rechazadas.');
        return;
      }
      if (!confirm('¿Está seguro que desea cerrar esta requisición?')) {
        return;
      }
    } else {
      let mensajeConfirmacion = `¿Está seguro que desea ${newStatus} esta requisición?`;
      if (newStatus === 'en_gestion') {
        mensajeConfirmacion = '¿Está seguro que desea poner esta requisición en gestión?';
      }
      if (!confirm(mensajeConfirmacion)) {
        return;
      }
    }

    setIsUpdating(id);

    try {
      const body: Partial<RequisicionDB> = { 
        estado: newStatus,
        usuarioActual: getCurrentUserEmail() // Agregar usuario actual
      };

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
              comentarioRechazoFinal:
                newStatus === 'rechazada'
                  ? (updatedRequisition?.comentarioRechazoFinal || comentarioRechazo)
                  : (updatedRequisition?.comentarioRechazoFinal ?? req.comentarioRechazoFinal),
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

  // Generar reporte con filtros
  const handleGenerateReport = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      setIsSendingReport(true);
      setPdfReportError(null);
      setReportSuccess(null);

      // Construir URL con parámetros de filtro
      const params = new URLSearchParams();
      if (reportFilterMes) params.append('mes', reportFilterMes);
      if (reportFilterEmpresa) params.append('empresa', reportFilterEmpresa);
      if (reportFilterProceso) params.append('proceso', reportFilterProceso);
      if (reportFilterEstado) params.append('estado', reportFilterEstado);
      
      const queryString = params.toString();
      const url = `/api/reportes/requisiciones${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      const data: ApiResponse<null> = await response.json();

      // Verificar si hay error (aunque sea status 200)
      if (!data.success) {
        setPdfReportError(data.error || 'No se encontraron requisiciones con los filtros seleccionados');
        return;
      }

      if (!data.fileUrl) {
        setPdfReportError('Error al generar el reporte: no se recibió el archivo');
        return;
      }

      // Abrir el PDF en una nueva pestaña
      window.open(data.fileUrl, '_blank');

      setReportSuccess('Reporte PDF generado correctamente');
      setShowReportModal(false);
      // Limpiar filtros después de generar
      setReportFilterMes('');
      setReportFilterEmpresa('');
      setReportFilterProceso('');
      setReportFilterEstado('');
      setTimeout(() => setReportSuccess(null), 5000);
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setPdfReportError(err instanceof Error ? err.message : 'Error desconocido al generar el reporte');
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
      case 'completada':
        return (
          <span className="status-badge">
            <FileText className="icon" /> Completada
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
                <strong>Motivo de corrección:</strong> {requisicion.comentarioRechazo}
              </div>
            )}
            {requisicion.comentarioRechazoFinal && (
              <div className="mt-1 text-xs text-gray-800">
                <strong>Motivo de rechazo final:</strong> {requisicion.comentarioRechazoFinal}
              </div>
            )}
          </div>
        );
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
      case 'en_gestion':
        return (
          <span className="status-badge warning">
            <Clock className="icon" /> En gestión
          </span>
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

  // Loading mejorado
  if (loading) {
    return (
      <div className="dashboard-loading-container">
        {/* Partículas de fondo animadas */}
        <div className="dashboard-loading-particles">
          <div className="dashboard-loading-particle"></div>
          <div className="dashboard-loading-particle"></div>
          <div className="dashboard-loading-particle"></div>
          <div className="dashboard-loading-particle"></div>
          <div className="dashboard-loading-particle"></div>
        </div>
        
        {/* Contenido principal de carga */}
        <div className="dashboard-loading-content">
          {/* Logo o spinner principal */}
          <div className="dashboard-loading-spinner"></div>
          
          {/* Título y subtítulo */}
          <h2 className="dashboard-loading-title">Panel de Compras</h2>
          <p className="dashboard-loading-subtitle">Cargando requisiciones...</p>
          
          {/* Barra de progreso animada */}
          <div className="dashboard-loading-progress">
            <div className="dashboard-loading-progress-bar"></div>
          </div>
          
          {/* Puntos animados */}
          <div className="dashboard-loading-dots">
            <div className="dashboard-loading-dot"></div>
            <div className="dashboard-loading-dot"></div>
            <div className="dashboard-loading-dot"></div>
          </div>
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
  const enGestion = requisiciones.filter((r) => r.estado === 'en_gestion').length;
  const aprobadas = requisiciones.filter((r) => r.estado === 'aprobada').length;
  const rechazadas = requisiciones.filter((r) => r.estado === 'rechazada').length;
  const enCorreccion = requisiciones.filter((r) => r.estado === 'correccion').length;
  const cerradas = requisiciones.filter((r) => r.estado === 'completada').length;

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
  const pageSize = 50;
  const totalFiltered = filteredRequisiciones.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRequisiciones = filteredRequisiciones.slice(startIndex, endIndex);
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
            onClick={() => setShowReportModal(true)}
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

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">COMPLETADAS</span>
            <CheckCircle className="stat-icon" />
          </div>
          <div className="stat-value gray">{cerradas}</div>
          <p className="stat-description">
            {totalRequisiciones > 0
              ? `${Math.round((cerradas / totalRequisiciones) * 100)}% del total`
              : 'Sin datos'}
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <RequisitionCharts />

      {/* EMPRESAS - TARJETAS DE FILTRO */}
      <div className="mt-10">
        <div className="section-header">
          <h2 className="text-white">Empresas</h2>
          <p className="section-description text-white">Selecciona una empresa para ver sus requisiciones</p>
        </div>
        {empresasError && (
          <div className="alert error mt-3 text-white">
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
            <div className="text-2xl font-semibold mt-1 text-white">{totalRequisiciones}</div>
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
                <div className="text-2xl font-semibold mt-1 text-white">{countByEmpresa[e] || 0}</div>
              </button>
            ))}
        </div>
      </div>

      {/* LISTA DE REQUISICIONES */}
      <div className="recent-requisitions mt-8">
        <div className="section-header">
          <h2 className="text-white">
            {selectedEmpresa ? `Requisiciones - ${selectedEmpresa}` : 'Requisiciones Recientes'}
          </h2>
          <p className="section-description text-gray-300">
            {selectedEmpresa ? 'Filtradas por empresa seleccionada' : 'Últimas solicitudes enviadas por los coordinadores'}
          </p>
        </div>

        {/* Filtros de búsqueda */}
        <div className="filters-container mb-6 p-4 bg-black rounded-lg shadow-sm border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            {/* Filtro de búsqueda */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por empresa, solicitante, proceso..."
                className="pl-10 block w-full rounded-md border border-gray-600 bg-gray-900 text-white placeholder-gray-400 shadow-sm focus:border-indigo-400 focus:ring-indigo-400 text-base sm:text-base py-2.5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtro por estado */}
            <div className="w-full sm:w-48 ">
              <select
                className="block w-full rounded-md text-white border-2 border-white  shadow-sm focus:border-white focus:ring-white sm:text-sm py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Estado | 'todos')}
              >
                <option className="text-gray-800" value="todos">Todos los estados</option>
                <option className="text-gray-800" value="pendiente">Pendiente</option>
                <option className="text-gray-800" value="en_gestion">En gestión</option>
                <option className="text-gray-800" value="aprobada">Aprobada</option>
                <option className="text-gray-800" value="rechazada">Rechazada</option>
                <option className="text-gray-800" value="correccion">En corrección</option>
                <option className="text-gray-800" value="completada">Completada</option>
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
        
        {/* Tabla de requisiciones en formato listado */}
        <div className="requisition-table-container">
          <table className="requisition-table">
            <thead>
              <tr>
                <th>Consecutivo</th>
                <th>Solicitante</th>
                <th>Empresa</th>
                <th>Proceso</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequisiciones.map((req) => (
                <tr key={req.id} className="requisition-row">
                  <td className="cell-consecutivo">
                    <span className="consecutivo-badge">{req.consecutivo || req.id}</span>
                  </td>
                  <td className="cell-solicitante">
                    <div className="solicitante-info">
                      <span className="solicitante-nombre">{req.nombreSolicitante}</span>
                      {req.coordinador_email && (
                        <span className="solicitante-email">{req.coordinador_email}</span>
                      )}
                    </div>
                  </td>
                  <td className="cell-empresa">{req.empresa}</td>
                  <td className="cell-proceso">{req.proceso}</td>
                  <td className="cell-fecha">
                    {new Date(req.fechaCreacion).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="cell-estado">
                    <span className={`status-badge ${req.estado}`}>
                      {formatEstadoLabel(req.estado)}
                    </span>
                  </td>
                  <td className="cell-acciones">
                    <div className="table-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => setShowDetailModal({ open: true, req })}
                        title="Ver detalles"
                      >
                        <Eye className="action-icon" size={16} />
                      </button>
                      
                      {/* Botón Completar - solo cuando está aprobada */}
                      {req.estado === 'aprobada' && (
                        <button
                          onClick={(e) => updateRequisitionStatus(req.id, 'completada', e)}
                          className="action-btn close-btn"
                          disabled={!!isUpdating && isUpdating === req.id}
                          title="Completar requisición"
                        >
                          <X className="action-icon" size={16} />
                        </button>
                      )}
                      
                      {/* Botones de acción - solo cuando NO está aprobada, rechazada o completada */}
                      {req.estado !== 'aprobada' && req.estado !== 'rechazada' && req.estado !== 'completada' && (
                        <>
                          {/* Pasar a En gestión (solo desde pendiente) */}
                          {req.estado === 'pendiente' && (
                            <button
                              onClick={(e) => updateRequisitionStatus(req.id, 'en_gestion', e)}
                              className="action-btn warning-btn"
                              disabled={!!isUpdating && isUpdating === req.id}
                              title="Poner en gestión"
                            >
                              <Clock className="action-icon" size={16} />
                            </button>
                          )}

                          <button
                            onClick={(e) => updateRequisitionStatus(req.id, 'aprobada', e)}
                            className="action-btn approve-btn"
                            disabled={!!isUpdating && isUpdating === req.id}
                            title="Aprobar"
                          >
                            <CheckCircle className="action-icon" size={16} />
                          </button>
                          
                          <button
                            onClick={(e) => updateRequisitionStatus(req.id, 'rechazada', e)}
                            className="action-btn reject-btn"
                            disabled={!!isUpdating && isUpdating === req.id}
                            title="Rechazar"
                          >
                            <X className="action-icon" size={16} />
                          </button>
                          
                          <button
                            onClick={(e) => updateRequisitionStatus(req.id, 'correccion', e)}
                            className="action-btn warning-btn"
                            disabled={!!isUpdating && isUpdating === req.id}
                            title="Solicitar corrección"
                          >
                            <AlertCircle className="action-icon" size={16} />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => openHistory(req.id)}
                        className="action-btn history-btn"
                        title="Ver historial"
                        type="button"
                      >
                        <History className="action-icon" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRequisiciones.length === 0 && (
            <div className="no-requisitions">
              {selectedEmpresa ? 'No hay requisiciones para esta empresa' : 'No hay requisiciones registradas'}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PARA GENERAR REPORTE CON FILTROS */}
      {showReportModal && (
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
            backgroundColor: '#111111',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            width: '100%',
            maxWidth: '32rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #BFA181'
          }}>
            {/* Encabezado */}
            <div style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #BFA181' }} className="text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold" style={{ color: '#BFA181' }}>Generar Reporte PDF</h2>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportFilterMes('');
                    setReportFilterEmpresa('');
                    setReportFilterProceso('');
                    setReportFilterEstado('');
                    setPdfReportError(null);
                  }}
                  className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1"
                  disabled={isSendingReport}
                  aria-label="Cerrar modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-1 text-gray-400 text-sm">
                Seleccione los filtros para generar el reporte. Deje vacío para incluir todas las requisiciones.
              </p>
            </div>

            {/* Cuerpo del formulario */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto" style={{ backgroundColor: '#111111' }}>
              {/* Filtro por Mes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Mes
                </label>
                {supportsMonthInput ? (
                  <input
                    type="month"
                    value={reportFilterMes}
                    onChange={(e) => setReportFilterMes(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg transition-colors text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent month-input-enhanced"
                    style={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #3a3a3a', 
                      colorScheme: 'dark'
                    }}
                    disabled={isSendingReport}
                  />
                ) : (
                  // Fallback para navegadores que no soportan type="month" (Edge antiguo)
                  <div className="flex space-x-2">
                    <select
                      value={fallbackYear}
                      onChange={(e) => setFallbackYear(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg transition-colors text-white"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                      disabled={isSendingReport}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <option key={year} value={year}>{year}</option>
                        );
                      })}
                    </select>
                    <select
                      value={fallbackMonth}
                      onChange={(e) => setFallbackMonth(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg transition-colors text-white"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                      disabled={isSendingReport}
                    >
                      <option value="01">Enero</option>
                      <option value="02">Febrero</option>
                      <option value="03">Marzo</option>
                      <option value="04">Abril</option>
                      <option value="05">Mayo</option>
                      <option value="06">Junio</option>
                      <option value="07">Julio</option>
                      <option value="08">Agosto</option>
                      <option value="09">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Filtro por Empresa */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Empresa
                </label>
                <select
                  value={reportFilterEmpresa}
                  onChange={(e) => setReportFilterEmpresa(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition-colors text-white"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                  disabled={isSendingReport}
                >
                  <option value="">Todas las empresas</option>
                  {empresas.map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Proceso */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Proceso
                </label>
                <select
                  value={reportFilterProceso}
                  onChange={(e) => setReportFilterProceso(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition-colors text-white"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                  disabled={isSendingReport}
                >
                  <option value="">Todos los procesos</option>
                  {Array.from(new Set(requisiciones.map(r => r.proceso).filter(Boolean))).sort().map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Estado */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Estado
                </label>
                <select
                  value={reportFilterEstado}
                  onChange={(e) => setReportFilterEstado(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition-colors text-white"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                  disabled={isSendingReport}
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_gestion">En gestión</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="correccion">En corrección</option>
                  <option value="completada">Completada</option>
                </select>
              </div>

              {/* Resumen de filtros */}
              {(reportFilterMes || reportFilterEmpresa || reportFilterProceso || reportFilterEstado) && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#1a1a1a', border: '1px solid #BFA181' }}>
                  <p className="font-medium mb-1" style={{ color: '#BFA181' }}>Filtros seleccionados:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {reportFilterMes && <li>Mes: {reportFilterMes}</li>}
                    {reportFilterEmpresa && <li>Empresa: {reportFilterEmpresa}</li>}
                    {reportFilterProceso && <li>Proceso: {reportFilterProceso}</li>}
                    {reportFilterEstado && <li>Estado: {formatEstadoLabel(reportFilterEstado)}</li>}
                  </ul>
                </div>
              )}

              {/* Mensajes de estado */}
              {pdfReportError && (
                <div className="p-4 bg-red-100 border-2 border-red-400 text-red-800 rounded-lg flex items-start space-x-3 shadow-md">
                  <AlertCircle className="flex-shrink-0 w-6 h-6 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-semibold">No se pudo generar el reporte</p>
                    <p className="text-sm mt-1">{pdfReportError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pie del modal - Acciones */}
            <div className="px-6 py-4 flex justify-end space-x-3" style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #3a3a3a' }}>
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportFilterMes('');
                  setReportFilterEmpresa('');
                  setReportFilterProceso('');
                  setReportFilterEstado('');
                  setPdfReportError(null);
                }}
                disabled={isSendingReport}
                className="px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={(e) => handleGenerateReport(e)}
                disabled={isSendingReport}
                className={`px-4 py-2 text-sm font-medium text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isSendingReport
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: '#BFA181' }}
              >
                {isSendingReport ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Generar PDF
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ENVIAR REPORTE - DISEÑO OSCURO */}
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
            backgroundColor: '#111111',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            width: '100%',
            maxWidth: '28rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #BFA181'
          }}>
            {/* Encabezado */}
            <div style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #BFA181' }} className="text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold" style={{ color: '#BFA181' }}>Enviar Reporte por Correo</h2>
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
              <p className="mt-1 text-gray-400 text-sm">
                Complete los campos para enviar el reporte por correo electrónico.
              </p>
            </div>

            {/* Cuerpo del formulario */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto" style={{ backgroundColor: '#111111' }}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Correo electrónico <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition-colors text-white placeholder-gray-500"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                  placeholder="ejemplo@empresa.com"
                  disabled={isSendingReport}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Mensaje (opcional)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition-colors min-h-[100px] text-white placeholder-gray-500"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a' }}
                  placeholder="Escriba un mensaje personalizado..."
                  disabled={isSendingReport}
                  aria-label="Mensaje opcional para el correo"
                />
              </div>

              {/* Mensajes de estado */}
              {sendReportError && (
                <div className="p-4 bg-red-900/30 border border-red-500 text-red-300 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-400" />
                  <span className="text-sm">{sendReportError}</span>
                </div>
              )}
              
              {sendReportSuccess && (
                <div className="p-4 bg-green-900/30 border border-green-500 text-green-300 rounded-lg flex items-start space-x-3">
                  <CheckCircle className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-400" />
                  <span className="text-sm">{sendReportSuccess}</span>
                </div>
              )}
            </div>

            {/* Pie del modal - Acciones */}
            <div className="px-6 py-4 flex justify-end space-x-3" style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #3a3a3a' }}>
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
                className="px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleSendReport}
                disabled={isSendingReport || !recipientEmail}
                className={`px-4 py-2 text-sm font-medium text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isSendingReport || !recipientEmail
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: '#BFA181' }}
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
                  {formatEstadoLabel(showDetailModal.req.estado)}
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

              {showDetailModal.req.justificacion && (
                <div className="detail-item-full">
                  <label>Justificación:</label>
                  <p>{showDetailModal.req.justificacion}</p>
                </div>
              )}

              <div className="detail-item-full">
                <label>Justificación de TI:</label>
                <p className="justification-ti">
                  {showDetailModal.req.justificacion_ti ? (
                    <span className="justification-text">{showDetailModal.req.justificacion_ti}</span>
                  ) : (
                    <span className="no-justification">No se ha especificado una justificación de TI</span>
                  )}
                </p>
              </div>

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

                      {/* Motivo de corrección (comentario_rechazo) */}
                      {showDetailModal.req.comentarioRechazo && (
                        <div className="alert-message">
                          <p className="label">
                            {showDetailModal.req.estado === 'correccion'
                              ? 'Motivo de corrección:'
                              : 'Motivo de corrección (previo):'}
                          </p>
                          <p className="message">{showDetailModal.req.comentarioRechazo}</p>
                        </div>
                      )}

                      {/* Motivo de rechazo final (comentario_rechazo_f) solo cuando está rechazada */}
                      {showDetailModal.req.estado === 'rechazada' && showDetailModal.req.comentarioRechazoFinal && (
                        <div className="alert-message mt-2">
                          <p className="label">Motivo de rechazo final:</p>
                          <p className="message">{showDetailModal.req.comentarioRechazoFinal}</p>
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


              {showDetailModal.req.archivos && showDetailModal.req.archivos.length > 0 ? (
                <div className="detail-item-full">
                  <label>Archivos adjuntos</label>
                  <div className="file-previews space-y-3">
                    {showDetailModal.req.archivos.map((archivo, index) => {
                      const isPDF = archivo.tipo_mime === 'application/pdf';
                      
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
                                {archivo.nombre_archivo}
                              </span>
                              <span className="file-type text-sm text-gray-500">
                                {archivo.tipo_mime} • {(archivo.tamano / 1024).toFixed(1)} KB
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
                                          <iframe src="${archivo.url}" type="${archivo.tipo_mime}">
                                            <p>Tu navegador no soporta la visualización de PDFs. 
                                            <a href="${archivo.url}">Descarga el PDF</a>.</p>
                                          </iframe>
                                        </body>
                                      </html>
                                    `;
                                    pdfWindow.document.open();
                                    pdfWindow.document.write(html);
                                    pdfWindow.document.close();
                                  }
                                } else {
                                  window.open(archivo.url, '_blank');
                                }
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                            >
                              Ver
                            </button>
                            <a
                              href={archivo.url}
                              download={archivo.nombre_archivo}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm inline-block"
                              target="_blank"
                              rel="noopener noreferrer"
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
      
