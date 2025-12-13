import React, { useState, useEffect } from 'react';
import { ServiceRequest, Role, User, ChatMessage, RequestTypeConfig } from '../types';
import { 
    getServiceRequests, addServiceRequest, updateServiceRequest, softDeleteServiceRequest, 
    restoreServiceRequest, getRequestTypes, getDeletedServiceRequests
} from '../services/mockData';
import { 
    Plus, Search, MessageSquare, Clock, CheckCircle, FileText, 
    Send, X, Trash2, RotateCcw, Eye, CreditCard, QrCode, Upload, Download, AlertTriangle
} from 'lucide-react';

interface RequestManagerProps {
  role: Role;
  currentUser: User;
  currentCompanyId: string;
}

const RequestManager: React.FC<RequestManagerProps> = ({ role, currentUser, currentCompanyId }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [deletedRequests, setDeletedRequests] = useState<ServiceRequest[]>([]);
  const [types, setTypes] = useState<RequestTypeConfig[]>([]);
  
  // UI State
  const [view, setView] = useState<'list' | 'bin'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ServiceRequest | null>(null);
  const [filterText, setFilterText] = useState('');
  
  // New Request Form
  const [formData, setFormData] = useState({ title: '', typeId: '', description: '' });
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'pix' | 'confirm'>('select');

  // Chat
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    refreshData();
    setTypes(getRequestTypes());
  }, [currentCompanyId, role, view]);

  const refreshData = () => {
      setRequests(getServiceRequests(role === 'client' ? currentCompanyId : currentCompanyId === 'all' ? undefined : currentCompanyId));
      if (role === 'admin') {
          setDeletedRequests(getDeletedServiceRequests());
      }
  };

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const selectedType = types.find(t => t.id === formData.typeId);
      if(!selectedType) return;

      const isBillable = selectedType.price > 0;
      
      const newReq: ServiceRequest = {
          id: Date.now().toString(),
          protocol: `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
          title: formData.title,
          type: selectedType.name,
          price: selectedType.price,
          description: formData.description,
          status: isBillable ? 'Pendente Pagamento' : 'Solicitada',
          paymentStatus: isBillable ? 'Pendente' : 'N/A',
          clientId: currentUser.id,
          companyId: currentCompanyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deleted: false,
          chat: [],
          auditLog: [{ id: Date.now().toString(), action: 'Solicitação Criada', user: currentUser.name, timestamp: new Date().toISOString() }]
      };
      addServiceRequest(newReq);
      setIsModalOpen(false);
      setFormData({ title: '', typeId: '', description: '' });
      refreshData();
  };

  const updateStatus = (status: ServiceRequest['status']) => {
      if (!selectedReq) return;
      const updated = { ...selectedReq, status, updatedAt: new Date().toISOString() };
      
      updated.auditLog.push({
          id: Date.now().toString(),
          action: `Status alterado para ${status}`,
          user: currentUser.name,
          timestamp: new Date().toISOString()
      });

      updateServiceRequest(updated);
      setSelectedReq(updated);
      refreshData();
  };

  const handlePaymentProofUpload = () => {
      if (!selectedReq) return;
      // Simulate upload
      const updated: ServiceRequest = { 
          ...selectedReq, 
          status: 'Pagamento em Análise',
          paymentStatus: 'Em Análise',
          proofUrl: 'comprovante_mock.pdf',
          updatedAt: new Date().toISOString() 
      };
      updated.auditLog.push({ id: Date.now().toString(), action: 'Comprovante Enviado', user: currentUser.name, timestamp: new Date().toISOString() });
      
      updateServiceRequest(updated);
      setSelectedReq(updated);
      setIsPaymentModalOpen(false);
      refreshData();
      alert('Comprovante enviado! Aguarde a confirmação do administrador.');
  };

  const confirmPayment = () => {
      if(!selectedReq) return;
      const updated: ServiceRequest = {
          ...selectedReq,
          status: 'Solicitada',
          paymentStatus: 'Aprovado',
          updatedAt: new Date().toISOString()
      };
      updated.auditLog.push({ id: Date.now().toString(), action: 'Pagamento Confirmado pelo Admin', user: currentUser.name, timestamp: new Date().toISOString() });
      updateServiceRequest(updated);
      setSelectedReq(updated);
      refreshData();
  };

  const handleDelete = (id: string) => {
      if(confirm('Tem certeza que deseja mover para a lixeira?')) {
          softDeleteServiceRequest(id, currentUser.name);
          refreshData();
          if(selectedReq?.id === id) setSelectedReq(null);
      }
  };

  const handleRestore = (id: string) => {
      restoreServiceRequest(id, currentUser.name);
      refreshData();
  };

  const sendMsg = () => {
      if(!chatInput.trim() || !selectedReq) return;
      const msg: ChatMessage = {
          id: Date.now().toString(),
          sender: currentUser.name,
          role,
          text: chatInput,
          timestamp: new Date().toISOString()
      };
      
      const updatedReq = { ...selectedReq, chat: [...selectedReq.chat, msg] };
      updateServiceRequest(updatedReq);
      setSelectedReq(updatedReq);
      setChatInput('');
  };

  const openRequest = (req: ServiceRequest) => {
      if (role === 'admin' && req.status === 'Solicitada') {
          const updated = { ...req, status: 'Visualizada' as const };
          updated.auditLog.push({ id: Date.now().toString(), action: 'Visualizada pelo Admin', user: currentUser.name, timestamp: new Date().toISOString() });
          updateServiceRequest(updated);
          setSelectedReq(updated);
          refreshData();
      } else {
          setSelectedReq(req);
      }
  };

  const getStatusColor = (s: string) => {
      switch(s) {
          case 'Pendente Pagamento': return 'bg-red-100 text-red-700';
          case 'Pagamento em Análise': return 'bg-orange-100 text-orange-700';
          case 'Solicitada': return 'bg-slate-100 text-slate-700';
          case 'Visualizada': return 'bg-blue-100 text-blue-700';
          case 'Em Resolução': return 'bg-amber-100 text-amber-700';
          case 'Em Validação': return 'bg-purple-100 text-purple-700';
          case 'Resolvido': return 'bg-emerald-100 text-emerald-700';
          default: return 'bg-slate-100';
      }
  };

  // Filter List
  const listToRender = view === 'bin' ? deletedRequests : requests;
  const filteredList = listToRender.filter(r => 
      r.title.toLowerCase().includes(filterText.toLowerCase()) || 
      r.protocol.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <MessageSquare className="text-blue-600"/>
             {view === 'bin' ? 'Lixeira de Solicitações' : 'Solicitações e Pedidos'}
          </h2>
          
          <div className="flex gap-2">
             {role === 'client' && (
                 <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                     <Plus size={18} /> Novo Pedido
                 </button>
             )}
             {role === 'admin' && (
                 <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                     <button onClick={() => setView('list')} className={`px-3 py-1 rounded text-sm font-medium ${view === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-500'}`}>Ativos</button>
                     <button onClick={() => setView('bin')} className={`px-3 py-1 rounded text-sm font-medium ${view === 'bin' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>Lixeira</button>
                 </div>
             )}
          </div>
       </div>

       {/* List View */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
             <div className="relative max-w-md">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Buscar por protocolo ou título..." 
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                 />
             </div>
          </div>

          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                   <th className="px-6 py-4">Protocolo</th>
                   <th className="px-6 py-4">Título / Tipo</th>
                   <th className="px-6 py-4">Data</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">Nenhuma solicitação encontrada.</td></tr>
                )}
                {filteredList.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openRequest(req)}>
                       <td className="px-6 py-4 font-mono text-slate-600">{req.protocol}</td>
                       <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{req.title}</p>
                          <p className="text-xs text-slate-500">{req.type}</p>
                          {req.price > 0 && <span className="text-xs text-green-600 font-bold">R$ {req.price.toFixed(2)}</span>}
                       </td>
                       <td className="px-6 py-4 text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                       <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(req.status)}`}>
                             {req.status}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {view === 'list' ? (
                              <>
                                <button onClick={() => openRequest(req)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Eye size={18}/></button>
                                {role === 'admin' && (
                                    <button onClick={() => handleDelete(req.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18}/></button>
                                )}
                              </>
                          ) : (
                              <button onClick={() => handleRestore(req.id)} className="text-green-600 hover:bg-green-50 p-2 rounded flex items-center gap-1">
                                  <RotateCcw size={16}/> Restaurar
                              </button>
                          )}
                       </td>
                    </tr>
                ))}
             </tbody>
          </table>
       </div>

       {/* Create Modal */}
       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">Nova Solicitação</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Assunto / Título</label>
                       <input required type="text" className="w-full border rounded-lg p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Solicitação</label>
                       <select required className="w-full border rounded-lg p-2" value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})}>
                          <option value="">Selecione...</option>
                          {types.map(t => <option key={t.id} value={t.id}>{t.name} {t.price > 0 ? `(R$ ${t.price})` : '(Grátis)'}</option>)}
                       </select>
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Detalhada</label>
                       <textarea required rows={4} className="w-full border rounded-lg p-2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descreva sua necessidade..."></textarea>
                   </div>
                   <div className="flex justify-end gap-2 mt-4">
                       <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                       <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Abrir Pedido</button>
                   </div>
                </form>
             </div>
          </div>
       )}

       {/* Payment Modal */}
       {isPaymentModalOpen && selectedReq && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
                   <h3 className="text-xl font-bold mb-2">Pagamento do Serviço</h3>
                   <p className="text-slate-500 mb-6">Valor Total: <span className="font-bold text-slate-800 text-lg">R$ {selectedReq.price.toFixed(2)}</span></p>

                   {paymentStep === 'select' && (
                       <div className="space-y-3">
                           <button onClick={() => setPaymentStep('pix')} className="w-full p-4 border rounded-lg hover:bg-slate-50 flex items-center gap-3">
                               <QrCode size={24} className="text-blue-600" />
                               <div className="text-left">
                                   <p className="font-bold">Pagar com PIX</p>
                                   <p className="text-xs text-slate-500">Aprovação rápida</p>
                               </div>
                           </button>
                           <button disabled className="w-full p-4 border rounded-lg opacity-50 cursor-not-allowed flex items-center gap-3">
                               <CreditCard size={24} className="text-slate-400" />
                               <div className="text-left">
                                   <p className="font-bold text-slate-400">Cartão de Crédito</p>
                                   <p className="text-xs text-slate-400">Em breve</p>
                               </div>
                           </button>
                       </div>
                   )}

                   {paymentStep === 'pix' && (
                       <div className="space-y-4">
                           <div className="bg-slate-100 p-4 rounded-lg inline-block">
                               <QrCode size={120} className="text-slate-800" />
                           </div>
                           <p className="text-sm text-slate-600">Escaneie o QR Code ou use a chave abaixo:</p>
                           <code className="block bg-slate-100 p-2 rounded text-xs break-all">00020126360014BR.GOV.BCB.PIX011412.345.678/00015204000053039865802BR5913ContabilConnect6008SaoPaulo62070503***6304E2CA</code>
                           
                           <div className="pt-4 border-t border-slate-100">
                               <p className="text-sm font-bold mb-2">Já realizou o pagamento?</p>
                               <button onClick={() => handlePaymentProofUpload()} className="w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                                   <Upload size={18} /> Enviar Comprovante
                               </button>
                           </div>
                           <button onClick={() => setPaymentStep('select')} className="text-sm text-slate-500 hover:underline">Voltar</button>
                       </div>
                   )}

                   <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                       <X size={20} />
                   </button>
               </div>
           </div>
       )}

       {/* Detail Drawer / Modal */}
       {selectedReq && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
                   {/* Left: Info */}
                   <div className="flex-1 p-6 overflow-y-auto bg-white">
                       <div className="flex justify-between items-start mb-4">
                           <div>
                               <span className="text-xs font-mono text-slate-400">{selectedReq.protocol}</span>
                               <h2 className="text-2xl font-bold text-slate-800">{selectedReq.title}</h2>
                           </div>
                           <button onClick={() => setSelectedReq(null)} className="md:hidden"><X/></button>
                       </div>

                       <div className="flex items-center gap-2 mb-6">
                           <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedReq.status)}`}>
                               {selectedReq.status}
                           </span>
                           <span className="text-sm text-slate-500">• {selectedReq.type}</span>
                       </div>

                       {/* Payment Section */}
                       {selectedReq.price > 0 && (
                           <div className="mb-6 p-4 border border-blue-100 bg-blue-50/50 rounded-xl">
                               <div className="flex justify-between items-center mb-2">
                                   <h4 className="font-bold text-slate-800">Financeiro do Pedido</h4>
                                   <span className="font-bold text-lg text-slate-800">R$ {selectedReq.price.toFixed(2)}</span>
                               </div>
                               <div className="flex items-center justify-between">
                                   <span className="text-sm text-slate-600">Status Pagamento: <span className="font-semibold">{selectedReq.paymentStatus}</span></span>
                                   
                                   {role === 'client' && selectedReq.status === 'Pendente Pagamento' && (
                                       <button onClick={() => { setPaymentStep('select'); setIsPaymentModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2">
                                           <CreditCard size={16}/> Pagar Agora
                                       </button>
                                   )}

                                   {role === 'admin' && selectedReq.status === 'Pagamento em Análise' && (
                                       <div className="flex items-center gap-2">
                                           <button className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                                               <Download size={14}/> Ver Comprovante
                                           </button>
                                           <button onClick={confirmPayment} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
                                               Confirmar Pagamento
                                           </button>
                                       </div>
                                   )}
                                    {selectedReq.paymentStatus === 'Aprovado' && (
                                       <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Pago</span>
                                   )}
                               </div>
                           </div>
                       )}

                       {/* Workflow Buttons */}
                       {!selectedReq.deleted && (
                           <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                               <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Fluxo de Trabalho</h4>
                               
                               {selectedReq.status === 'Pendente Pagamento' || selectedReq.status === 'Pagamento em Análise' ? (
                                   <p className="text-sm text-amber-600 flex items-center gap-2">
                                       <AlertTriangle size={16}/> O fluxo iniciará após a confirmação do pagamento.
                                   </p>
                               ) : (
                                   <div className="flex flex-wrap gap-2">
                                       {role === 'admin' && (
                                           <>
                                               {selectedReq.status !== 'Em Resolução' && selectedReq.status !== 'Resolvido' && selectedReq.status !== 'Em Validação' && (
                                                   <button onClick={() => updateStatus('Em Resolução')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Iniciar Resolução</button>
                                               )}
                                               {selectedReq.status === 'Em Resolução' && (
                                                   <button onClick={() => updateStatus('Em Validação')} className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700">Enviar para Validação</button>
                                               )}
                                           </>
                                       )}
                                       {role === 'client' && (
                                           <>
                                               {selectedReq.status === 'Em Validação' && (
                                                   <button onClick={() => updateStatus('Resolvido')} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700 flex items-center gap-1"><CheckCircle size={14}/> Aprovar e Finalizar</button>
                                               )}
                                               {selectedReq.status === 'Resolvido' && (
                                                   <button onClick={() => updateStatus('Solicitada')} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-300 flex items-center gap-1"><RotateCcw size={14}/> Reabrir Pedido</button>
                                               )}
                                           </>
                                       )}
                                   </div>
                               )}
                           </div>
                       )}

                       <div className="mb-6">
                           <h4 className="font-bold text-slate-800 mb-2">Descrição</h4>
                           <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 rounded-lg border border-slate-100">
                               {selectedReq.description}
                           </p>
                       </div>

                       <div>
                           <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Clock size={16}/> Histórico (Auditoria)</h4>
                           <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                              {selectedReq.auditLog.map(log => (
                                  <div key={log.id} className="relative pl-4 text-sm">
                                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                                      <p className="text-slate-800 font-medium">{log.action}</p>
                                      <p className="text-xs text-slate-500">{log.user} em {new Date(log.timestamp).toLocaleString()}</p>
                                  </div>
                              ))}
                           </div>
                       </div>
                   </div>

                   {/* Right: Chat */}
                   <div className="w-full md:w-96 bg-slate-50 border-l border-slate-200 flex flex-col">
                       <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare size={18}/> Chat do Pedido</h4>
                          <button onClick={() => setSelectedReq(null)} className="hidden md:block text-slate-400 hover:text-slate-600"><X size={20}/></button>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto space-y-4">
                          {selectedReq.chat.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Nenhuma mensagem. Inicie a conversa.</p>}
                          {selectedReq.chat.map(msg => (
                              <div key={msg.id} className={`flex flex-col ${msg.role === role ? 'items-end' : 'items-start'}`}>
                                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === role ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                                      {msg.text}
                                  </div>
                                  <span className="text-[10px] text-slate-400 mt-1">{msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                          ))}
                      </div>

                      {!selectedReq.deleted && (
                          <div className="p-4 bg-white border-t border-slate-200">
                              <div className="flex gap-2">
                                  <input 
                                      type="text" 
                                      value={chatInput}
                                      onChange={e => setChatInput(e.target.value)}
                                      placeholder="Digite sua mensagem..." 
                                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                      onKeyPress={e => e.key === 'Enter' && sendMsg()}
                                  />
                                  <button onClick={sendMsg} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                                      <Send size={18} />
                                  </button>
                              </div>
                          </div>
                      )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default RequestManager;