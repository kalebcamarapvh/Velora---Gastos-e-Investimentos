import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Database, LogOut, X, UploadCloud, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { usePrivacy } from '../../contexts/PrivacyContext';

export const Configuracoes = () => {
  const [activeTab, setActiveTab] = useState('perfil');
  const { theme, setTheme } = useTheme();
  const { hidden, togglePrivacy } = usePrivacy();

  const [startTab, setStartTab] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('velora-start-tab') || 'dashboard';
    return 'dashboard';
  });

  // Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false); // New state to differentiate Reset vs Delete
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (isReset: boolean) => {
    setIsResetMode(isReset);
    setShowDeleteModal(true);
    setDeleteError('');
    setDeletePassword('');
  };

  const handleStartTabChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTab = e.target.value;
    setStartTab(newTab);
    localStorage.setItem('velora-start-tab', newTab);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      window.dispatchEvent(new Event('auth-unauthorized'));
    } catch (e) {
      console.error('Logout falhou:', e);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/export', { credentials: 'include' });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_financeiro_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportError('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportFile(e.dataTransfer.files[0]);
      setImportError('');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImportData = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportError('');
    try {
      const text = await importFile.text();
      const jsonData = JSON.parse(text);

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      if (!res.ok) {
        const err = await res.json();
        setImportError(err.error || 'Erro ao importar dados.');
        setIsImporting(false);
        return;
      }
      setShowImportModal(false);
      setIsImporting(false);
      setImportFile(null);
      window.location.reload(); // Reload to refresh contexts with newly imported data
    } catch (e) {
      setImportError('Arquivo JSON inválido ou erro de conexão.');
      setIsImporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const endpoint = isResetMode ? '/api/account/reset' : '/api/account';
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      });
      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.error || 'Erro ao processar solicitação.');
        setIsDeleting(false);
        return;
      }
      if (isResetMode) {
        setShowDeleteModal(false);
        setIsDeleting(false);
        window.location.reload();
      } else {
        window.dispatchEvent(new Event('auth-unauthorized'));
      }
    } catch (e) {
      setDeleteError('Erro de conexão com o servidor.');
      setIsDeleting(false);
    }
  };

  const navItems = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'preferencias', label: 'Preferências', icon: Settings },
    { id: 'dados', label: 'Dados', icon: Database },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <>
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
          </>
        );
      case 'preferencias':
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Preferências</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Aparência</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={(e) => setTheme('dark', e)} className={`flex flex-col items-center gap-3 p-4 border rounded-xl transition-colors ${theme === 'dark' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 text-gray-700 dark:text-gray-400'}`}>
                    <div className="w-full h-20 bg-[#121212] rounded border border-gray-800 shadow-sm flex items-center justify-center">
                      <span className="text-xs text-gray-400">Escuro</span>
                    </div>
                    <span className="text-sm font-medium">Modo Escuro</span>
                  </button>
                  <button onClick={(e) => setTheme('light', e)} className={`flex flex-col items-center gap-3 p-4 border rounded-xl transition-colors ${theme === 'light' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 text-gray-700 dark:text-gray-400'}`}>
                    <div className="w-full h-20 bg-white rounded border border-gray-200 shadow-sm flex items-center justify-center">
                      <span className="text-xs text-gray-500">Claro</span>
                    </div>
                    <span className="text-sm font-medium">Modo Claro</span>
                  </button>
                  <button onClick={(e) => setTheme('system', e)} className={`flex flex-col items-center gap-3 p-4 border rounded-xl transition-colors ${theme === 'system' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 text-gray-700 dark:text-gray-400'}`}>
                    <div className="w-full h-20 bg-gradient-to-r from-gray-100 to-[#121212] rounded border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center">
                      <span className="text-xs text-gray-500">Auto</span>
                    </div>
                    <span className="text-sm font-medium">Sistema</span>
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Gerais</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Ocultar saldos por padrão</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Ao abrir o app, os valores estarão borrados</p>
                    </div>
                    <div onClick={togglePrivacy} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${hidden ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${hidden ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Tela Inicial</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aba exibida ao fazer login</p>
                    </div>
                    <select value={startTab} onChange={handleStartTabChange} className="px-3 py-1.5 bg-gray-50 dark:bg-[#252525] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500 block w-40">
                      <option value="dashboard">Dashboard</option>
                      <option value="carteira-dividendos">Carteira</option>
                      <option value="gastos">Gastos</option>
                      <option value="receitas">Receitas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'dados':
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Gestão de Dados</h2>
            <div className="space-y-6">
              <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                <h3 className="text-base font-bold text-blue-800 dark:text-blue-400 mb-2">Exportar seus dados</h3>
                <p className="text-sm text-blue-600 dark:text-blue-300 mb-4">Baixe um arquivo seguro com todo o seu histórico financeiro, transações e configurações da base de dados.</p>
                <button onClick={handleExportData} className="px-4 py-2 bg-blue-600 border border-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">Exportar Backup (.json)</button>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Importar dados</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Traga seus dados de outras planilhas, softwares antigos ou bancos.</p>
                <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:border-violet-500 hover:text-violet-600 dark:hover:text-white transition-colors text-sm font-medium shadow-sm">Importar Arquivos / Backup</button>
              </div>

              <div className="p-5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl">
                <h3 className="text-base font-bold text-red-800 dark:text-red-400 mb-2">Zona de Perigo</h3>
                <p className="text-sm text-red-600 dark:text-red-300/80 mb-4 border-b border-red-200 dark:border-red-900/50 pb-4">Estas ações são destrutivas e irreversíveis. Tenha certeza do que está fazendo.</p>
                <div className="flex gap-4">
                  <button onClick={() => openDeleteModal(true)} className="px-4 py-2 bg-transparent border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium">Zerar Conta</button>
                  <button onClick={() => openDeleteModal(false)} className="px-4 py-2 bg-red-600 border border-red-500 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm">Excluir Conta</button>
                </div>
              </div>
            </div>
          </>
        );
      case 'notificacoes':
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notificações</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Resumo Semanal</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receba um balanço das suas finanças toda segunda-feira.</p>
                </div>
                <div className="w-12 h-6 bg-violet-600 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Alerta de Vencimentos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lembretes 2 dias antes de uma conta ou assinatura vencer.</p>
                </div>
                <div className="w-12 h-6 bg-violet-600 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>

              <div className="flex items-center justify-between pb-5">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Metas Financeiras</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Seja avisado quando atingir ou estiver perto de concluir uma meta.</p>
                </div>
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white dark:bg-gray-400 rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-4">
                <button className="px-6 py-2 bg-violet-600 border border-violet-500 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm">
                  Salvar Preferências
                </button>
              </div>
            </div>
          </>
        );
      case 'seguranca':
        return (
          <>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Segurança da Conta</h2>
            <div className="space-y-6">

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Senha e Autenticação</h3>
                <div className="grid grid-cols-1 gap-4 max-w-sm">
                  <div>
                    <input type="password" placeholder="Senha Atual" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
                  </div>
                  <div>
                    <input type="password" placeholder="Nova Senha" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
                  </div>
                  <div className="pt-2">
                    <button className="w-full px-4 py-2 bg-gray-50 dark:bg-[#333] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg hover:border-violet-500 transition-colors text-sm font-medium">Trocar Senha Agora</button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Sessões Ativas</h3>
                <div className="p-4 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Windows • Chrome</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Atividade Recente • Brasil</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 px-2 leading-tight py-1 rounded-md">
                      Sessão Atual
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    Encerrar todas as outras sessões
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
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
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* IMPORT DATA MODAL - "Add anything" File Drop Style */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur and dark overlay simulating the chatgpt modal */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}></div>

          <div className="relative w-full max-w-lg bg-[#212121] text-gray-200 rounded-3xl shadow-2xl p-10 flex flex-col items-center text-center animate-in slide-in-from-bottom-10 fade-in duration-300">
            <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportError(''); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6 flex gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center transform -rotate-6 shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center z-10 shadow-lg" style={{ transform: 'translateY(-10px)' }}>
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center transform rotate-6 shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Importar Dados</h2>
            <p className="text-gray-400 mb-8 font-medium">Faça o upload do seu arquivo de backup (.json) gerado anteriormente.</p>

            {importError && (
              <div className="mb-6 px-4 py-2 w-full bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm">
                {importError}
              </div>
            )}

            {!importFile ? (
              <>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="w-full h-32 border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center hover:border-violet-500 hover:bg-violet-500/10 transition-all relative"
                >
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Selecione ou solte aqui</span>
                  <span className="text-gray-500 text-xs mt-1">Apenas arquivos .json suportados</span>
                </div>
              </>
            ) : (
              <div className="w-full space-y-4">
                <div className="w-full flex items-center justify-between p-4 bg-[#2a2a2a] rounded-xl border border-gray-700">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-violet-400" />
                    <span className="text-sm font-medium text-gray-200 truncate max-w-[200px]">{importFile.name}</span>
                  </div>
                  <button onClick={() => setImportFile(null)} className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">Remover</button>
                </div>
                <button
                  onClick={handleImportData}
                  disabled={isImporting}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isImporting ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isResetMode ? 'Zerar seus dados' : 'Excluir sua conta'}
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Você tem certeza absoluta? Isso {isResetMode ? 'limpará todo o seu histórico financeiro e transações.' : 'excluirá permanentemente seus dados financeiros e sua conta de acesso.'} <strong className="text-gray-900 dark:text-gray-200">Esta ação não pode ser desfeita.</strong>
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-900/50">
                {deleteError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Para confirmar, digite sua senha:</label>
                <input
                  type="password"
                  placeholder="Sua senha..."
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder-gray-400"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={!deletePassword || isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
                >
                  {isDeleting ? 'Processando...' : (isResetMode ? 'Sim, zerar dados' : 'Sim, excluir minha conta')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
