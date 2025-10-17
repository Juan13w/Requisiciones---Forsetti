export interface ArchivoAdjunto {
  archivo_id: number;
  nombre_archivo: string;
  tipo_mime: string;
  tamano: number;
  fecha_creacion: string;
  url: string;
  descargarUrl?: string;
}

export interface Requisition {
  id: string;
  consecutivo: string;
  empresa: string;
  fechaSolicitud: string;
  nombreSolicitante: string;
  proceso: string;
  justificacion: string;
  justificacion_ti?: string; // Nuevo campo para justificación de TI
  descripcion: string;
  cantidad: number;
  imagenes?: string[]; // Mantenemos esto por compatibilidad
  archivos?: ArchivoAdjunto[]; // Propiedad para los archivos adjuntos
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'correccion';
  fechaCreacion: number; // timestamp
  intentosRevision?: number;
  comentarioRechazo?: string;
  fechaUltimoRechazo?: string;
  fechaUltimaModificacion?: string;
}
