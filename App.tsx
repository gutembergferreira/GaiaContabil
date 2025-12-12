import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardClient from './components/DashboardClient';
import DocumentVault from './components/DocumentVault';
import HRManagement from './components/HRManagement';
import CommunicationCenter from './components/CommunicationCenter';
import SettingsManager from './components/SettingsManager';
import NotificationPage from './components/NotificationPage';
import MonthlyRoutines from './components/MonthlyRoutines';
import UserProfile from './components/UserProfile';
import { Role, User } from './types';
import { getUsers, updateUser } from './services/mockData';

const App: React.FC = () => {
  // Global State simulation
  const [currentUser, setCurrentUser] = useState<User>(getUsers()[0]); // Default to admin
  const [role, setRole] = useState<Role>(currentUser.role);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentCompanyId, setCurrentCompanyId] = useState<string>('c1');

  // Sync role when user switches (Demo purpose)
  useEffect(() => {
     if (role === 'admin') {
         setCurrentUser(getUsers().find(u => u.role === 'admin')!);
         setCurrentCompanyId('c1'); // Default view
     } else {
         const client = getUsers().find(u => u.role === 'client')!;
         setCurrentUser(client);
         if (client.companyId) setCurrentCompanyId(client.companyId);
     }
  }, [role]);

  const handleProfileUpdate = () => {
      // Force refresh user data from store
      const updated = getUsers().find(u => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return role === 'admin' ? <DashboardAdmin /> : <DashboardClient />;
      case 'routines':
        return <MonthlyRoutines />; 
      case 'documents':
        return <DocumentVault role={role} currentCompanyId={currentCompanyId} currentUser={currentUser} />;
      case 'hr':
        return <HRManagement role={role} />;
      case 'communication':
        return <CommunicationCenter role={role} />;
      case 'settings':
        return role === 'admin' ? <SettingsManager /> : <div>Acesso Negado</div>;
      case 'notifications':
        return <NotificationPage userId={currentUser.id} />;
      case 'profile':
        return <UserProfile user={currentUser} onUpdate={handleProfileUpdate} />;
      default:
        return role === 'admin' ? <DashboardAdmin /> : <DashboardClient />;
    }
  };

  return (
    <Layout 
      role={role} 
      setRole={setRole} 
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      currentCompanyId={currentCompanyId}
      setCurrentCompanyId={setCurrentCompanyId}
      currentUser={currentUser}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
