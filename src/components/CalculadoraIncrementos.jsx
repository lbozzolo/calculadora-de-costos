import React, { useState, useEffect, useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// Registrar locale español
registerLocale('es', es);

// Índices disponibles del INDEC
const INDICES_DISPONIBLES = [
  { id: 'IPC', name: 'IPC (Índice de Precios al Consumidor)', serieId: '148.3_INIVELNAL_DICI_M_26' },
  { id: 'ICC', name: 'ICC (Índice del Costo de la Construcción)', serieId: '380.3_ICC_NACIONNAL_0_T_12' },
  { id: 'RIPTE', name: 'RIPTE (Índice de Salarios)', serieId: '158.1_REPTE_0_0_5' },
];

export default function CalculadoraIncrementos() {
  const [valorInicial, setValorInicial] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
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

    const fecha = new Date(fechaInicio);
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
          
          // Label: mostrar el mes siguiente al dato real
          const mesParaLabel = new Date(fechaOriginal.getFullYear(), fechaOriginal.getMonth() + 1, 1);
          
          const variacionMes = ((datoMes.valor - indiceAnteriorMes.valor) / indiceAnteriorMes.valor) * 100;
          const variacionAcumulada = ((datoMes.valor - baseAcumulado.valor) / baseAcumulado.valor) * 100;
          
          desgloseMensual.push({
            fecha: fechaOriginal,
            mesDisplay: mesParaLabel,
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

    // Agregar período estimado (próximo período usando el último valor de inflación)
    if (resultados.length > 1 && indicePrevioParaDesglose) {
      const ultimoPeriodo = resultados[resultados.length - 1];
      const ultimoIndiceMensual = indicePrevioParaDesglose;
      
      // Calcular la variación mensual promedio del último dato disponible
      // Buscar el dato anterior al último para calcular la variación mensual
      const datosOrdenados = [...datosIndice].sort((a, b) => 
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
      
      const indexUltimo = datosOrdenados.findIndex(d => d.fecha === ultimoIndiceMensual.fecha);
      const datoPrevio = indexUltimo > 0 ? datosOrdenados[indexUltimo - 1] : null;
      
      const variacionMensualUltima = datoPrevio 
        ? ((ultimoIndiceMensual.valor - datoPrevio.valor) / datoPrevio.valor) * 100
        : 2.5; // Default conservador si no hay dato previo
      
      // Calcular fecha del próximo período estimado
      const fechaProximoPeriodo = new Date(ultimoPeriodo.fecha);
      fechaProximoPeriodo.setMonth(fechaProximoPeriodo.getMonth() + mesesIncremento);
      
      // Simular el incremento acumulado replicando la variación mensual
      const variacionEstimadaPeriodo = (Math.pow(1 + (variacionMensualUltima / 100), mesesIncremento) - 1) * 100;
      
      // Calcular monto estimado desde el valor inicial
      const indiceEstimado = ultimoIndiceMensual.valor * (1 + (variacionEstimadaPeriodo / 100));
      const variacionDesdeInicioEstimada = ((indiceEstimado - indiceInicial.valor) / indiceInicial.valor);
      const montoEstimado = montoInicial * (1 + variacionDesdeInicioEstimada);
      
      // Generar desglose mensual estimado
      const desgloseMensualEstimado = [];
      let indiceAcumuladoEstimado = ultimoIndiceMensual.valor;
      
      // Calcular la fecha base: primer día del mes siguiente al último dato real
      const fechaBaseEstimado = new Date(ultimoIndiceMensual.fecha);
      fechaBaseEstimado.setMonth(fechaBaseEstimado.getMonth() + 1);
      fechaBaseEstimado.setDate(1); // Asegurar que es día 1
      
      for (let m = 0; m < mesesIncremento; m++) {
        // Crear fecha para cada mes del período estimado
        const fechaMesEstimado = new Date(fechaBaseEstimado);
        fechaMesEstimado.setMonth(fechaBaseEstimado.getMonth() + m);
        
        // Para estimados, mantener la consistencia con los datos reales (+1 mes en el label)
        const mesParaLabel = new Date(fechaMesEstimado.getFullYear(), fechaMesEstimado.getMonth() + 1, 1);
        
        // Aplicar la variación mensual
        const nuevoIndice = indiceAcumuladoEstimado * (1 + (variacionMensualUltima / 100));
        const variacionAcumuladaEstimada = ((nuevoIndice - ultimoIndiceMensual.valor) / ultimoIndiceMensual.valor) * 100;
        
        desgloseMensualEstimado.push({
          fecha: fechaMesEstimado,
          mesDisplay: mesParaLabel,
          valorIndice: nuevoIndice,
          variacionMes: variacionMensualUltima,
          variacionAcumulada: variacionAcumuladaEstimada,
          estimado: true
        });
        
        indiceAcumuladoEstimado = nuevoIndice;
      }
      
      resultados.push({
        periodo: resultados.length + 1,
        fecha: fechaProximoPeriodo,
        monto: montoEstimado,
        incremento: variacionEstimadaPeriodo,
        indice: indiceEstimado,
        desglose: desgloseMensualEstimado,
        estimado: true
      });
    }

    return resultados;
  }, [valorInicial, fechaInicio, mesesActualizacion, datosIndice]);

  return (
    <div className="space-y-8">
      {/* Leyenda explicativa */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <p className="text-slate-700 text-sm">
            <span className="font-medium">Calculá cómo se actualiza tu alquiler según el índice que elijas.</span>
            {' '}Ingresá el valor inicial, la fecha de inicio del contrato y cada cuántos meses se actualiza.
          </p>
          <div className="relative group flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-slate-400 hover:text-slate-600 cursor-help" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
            </svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 z-10 shadow-lg">
              <p className="mb-1">📊 Los datos se obtienen en tiempo real del INDEC.</p>
              <p>📅 El cálculo considera el desfase de un mes en la publicación de los índices oficiales.</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de formulario de entrada */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-700 border-b pb-2">Variables del Contrato</h2>
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
          <DatePicker
            id="fechaInicio"
            selected={fechaInicio}
            onChange={(date) => setFechaInicio(date)}
            dateFormat="dd/MM/yyyy"
            locale="es"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            wrapperClassName="w-full"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-2">
            ¿Cada cuántos meses actualiza el contrato?
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
              <button
                key={mes}
                type="button"
                onClick={() => setMesesActualizacion(mes)}
                className={`min-w-[42px] px-3 py-2 rounded-md border text-sm font-medium transition-all shadow-sm ${
                  mesesActualizacion === mes
                    ? 'bg-slate-700 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {mes}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Índice de actualización
          </label>
          <div className="flex flex-wrap gap-2">
            {INDICES_DISPONIBLES.map((indice) => (
              <button
                key={indice.id}
                type="button"
                onClick={() => setIndiceSeleccionado(indice.id)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-all shadow-sm ${
                  indiceSeleccionado === indice.id
                    ? 'bg-slate-700 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {indice.id}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {INDICES_DISPONIBLES.find(i => i.id === indiceSeleccionado)?.name}
          </p>
        </div>
        </div>
      </div>

      {/* Sección de resultados - solo visible cuando hay datos o está cargando */}
      {(cargando || incrementos.length > 0) && (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-700 border-b pb-2">Incrementos Calculados</h2>

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
                  <tr className={inc.estimado ? 'bg-amber-50 border-l-4 border-l-amber-400' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {inc.periodo === 0 ? 'Inicial' : (
                        inc.estimado ? (
                          <span className="flex items-center gap-1">
                            <span>Período {inc.periodo}</span>
                            <span className="text-xs text-amber-600 font-medium">(Estimado)</span>
                          </span>
                        ) : `Período ${inc.periodo}`
                      )}
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
                        <span className={inc.estimado ? 'text-amber-600 font-semibold' : (inc.incremento > 0 ? 'text-green-600 font-semibold' : 'text-slate-600')}>
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
                                <tr key={mesIndex} className={mes.estimado ? 'bg-amber-50' : (mesIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                                  <td className="px-3 py-2 text-sm text-slate-700 capitalize">
                                    {mes.mesDisplay.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}
                                    {mes.estimado && <span className="ml-1 text-xs text-amber-600">*</span>}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-slate-900 text-right">
                                    {mes.valorIndice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    <span className={mes.estimado ? 'text-amber-600' : (mes.variacionMes > 0 ? 'text-green-600' : 'text-slate-600')}>
                                      {mes.variacionMes.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right">
                                    <span className={mes.estimado ? 'text-amber-600 font-semibold' : (mes.variacionAcumulada > 0 ? 'text-green-600 font-semibold' : 'text-slate-600')}>
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

          {/* Leyenda para período estimado */}
          {incrementos.some(inc => inc.estimado) && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Sobre el período estimado</p>
                  <p>El último período mostrado es una <strong>estimación</strong> basada en replicar la variación mensual más reciente ({incrementos.find(inc => inc.estimado)?.desglose?.[0]?.variacionMes.toFixed(2)}%) durante los próximos {mesesActualizacion} meses. Esta proyección asume que la inflación se mantendrá constante, por lo que debe tomarse solo como referencia.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje cuando no hay datos */}
      {!cargando && !error && incrementos.length === 0 && valorInicial && fechaInicio && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <p className="text-sm">Complete todos los campos para calcular los incrementos de alquiler.</p>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
