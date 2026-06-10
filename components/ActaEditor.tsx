'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, FileText, Send, Loader2, X, CheckCircle, AlertCircle, PenLine } from 'lucide-react';
import FirmaPerfilModal from './FirmaPerfilModal';

interface RequisicionResumen {
  requisicion_id: number;
  consecutivo: string | null;
  empresa: string;
  proceso: string;
  descripcion: string;
  cantidad: number;
  coordinador_email?: string;
}

interface ActaEditorProps {
  requisicion: RequisicionResumen;
  onClose: () => void;
}

interface Item {
  id: number;
  codigo_articulo: string;
  descripcion: string;
  cantidad: string;
}

type Fase = 'cargando' | 'editando' | 'generando' | 'generado' | 'error';

const GOLD = '#BFA181';
const BG_DARK = '#1a1a1a';
const BG_CARD = '#222222';
const BG_INPUT = '#2a2a2a';
const BORDER = '#3a3a3a';
const BORDER_GOLD = '#BFA181';

export default function ActaEditor({ requisicion, onClose }: ActaEditorProps) {
  const [fase, setFase] = useState<Fase>('cargando');
  const [actaId, setActaId] = useState<number | null>(null);
  const [estadoActa, setEstadoActa] = useState<string>('borrador');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showFirmaPerfil, setShowFirmaPerfil] = useState(false);

  // Carga o crea el borrador al montar
  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    setFase('cargando');
    try {
      // Verificar que el usuario tenga nombre, cargo y firma configurados
      const perfilRes = await fetch('/api/compras/perfil');
      if (perfilRes.ok) {
        const { perfil } = await perfilRes.json();
        if (!perfil?.nombre || !perfil?.firma_url) {
          setShowFirmaPerfil(true);
          return; // Se reanuda en onFirmaGuardada()
        }
      }
      await crearActaBorrador();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error inesperado');
      setFase('error');
    }
  }

  async function crearActaBorrador() {
    setFase('cargando');
    try {
      const res = await fetch('/api/actas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisicion_id: requisicion.requisicion_id }),
      });
      const data = await res.json();

      let id: number;
      if (res.ok) {
        id = data.acta_id;
      } else if (res.status === 409 && data.acta_id) {
        // Ya existe → usar el existente
        id = data.acta_id;
      } else {
        throw new Error(data.error || 'Error al crear el acta');
      }

      setActaId(id);
      await cargarActa(id);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error inesperado');
      setFase('error');
    }
  }

  async function cargarActa(id: number) {
    const res = await fetch(`/api/actas/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar el acta');

    const acta = data.data;
    setEstadoActa(acta.estado);
    setPdfUrl(acta.pdf_url ?? null);
    setObservaciones(acta.observaciones ?? '');
    setItems(
      (acta.items ?? []).map((i: any) => ({
        id: i.id,
        codigo_articulo: i.codigo_articulo ?? '',
        descripcion: i.descripcion,
        cantidad: String(i.cantidad),
      }))
    );

    if (['generada', 'enviada', 'recibida'].includes(acta.estado)) {
      setFase('generado');
    } else {
      setFase('editando');
    }
  }

  // ── Edición de ítems ───────────────────────────────────────────────────────

  function actualizarItem(idx: number, campo: keyof Item, valor: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  async function guardarItemEnBlur(idx: number) {
    if (!actaId) return;
    const item = items[idx];
    await fetch(`/api/actas/${actaId}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_articulo: item.codigo_articulo,
        descripcion: item.descripcion,
        cantidad: parseInt(item.cantidad) || 1,
      }),
    });
  }

  async function agregarItem() {
    if (!actaId) return;
    const res = await fetch(`/api/actas/${actaId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_articulo: '', descripcion: '', cantidad: 1 }),
    });
    const data = await res.json();
    if (res.ok) {
      setItems((prev) => [
        ...prev,
        { id: data.id, codigo_articulo: '', descripcion: '', cantidad: '1' },
      ]);
    }
  }

  async function eliminarItem(idx: number) {
    if (!actaId) return;
    const item = items[idx];
    const res = await fetch(`/api/actas/${actaId}/items/${item.id}`, { method: 'DELETE' });
    if (res.ok) setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function guardarObservaciones() {
    if (!actaId) return;
    await fetch(`/api/actas/${actaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observaciones: observaciones || null }),
    });
  }

  // ── Generar acta ───────────────────────────────────────────────────────────

  async function generarActa() {
    if (!actaId) return;
    setFase('generando');
    try {
      const res = await fetch(`/api/actas/${actaId}/generar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar');
      setPdfUrl(data.pdf_url);
      setEstadoActa(data.estado);
      setFase('generado');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al generar el acta');
      setFase('error');
    }
  }

  // ── Estilos helpers ────────────────────────────────────────────────────────

  const badgeEstado: Record<string, { bg: string; color: string; label: string }> = {
    borrador:  { bg: '#2a2a2a',  color: '#aaaaaa', label: 'Borrador'  },
    generada:  { bg: '#1e3a5f',  color: '#60a5fa', label: 'Generada'  },
    enviada:   { bg: '#2d1b69',  color: '#a78bfa', label: 'Enviada'   },
    recibida:  { bg: '#14532d',  color: '#4ade80', label: 'Recibida'  },
  };
  const badge = badgeEstado[estadoActa] ?? badgeEstado.borrador;

  const inputStyle: React.CSSProperties = {
    background: BG_INPUT,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: '#fff',
    padding: '6px 10px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    background: GOLD,
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const btnSecondary: React.CSSProperties = {
    background: 'transparent',
    color: GOLD,
    border: `1px solid ${GOLD}`,
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const btnDanger: React.CSSProperties = {
    background: 'transparent',
    color: '#ef4444',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${BORDER}`,
    background: BG_CARD,
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: `1px solid ${BORDER}`,
    verticalAlign: 'middle',
  };

  const esBorrador = estadoActa === 'borrador';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: BG_DARK,
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          width: '100%', maxWidth: 860,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={20} color={GOLD} />
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>
                Acta de Entrega — {requisicion.consecutivo || `#${requisicion.requisicion_id}`}
              </h3>
              <p style={{ color: '#888', fontSize: 12, margin: 0, marginTop: 2 }}>
                {requisicion.empresa} · {requisicion.proceso}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: badge.bg, color: badge.color,
              borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
            }}>
              {badge.label}
            </span>
            <button
              onClick={() => setShowFirmaPerfil(true)}
              title="Editar mi firma"
              style={{ ...btnDanger, color: GOLD, padding: '4px 8px', border: `1px solid #3a3a3a`, borderRadius: 6 }}
            >
              <PenLine size={15} />
            </button>
            <button onClick={onClose} style={{ ...btnDanger, color: '#888' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── CARGANDO ── */}
          {fase === 'cargando' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#888' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Preparando acta…</span>
            </div>
          )}

          {/* ── ERROR ── */}
          {fase === 'error' && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#ef4444', fontWeight: 600 }}>{errorMsg}</p>
              <button onClick={inicializar} style={{ ...btnSecondary, margin: '16px auto 0', justifyContent: 'center' }}>
                Reintentar
              </button>
            </div>
          )}

          {/* ── GENERADO ── */}
          {fase === 'generado' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle size={48} color="#4ade80" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
                {estadoActa === 'recibida' ? 'Acta firmada y recibida' : 'Acta generada correctamente'}
              </h4>
              <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>
                {estadoActa === 'enviada'
                  ? 'El correo fue enviado al coordinador con el link de firma.'
                  : estadoActa === 'recibida'
                  ? 'El acta fue firmada por el receptor.'
                  : 'El PDF fue generado. No se envió correo (sin coordinador asignado).'}
              </p>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...btnPrimary,
                    display: 'inline-flex',
                    margin: '0 auto',
                    textDecoration: 'none',
                  }}
                >
                  <FileText size={16} /> Ver PDF
                </a>
              )}
            </div>
          )}

          {/* ── GENERANDO ── */}
          {fase === 'generando' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#888' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Generando PDF y enviando correo…</span>
            </div>
          )}

          {/* ── EDITANDO ── */}
          {fase === 'editando' && (
            <>
              {/* TABLA DE ÍTEMS */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>
                    Artículos a entregar
                  </h4>
                  {esBorrador && (
                    <button onClick={agregarItem} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 13 }}>
                      <Plus size={14} /> Agregar fila
                    </button>
                  )}
                </div>

                <div style={{ background: BG_CARD, borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '18%' }}>Código</th>
                        <th style={{ ...thStyle, width: '52%' }}>Descripción / Insumo</th>
                        <th style={{ ...thStyle, width: '18%' }}>Cantidad</th>
                        {esBorrador && <th style={{ ...thStyle, width: '12%' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={esBorrador ? 4 : 3} style={{ ...tdStyle, textAlign: 'center', color: '#555', padding: 24 }}>
                            Sin ítems. Agrega al menos uno.
                          </td>
                        </tr>
                      )}
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ background: idx % 2 === 0 ? BG_CARD : '#252525' }}>
                          <td style={tdStyle}>
                            {esBorrador ? (
                              <input
                                style={inputStyle}
                                value={item.codigo_articulo}
                                onChange={(e) => actualizarItem(idx, 'codigo_articulo', e.target.value)}
                                onBlur={() => guardarItemEnBlur(idx)}
                                placeholder="Código"
                              />
                            ) : (
                              <span style={{ color: '#ccc', fontSize: 13 }}>{item.codigo_articulo || '—'}</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {esBorrador ? (
                              <input
                                style={inputStyle}
                                value={item.descripcion}
                                onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)}
                                onBlur={() => guardarItemEnBlur(idx)}
                                placeholder="Descripción del artículo"
                              />
                            ) : (
                              <span style={{ color: '#ccc', fontSize: 13 }}>{item.descripcion}</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {esBorrador ? (
                              <input
                                style={{ ...inputStyle, textAlign: 'center' }}
                                type="number"
                                min="1"
                                step="1"
                                value={item.cantidad}
                                onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                                onBlur={() => guardarItemEnBlur(idx)}
                              />
                            ) : (
                              <span style={{ color: '#ccc', fontSize: 13, display: 'block', textAlign: 'center' }}>{item.cantidad}</span>
                            )}
                          </td>
                          {esBorrador && (
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <button onClick={() => eliminarItem(idx)} style={btnDanger} title="Eliminar fila">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OBSERVACIONES */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', color: '#888', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Observaciones (opcional)
                </label>
                {esBorrador ? (
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    onBlur={guardarObservaciones}
                    placeholder="Notas adicionales para el acta…"
                  />
                ) : (
                  <p style={{ color: '#ccc', fontSize: 13, margin: 0 }}>
                    {observaciones || <span style={{ color: '#555' }}>Sin observaciones.</span>}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER — solo en modo edición */}
        {fase === 'editando' && (
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'flex-end', gap: 12,
            flexShrink: 0,
          }}>
            <button onClick={onClose} style={btnSecondary}>
              Cerrar
            </button>
            <button
              onClick={generarActa}
              disabled={items.length === 0}
              style={{
                ...btnPrimary,
                opacity: items.length === 0 ? 0.5 : 1,
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={15} /> Generar acta
            </button>
          </div>
        )}

        {/* FOOTER — modo generado: botón cerrar */}
        {(fase === 'generado') && (
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'flex-end',
            flexShrink: 0,
          }}>
            <button onClick={onClose} style={btnSecondary}>Cerrar</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {showFirmaPerfil && (
        <FirmaPerfilModal
          onGuardado={() => {
            setShowFirmaPerfil(false);
            // Si aún no hay acta creada, crear el borrador ahora
            if (!actaId) {
              crearActaBorrador();
            }
          }}
          onCancelar={() => {
            setShowFirmaPerfil(false);
            // Si se cancela antes de crear el acta, cerrar el editor
            if (!actaId) onClose();
          }}
        />
      )}
    </div>
  );
}
