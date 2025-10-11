"use client";

import type { Requisition, ArchivoAdjunto } from "@/types/requisition";
import "../styles/RequisitionDetails.css";

interface RequisitionDetailsProps {
  requisition: Requisition;
  onClose: () => void;
}

export default function RequisitionDetails({ requisition, onClose }: RequisitionDetailsProps) {
  const formatDate = (timestamp: number | Date | string) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  const getStatusClass = () => {
    return "status-pending";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del modal */}
        <div className="modal-header">
          <h3>Detalles de Requisición</h3>
          <button onClick={onClose} className="close-button">
            &times;
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="modal-body">
          <div className="req-header">
            <span className="req-consecutivo">{requisition.consecutivo}</span>
            <span className={`status-badge ${getStatusClass()}`}>Pendiente</span>
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

          {/* Sección de archivos adjuntos */}
          {requisition.archivos && requisition.archivos.length > 0 ? (
            <div className="detail-item-full">
              <label>Archivos adjuntos</label>
              <div className="file-previews">
                {requisition.archivos.map((archivo: ArchivoAdjunto, index: number) => (
                  <div key={index} className="file-item">
                    <div className="file-item-header">
                      <div className="file-icon pdf">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="file-info">
                        <span className="file-name">{archivo.nombre_archivo}</span>
                        <span className="file-type">{archivo.tipo_mime}</span>
                      </div>
                    </div>

                    <div className="file-actions">
                      {/* Botón de visualización */}
                      <button
                        type="button"
                        onClick={() => {
                          const pdfWindow = window.open("", "_blank");
                          if (pdfWindow) {
                            const html = `
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>${archivo.nombre_archivo}</title>
                                  <style>
                                    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                                    iframe { width: 100%; height: 100%; border: none; }
                                    .pdf-container { position: relative; width: 100%; height: 100vh; }
                                    .pdf-toolbar { 
                                      position: fixed; 
                                      top: 0; 
                                      left: 0; 
                                      right: 0; 
                                      background: #f5f5f5; 
                                      padding: 10px; 
                                      text-align: right; 
                                      z-index: 1000;
                                      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    }
                                    .pdf-content { 
                                      padding-top: 50px; 
                                      height: calc(100% - 50px); 
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="pdf-toolbar">
                                    <a href="${archivo.url}" download="${archivo.nombre_archivo}" class="btn btn-primary">
                                      Descargar PDF
                                    </a>
                                  </div>
                                  <div class="pdf-content">
                                    <iframe src="${archivo.url}" type="${archivo.tipo_mime}">
                                      <p>Tu navegador no soporta la visualización de PDFs. 
                                      <a href="${archivo.url}" download>Descarga el PDF</a>.</p>
                                    </iframe>
                                  </div>
                                </body>
                              </html>
                            `;
                            pdfWindow.document.open();
                            pdfWindow.document.write(html);
                            pdfWindow.document.close();
                          }
                        }}
                        className="btn btn-outline"
                      >
                        Ver
                      </button>

                      {/* Botón de descarga */}
                      <a
                        href={archivo.url}
                        download={archivo.nombre_archivo}
                        className="btn btn-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Descargar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : requisition.imagenes && requisition.imagenes.length > 0 ? (
            <div className="detail-item-full">
              <label>Archivos adjuntos (legado)</label>
              <div className="file-previews">
                {requisition.imagenes.map((imagen: string, index: number) => (
                  <div key={index} className="file-item">
                    <div className="file-item-header">
                      <div className="file-icon pdf">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="file-info">
                        <span className="file-name">Documento {index + 1}.pdf</span>
                        <span className="file-type">PDF</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        type="button"
                        onClick={() => {
                          const pdfWindow = window.open('', '_blank');
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
                                <iframe src="${imagen}" type="application/pdf">
                                  <p>Tu navegador no soporta la visualización de PDFs. <a href="${imagen}" download>Descarga el PDF</a>.</p>
                                </iframe>
                              </body>
                              </html>
                            `;
                            
                            pdfWindow.document.open();
                            pdfWindow.document.write(html);
                            pdfWindow.document.close();
                          }
                        }}
                        className="btn btn-primary"
                      >
                        Ver PDF
                      </button>
                      <a
                        href={imagen}
                        download={`Documento_${requisition.consecutivo}_${index + 1}.pdf`}
                        className="btn btn-secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Descargar
                      </a>
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
        </div>

        {/* Pie del modal */}
        <div className="modal-footer">
          <span>Creada: {formatDate(requisition.fechaCreacion)}</span>
          <span>Actualizada: {formatDate(Date.now())}</span>
        </div>
      </div>
    </div>
  );
}
