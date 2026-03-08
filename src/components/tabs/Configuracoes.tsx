import React from 'react';
import { Settings, User, Bell, Shield, Database } from 'lucide-react';

export const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white text-emerald-600 rounded-xl shadow-sm border border-emerald-100 font-medium transition-colors">
            <User className="w-5 h-5" /> Perfil
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" /> Preferências
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 rounded-xl font-medium transition-colors">
            <Database className="w-5 h-5" /> Dados
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 rounded-xl font-medium transition-colors">
            <Bell className="w-5 h-5" /> Notificações
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 rounded-xl font-medium transition-colors">
            <Shield className="w-5 h-5" /> Segurança
          </button>
        </div>

        <div className="col-span-1 md:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Configurações de Perfil</h2>
            
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-3xl text-slate-500 font-bold">
                  AU
                </div>
                <div>
                  <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                    Alterar Foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    defaultValue="Aluno AUVP"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    defaultValue="aluno@auvp.com.br"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Moeda Principal</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white">
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fuso Horário</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white">
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                <button className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                  Cancelar
                </button>
                <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
