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

// Helpers de formato numérico argentino (1.250.000,50)
const formatArgentineNumber = (value) => {
  const cleaned = value.replace(/[^\d,]/g, '');
  const commaIndex = cleaned.indexOf(',');
  if (commaIndex === -1) {
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const intPart = cleaned.substring(0, commaIndex);
  const decPart = cleaned.substring(commaIndex + 1).replace(/,/g, '');
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decPart}`;
};

const parseArgentineNumber = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/\./g, '').replace(',', '.')) || 0;
};

// Configuración de tasas de interés desde variables de entorno
const INTEREST_RATES = {
  three: parseFloat(import.meta.env.VITE_RATE_THREE) || 1.076,
  six: parseFloat(import.meta.env.VITE_RATE_SIX) || 1.135,
  twelve: parseFloat(import.meta.env.VITE_RATE_TWELVE) || 1.255,
};

export default function CalculadoraGarantia() {
  const [duration, setDuration] = useState(24);
  const [rent, setRent] = useState('');
  const [expenses, setExpenses] = useState('');

  const costs = useMemo(() => {
    const numRent = parseArgentineNumber(rent);
    const numExpenses = parseArgentineNumber(expenses);
    const numDuration = parseInt(duration, 10) || 0;
    const totalCost = (numRent + numExpenses) * numDuration * 0.07;
    const upfrontPayment = totalCost * 0.80;
    const threePaymentsValue = (totalCost * INTEREST_RATES.three) / 3;
    const sixPaymentsValue = (totalCost * INTEREST_RATES.six) / 6;
    const twelvePaymentsValue = (totalCost * INTEREST_RATES.twelve) / 12;
    return { total: totalCost, upfront: upfrontPayment, threePayments: threePaymentsValue, sixPaymentsValue, twelvePaymentsValue };
  }, [duration, rent, expenses]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Columna izquierda: Variables del contrato + Total */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-700 border-b pb-2">Variables del Contrato</h2>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-slate-600 mb-1">
            Duración del Contrato (en meses)
          </label>
          <div className="relative">
            <input
              id="duration"
              type="number"
              min="6"
              max="60"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ej: 24"
              className="w-full pl-4 pr-20 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
              meses
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="rent" className="block text-sm font-medium text-slate-600 mb-1">Precio Primer Alquiler</label>
          <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span><input id="rent" type="text" inputMode="decimal" value={rent} onChange={(e) => setRent(formatArgentineNumber(e.target.value))} placeholder="Ej: 250.000" className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/></div>
        </div>
        <div>
          <label htmlFor="expenses" className="block text-sm font-medium text-slate-600 mb-1">Precio Primer Mes de Expensas</label>
          <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span><input id="expenses" type="text" inputMode="decimal" value={expenses} onChange={(e) => setExpenses(formatArgentineNumber(e.target.value))} placeholder="Ej: 50.000" className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/></div>
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
        {/* Logo debajo del total */}
        <div className="flex justify-center mt-4">
          <img src="/logo_mercado_pago.webp" alt="Logo Mercado Pago" className="h-16 w-auto" />
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
            <p className="text-xs text-green-700 mt-2">
              {INTEREST_RATES.three === 1
                ? <span className="inline-block bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold tracking-wide">SIN INTERÉS</span>
                : `Con ${(Math.round((INTEREST_RATES.three - 1) * 1000) / 10).toLocaleString('es-AR')}% de interés.`}
            </p>
          </div>
          <ResultCard
            title="6 Pagos de"
            amount={costs.sixPaymentsValue}
            description={INTEREST_RATES.six === 1
              ? <span className="inline-block bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold tracking-wide">SIN INTERÉS</span>
              : `Con ${(Math.round((INTEREST_RATES.six - 1) * 1000) / 10).toLocaleString('es-AR')}% de interés`}
          />
          <ResultCard
            title="12 Pagos de"
            amount={costs.twelvePaymentsValue}
            description={INTEREST_RATES.twelve === 1
              ? <span className="inline-block bg-green-500 text-white px-2 py-0-5 rounded-full font-semibold tracking-wide">SIN INTERÉS</span>
              : `Con ${(Math.round((INTEREST_RATES.twelve - 1) * 1000) / 10).toLocaleString('es-AR')}% de interés`}
          />
        </div>
      </div>
    </div>
  );
}
