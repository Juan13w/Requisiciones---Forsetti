"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Chart from "chart.js";

// Registrar todos los componentes necesarios
const { Chart: ChartJS, registerables } = Chart;
if (registerables) {
  ChartJS.register(...registerables);
}

interface Estado { estado: string; cantidad: number; porcentaje: number; }
interface Proceso { proceso: string; cantidad: number; porcentaje: number; }
interface Dia { 
  fecha: string; 
  mes_anio?: string;
  aprobadas: number; 
  rechazadas: number; 
  pendientes: number; 
  en_gestion: number;
  completadas: number;
  total: number; 
}
interface ChartDataResponse { porEstado: Estado[]; porProceso: Proceso[]; porDia: Dia[]; }

interface RequisitionChartsProps {
  selectedMonths?: string[];
}

export default function RequisitionCharts({ selectedMonths = [] }: RequisitionChartsProps) {
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  
  const barChartInstance = useRef<Chart.Chart | null>(null);
  const lineChartInstance = useRef<Chart.Chart | null>(null);
  const pieChartInstance = useRef<Chart.Chart | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Optimización: usar meses seleccionados del dashboard
        const queryParams = new URLSearchParams({ year: selectedYear.toString() });
        
        if (selectedMonths.length > 0) {
          // Usar múltiples meses del dashboard
          selectedMonths.forEach(month => {
            queryParams.append('months', month);
          });
        } else if (selectedMonth !== null) {
          // Compatibilidad con filtro individual de gráficas
          queryParams.append('month', selectedMonth.toString());
        }
        
        // Agregar timeout para producción
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
        
        const response = await fetch(`/api/requisiciones/estadisticas?${queryParams}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error("Error en la API");
        const data = await response.json();
        setChartData(data.data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError("Tiempo de espera agotado. Intente con menos meses o reduzca el rango.");
        } else {
          setError("Error al cargar estadísticas");
        }
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedYear, selectedMonth, selectedMonths]);

  useEffect(() => {
    if (!chartData) return;

    const { porEstado, porProceso, porDia } = chartData;

    // Crear array de meses según los seleccionados o todos si no hay selección
    const mesesAMostrar = selectedMonths.length > 0 
      ? selectedMonths.map(monthStr => {
          const [year, month] = monthStr.split('-');
          return {
            fecha: `${monthStr}-01`,
            mes_anio: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('es-ES', { 
              month: 'long', 
              year: 'numeric' 
            }),
            aprobadas: 0,
            rechazadas: 0,
            pendientes: 0,
            en_gestion: 0,
            completadas: 0,
            total: 0
          };
        })
      : Array.from({ length: 12 }, (_, i) => {
          const mes = i + 1;
          return {
            fecha: `${selectedYear}-${String(mes).padStart(2, '0')}-01`,
            mes_anio: new Date(selectedYear, i, 1).toLocaleDateString('es-ES', { 
              month: 'long', 
              year: 'numeric' 
            }),
            aprobadas: 0,
            rechazadas: 0,
            pendientes: 0,
            en_gestion: 0,
            completadas: 0,
            total: 0
          };
        });

    // Combinar con datos reales usando el mes-año como clave
    const datosCompletos = mesesAMostrar.map(mes => {
      // Extraer YYYY-MM de la fecha del mes a mostrar
      const mesKey = mes.fecha.substring(0, 7); // YYYY-MM
      
      // Buscar datos reales que coincidan con el mismo YYYY-MM
      const datosMes = porDia.find(d => {
        const datoKey = d.fecha.substring(0, 7); // YYYY-MM
        return datoKey === mesKey;
      });
      
      return datosMes || mes;
    });

    // Ordenar por fecha
    const datosOrdenados = datosCompletos.sort((a: any, b: any) => {
      return a.fecha.localeCompare(b.fecha);
    });

    // Destruir gráficos anteriores
    if (barChartInstance.current) barChartInstance.current.destroy();
    if (lineChartInstance.current) lineChartInstance.current.destroy();
    if (pieChartInstance.current) pieChartInstance.current.destroy();

    // Gráfico de barras apiladas
    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext('2d');
      if (ctx) {
        barChartInstance.current = new ChartJS(ctx, {
          type: 'bar',
          data: {
            labels: datosOrdenados.map(d => {
              // Parsear la fecha manualmente para evitar problemas de zona horaria
              const [year, month] = d.fecha.split('-').map(Number);
              const mesesNombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
              return `${mesesNombres[month - 1]} ${year}`;
            }),
            datasets: [
              { 
                label: "Aprobadas", 
                data: datosOrdenados.map(d => d.aprobadas), 
                backgroundColor: "#4CAF50",
                borderRadius: 4,
                barThickness: 18,
                maxBarThickness: 22
              },
              { 
                label: "Pendientes", 
                data: datosOrdenados.map(d => d.pendientes), 
                backgroundColor: "#2196F3",
                borderRadius: 4,
                barThickness: 18,
                maxBarThickness: 22
              },
              { 
                label: "En gestión", 
                data: datosOrdenados.map(d => d.en_gestion), 
                backgroundColor: "#FF9800",
                borderRadius: 4,
                barThickness: 18,
                maxBarThickness: 22
              },
              { 
                label: "Rechazadas", 
                data: datosOrdenados.map(d => d.rechazadas), 
                backgroundColor: "#F44336",
                borderRadius: 4,
                barThickness: 18,
                maxBarThickness: 22
              },
              { 
                label: "Completadas", 
                data: datosOrdenados.map(d => d.completadas), 
                backgroundColor: "#9E9E9E",
                borderRadius: 4,
                barThickness: 18,
                maxBarThickness: 22
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: {
                position: 'top',
                align: 'center',
                labels: {
                  boxWidth: 12,
                  padding: 15,
                  usePointStyle: true,
                  pointStyle: 'circle',
                  font: {
                    size: 12,
                    weight: 'bold'
                  }
                }
              },
              title: { 
                display: true, 
                text: "ESTADÍSTICAS DE REQUISICIONES",
                font: {
                  size: 16,
                  weight: 'bold'
                },
                padding: {
                  bottom: 20
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                titleFont: {
                  size: 13,
                  weight: 'bold'
                },
                bodyFont: {
                  size: 12
                },
                padding: 10,
                displayColors: true,
                usePointStyle: true,
                callbacks: {
                  label: function(context: any) {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    return ` ${label}: ${value} ${value === 1 ? 'requisición' : 'requisiciones'}`;
                  },
                  title: function(tooltipItems: any[]) {
                    const dataIndex = tooltipItems[0].dataIndex;
                    const [year, month] = datosOrdenados[dataIndex]?.fecha.split('-').map(Number) || [selectedYear, 1];
                    const mesesNombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    return `${mesesNombres[month - 1]} ${year}`.toUpperCase();
                  }
                }
              }
            },
            scales: { 
              x: { 
                stacked: true,
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    size: 12
                  }
                },
                title: {
                  display: true,
                  text: 'Meses',
                  font: {
                    weight: 'bold',
                    size: 12
                  }
                }
              }, 
              y: { 
                stacked: true,
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  stepSize: 1,
                  precision: 0,
                  font: {
                    size: 11
                  }
                },
                title: {
                  display: true,
                  text: 'Número de Requisiciones',
                  font: {
                    weight: 'bold',
                    size: 12
                  }
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        });
      }
    }

    // Gráfico de línea
    if (lineChartRef.current) {
      const ctx = lineChartRef.current.getContext('2d');
      if (ctx) {
        lineChartInstance.current = new ChartJS(ctx, {
          type: 'line',
          data: {
            labels: datosOrdenados.map(d => {
              // Parsear la fecha manualmente para evitar problemas de zona horaria
              const [year, month] = d.fecha.split('-').map(Number);
              const mesesNombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
              return `${mesesNombres[month - 1]} ${year}`;
            }),
            datasets: [{
              label: "Total de Requisiciones",
              data: datosOrdenados.map(d => d.total),
              borderColor: "#3F51B5",
              backgroundColor: "rgba(63, 81, 181, 0.1)",
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#3F51B5',
              pointBorderColor: '#fff',
              pointHoverRadius: 5,
              pointHoverBackgroundColor: '#3F51B5',
              pointHoverBorderColor: '#fff',
              pointHitRadius: 10,
              pointBorderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              title: { 
                display: true, 
                text: "Tendencia Mensual de Requisiciones",
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              tooltip: {
                callbacks: {
                  title: function(tooltipItems: any[]) {
                    const dataIndex = tooltipItems[0].dataIndex;
                    const [year, month] = datosOrdenados[dataIndex]?.fecha.split('-').map(Number) || [2025, 1];
                    const mesesNombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    return `${mesesNombres[month - 1]} ${year}`.toUpperCase();
                  }
                }
              }
            },
            scales: { 
              y: { 
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Cantidad de Requisiciones'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Mes'
                }
              }
            },
          }
        });
      }
    }

    // Gráfico de pastel
    if (pieChartRef.current && porProceso.length > 0) {
      const ctx = pieChartRef.current.getContext('2d');
      if (ctx) {
        pieChartInstance.current = new ChartJS(ctx, {
          type: 'pie',
          data: {
            labels: porProceso.map(p => p.proceso),
            datasets: [{
              data: porProceso.map(p => p.cantidad),
              backgroundColor: ["#4CAF50","#2196F3","#FFC107","#9C27B0","#607D8B","#FF5722","#00BCD4"].slice(0, porProceso.length),
              borderWidth: 1,
              borderColor: '#fff'
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              title: { 
                display: true, 
                text: "Distribución por Proceso",
                font: {
                  size: 14,
                  weight: 'bold'
                },
                padding: {
                  top: 10,
                  bottom: 20,
                },
              }, 
              legend: { 
                position: "right" 
              } 
            },
          }
        });
      }
    }

    return () => {
      if (barChartInstance.current) barChartInstance.current.destroy();
      if (lineChartInstance.current) lineChartInstance.current.destroy();
      if (pieChartInstance.current) pieChartInstance.current.destroy();
    };
  }, [chartData]);

  if (loading) return <div className="p-4 text-center">Cargando estadísticas...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  if (!chartData) return <div className="p-4 text-center">No hay datos disponibles.</div>;

  const { porProceso } = chartData;

  return (
    <div className="space-y-8">
      <div className="flex justify-end mb-2 gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-white">
          <span>Año:</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-black text-white border-white"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </label>
        {selectedMonth !== null && (
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <span>Filtro activo:</span>
            <span className="bg-blue-600 px-2 py-1 rounded text-xs">
              {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-ES', { month: 'long' })}
            </span>
          </div>
        )}
      </div>
      {/* Gráfica de barras */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div style={{ height: '400px' }}>
          <canvas ref={barChartRef}></canvas>
        </div>
      </div>

      {/* Otras gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div style={{ height: '300px' }}>
            <canvas ref={lineChartRef}></canvas>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div style={{ height: '300px' }}>
            <canvas ref={pieChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Cuadro de Resumen */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="border-b pb-4 mb-4">
          <h3 className="text-lg font-bold">Top 5 Procesos con Más Requisiciones</h3>
        </div>
        
        <div className="space-y-2">
          {porProceso.slice(0, 5).map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span className="font-medium">{item.proceso}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{item.cantidad}</span>
                <span className="text-gray-500">({item.porcentaje}%)</span>
              </div>
            </div>
          ))}
          
          <div className="flex items-center justify-between pt-4 mt-4 border-t-2 font-bold">
            <span>Total</span>
            <span>
              {porProceso.reduce((sum: number, item: any) => sum + item.cantidad, 0)} solicitudes
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
