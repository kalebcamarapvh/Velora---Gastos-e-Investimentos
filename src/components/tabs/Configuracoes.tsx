import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Database, LogOut } from 'lucide-react';

export const Configuracoes = () => {
  const [activeTab, setActiveTab] = useState('perfil');

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      // Trigger the global logout event we set up in App.tsx
      window.dispatchEvent(new Event('auth-unauthorized'));
    } catch (e) {
      console.error('Logout falhou:', e);
    }
  };

  const navItems = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'preferencias', label: 'Preferências', icon: Settings },
    { id: 'dados', label: 'Dados', icon: Database },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === item.id
                ? 'bg-violet-100/50 text-violet-600 dark:bg-violet-600/20 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525] hover:text-gray-900 dark:hover:text-white border border-transparent'
                }`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#EA4335] text-white rounded-xl font-medium transition-colors hover:bg-[#d93025]"
            >
              <LogOut className="w-5 h-5" /> Fazer Logout
            </button>
          </div>
        </div>

        <div className="col-span-1 md:col-span-3">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Configurações de Perfil</h2>

            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-3xl text-gray-500 dark:text-gray-400 font-bold">
                  US
                </div>
                <div>
                  <button className="px-4 py-2 bg-gray-50 dark:bg-[#252525] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:border-violet-500 hover:text-violet-600 dark:hover:text-white transition-colors text-sm font-medium">
                    Alterar Foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    defaultValue="Usuário Financeiro"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    defaultValue="usuario@email.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Moeda Principal</label>
                  <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all">
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Fuso Horário</label>
                  <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all">
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-4">
                <button className="px-6 py-2 bg-transparent border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium">
                  Cancelar
                </button>
                <button className="px-6 py-2 bg-violet-600 border border-violet-500 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm">
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
