"use client"

import type React from "react"

import { useState, useRef, type ChangeEvent, useEffect, useCallback } from "react"
import type { Requisition } from "@/types/requisition"
import { AutoCompleteInput } from "./ui/AutoCompleteInput"

// Definir un tipo para los datos del formulario que incluye el estado como opcional
type RequisitionFormData = Omit<Requisition, "id" | "fechaCreacion" | "fechaUltimaModificacion" | "fechaUltimoRechazo" | "intentosRevision"> & {
  imagenes: string[];
  comentarioRechazo?: string;
  justificacion_ti: string;
};

interface RequisitionFormProps {
  onSave: (requisition: RequisitionFormData) => void;
  onCancel: () => void;
  initialData?: RequisitionFormData;
}

export default function RequisitionForm({ onSave, onCancel, initialData }: RequisitionFormProps) {
  // Función para obtener la fecha actual en formato YYYY-MM-DD (compatible con input type="date")
  const getCurrentDateTime = () => {
    const now = new Date();
    // Ajustar por la zona horaria local
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return localDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<RequisitionFormData>(() => {
    // Si hay initialData, usarlo, de lo contrario crear datos por defecto
    if (initialData) {
      return {
        consecutivo: initialData.consecutivo || `REQ-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        empresa: initialData.empresa || "",
        fechaSolicitud: initialData.fechaSolicitud || getCurrentDateTime(),
        nombreSolicitante: initialData.nombreSolicitante || "",
        proceso: initialData.proceso || "",
        justificacion: initialData.justificacion || "",
        justificacion_ti: initialData.justificacion_ti || "",
        descripcion: initialData.descripcion || "",
        cantidad: initialData.cantidad || 1,
        imagenes: initialData.imagenes || [],
        comentarioRechazo: initialData.comentarioRechazo || "",
        estado: initialData.estado || 'pendiente',
      };
    }
    
    // Datos por defecto para una nueva requisición
    return {
      consecutivo: `REQ-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      empresa: "",
      fechaSolicitud: getCurrentDateTime(),
      nombreSolicitante: "",
      proceso: "",
      justificacion: "",
      justificacion_ti: "",
      descripcion: "",
      cantidad: 1,
      imagenes: [],
      comentarioRechazo: "",
      estado: 'pendiente',
    };
  });

  // Actualizar la hora de la solicitud justo antes de guardar
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!formData.descripcion?.trim()) {
      alert("La descripción es requerida");
      return;
    }
    if (!formData.proceso?.trim()) {
      alert("El proceso es requerido");
      return;
    }
    if (!formData.cantidad || formData.cantidad <= 0) {
      alert("La cantidad debe ser mayor a cero");
      return;
    }
    
    // Actualizar la fecha de solicitud con la hora actual justo antes de guardar
    const updatedFormData = {
      ...formData,
      fechaSolicitud: getCurrentDateTime(),
      estado: formData.estado || 'pendiente'
    };
    
    // Llamar a la función onSave con los datos actualizados
    onSave(updatedFormData);
  };

  // Lista de empresas disponibles
  const empresasDisponibles = ["SCI", "EMTRA", "INPROSALUD", "SIMADRID", "EMTRASUR", "INCORPORANDO", "OTRA_EMPRESA"]; // Ajusta según tus necesidades
  
  // Cargar datos del usuario desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const usuarioData = localStorage.getItem('usuarioData');
    if (usuarioData) {
      try {
        const user = JSON.parse(usuarioData);
        console.log('Datos de usuario encontrados:', user);
        
        // Verificar si el usuario es un coordinador con empresa asignada
        const isCoordinatorWithCompany = user.rol === 'coordinador' && user.empresa;
        const isSpecialUser = user.email === 'rulexor.monasterios@solucionescorp.com.co' || user.empresa === 'multiple';
        
        // Actualizar el estado del formulario
        setFormData(prev => {
          // Si el usuario es especial o tiene empresa 'multiple', no establecer la empresa automáticamente
          // pero si es 'multiple', establecer la primera empresa como valor predeterminado
          const empresaValue = isSpecialUser && user.empresa === 'multiple' 
            ? empresasDisponibles[0] || '' 
            : (isCoordinatorWithCompany && !isSpecialUser ? user.empresa : prev.empresa);
            
          return {
            ...prev,
            nombreSolicitante: user.email || '',
            empresa: empresaValue
          };
        });
        
        console.log('Estado del formulario actualizado:', {
          email: user.email,
          rol: user.rol,
          empresa: user.empresa,
          isSpecialUser,
          shouldSetCompany: isCoordinatorWithCompany && !isSpecialUser
        });
      } catch (error) {
        console.error('Error al procesar los datos del usuario:', error);
      }
    } else {
      console.log('No se encontraron datos de usuario en localStorage');
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? Number.parseInt(value) || 0 : value,
    }))
  }


  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const MAX_FILE_SIZE = 800 * 1024; // 800KB
    const files = Array.from(e.target.files);

    // Validate file type
    const invalidFiles = files.filter((file) => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      alert('Solo se permiten archivos en formato PDF');
      return;
    }

    // Validate file size
    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert('Algunos archivos superan el tamaño máximo de 800KB');
      return;
    }

    const filePromises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error('Error al leer el archivo'));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(filePromises)
      .then((newFiles) => {
        setFormData((prev) => ({
          ...prev,
          imagenes: [...prev.imagenes, ...newFiles],
        }));
      })
      .catch((error) => {
        console.error('Error al cargar los archivos:', error);
        alert('Error al cargar uno o más archivos');
      });
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index),
    }))
  }

  // Estilos comunes para los inputs
  const inputClass =
    "w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"
  const buttonClass = `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
  }`

  return (
    <div className="requisition-form-container fade-in overflow-hidden">
      <div className="encabezado-requisition-form">
      {/* Columna 1: Info */}
      <div className="info-requisition-form">
        <p><strong>Controlado:</strong> SI</p>
        <p><strong>Código:</strong> LO-FO12</p>
        <p><strong>Vigencia:</strong> 2025-07-03</p>
        <p><strong>Versión:</strong> 03</p>
      </div>

      {/* Columna 2: Título */}
      <div className="titulo-requisition-form">
        <h2>REQUISICIÓN DE COMPRAS</h2>
      </div>

      {/* Columna 3: Logo */}
      <div className="logo-requisition-form">
        <img src="/images/imagenes/logo4.png" alt="Logo SC" />
      </div>
    </div>
    
    <div className="justify-content-center py-4 w-100">
      
    </div>


      
      <div className="form-content p-6">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Consecutivo</label>
              <input
                type="text"
                name="consecutivo"
                value={formData.consecutivo}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="Ej: REQ-2023-001"
              />
            </div>
  
            <div className="form-field">
              <label className="form-label">Empresa</label>
              {formData.nombreSolicitante === 'rulexor.monasterios@solucionescorp.com.co' || (formData.empresa && localStorage.getItem('usuarioData') && JSON.parse(localStorage.getItem('usuarioData') || '{}').empresa === 'multiple') ? (
                <select
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  className="form-input w-full"
                  required
                >
                  <option value="">Seleccione una empresa</option>
                  {empresasDisponibles.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp.charAt(0).toUpperCase() + emp.slice(1)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="empresa"
                  value={formData.empresa}
                  readOnly
                  className="form-input bg-gray-100 cursor-not-allowed w-full"
                />
              )}
            </div>
              <div className="form-field">
              <label className="form-label">Fecha de Solicitud</label>
              <div className="relative">
                <input
                  type="date"
                  name="fechaSolicitud"
                  value={formData.fechaSolicitud}
                  onChange={handleChange}
                  className="form-input bg-gray-100 cursor-not-allowed"
                  readOnly
                  required
                />
              </div>

             
           <div className="mt-1">
             <span className="info-text">La fecha se establece automáticamente</span>
           </div>
        </div>

            {/* Campo oculto para el nombre del solicitante */}
            <input
              type="hidden"
              name="nombreSolicitante"
              value={formData.nombreSolicitante}
            />
  
            <div className="form-field">
              <label className="form-label">Proceso</label>
              <select
                name="proceso"
                value={formData.proceso}
                onChange={handleChange}
                className="form-input w-full"
                required
              >
                <option value="">Seleccione un proceso</option>
                <option value="LOGISTICA">LOGISTICA</option>
                <option value="TRANSITO XPRESS">TRANSITO XPRESS</option>
                <option value="COMERCIAL">COMERCIAL</option>
                <option value="SST - CALIDAD">SST - CALIDAD</option>
                <option value="FINANCIERA">FINANCIERA</option>
                <option value="ALMACEN">ALMACEN</option>
                <option value="PRODUCCION">PRODUCCION</option>
                <option value="TESORERIA">TESORERIA</option>
                <option value="GESTION HUMANA">GESTION HUMANA</option>
                <option value="MARKETING">MARKETING</option>
                <option value="LEGAL">LEGAL</option>
                <option value="DOCUMENTAL">DOCUMENTAL</option>
                <option value="SERVICIOS GENERALES">SERVICIOS GENERALES</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="TRANSITO Y TRANSPORTE">TRANSITO Y TRANSPORTE</option>
                <option value="OPERACIONES">OPERACIONES</option>
                <option value="IN HOUSE">IN HOUSE</option>
                <option value="INNOVACION TECNOLOGIA">INNOVACION TECNOLOGIA</option>
                <option value="GERENCIA">GERENCIA</option>
                <option value="ESCUELAS DE CONDUCCION">ESCUELAS DE CONDUCCION</option>
              </select>
            </div>
  
            <div className="form-field">
              <label className="form-label">Justificación</label>
              <textarea
                name="justificacion"
                value={formData.justificacion}
                onChange={handleChange}
                className="form-input form-textarea"
                required
                rows={3}
                placeholder="Describa la justificación de la solicitud"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Justificación de TI</label>
              <select
                name="justificacion_ti"
                value={formData.justificacion_ti}
                onChange={handleChange}
                className="form-input w-full"
              >
                <option value="">Seleccione una opción</option>
                <option value="Deterioro">Deterioro</option>
                <option value="Daño">Daño</option>
                <option value="Cargo nuevo">Cargo nuevo</option>
                <option value="Cargo de reemplazo">Cargo de reemplazo</option>
              </select>
            </div>
  
            <div className="form-field full-width">
              <label className="form-label">Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="form-input form-textarea"
                required
                placeholder="Proporciona una descripción detallada"
              />
            </div>
          </div>
  
          {/* Comentario de rechazo */}
          {(() => {
            const estadoActual = formData.estado || initialData?.estado;
            const comentarioRechazo =
              formData.comentarioRechazo || initialData?.comentarioRechazo;
  
            if (
              comentarioRechazo &&
              (estadoActual === "correccion" || estadoActual === "rechazada")
            ) {
              return (
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5"></div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {estadoActual === "correccion"
                          ? "Se requiere corrección"
                          : "Comentario de Rechazo"}
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{comentarioRechazo}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
  
          <div className="images-section">
            <label className="form-label">Imágenes Adjuntas</label>
  
            <div className="upload-container">
              <div className="upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  multiple
                  accept=".pdf,application/pdf"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="upload-label">
                  <div className="upload-content">
                    <svg
                      className="upload-icon"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                        fill="#3B82F6"
                      />
                      <path d="M14 2V8H20" fill="#93C5FD" />
                      <path
                        d="M16 13H8V11H16V13ZM16 17H8V15H16V17ZM13 9H8V7H13V9Z"
                        fill="white"
                      />
                    </svg>
                    <span>Haz clic o arrastra archivos PDF aquí</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Tamaño máximo por archivo: 800KB
                    </p>
                  </div>
                </label>
  
                {formData.imagenes.length > 0 && (
                  <div className="file-previews mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Archivos cargados:
                    </h4>
                    <div className="space-y-2">
                      {formData.imagenes.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            
                            <span className="text-sm text-gray-700">
                              Documento {index + 1}.pdf
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Create a blob URL for the PDF
                                const pdfWindow = window.open('', '_blank');
                                if (pdfWindow) {
                                  const iframe = document.createElement('iframe');
                                  iframe.style.width = '100%';
                                  iframe.style.height = '100%';
                                  iframe.src = file;
                                  
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
                                        <p>Tu navegador no soporta la visualización de PDFs. <a href="${file}">Descarga el PDF</a>.</p>
                                      </iframe>
                                    </body>
                                    </html>
                                  `;
                                  
                                  pdfWindow.document.open();
                                  pdfWindow.document.write(html);
                                  pdfWindow.document.close();
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-2 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                              title="Ver documento"
                            >
                              Ver
                            </button>
                            <a
                              href={file}
                              download={`documento-${index + 1}.pdf`}
                              className="text-green-600 hover:text-green-800 text-sm font-medium mr-2 px-3 py-1 border border-green-600 rounded hover:bg-green-50 transition-colors"
                              title="Descargar documento"
                            >
                              Descargar
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                              title="Eliminar documento"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
  
          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="form-button cancel"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
  
            <button
              type="submit"
              className="form-button submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {initialData ? "Actualizar" : "Guardar"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


