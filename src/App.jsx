import React, { useState, useEffect, useRef } from 'react';
import CalculadoraGarantia from './components/CalculadoraGarantia';
import CalculadoraIncrementos from './components/CalculadoraIncrementos';

// Componente principal de la aplicación
export default function App() {
  const [activeTab, setActiveTab] = useState('garantia');
  const appRef = useRef(null);

  useEffect(() => {
    // Esta función envía la altura al documento padre (WordPress)
    const sendHeight = () => {
      if (appRef.current) {
        const height = appRef.current.scrollHeight;
        window.parent.postMessage({ frameHeight: height }, 'https://mialquilergarantias.com.ar');
      }
    };

    // Usamos ResizeObserver para detectar cambios de tamaño en el contenido
    const resizeObserver = new ResizeObserver(sendHeight);
    if (appRef.current) {
      resizeObserver.observe(appRef.current);
    }

    // Envía la altura inicial
    sendHeight();

    // Limpieza al desmontar el componente
    return () => {
      if(appRef.current) {
        resizeObserver.unobserve(appRef.current);
      }
    };
  }, [activeTab]); // Se ejecuta de nuevo cuando cambia el tab activo

  return (
    <div ref={appRef} className="font-poppins p-2">
      <div className="w-full max-w-5xl mx-auto">
        <main className="w-full bg-white rounded-2xl shadow-lg p-3 md:p-5 border border-slate-200">
          {/* Tabs de navegación */}
          <div className="mb-8">
            <nav className="flex flex-col sm:flex-row gap-3 sm:gap-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('garantia')}
                className={`group relative flex items-center gap-3 px-5 py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
                  activeTab === 'garantia'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-md border border-slate-200'
                }`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-6 w-6 transition-transform ${activeTab === 'garantia' ? '' : 'group-hover:scale-110'}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="flex flex-col items-start">
                  <span className="text-base">Garantía de Alquiler</span>
                  <span className={`text-xs font-normal ${activeTab === 'garantia' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    Calculá el costo de tu garantía
                  </span>
                </div>
                {activeTab === 'garantia' && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-indigo-600 rotate-45"></div>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('incrementos')}
                className={`group relative flex items-center gap-3 px-5 py-4 rounded-xl font-semibold transition-all duration-200 shadow-sm ${
                  activeTab === 'incrementos'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:shadow-md border border-slate-200'
                }`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-6 w-6 transition-transform ${activeTab === 'incrementos' ? '' : 'group-hover:scale-110'}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div className="flex flex-col items-start">
                  <span className="text-base">Actualización de Alquiler</span>
                  <span className={`text-xs font-normal ${activeTab === 'incrementos' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    Calculá los incrementos por índice
                  </span>
                </div>
                {activeTab === 'incrementos' && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-indigo-600 rotate-45"></div>
                )}
              </button>
            </nav>
          </div>

          {/* Contenido según el tab activo */}
          {activeTab === 'garantia' && <CalculadoraGarantia />}
          {activeTab === 'incrementos' && <CalculadoraIncrementos />}
        </main>
      </div>
    </div>
  );
}