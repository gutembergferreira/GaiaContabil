import React, { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead } from '../services/mockData';
import { Notification } from '../types';
import { Bell, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';

interface NotificationPageProps {
  userId: string;
}

const NotificationPage: React.FC<NotificationPageProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setNotifications(getNotifications(userId));
  }, [userId]);

  const toggleExpand = (id: string, isRead: boolean) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!isRead) {
        markNotificationRead(id);
        setNotifications(getNotifications(userId)); // Refresh to update read status visually
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <Bell className="text-blue-600" /> Minhas Notificações
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Você não possui notificações no momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`transition-colors ${!notif.read ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50'}`}
              >
                <div 
                  className="p-4 cursor-pointer flex justify-between items-start gap-4"
                  onClick={() => toggleExpand(notif.id, notif.read)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 block" title="Não lida"></span>
                      )}
                      <h4 className={`text-base ${!notif.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-slate-400 ml-auto block sm:hidden">
                        {new Date(notif.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm text-slate-600 ${expandedId === notif.id ? '' : 'line-clamp-1'}`}>
                       {notif.message}
                    </p>
                  </div>
                  
                  <div className="hidden sm:flex flex-col items-end gap-1">
                     <span className="text-xs text-slate-400">
                        {new Date(notif.timestamp).toLocaleDateString()} {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                     {expandedId === notif.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                  </div>
                </div>

                {expandedId === notif.id && (
                  <div className="px-4 pb-4 pl-8 sm:pl-4">
                     <div className="pt-2 border-t border-slate-200/50 text-slate-700 text-sm leading-relaxed">
                        {notif.message}
                     </div>
                     <div className="mt-2 flex justify-end">
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCheck size={14} /> Lida
                        </span>
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
