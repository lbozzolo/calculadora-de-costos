import React, { useState, useMemo } from 'react';

// Componente para un ícono de información
const InfoIcon = ({ className = 'text-gray-400' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={`inline-block ml-1 ${className}`} viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.055.492.116.558.162.067.047.105.118.105.246v.255a2.5 2.5 0 0 0-.715.435c-.32.224-.464.49-.464.862v.518H8.93v-.518c0-.244.027-.47.08-.688.052-.217.158-.404.308-.563.15-.159.342-.295.577-.402.235-.107.496-.193.783-.259v-.518c0-.244-.027-.47-.08-.688-.052-.217-.158-.404-.308-.563a2.06 2.06 0 0 0-.577-.402 2.167 2.167 0 0 0-.783-.259zM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
  </svg>
);

// Componente para una tarjeta de resultado
const ResultCard = ({ title, amount, description, bgColor = 'bg-slate-50', borderColor = 'border-slate-200' }) => (
  <div className={`p-4 rounded-lg shadow-sm ${bgColor} border ${borderColor}`}>
    <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    <p className="text-2xl font-bold text-slate-800">
      {amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
    </p>
    {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
  </div>
);

// Componente principal de la aplicación
export default function App() {
  const [duration, setDuration] = useState(24);
  const [rent, setRent] = useState(250000);
  const [expenses, setExpenses] = useState(50000);

  const costs = useMemo(() => {
    const numRent = parseFloat(rent) || 0;
    const numExpenses = parseFloat(expenses) || 0;
    const numDuration = parseInt(duration, 10) || 0;
    const totalCost = (numRent + numExpenses) * numDuration * 0.07;
    const upfrontPayment = totalCost * 0.80;
    const threePaymentsValue = totalCost / 3;
    // Nueva forma: 1 adelanto del 30% y 3 cuotas sin interés del 23.33% cada una
    const advance30 = totalCost * 0.30;
    const threePayments2333 = (totalCost * 0.70) / 3;
    return { total: totalCost, upfront: upfrontPayment, threePayments: threePaymentsValue, advance30, threePayments2333 };
  }, [duration, rent, expenses]);

  return (
    <div className="min-h-screen font-poppins flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800">Calculadora de Costos</h1>
        </div> */}
        <main className="w-full bg-white rounded-2xl shadow-lg p-6 md:p-10 border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Columna izquierda: Variables del contrato + Total */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-700 border-b pb-2">Variables del Contrato</h2>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-slate-600 mb-2">
                  Duración del Contrato: <span className="font-bold text-indigo-600">{duration} meses</span>
                </label>
                <input id="duration" type="range" min="6" max="60" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>6 meses</span><span>60 meses</span></div>
              </div>
              <div>
                <label htmlFor="rent" className="block text-sm font-medium text-slate-600 mb-1">Precio Primer Alquiler</label>
                <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span><input id="rent" type="number" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="Ej: 250000" className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/></div>
              </div>
              <div>
                <label htmlFor="expenses" className="block text-sm font-medium text-slate-600 mb-1">Precio Primer Mes de Expensas</label>
                <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span><input id="expenses" type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="Ej: 50000" className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/></div>
              </div>
              {/* Total debajo de las variables */}
              <div className="bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Total</h3>
                  <InfoIcon className="text-slate-400" />
                </div>
                <p className="text-2xl font-bold mt-1">{costs.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
                <p className="text-xs text-slate-500 mt-2 opacity-90">Contrato de {duration} meses</p>
              </div>
            </div>
            {/* Columna derecha: Opciones de pago */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-700 border-b pb-2">Opciones de Pago</h2>
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-[#352884] to-[#40E7DF] text-white p-6 rounded-lg shadow-lg border border-[#352884]">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl md:text-2xl font-bold">1 Pago al Contado</h3>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold mt-2">{costs.upfront.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
                  <p className="text-xs md:text-sm text-white/80 mt-2">Incluye 20% de descuento.</p>
                </div>
                <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold">3 Pagos de</h3>
                  </div>
                  <p className="text-2xl font-bold mt-1">{costs.threePayments.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
                  <p className="text-xs text-green-700 mt-2">Cuotas sin interés.</p>
                </div>
                <ResultCard
                  title="6 Pagos de"
                  amount={(costs.total * 1.40) / 6}
                  description="En efectivo o transferencia"
                />
                {/*
                <ResultCard
                  title="1 Adelanto y 3 Cuotas"
                  amount={costs.advance30}
                  description={
                    <span>
                      Adelanto del <b>30%</b> ({costs.advance30.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })})<br/>
                      3 cuotas de <b>{costs.threePayments2333.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b> (23,33% c/u)
                    </span>
                  }
                  bgColor="bg-slate-50"
                  borderColor="border-slate-200"
                />
                */}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}