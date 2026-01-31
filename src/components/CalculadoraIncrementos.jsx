import React, { useState, useEffect, useMemo } from 'react';

// Índices disponibles del INDEC
const INDICES_DISPONIBLES = [
  { id: 'IPC', name: 'IPC (Índice de Precios al Consumidor)', serieId: '148.3_INIVELNAL_DICI_M_26' },
  { id: 'ICC', name: 'ICC (Índice del Costo de la Construcción)', serieId: '380.3_ICC_NACIONNAL_0_T_12' },
];

export default function CalculadoraIncrementos() {
  const [valorInicial, setValorInicial] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [mesesActualizacion, setMesesActualizacion] = useState(3);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState('IPC');
  const [datosIndice, setDatosIndice] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [periodoExpandido, setPeriodoExpandido] = useState(null);

  // Cargar datos del índice seleccionado
  useEffect(() => {
    const cargarDatosIndice = async () => {
      setCargando(true);
      setError(null);
      
      try {
        const indice = INDICES_DISPONIBLES.find(i => i.id === indiceSeleccionado);
        if (!indice) return;

        const response = await fetch(
          `https://apis.datos.gob.ar/series/api/series/?ids=${indice.serieId}&limit=5000&format=json`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar datos del INDEC');
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          // Convertir los datos al formato [fecha, valor]
          const datos = data.data.map(item => ({
            fecha: item[0],
            valor: parseFloat(item[1])
          }));
          setDatosIndice(datos);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error cargando datos del INDEC:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosIndice();
  }, [indiceSeleccionado]);

  // Calcular incrementos
  const incrementos = useMemo(() => {
    if (!valorInicial || !fechaInicio || datosIndice.length === 0) {
      return [];
    }

    const montoInicial = parseFloat(valorInicial);
    if (isNaN(montoInicial) || montoInicial <= 0) {
      return [];
    }

    const fecha = new Date(fechaInicio + 'T00:00:00');
    if (isNaN(fecha.getTime())) {
      return [];
    }

    const resultados = [];
    const mesesIncremento = parseInt(mesesActualizacion) || 3;

    // Función auxiliar para buscar el índice del MES ANTERIOR a una fecha
    // El IPC se publica con un mes de retraso, entonces para octubre usamos el índice de septiembre
    const buscarIndiceCercano = (fechaBuscada) => {
      // Retroceder un mes para obtener el índice correcto
      const fechaMesAnterior = new Date(fechaBuscada);
      fechaMesAnterior.setMonth(fechaMesAnterior.getMonth() - 1);
      
      const fechaStr = fechaMesAnterior.toISOString().substring(0, 7); // YYYY-MM
      
      // Buscar exactamente la fecha
      let indice = datosIndice.find(d => d.fecha.startsWith(fechaStr));
      
      // Si no encuentra exacta, buscar la más cercana anterior (máximo 2 meses de diferencia)
      if (!indice) {
        const datosOrdenados = [...datosIndice].sort((a, b) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        
        for (let i = datosOrdenados.length - 1; i >= 0; i--) {
          const fechaDato = new Date(datosOrdenados[i].fecha);
          if (fechaDato <= fechaMesAnterior) {
            // Solo aceptar si la diferencia es menor a 2 meses
            const diferenciaMeses = (fechaMesAnterior.getFullYear() - fechaDato.getFullYear()) * 12 + 
                                   (fechaMesAnterior.getMonth() - fechaDato.getMonth());
            if (diferenciaMeses <= 2) {
              indice = datosOrdenados[i];
            }
            break;
          }
        }
      }
      
      return indice;
    };

    // Encontrar el índice inicial
    const indiceInicial = buscarIndiceCercano(fecha);
    
    if (!indiceInicial) {
      return [];
    }

    let montoActual = montoInicial;
    resultados.push({
      periodo: 0,
      fecha: new Date(fecha),
      monto: montoActual,
      incremento: 0,
      indice: indiceInicial.valor
    });

    // Calcular incrementos (hasta 12 períodos o 36 meses)
    let indicePrevioParaDesglose = indiceInicial;
    
    for (let i = 1; i <= 12; i++) {
      const fechaActual = new Date(fecha);
      fechaActual.setMonth(fechaActual.getMonth() + (i * mesesIncremento));
      
      const indiceActual = buscarIndiceCercano(fechaActual);
      
      // Solo agregar si encontró un índice y es diferente al anterior
      if (indiceActual && indiceActual.valor && indiceActual.fecha !== indicePrevioParaDesglose.fecha) {
        // IMPORTANTE: Calcular SIEMPRE desde el índice inicial del contrato
        // Fórmula: Valor Nuevo = Valor Inicial * (Índice Actual / Índice Inicial)
        const variacionDesdeInicio = ((indiceActual.valor - indiceInicial.valor) / indiceInicial.valor);
        montoActual = montoInicial * (1 + variacionDesdeInicio);
        
        // Calcular incremento del período (respecto al período anterior para mostrar)
        const variacionPeriodo = i === 1 
          ? variacionDesdeInicio 
          : ((indiceActual.valor - indicePrevioParaDesglose.valor) / indicePrevioParaDesglose.valor);
        
        // Calcular desglose mes a mes
        const desgloseMensual = [];
        
        const fechaInicioDesglose = new Date(indicePrevioParaDesglose.fecha);
        const fechaFinDesglose = new Date(indiceActual.fecha);
        
        // Filtrar los datos que estén DESPUÉS del inicio y HASTA el fin
        const datosPeriodo = datosIndice.filter(d => {
          const fechaDato = new Date(d.fecha);
          return fechaDato > fechaInicioDesglose && fechaDato <= fechaFinDesglose;
        }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        
        // Generar el desglose
        let indiceAnteriorMes = indicePrevioParaDesglose;
        const baseAcumulado = indicePrevioParaDesglose;
        
        for (let j = 0; j < datosPeriodo.length; j++) {
          const datoMes = datosPeriodo[j];
          const fechaOriginal = new Date(datoMes.fecha);
          
          const variacionMes = ((datoMes.valor - indiceAnteriorMes.valor) / indiceAnteriorMes.valor) * 100;
          const variacionAcumulada = ((datoMes.valor - baseAcumulado.valor) / baseAcumulado.valor) * 100;
          
          desgloseMensual.push({
            fecha: fechaOriginal,
            mesDisplay: fechaOriginal,
            valorIndice: datoMes.valor,
            variacionMes: variacionMes,
            variacionAcumulada: variacionAcumulada
          });
          
          indiceAnteriorMes = datoMes;
        }
        
        resultados.push({
          periodo: i + 1, // Período 2, 3, 4... (ya que el inicial es período 1)
          fecha: new Date(fechaActual),
          monto: montoActual,
          incremento: variacionPeriodo * 100,
          indice: indiceActual.valor,
          desglose: desgloseMensual
        });
        
        // Actualizar el índice previo para el siguiente período
        indicePrevioParaDesglose = indiceActual;
      } else {
        // Si no hay más datos disponibles, terminar el loop
        break;
      }
    }

    return resultados;
  }, [valorInicial, fechaInicio, mesesActualizacion, datosIndice]);

  return (
    <div className="space-y-6">
      {/* Formulario de entrada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="valorInicial" className="block text-sm font-medium text-slate-600 mb-1">
            Valor Inicial del Alquiler
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
            <input
              id="valorInicial"
              type="number"
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              placeholder="Ej: 250000"
              className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="fechaInicio" className="block text-sm font-medium text-slate-600 mb-1">
            Fecha de Inicio del Contrato
          </label>
          <input
            id="fechaInicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="mesesActualizacion" className="block text-sm font-medium text-slate-600 mb-1">
            Cada Cuántos Meses Actualiza
          </label>
          <div className="relative">
            <input
              id="mesesActualizacion"
              type="number"
              min="1"
              max="12"
              value={mesesActualizacion}
              onChange={(e) => setMesesActualizacion(e.target.value)}
              placeholder="Ej: 3"
              className="w-full pl-4 pr-20 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
              meses
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="indice" className="block text-sm font-medium text-slate-600 mb-1">
            Índice de Actualización
          </label>
          <select
            id="indice"
            value={indiceSeleccionado}
            onChange={(e) => setIndiceSeleccionado(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {INDICES_DISPONIBLES.map(indice => (
              <option key={indice.id} value={indice.id}>
                {indice.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado de carga */}
      {cargando && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-slate-600">Cargando datos del INDEC...</p>
        </div>
      )}

      {/* Errores */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          <p className="font-semibold">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabla de resultados */}
      {!cargando && !error && incrementos.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Monto Alquiler
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Incremento %
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {incrementos.map((inc, index) => (
                <React.Fragment key={index}>
                  <tr className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {inc.periodo === 0 ? 'Inicial' : `Período ${inc.periodo}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {inc.fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                      {inc.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {inc.periodo === 0 ? (
                        <span className="text-slate-500">-</span>
                      ) : (
                        <span className={inc.incremento > 0 ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                          +{inc.incremento.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inc.periodo > 0 && inc.desglose && inc.desglose.length > 0 && (
                        <button
                          onClick={() => setPeriodoExpandido(periodoExpandido === index ? null : index)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 transform transition-transform ${periodoExpandido === index ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  
                  {/* Fila expandible con desglose mensual */}
                  {periodoExpandido === index && inc.desglose && inc.desglose.length > 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 bg-slate-100">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-300">
                            <thead className="bg-slate-200">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-700">
                                  Mes
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">
                                  Valor Índice
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">
                                  Mes Anterior (%)
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-slate-700">
                                  Acumulado (%)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                              {inc.desglose.map((mes, mesIndex) => (
                                <tr key={mesIndex} className={mesIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className="px-3 py-2 text-sm text-slate-700 capitalize">
                                    {mes.mesDisplay.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-slate-900 text-right">
                                    {mes.valorIndice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    <span className={mes.variacionMes > 0 ? 'text-green-600' : 'text-slate-600'}>
                                      {mes.variacionMes.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    <span className={mes.variacionAcumulada > 0 ? 'text-green-600 font-semibold' : 'text-slate-600'}>
                                      {mes.variacionAcumulada.toFixed(2)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mensaje cuando no hay datos */}
      {!cargando && !error && incrementos.length === 0 && valorInicial && fechaInicio && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <p className="text-sm">Complete todos los campos para calcular los incrementos de alquiler.</p>
        </div>
      )}
    </div>
  );
}
