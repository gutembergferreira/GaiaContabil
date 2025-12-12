import React, { useState, useEffect } from 'react';
import { addNotification, getUsers, getAllNotifications, updateNotification, deleteNotification } from '../services/mockData';
import { Send, Bell, User, History, Edit2, Trash2, Save, X } from 'lucide-react';
import { Role, Notification } from '../types';

interface CommunicationCenterProps {
  role: Role;
}

const CommunicationCenter: React.FC<CommunicationCenterProps> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  
  // Send Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetUser, setTargetUser] = useState('all');
  const [users, setUsers] = useState(getUsers());

  // History State
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', message: '' });

  useEffect(() => {
    setUsers(getUsers().filter(u => u.role === 'client'));
    if (role === 'admin') {
        refreshHistory();
    }
  }, [role]);

  const refreshHistory = () => {
      setSentNotifications(getAllNotifications());
  };

  const handleSend = () => {
    if(!title || !message) return;

    if (targetUser === 'all') {
        users.forEach(u => {
            addNotification({
                id: Date.now().toString() + Math.random(),
                userId: u.id,
                title,
                message,
                read: false,
                timestamp: new Date().toISOString()
            });
        });
    } else {
        addNotification({
            id: Date.now().toString(),
            userId: targetUser,
            title,
            message,
            read: false,
            timestamp: new Date().toISOString()
        });
    }

    alert('Notificação enviada com sucesso!');
    setTitle('');
    setMessage('');
    refreshHistory();
  };

  const startEdit = (n: Notification) => {
      setEditingId(n.id);
      setEditForm({ title: n.title, message: n.message });
  };

  const saveEdit = (id: string) => {
      const original = sentNotifications.find(n => n.id === id);
      if (original) {
          updateNotification({ ...original, title: editForm.title, message: editForm.message });
          setEditingId(null);
          refreshHistory();
      }
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditForm({ title: '', message: '' });
  };

  const deleteNotif = (id: string) => {
      if (confirm('Deseja excluir esta notificação?')) {
          deleteNotification(id);
          refreshHistory();
      }
  };

  const getUserName = (id: string) => {
      const u = users.find(user => user.id === id);
      return u ? u.name : 'Usuário Removido';
  };

  if (role !== 'admin') {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Bell size={48} className="mb-4" />
              <p>Você receberá notificações importantes no ícone de sino acima.</p>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Centro de Comunicações</h2>
       </div>

       <div className="flex gap-4 border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('send')}
             className={`pb-3 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'send' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               <Send size={18} /> Nova Notificação
           </button>
           <button 
             onClick={() => { setActiveTab('history'); refreshHistory(); }}
             className={`pb-3 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               <History size={18} /> Histórico Enviados
           </button>
       </div>
       
       {activeTab === 'send' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
              <div className="space-y-4">
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Destinatário</label>
                     <select 
                        value={targetUser} 
                        onChange={e => setTargetUser(e.target.value)}
                        className="w-full border rounded-lg p-2.5"
                     >
                        <option value="all">Todos os Clientes</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
                        ))}
                     </select>
                 </div>

                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                     <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        className="w-full border rounded-lg p-2.5"
                        placeholder="Ex: Vencimento de Guia"
                     />
                 </div>

                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem</label>
                     <textarea 
                        value={message} 
                        onChange={e => setMessage(e.target.value)}
                        rows={4}
                        className="w-full border rounded-lg p-2.5"
                        placeholder="Digite a mensagem que aparecerá na notificação..."
                     />
                 </div>

                 <div className="pt-2">
                     <button 
                        onClick={handleSend}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                     >
                        <Send size={18} /> Enviar Push Notification
                     </button>
                 </div>
              </div>
           </div>
       )}

       {activeTab === 'history' && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                           <tr>
                               <th className="px-6 py-3">Data</th>
                               <th className="px-6 py-3">Destinatário</th>
                               <th className="px-6 py-3">Conteúdo</th>
                               <th className="px-6 py-3 text-right">Ações</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {sentNotifications.map(n => (
                               <tr key={n.id} className="hover:bg-slate-50">
                                   <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                       {new Date(n.timestamp).toLocaleDateString()} <br/>
                                       <span className="text-xs">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                   </td>
                                   <td className="px-6 py-4">
                                       <span className="flex items-center gap-2">
                                           <User size={14} className="text-slate-400"/>
                                           {getUserName(n.userId)}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 max-w-md">
                                       {editingId === n.id ? (
                                           <div className="space-y-2">
                                               <input 
                                                  className="w-full border rounded p-1 text-sm" 
                                                  value={editForm.title}
                                                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                                               />
                                               <textarea 
                                                  className="w-full border rounded p-1 text-sm" 
                                                  rows={2}
                                                  value={editForm.message}
                                                  onChange={e => setEditForm({...editForm, message: e.target.value})}
                                               />
                                           </div>
                                       ) : (
                                           <div>
                                               <p className="font-medium text-slate-800">{n.title}</p>
                                               <p className="text-slate-600 truncate">{n.message}</p>
                                           </div>
                                       )}
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                       {editingId === n.id ? (
                                           <div className="flex justify-end gap-2">
                                               <button onClick={() => saveEdit(n.id)} className="text-green-600 hover:text-green-800"><Save size={18}/></button>
                                               <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                                           </div>
                                       ) : (
                                           <div className="flex justify-end gap-2">
                                               <button onClick={() => startEdit(n)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16}/></button>
                                               <button onClick={() => deleteNotif(n.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                           </div>
                                       )}
                                   </td>
                               </tr>
                           ))}
                           {sentNotifications.length === 0 && (
                               <tr><td colSpan={4} className="p-6 text-center text-slate-400">Nenhuma notificação enviada.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
       )}
    </div>
  );
};

export default CommunicationCenter;
