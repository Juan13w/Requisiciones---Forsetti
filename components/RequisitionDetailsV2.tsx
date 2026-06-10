"use client";

import { useEffect, useState } from "react";
import type { Requisition, ArchivoAdjunto } from "@/types/requisition";
import "../styles/RequisitionDetails.css";

interface ActaResumen {
  id: number;
  estado: "borrador" | "generada" | "enviada" | "recibida";
  pdf_url: string | null;
  fecha_entrega: string | null;
  ciudad: string | null;
  observaciones: string | null;
  recibido_por_nombre: string | null;
  recibido_por_cargo: string | null;
  fecha_recibido: string | null;
}

interface RequisitionDetailsV2Props {
  requisition: Requisition;
  onClose: () => void;
}

export default function RequisitionDetailsV2({ requisition, onClose }: RequisitionDetailsV2Props) {
  const [acta, setActa] = useState<ActaResumen | null>(null);
  const [actaCargando, setActaCargando] = useState(true);

  const aprobadoPor: string | null = (requisition as any).aprobadoPor ?? null;
  const rechazadoPor: string | null = (requisition as any).rechazadoPor ?? null;

  useEffect(() => {
    const fetchActa = async () => {
      try {
        const res = await fetch(`/api/actas/requisicion/${requisition.id}`, { credentials: "include" });
        if (!res.ok) { setActaCargando(false); return; }
        const data = await res.json();
        setActa(data.acta);
      } catch {
        // silencioso
      } finally {
        setActaCargando(false);
      }
    };
    fetchActa();
  }, [requisition.id]);

  const formatDate = (timestamp: number | Date | string) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("es-ES", { day: "numeric", month: "numeric", year: "numeric" });
  };

  const getStatusClass = () => {
    const s = (requisition.estado || "").toString().toLowerCase();
    switch (s) {
      case "aprobada":   return "status-aprobado";
      case "rechazada":  return "status-rechazado";
      case "completada":
      case "cerrada":    return "status-completado";
      case "correccion": return "status-correccion";
      case "en_gestion":
      case "en gestion":
      case "en gestión": return "status-pendiente";
      default:           return "status-pending";
    }
  };

  const formatStatusText = () => {
    const s = (requisition.estado || "").toString().toLowerCase();
    switch (s) {
      case "aprobada":   return "Aprobada";
      case "rechazada":  return "Rechazada";
      case "completada":
      case "cerrada":    return "Completada";
      case "correccion": return "En corrección";
      case "en_gestion":
      case "en gestion":
      case "en gestión": return "En gestión";
      default:           return "Pendiente";
    }
  };

  const estado = (requisition.estado || "").toLowerCase();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalles de Requisición</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>

        <div className="modal-body">
          <div className="req-header">
            <span className="req-consecutivo">{requisition.consecutivo}</span>
            <span className={`status-badge ${getStatusClass()}`}>{formatStatusText()}</span>
          </div>

          <div className="req-details-grid">
            <div className="detail-item">
              <label>Holding:</label>
              <p>{requisition.empresa}</p>
            </div>
            <div className="detail-item">
              <label>Fecha de Solicitud:</label>
              <p>{formatDate(requisition.fechaSolicitud)}</p>
            </div>
            <div className="detail-item">
              <label>Nombre del Solicitante:</label>
              <p>{requisition.nombreSolicitante}</p>
            </div>
            <div className="detail-item">
              <label>Proceso Solicitante:</label>
              <p>{requisition.proceso}</p>
            </div>
          </div>

          {/* Aprobado por */}
          {(estado === 'aprobada' || aprobadoPor) && (
            <div className="detail-item-full">
              <label>Aprobado por:</label>
              <p style={{ color: aprobadoPor ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                {aprobadoPor || 'No registrado'}
              </p>
            </div>
          )}

          {/* Rechazado por */}
          {(estado === 'rechazada' || rechazadoPor) && (
            <div className="detail-item-full">
              <label>Rechazado por:</label>
              <p style={{ color: rechazadoPor ? '#dc2626' : '#94a3b8', fontWeight: 500 }}>
                {rechazadoPor || 'No registrado'}
              </p>
            </div>
          )}

          {(estado === 'rechazada' || estado === 'correccion') && (
            <div className="status-alert">
              <div className="alert-content">
                <div className="alert-details">
                  <h4>{estado === 'rechazada' ? 'Requisición rechazada' : 'Requisición en corrección'}</h4>
                  {requisition.comentarioRechazo && (
                    <div className="alert-message">
                      <p className="label">{estado === 'correccion' ? 'Motivo de corrección:' : 'Motivo de corrección (previo):'}</p>
                      <p className="message">{requisition.comentarioRechazo}</p>
                    </div>
                  )}
                  {estado === 'rechazada' && requisition.comentarioRechazoFinal && (
                    <div className="alert-message">
                      <p className="label">Motivo de rechazo final:</p>
                      <p className="message">{requisition.comentarioRechazoFinal}</p>
                    </div>
                  )}
                  {requisition.fechaUltimoRechazo && (
                    <p className="alert-timestamp">{new Date(requisition.fechaUltimoRechazo).toLocaleString('es-ES')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="detail-item-full">
            <label>Descripción del Producto:</label>
            <p>{requisition.descripcion}</p>
          </div>
          <div className="detail-item-full">
            <label>Cantidad:</label>
            <p>{requisition.cantidad}</p>
          </div>
          <div className="detail-item-full">
            <label>Justificación:</label>
            <p>{requisition.justificacion}</p>
          </div>
          <div className="detail-item-full">
            <label>Justificación de TI:</label>
            <p className="justification-ti">
              {requisition.justificacion_ti
                ? <span className="justification-text">{requisition.justificacion_ti}</span>
                : <span className="no-justification">No se ha especificado una justificación de TI</span>}
            </p>
          </div>

          {requisition.archivos && requisition.archivos.length > 0 ? (
            <div className="detail-item-full">
              <label>Archivos adjuntos</label>
              <div className="file-previews">
                {requisition.archivos.map((archivo: ArchivoAdjunto, index: number) => (
                  <div key={index} className="file-item">
                    <div className="file-item-header">
                      <div className="file-icon pdf">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="file-info">
                        <span className="file-name">{archivo.nombre_archivo}</span>
                        <span className="file-type">{archivo.tipo_mime}</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button type="button" className="btn btn-outline"
                        onClick={() => {
                          const w = window.open("", "_blank");
                          if (w) { w.document.write(`<!DOCTYPE html><html><head><title>${archivo.nombre_archivo}</title><style>body,html{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${archivo.url}" type="${archivo.tipo_mime}"></iframe></body></html>`); w.document.close(); }
                        }}>Ver</button>
                      <a href={archivo.url} download={archivo.nombre_archivo} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Descargar</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="detail-item-full">
              <label>Archivos adjuntos</label>
              <p>No hay documentos adjuntos</p>
            </div>
          )}

          {/* Acta de entrega */}
          {actaCargando ? (
            <div className="detail-item-full">
              <label>Acta de Entrega</label>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Consultando acta...</p>
            </div>
          ) : acta ? (
            <div className="detail-item-full">
              <label>Acta de Entrega</label>
              <div className="acta-resumen">
                <div className="acta-resumen-header">
                  <span className={`acta-estado-badge acta-estado-${acta.estado}`}>
                    {acta.estado === "borrador" && "En borrador"}
                    {acta.estado === "generada" && "Generada"}
                    {acta.estado === "enviada" && "Enviada para firma"}
                    {acta.estado === "recibida" && "Firmada y recibida"}
                  </span>
                  {acta.fecha_entrega && <span className="acta-fecha">Fecha de entrega: {formatDate(acta.fecha_entrega)}</span>}
                </div>
                {acta.estado === "recibida" && acta.recibido_por_nombre && (
                  <div className="acta-recibido-info">
                    <p><strong>Recibido por:</strong> {acta.recibido_por_nombre}{acta.recibido_por_cargo && ` — ${acta.recibido_por_cargo}`}</p>
                    {acta.fecha_recibido && <p><strong>Fecha de recibo:</strong> {new Date(acta.fecha_recibido).toLocaleString("es-ES")}</p>}
                  </div>
                )}
                {acta.observaciones && <p className="acta-observaciones"><strong>Observaciones:</strong> {acta.observaciones}</p>}
                {acta.pdf_url && (
                  <div className="acta-acciones">
                    <button type="button" className="btn btn-outline"
                      onClick={() => {
                        const w = window.open("", "_blank");
                        if (w) { w.document.write(`<!DOCTYPE html><html><head><title>Acta de Entrega</title><style>body,html{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${acta.pdf_url}" type="application/pdf"></iframe></body></html>`); w.document.close(); }
                      }}>Ver Acta</button>
                    <a href={acta.pdf_url} download={`Acta_${requisition.consecutivo}.pdf`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Descargar Acta</a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="detail-item-full">
              <label>Acta de Entrega</label>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>No hay acta de entrega registrada para esta requisición.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span>Creada: {formatDate(requisition.fechaCreacion)}</span>
          <span>Actualizada: {formatDate(Date.now())}</span>
        </div>
      </div>
    </div>
  );
}
