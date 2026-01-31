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
          <div className="mb-6 border-b border-slate-200">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('garantia')}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'garantia'
                    ? 'bg-slate-100 text-slate-900 border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Garantía de Alquiler
              </button>
              <button
                onClick={() => setActiveTab('incrementos')}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'incrementos'
                    ? 'bg-slate-100 text-slate-900 border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Actualización de Alquiler
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