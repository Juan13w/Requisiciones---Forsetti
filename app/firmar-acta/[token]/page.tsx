'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface ActaInfo {
  consecutivo: string;
  cliente: string;
  fecha: string;
  ciudad: string;
  observaciones: string | null;
  entregadoPorNombre: string;
  entregadoPorCargo: string;
  formato: { codigo: string; version: string; vigencia: string };
  items: { codigo_articulo: string; descripcion: string; cantidad: number }[];
  firmaGuardada: { nombre: string; cargo: string; firmaUrl: string } | null;
}

type Estado = 'cargando' | 'listo' | 'firmando' | 'exito' | 'error' | 'invalido' | 'ya_firmado';

const BG = '#f5f5f5';
const WHITE = '#ffffff';
const GOLD = '#BFA181';
const TEXT = '#1a1a1a';
const TEXT_MUTED = '#666';
const BORDER = '#e0e0e0';
const GREEN = '#16a34a';
const RED = '#dc2626';
const BLUE = '#2563eb';

export default function FirmarActaPage() {
  const { token } = useParams<{ token: string }>();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [acta, setActa] = useState<ActaInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [dibujando, setDibujando] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);

  const [modo, setModo] = useState<'guardada' | 'dibujo' | 'archivo'>('dibujo');
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null);
  const [archivoDataUri, setArchivoDataUri] = useState<string | null>(null);
  const [archivoError, setArchivoError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/firmar-acta/${token}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setActa(data.data);
          const guardada = data.data.firmaGuardada;
          if (guardada) {
            setModo('guardada');
            if (guardada.nombre) setNombre(guardada.nombre);
            if (guardada.cargo) setCargo(guardada.cargo);
          }
          setEstado('listo');
        } else if (data.error?.includes('ya fue firmada')) {
          setEstado('ya_firmado');
        } else {
          setErrorMsg(data.error || 'Link inválido');
          setEstado('invalido');
        }
      })
      .catch(() => { setErrorMsg('Error de conexión'); setEstado('invalido'); });
  }, [token]);

  function getPosCanvas(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  }

  function iniciarTrazo(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setDibujando(true);
    lastPos.current = getPosCanvas(e);
  }

  function continuarTrazo(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!dibujando || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPosCanvas(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setTieneFirma(true);
  }

  function terminarTrazo() {
    setDibujando(false);
    lastPos.current = null;
  }

  function limpiarFirma() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setTieneFirma(false);
  }

  const FORMATOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024; // 5 MB

  function seleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoError('');

    if (!FORMATOS_PERMITIDOS.includes(file.type)) {
      setArchivoError('Formato no soportado. Usa PNG, JPG o WebP.');
      return;
    }
    if (file.size > MAX_ARCHIVO_BYTES) {
      setArchivoError('El archivo supera el tamaño máximo de 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setArchivoDataUri(dataUri);
      setArchivoPreview(dataUri);
    };
    reader.readAsDataURL(file);
  }

  function quitarArchivo() {
    setArchivoDataUri(null);
    setArchivoPreview(null);
    setArchivoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function confirmar() {
    if (!nombre.trim()) { alert('Por favor ingresa tu nombre completo.'); return; }
    if (!cargo.trim())  { alert('Por favor ingresa tu cargo.'); return; }

    let firmaBase64: string | undefined;
    if (modo === 'dibujo') {
      if (!tieneFirma) { alert('Por favor dibuja tu firma en el recuadro.'); return; }
      firmaBase64 = canvasRef.current!.toDataURL('image/png');
    } else if (modo === 'archivo') {
      if (!archivoDataUri) { alert('Por favor sube una imagen con tu firma.'); return; }
      firmaBase64 = archivoDataUri;
    }
    // modo === 'guardada': no se envía firmaBase64, el servidor reutiliza la firma
    // ya guardada en el perfil del coordinador.

    setEstado('firmando');

    try {
      const res = await fetch(`/api/firmar-acta/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cargo, firmaBase64, firmaOrigen: modo }),
      });
      const data = await res.json();
      if (data.success) {
        setEstado('exito');
      } else {
        setErrorMsg(data.error || 'Error al procesar la firma');
        setEstado('error');
      }
    } catch {
      setErrorMsg('Error de conexión al servidor');
      setEstado('error');
    }
  }

  const centeredPage = (content: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, padding: 16 }}>
      {content}
    </div>
  );

  const card = (content: React.ReactNode) => (
    <div style={{ background: WHITE, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
      {content}
    </div>
  );

  if (estado === 'cargando') {
    return centeredPage(
      <p style={{ color: TEXT_MUTED, fontSize: 16 }}>Cargando acta…</p>
    );
  }

  if (estado === 'ya_firmado') {
    return centeredPage(card(
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: TEXT, fontWeight: 700, fontSize: 22, margin: '0 0 8px' }}>Acta ya firmada</h2>
        <p style={{ color: TEXT_MUTED, margin: 0 }}>Esta acta ya fue confirmada anteriormente.</p>
      </>
    ));
  }

  if (estado === 'invalido') {
    return centeredPage(card(
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: TEXT, fontWeight: 700, fontSize: 22, margin: '0 0 8px' }}>Link inválido</h2>
        <p style={{ color: TEXT_MUTED, margin: 0 }}>{errorMsg}</p>
      </>
    ));
  }

  if (estado === 'exito') {
    return centeredPage(card(
      <>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: GREEN, fontWeight: 700, fontSize: 24, margin: '0 0 10px' }}>Recepción confirmada</h2>
        <p style={{ color: TEXT, margin: '0 0 6px' }}>
          El acta <strong>{acta?.consecutivo}</strong> ha sido firmada exitosamente.
        </p>
        <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>
          El equipo de compras recibirá una copia del acta firmada.
        </p>
      </>
    ));
  }

  if (estado === 'error') {
    return centeredPage(card(
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ color: RED, fontWeight: 700, fontSize: 22, margin: '0 0 8px' }}>Error</h2>
        <p style={{ color: TEXT_MUTED, margin: '0 0 20px' }}>{errorMsg}</p>
        <button
          onClick={() => setEstado('listo')}
          style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </>
    ));
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: TEXT,
    background: WHITE,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: TEXT_MUTED,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const sectionCard: React.CSSProperties = {
    background: WHITE,
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    padding: '24px',
    marginBottom: 20,
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingTop: 32, paddingBottom: 48, paddingLeft: 16, paddingRight: 16, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header de la empresa / acta */}
        <div style={{ ...sectionCard, borderTop: `4px solid ${GOLD}` }}>
          <h1 style={{ color: TEXT, fontWeight: 700, fontSize: 22, margin: '0 0 4px' }}>
            Acta de Entrega de Artículos
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: 13, margin: '0 0 20px' }}>
            Formato {acta?.formato.codigo} · Versión {acta?.formato.version} · Vigencia {acta?.formato.vigencia}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
            {[
              ['Consecutivo', acta?.consecutivo],
              ['Fecha', acta?.fecha],
              ['Ciudad', acta?.ciudad],
              ['Cliente / Proceso', acta?.cliente],
              ['Entregado por', acta?.entregadoPorNombre],
              ['Cargo entregador', acta?.entregadoPorCargo],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ fontWeight: 600, color: TEXT_MUTED }}>{k}: </span>
                <span style={{ color: TEXT }}>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla de ítems */}
        <div style={sectionCard}>
          <h2 style={{ color: TEXT, fontWeight: 600, fontSize: 15, margin: '0 0 14px' }}>Artículos entregados</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {['Código', 'Descripción', 'Cant.'].map((h) => (
                  <th key={h} style={{ border: `1px solid ${BORDER}`, padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: TEXT_MUTED, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acta?.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? WHITE : '#fafafa' }}>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '8px 10px', color: TEXT }}>{item.codigo_articulo || '—'}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '8px 10px', color: TEXT }}>{item.descripcion}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '8px 10px', color: TEXT, textAlign: 'center' }}>{item.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {acta?.observaciones && (
            <p style={{ marginTop: 12, fontSize: 13, color: TEXT_MUTED }}>
              <strong>Observaciones:</strong> {acta.observaciones}
            </p>
          )}
        </div>

        {/* Datos del receptor + firma */}
        <div style={sectionCard}>
          <h2 style={{ color: TEXT, fontWeight: 600, fontSize: 15, margin: '0 0 20px' }}>Confirmación de recepción</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cargo *</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Tu cargo"
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Firma digital *</label>

          {/* Selector de modo: firma guardada (si existe), dibujar o subir imagen */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, background: '#f0f0f0', borderRadius: 8, padding: 4 }}>
            {(acta?.firmaGuardada ? (['guardada', 'dibujo', 'archivo'] as const) : (['dibujo', 'archivo'] as const)).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: modo === m ? WHITE : 'transparent',
                  color: modo === m ? TEXT : TEXT_MUTED,
                  boxShadow: modo === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'guardada' ? '✅ Mi firma guardada' : m === 'dibujo' ? '✏️ Dibujar firma' : '📤 Subir imagen'}
              </button>
            ))}
          </div>

          {modo === 'guardada' ? (
            <>
              <div style={{ border: `2px solid ${GOLD}`, borderRadius: 10, overflow: 'hidden', background: '#fafafa', marginBottom: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={acta?.firmaGuardada?.firmaUrl} alt="Tu firma guardada" style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0 }}>
                Esta es la firma configurada en tu perfil. Se usará automáticamente — si quieres cambiarla, usa las pestañas &quot;Dibujar firma&quot; o &quot;Subir imagen&quot;.
              </p>
            </>
          ) : modo === 'dibujo' ? (
            <>
              <div style={{ border: `2px dashed ${tieneFirma ? GOLD : BORDER}`, borderRadius: 10, overflow: 'hidden', background: '#fafafa', marginBottom: 8 }}>
                <canvas
                  ref={canvasRef}
                  width={620}
                  height={160}
                  style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
                  onMouseDown={iniciarTrazo}
                  onMouseMove={continuarTrazo}
                  onMouseUp={terminarTrazo}
                  onMouseLeave={terminarTrazo}
                  onTouchStart={iniciarTrazo}
                  onTouchMove={continuarTrazo}
                  onTouchEnd={terminarTrazo}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: TEXT_MUTED, margin: 0 }}>Dibuja tu firma en el recuadro</p>
                <button
                  onClick={limpiarFirma}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: TEXT_MUTED, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Limpiar
                </button>
              </div>
            </>
          ) : (
            <>
              {archivoPreview ? (
                <div style={{ border: `2px solid ${GOLD}`, borderRadius: 10, overflow: 'hidden', background: '#fafafa', marginBottom: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={archivoPreview} alt="Vista previa de la firma" style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'contain' }} />
                </div>
              ) : (
                <label
                  htmlFor="firma-file-input"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `2px dashed ${BORDER}`, borderRadius: 10, background: '#fafafa',
                    marginBottom: 8, padding: '28px 16px', cursor: 'pointer', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 24 }}>📤</span>
                  <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 600 }}>Haz clic para subir tu firma</span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>PNG, JPG o WebP · máx. 5 MB</span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED, textAlign: 'center', maxWidth: 320 }}>
                    Idealmente sobre fondo blanco (ej. foto de tu firma en papel). Evita capturas de pantalla de un fondo &quot;transparente&quot; a cuadros: a veces ese patrón queda grabado como color y no se puede quitar.
                  </span>
                </label>
              )}
              <input
                id="firma-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={seleccionarArchivo}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: archivoError ? RED : TEXT_MUTED, margin: 0 }}>
                  {archivoError || 'Sube una foto o escaneo de tu firma'}
                </p>
                {archivoPreview && (
                  <button
                    onClick={quitarArchivo}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: TEXT_MUTED, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Botón confirmar */}
        <button
          onClick={confirmar}
          disabled={estado === 'firmando'}
          style={{
            width: '100%',
            padding: '14px',
            background: estado === 'firmando' ? '#aaa' : GREEN,
            color: WHITE,
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: estado === 'firmando' ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {estado === 'firmando' ? 'Procesando…' : 'Confirmar recepción y firmar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: TEXT_MUTED, marginTop: 14 }}>
          Al confirmar, el acta quedará registrada como recibida y se notificará al área de compras.
        </p>
      </div>
    </div>
  );
}
