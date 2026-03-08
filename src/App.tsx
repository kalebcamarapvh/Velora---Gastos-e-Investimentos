/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PrivacyProvider } from './contexts/PrivacyContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/tabs/Dashboard';
import { Receitas } from './components/tabs/Receitas';
import { Gastos } from './components/tabs/Gastos';
import { Planejamento } from './components/tabs/Planejamento';
import { Categorias } from './components/tabs/Categorias';
import { Investimentos } from './components/tabs/Investimentos';
import { CarteiraDividendos } from './components/tabs/CarteiraDividendos';
import { HistoricoDividendos } from './components/tabs/HistoricoDividendos';
import { Patrimonio } from './components/tabs/Patrimonio';
import { Metas } from './components/tabs/Metas';
import { Simulador } from './components/tabs/Simulador';
import { Assinaturas } from './components/tabs/Assinaturas';
import { Dividas } from './components/tabs/Dividas';
import { Configuracoes } from './components/tabs/Configuracoes';
import { Admin } from './components/tabs/Admin';
import { Auth } from './components/Auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setIsAdmin(data.isAdmin);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));

    const handleLogout = () => {
      setIsAuthenticated(false);
      setIsAdmin(false);
    };
    window.addEventListener('auth-unauthorized', handleLogout);
    return () => window.removeEventListener('auth-unauthorized', handleLogout);
  }, []);

  const handleLogin = () => {
    fetch('/api/me', { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin);
        }
      })
      .catch(() => { });
    setIsAuthenticated(true);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'receitas': return <Receitas />;
      case 'gastos': return <Gastos />;
      case 'planejamento': return <Planejamento />;
      case 'categorias': return <Categorias />;
      case 'investimentos': return <Investimentos />;
      case 'carteira-dividendos': return <CarteiraDividendos />;
      case 'historico-dividendos': return <HistoricoDividendos />;
      case 'patrimonio': return <Patrimonio />;
      case 'metas': return <Metas />;
      case 'simulador': return <Simulador />;
      case 'assinaturas': return <Assinaturas />;
      case 'dividas': return <Dividas />;
      case 'configuracoes': return <Configuracoes />;
      case 'admin': return isAdmin ? <Admin /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-gray-500">
        Validando sessão segura...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
      <PrivacyProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin}>
          {renderTab()}
        </Layout>
      </PrivacyProvider>
    </ThemeProvider>
  );
}