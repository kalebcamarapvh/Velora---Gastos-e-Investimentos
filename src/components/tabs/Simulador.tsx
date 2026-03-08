import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator } from 'lucide-react';

export const Simulador = () => {
  const [valorInicial, setValorInicial] = useState(10000);
  const [aporteMensal, setAporteMensal] = useState(1000);
  const [taxaJuros, setTaxaJuros] = useState(10);
  const [tempoAnos, setTempoAnos] = useState(10);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calcularJurosCompostos = () => {
    const meses = tempoAnos * 12;
    const taxaMensal = Math.pow(1 + taxaJuros / 100, 1 / 12) - 1;
    let montante = valorInicial;
    let totalInvestido = valorInicial;
    const dados = [];

    for (let i = 1; i <= meses; i++) {
      montante = montante * (1 + taxaMensal) + aporteMensal;
      totalInvestido += aporteMensal;

      if (i % 12 === 0 || i === meses) {
        dados.push({
          ano: `Ano ${i / 12}`,
          montante: Math.round(montante),
          investido: Math.round(totalInvestido),
          juros: Math.round(montante - totalInvestido)
        });
      }
    }

    return {
      dados,
      patrimonioFinal: montante,
      totalInvestido,
      jurosAcumulados: montante - totalInvestido
    };
  };

  const resultado = calcularJurosCompostos();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Parâmetros</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Inicial (R$)</label>
              <input
                type="number"
                value={valorInicial}
                onChange={(e) => setValorInicial(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Aporte Mensal (R$)</label>
              <input
                type="number"
                value={aporteMensal}
                onChange={(e) => setAporteMensal(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Taxa de Juros Anual (%)</label>
              <input
                type="number"
                value={taxaJuros}
                onChange={(e) => setTaxaJuros(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tempo (Anos)</label>
              <input
                type="number"
                value={tempoAnos}
                onChange={(e) => setTempoAnos(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Patrimônio Final</h3>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(resultado.patrimonioFinal)}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Investido</h3>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(resultado.totalInvestido)}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-1">Juros Acumulados</h3>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(resultado.jurosAcumulados)}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Crescimento do Patrimônio</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={resultado.dados}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="montante" name="Patrimônio Total" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="investido" name="Valor Investido" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
