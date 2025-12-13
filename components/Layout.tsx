import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, Users, Bell, Settings, LogOut, Briefcase, Building2, Menu, X, UserCircle, ChevronDown, MessageSquare
} from 'lucide-react';
import { Role, Company, User } from '../types';
import { getCompanies, getUsers, getNotifications, markNotificationRead } from '../services/mockData';

interface LayoutProps {
  children: React.ReactNode;
  role: Role;
  setRole: (role: Role) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  currentCompanyId: string;
  setCurrentCompanyId: (id: string) => void;
  currentUser: User;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, role, setRole, currentPage, setCurrentPage, currentCompanyId, setCurrentCompanyId, currentUser
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notifications, setNotifications] = useState(getNotifications(currentUser.id));
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    setCompanies(getCompanies());
  }, [role, currentPage]); // Refresh when context changes

  useEffect(() => {
    // Immediate fetch
    setNotifications(getNotifications(currentUser.id));
    const interval = setInterval(() => {
        setNotifications(getNotifications(currentUser.id));
    }, 2000); 
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const adminMenu = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'routines', label: 'Rotinas Mensais', icon: FileText },
    { id: 'documents', label: 'Arquivos', icon: FileText }, 
    { id: 'requests', label: 'Solicitações', icon: MessageSquare }, // New
    { id: 'communication', label: 'Comunicados', icon: Briefcase },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const clientMenu = [
    { id: 'dashboard', label: 'Meu Painel', icon: LayoutDashboard },
    { id: 'requests', label: 'Solicitações / Pedidos', icon: MessageSquare }, // New
    { id: 'documents', label: 'Arquivos', icon: FileText },
    { id: 'hr', label: 'Depto. Pessoal', icon: Users },
  ];

  const menuItems = role === 'admin' ? adminMenu : clientMenu;

  const currentCompanyName = companies.find(c => c.id === currentCompanyId)?.name || 'Empresa';

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowNotifDropdown(false);
    setCurrentPage('notifications');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-lg tracking-wide">Contabil</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        <div className="px-4 mt-6">
           <label className="text-xs text-slate-500 uppercase font-semibold block mb-2">Empresa Selecionada</label>
           
           {role === 'admin' ? (
             <div className="relative">
                <select 
                  value={currentCompanyId}
                  onChange={(e) => setCurrentCompanyId(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
             </div>
           ) : (
             <div className="w-full bg-slate-800/50 text-slate-300 border border-slate-700 rounded-lg p-2 text-sm flex items-center gap-2">
                <Building2 size={16} />
                <span className="truncate">{currentCompanyName}</span>
             </div>
           )}
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setIsSidebarOpen(false);
              }}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex flex-col space-y-3">
             <div className="flex items-center justify-between px-2 text-sm text-slate-400">
                <span>Trocar Perfil (Demo)</span>
             </div>
             <div className="flex p-1 bg-slate-800 rounded-lg">
                <button 
                  onClick={() => setRole('admin')}
                  className={`flex-1 py-1 text-xs font-medium rounded ${role === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Admin
                </button>
                <button 
                  onClick={() => setRole('client')}
                  className={`flex-1 py-1 text-xs font-medium rounded ${role === 'client' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  Cliente
                </button>
             </div>
             
             <button 
                onClick={() => setCurrentPage('profile')}
                className="flex items-center space-x-3 w-full px-4 py-2 text-slate-400 hover:text-white transition-colors"
             >
                <UserCircle size={18} />
                <span>Meu Perfil</span>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 px-4 lg:px-0">
             <h2 className="text-xl font-semibold text-slate-800">
               {menuItems.find(i => i.id === currentPage)?.label || 
                (currentPage === 'notifications' ? 'Notificações' : 
                 currentPage === 'profile' ? 'Meu Perfil' : 'ContabilConnect')}
             </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
                <Bell size={20} className="text-slate-600 cursor-pointer hover:text-blue-600" />
              </button>

              {/* Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                   <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex justify-between items-center">
                     <span>Notificações</span>
                     <div 
                      onClick={handleNotificationClick}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      Ver todas
                    </div>
                   </div>
                   <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Nenhuma notificação.</div>
                      ) : (
                        notifications.slice(0, 5).map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                                markNotificationRead(n.id);
                                setNotifications(getNotifications(currentUser.id));
                            }}
                            className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                          >
                             <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm font-medium ${!n.read ? 'text-blue-800' : 'text-slate-700'}`}>{n.title}</span>
                                <span className="text-[10px] text-slate-400">{new Date(n.timestamp).toLocaleDateString()}</span>
                             </div>
                             <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              )}
            </div>

            <div 
              className="flex items-center space-x-3 pl-4 border-l border-slate-200 cursor-pointer group"
              onClick={() => setCurrentPage('profile')}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{currentUser.name}</p>
                <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
              </div>
              {currentUser.photoUrl ? (
                <img src={currentUser.photoUrl} className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-blue-300 transition-all" />
              ) : (
                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                   {currentUser.name.substring(0,2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
           {showNotifDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)}></div>}
           <div className="max-w-7xl mx-auto">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
