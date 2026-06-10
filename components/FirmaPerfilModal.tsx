'use client';

import { useEffect, useRef, useState } from 'react';
import { X, PenLine, RotateCcw, Save, Loader2 } from 'lucide-react';

const GOLD = '#BFA181';
const BG_DARK = '#1a1a1a';
const BG_INPUT = '#2a2a2a';
const BORDER = '#3a3a3a';

interface FirmaPerfilModalProps {
  onGuardado: () => void;
  onCancelar: () => void;
}

export default function FirmaPerfilModal({ onGuardado, onCancelar }: FirmaPerfilModalProps) {
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [tieneFirma, setTieneFirma] = useState(false);
  const [dibujando, setDibujando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Cargar perfil existente al abrir
  useEffect(() => {
    fetch('/api/compras/perfil')
      .then((r) => r.json())
      .then(({ perfil }) => {
        if (perfil?.nombre) setNombre(perfil.nombre);
        if (perfil?.cargo) setCargo(perfil.cargo);
      })
      .catch(() => {});
  }, []);

  function getPosCanvas(e: React.MouseEvent | React.TouchEvent) {
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
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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

  async function guardar() {
    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    if (!cargo.trim())  { setError('El cargo es requerido.'); return; }
    if (!tieneFirma)    { setError('Por favor dibuja tu firma en el recuadro.'); return; }

    setError('');
    setGuardando(true);
    try {
      const firmaBase64 = canvasRef.current!.toDataURL('image/png');
      const res = await fetch('/api/compras/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), cargo: cargo.trim(), firmaBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      onGuardado();
    } catch (e: any) {
      setError(e.message || 'Error al guardar el perfil');
    } finally {
      setGuardando(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: BG_INPUT,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: '#fff',
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#888',
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 16,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: BG_DARK,
          borderRadius: 12,
          border: `1px solid ${GOLD}`,
          width: '100%', maxWidth: 500,
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        }}
      >
        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PenLine size={20} color={GOLD} />
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>
                Configura tu firma
              </h3>
              <p style={{ color: '#888', fontSize: 12, margin: '3px 0 0' }}>
                Se usará como entregador en todas las actas
              </p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: 4, lineHeight: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre completo</label>
            <input
              style={inputStyle}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: María García López"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Cargo</label>
            <input
              style={inputStyle}
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej: Jefe de Compras"
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>Firma digital</label>
              {tieneFirma && (
                <button
                  onClick={limpiarFirma}
                  style={{
                    background: 'transparent', border: `1px solid #444`,
                    color: '#999', borderRadius: 6, padding: '3px 10px',
                    fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <RotateCcw size={11} /> Limpiar
                </button>
              )}
            </div>

            <div style={{
              background: '#fff',
              borderRadius: 8,
              border: `2px solid ${tieneFirma ? GOLD : '#555'}`,
              overflow: 'hidden',
              position: 'relative',
              transition: 'border-color 0.2s',
            }}>
              <canvas
                ref={canvasRef}
                width={560}
                height={130}
                style={{ display: 'block', width: '100%', touchAction: 'none', cursor: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='2' x2='12' y2='22' stroke='black' stroke-width='2'/%3E%3Cline x1='2' y1='12' x2='22' y2='12' stroke='black' stroke-width='2'/%3E%3C/svg%3E\") 12 12, crosshair" }}
                onMouseDown={iniciarTrazo}
                onMouseMove={continuarTrazo}
                onMouseUp={terminarTrazo}
                onMouseLeave={terminarTrazo}
                onTouchStart={iniciarTrazo}
                onTouchMove={continuarTrazo}
                onTouchEnd={terminarTrazo}
              />
              {!tieneFirma && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', color: '#bbb', fontSize: 13,
                }}>
                  Dibuja tu firma aquí
                </div>
              )}
            </div>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0', fontWeight: 500 }}>{error}</p>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onCancelar}
            style={{
              background: 'transparent', color: GOLD,
              border: `1px solid ${GOLD}`, borderRadius: 8,
              padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            style={{
              background: guardando ? '#8a7060' : GOLD,
              color: '#000', border: 'none', borderRadius: 8,
              padding: '9px 20px', fontWeight: 700, fontSize: 13,
              cursor: guardando ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {guardando
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Save size={14} />}
            {guardando ? 'Guardando…' : 'Guardar firma'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
