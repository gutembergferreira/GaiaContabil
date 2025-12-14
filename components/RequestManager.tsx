import React, { useState, useEffect, useRef } from 'react';
import { ServiceRequest, Role, User, ChatMessage, RequestTypeConfig, PaymentConfig, Document, RequestAttachment } from '../types';
import { 
    getServiceRequests, addServiceRequest, updateServiceRequest, softDeleteServiceRequest, 
    restoreServiceRequest, getRequestTypes, getDeletedServiceRequests, getPaymentConfig, generatePixCharge, simulateWebhookPayment,
    addDocument, addRequestAttachment, deleteRequestAttachment
} from '../services/mockData';
import { 
    Plus, Search, MessageSquare, Clock, CheckCircle, FileText, 
    Send, X, Trash2, RotateCcw, Eye, CreditCard, QrCode, Upload, Download, AlertTriangle, Copy, RefreshCw, Paperclip, Layout, ShieldCheck, Server, Check, Shield, Code, Terminal
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
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  
  // UI State
  const [view, setView] = useState<'board' | 'bin'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ServiceRequest | null>(null);
  const [filterText, setFilterText] = useState('');
  
  // New Request Form
  const [formData, setFormData] = useState({ title: '', typeId: '', description: '' });
  
  // Payment Modal & Logic
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pixStep, setPixStep] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Dev Mode in Modal
  const [showDevInfo, setShowDevInfo] = useState(false);

  // Chat
  const [chatInput, setChatInput] = useState('');
  
  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kanban Columns Definition
  const KANBAN_COLUMNS = [
    { id: 'financeiro', label: 'Financeiro / Pagamento', statuses: ['Pendente Pagamento', 'Pagamento em Análise'], color: 'border-orange-500' },
    { id: 'novos', label: 'Aberto', statuses: ['Solicitada', 'Visualizada'], color: 'border-blue-500' },
    { id: 'execucao', label: 'Em Andamento', statuses: ['Em Resolução'], color: 'border-amber-500' },
    { id: 'validacao', label: 'Validação', statuses: ['Em Validação'], color: 'border-purple-500' },
    { id: 'concluido', label: 'Concluído', statuses: ['Resolvido'], color: 'border-emerald-500' },
  ];

  // Polling for Webhook Simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPaymentModalOpen && selectedReq && selectedReq.status === 'Pendente Pagamento') {
        // Poll to see if the webhook simulation changed the status in the "backend" (mockData)
        interval = setInterval(() => {
            const updated = getServiceRequests().find(r => r.id === selectedReq.id);
            if (updated && updated.status !== 'Pendente Pagamento') {
                setSelectedReq(updated);
                refreshData();
                setIsPaymentModalOpen(false);
                alert('Pagamento confirmado via PIX!');
            }
        }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPaymentModalOpen, selectedReq]);

  useEffect(() => {
    refreshData();
    setTypes(getRequestTypes());
    setPaymentConfig(getPaymentConfig());
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
          attachments: [],
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
      
      // Auto-generate document on 'Resolvido'
      if (status === 'Resolvido' && selectedReq.status !== 'Resolvido') {
          const newDoc: Document = {
              id: Date.now().toString(),
              title: `Resolução: ${selectedReq.title}`,
              category: 'Documentos Solicitados',
              date: new Date().toISOString().split('T')[0],
              companyId: selectedReq.companyId,
              status: 'Enviado',
              paymentStatus: 'N/A',
              url: '#', // Mock URL
              chat: [...selectedReq.chat], // Copy Chat
              auditLog: [...selectedReq.auditLog, {id: Date.now().toString(), action: 'Gerado automaticamente via Solicitação', user: 'Sistema', timestamp: new Date().toISOString()}],
              attachments: [...selectedReq.attachments] // Copy Attachments
          };
          addDocument(newDoc);
          
          // Log document creation in request audit
          selectedReq.auditLog.push({
              id: Date.now().toString() + 'doc',
              action: 'Documento gerado e enviado para "Documentos Solicitados"',
              user: 'Sistema',
              timestamp: new Date().toISOString()
          });
      }

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

  const handleGeneratePix = async () => {
      if(!selectedReq || !paymentConfig?.enablePix) return;
      
      setPixStep('loading');
      setIsPaymentModalOpen(true);
      setCopied(false);
      setErrorMessage('');

      // Check if we already have a valid pix, skip simulation if so
      const isReuse = selectedReq.pixCopiaECola && selectedReq.pixExpiration && new Date(selectedReq.pixExpiration) > new Date();

      if (isReuse) {
           setPixStep('success');
           return;
      }
      
      setLoadingMessage('Conectando com Banco Inter...');
      
      try {
          // Real Call via Proxy
          const { txid, pixCopiaECola } = await generatePixCharge(selectedReq.id, selectedReq.price);
          
          const updatedReq = { 
              ...selectedReq, 
              txid, 
              pixCopiaECola,
              pixExpiration: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          };
          updateServiceRequest(updatedReq);
          setSelectedReq(updatedReq);

          setPixStep('success');

      } catch (error: any) {
          console.error("Erro no Frontend:", error);
          setPixStep('error');
          setErrorMessage(error.message || "Erro desconhecido ao comunicar com a API.");
      }
  };

  const handleCopyPix = () => {
      if (selectedReq?.pixCopiaECola) {
          navigator.clipboard.writeText(selectedReq.pixCopiaECola);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const checkPaymentStatus = () => {
      if (selectedReq?.txid) {
          const success = simulateWebhookPayment(selectedReq.txid);
          if (success) {
              refreshData();
          }
      }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0] || !selectedReq) return;
      const file = e.target.files[0];
      
      const attachment: RequestAttachment = {
          id: Date.now().toString(),
          name: file.name,
          url: '#', // Mock URL
          uploadedBy: currentUser.name,
          createdAt: new Date().toISOString()
      };

      addRequestAttachment(selectedReq.id, attachment);
      
      // Fix: Immediately fetch updated request and set state (spread object to trigger re-render)
      const updatedReq = getServiceRequests(undefined, true).find(r => r.id === selectedReq.id);
      if(updatedReq) {
          setSelectedReq({ ...updatedReq });
      }
      
      // Reset input
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = (attId: string) => {
      if(!selectedReq) return;
      if(confirm('Excluir este anexo?')) {
          deleteRequestAttachment(selectedReq.id, attId, currentUser.name);
          // Refresh state
          const updatedReq = getServiceRequests(undefined, true).find(r => r.id === selectedReq.id);
          if(updatedReq) {
              setSelectedReq({ ...updatedReq });
          }
      }
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
          case 'Pendente Pagamento': return 'bg-orange-100 text-orange-700';
          case 'Pagamento em Análise': return 'bg-orange-100 text-orange-700';
          case 'Solicitada': return 'bg-blue-100 text-blue-700';
          case 'Visualizada': return 'bg-blue-100 text-blue-700';
          case 'Em Resolução': return 'bg-amber-100 text-amber-700';
          case 'Em Validação': return 'bg-purple-100 text-purple-700';
          case 'Resolvido': return 'bg-emerald-100 text-emerald-700';
          default: return 'bg-slate-100';
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Layout className="text-blue-600"/>
             {view === 'bin' ? 'Lixeira de Solicitações' : 'Quadro de Solicitações'}
          </h2>
          
          <div className="flex gap-2">
             {role === 'client' && (
                 <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                     <Plus size={18} /> Novo Pedido
                 </button>
             )}
             {role === 'admin' && (
                 <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                     <button onClick={() => setView('board')} className={`px-3 py-1 rounded text-sm font-medium ${view === 'board' ? 'bg-slate-100 text-slate-800' : 'text-slate-500'}`}>Quadro</button>
                     <button onClick={() => setView('bin')} className={`px-3 py-1 rounded text-sm font-medium ${view === 'bin' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>Lixeira</button>
                 </div>
             )}
          </div>
       </div>

       {/* Search Bar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
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

       {/* KANBAN BOARD VIEW */}
       {view === 'board' && (
           <div className="flex overflow-x-auto gap-4 pb-4 min-h-[600px]">
               {KANBAN_COLUMNS.map(column => {
                   const columnRequests = requests.filter(r => 
                       column.statuses.includes(r.status) && 
                       (r.title.toLowerCase().includes(filterText.toLowerCase()) || r.protocol.toLowerCase().includes(filterText.toLowerCase()))
                   );

                   return (
                       <div key={column.id} className="min-w-[300px] w-[320px] bg-slate-100 rounded-xl p-3 flex flex-col h-full">
                           <div className={`border-l-4 ${column.color} pl-3 mb-3 bg-white p-2 rounded shadow-sm`}>
                               <h3 className="font-bold text-slate-700 text-sm uppercase">{column.label}</h3>
                               <span className="text-xs text-slate-500">{columnRequests.length} pedidos</span>
                           </div>
                           
                           <div className="flex-1 space-y-3 overflow-y-auto">
                               {columnRequests.map(req => (
                                   <div 
                                      key={req.id} 
                                      onClick={() => openRequest(req)}
                                      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group relative"
                                   >
                                       {role === 'admin' && (
                                           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                               <button onClick={(e) => {e.stopPropagation(); handleDelete(req.id)}} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                                           </div>
                                       )}
                                       <div className="flex justify-between items-start mb-2">
                                           <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{req.protocol}</span>
                                           {req.price > 0 && <span className="text-xs font-bold text-green-600">R$ {req.price}</span>}
                                       </div>
                                       <h4 className="font-semibold text-slate-800 text-sm mb-1">{req.title}</h4>
                                       <p className="text-xs text-slate-500 mb-2">{req.type}</p>
                                       <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-2">
                                           <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                           <span className={`px-2 py-0.5 rounded-full ${getStatusColor(req.status)} text-[10px]`}>{req.status}</span>
                                       </div>
                                   </div>
                               ))}
                               {columnRequests.length === 0 && (
                                   <div className="text-center p-4 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-lg">
                                       Vazio
                                   </div>
                               )}
                           </div>
                       </div>
                   );
               })}
           </div>
       )}

       {/* BIN VIEW (Table for deleted items) */}
       {view === 'bin' && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                    <tr>
                       <th className="px-6 py-4">Protocolo</th>
                       <th className="px-6 py-4">Título</th>
                       <th className="px-6 py-4">Data</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {deletedRequests.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-slate-400">Lixeira vazia.</td></tr>
                    )}
                    {deletedRequests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4 font-mono text-slate-600">{req.protocol}</td>
                           <td className="px-6 py-4">{req.title}</td>
                           <td className="px-6 py-4 text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                           <td className="px-6 py-4">{req.status}</td>
                           <td className="px-6 py-4 text-right">
                              <button onClick={() => handleRestore(req.id)} className="text-green-600 hover:bg-green-50 p-2 rounded flex items-center gap-1 ml-auto">
                                  <RotateCcw size={16}/> Restaurar
                              </button>
                           </td>
                        </tr>
                    ))}
                 </tbody>
              </table>
           </div>
       )}

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
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
               <div className="bg-white rounded-xl p-6 w-full max-w-md text-center transition-all overflow-hidden flex flex-col max-h-[90vh]">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-xl font-bold">Pagamento do Serviço</h3>
                       <button onClick={() => { setIsPaymentModalOpen(false); setPixStep('idle'); setShowDevInfo(false); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                   </div>
                   
                   <p className="text-slate-500 mb-6">Valor Total: <span className="font-bold text-slate-800 text-lg">R$ {selectedReq.price.toFixed(2)}</span></p>

                   {/* LOADING STATE */}
                   {pixStep === 'loading' && (
                       <div className="py-10 flex flex-col items-center">
                           <RefreshCw size={48} className="text-blue-600 animate-spin mb-6" />
                           <h4 className="text-lg font-bold text-slate-800 mb-2">Processando...</h4>
                           <p className="text-sm text-slate-500 animate-pulse">{loadingMessage}</p>
                           <div className="flex gap-2 mt-4">
                                <span className={`h-2 w-2 rounded-full ${loadingMessage.includes('Conectando') ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
                                <span className={`h-2 w-2 rounded-full ${loadingMessage.includes('Coletando') ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
                                <span className={`h-2 w-2 rounded-full ${loadingMessage.includes('Gerando') ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
                           </div>
                       </div>
                   )}

                   {/* ERROR STATE */}
                   {pixStep === 'error' && (
                       <div className="py-8">
                           <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex flex-col items-center border border-red-100">
                               <AlertTriangle size={32} className="mb-2"/>
                               <p className="font-bold">Falha na API</p>
                               <p className="text-xs text-center mt-2 break-words max-w-xs">{errorMessage}</p>
                           </div>
                           <button onClick={() => { setIsPaymentModalOpen(false); setPixStep('idle'); }} className="text-sm text-slate-500 underline">Fechar</button>
                       </div>
                   )}

                   {/* SUCCESS / DISPLAY STATE */}
                   {(pixStep === 'success' || (pixStep === 'idle' && selectedReq.pixCopiaECola)) && (
                       <div className="space-y-4 overflow-y-auto pr-2">
                           
                           {/* Sandbox Warning only */}
                           {paymentConfig?.environment !== 'production' && (
                               <div className="bg-amber-50 border border-amber-200 rounded text-amber-700 p-2 text-[10px] text-left">
                                   <span className="font-bold block">⚠️ AMBIENTE DE TESTE / SANDBOX</span>
                                   O QR Code abaixo é simulado. Não realize pagamentos reais.
                               </div>
                           )}

                           <div className="bg-white p-4 rounded-lg inline-block border-4 border-slate-800 relative">
                               <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedReq.pixCopiaECola || '')}`} 
                                    alt="QR Code Pix"
                                    className="w-48 h-48 object-contain" 
                               />
                               <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1"><CheckCircle size={16}/></div>
                           </div>
                           
                           <div className="text-left bg-slate-50 p-3 rounded border border-slate-200">
                               <p className="text-xs font-bold text-slate-500 mb-1">Pix Copia e Cola</p>
                               <div className="flex gap-2">
                                   <code className="text-[10px] break-all bg-white p-1 border rounded flex-1 overflow-hidden h-12">
                                       {selectedReq.pixCopiaECola}
                                   </code>
                                   <button 
                                      onClick={handleCopyPix}
                                      className={`text-white p-2 rounded transition-colors ${copied ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`} 
                                      title="Copiar"
                                   >
                                      {copied ? <Check size={16}/> : <Copy size={16}/>}
                                   </button>
                               </div>
                           </div>

                           {/* DEV TOOLS TOGGLE - Hidden by default in production view for cleaner look */}
                           <div className="pt-2 border-t border-slate-100">
                               <button 
                                   onClick={() => setShowDevInfo(!showDevInfo)}
                                   className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 uppercase font-bold"
                               >
                                   <Terminal size={10} /> Dados Técnicos {showDevInfo ? '▲' : '▼'}
                               </button>
                           </div>

                           {showDevInfo && (
                               <div className="text-left bg-slate-900 rounded-lg p-3 text-[10px] font-mono text-green-400 overflow-x-auto">
                                   <p className="text-slate-500 font-bold mb-1">// Payload API Banco Inter</p>
                                   <div className="mb-3">
                                       <span className="text-blue-400">curl</span> --request POST \<br/>
                                       &nbsp;&nbsp;--url https://cdpj.partners.bancointer.com.br/pix/v2/cob \<br/>
                                       &nbsp;&nbsp;--cert ./certificado.crt --key ./chave.key \<br/>
                                       &nbsp;&nbsp;--data <span className="text-amber-300">'{`{
    "calendario": { "expiracao": 3600 },
    "devedor": { "nome": "${currentUser.name}", "cpf": "123.456.789-00" },
    "valor": { "original": "${selectedReq.price.toFixed(2)}" },
    "chave": "${paymentConfig?.inter.pixKey || 'CHAVE_PIX'}",
    "solicitacaoPagador": "Serviço #${selectedReq.protocol}"
}`} '</span>
                                   </div>
                               </div>
                           )}

                           <div className="flex items-center justify-center gap-2 text-slate-600 text-sm py-2">
                               <RefreshCw size={16} className="animate-spin text-blue-600"/>
                               Aguardando confirmação do banco...
                           </div>
                           
                           <button 
                                onClick={checkPaymentStatus}
                                className="text-xs text-blue-600 hover:underline font-medium"
                           >
                               Atualizar Status
                           </button>
                       </div>
                   )}

                   {/* INITIAL SELECTION STATE */}
                   {pixStep === 'idle' && !selectedReq.pixCopiaECola && (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            Selecione um método de pagamento na tela anterior.
                        </div>
                   )}
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
                               <div className="flex flex-col gap-2">
                                   <div className="flex justify-between items-center">
                                      <span className="text-sm text-slate-600">Status Pagamento: <span className="font-semibold">{selectedReq.paymentStatus}</span></span>
                                       {selectedReq.paymentStatus === 'Aprovado' && (
                                           <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Pago</span>
                                       )}
                                   </div>
                                   
                                   {role === 'client' && selectedReq.status === 'Pendente Pagamento' && (
                                       <div className="flex flex-wrap gap-2 mt-2">
                                           {paymentConfig?.enablePix ? (
                                                <button onClick={handleGeneratePix} className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2 transition-colors">
                                                    <QrCode size={16}/> {selectedReq.pixCopiaECola ? 'Ver QR Code' : 'Gerar QR CODE PIX'}
                                                </button>
                                           ) : null}

                                           {paymentConfig?.enableGateway ? (
                                                <button onClick={() => { setIsPaymentModalOpen(true); setPixStep('idle'); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2 transition-colors">
                                                    <CreditCard size={16}/> Pagar no Cartão
                                                </button>
                                           ) : null}

                                           {!paymentConfig?.enablePix && !paymentConfig?.enableGateway && (
                                               <span className="text-xs text-red-400 italic">Nenhum método de pagamento configurado.</span>
                                           )}
                                       </div>
                                   )}
                               </div>
                           </div>
                       )}

                       {/* Workflow Buttons */}
                       {!selectedReq.deleted && (
                           <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                               <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Fluxo de Trabalho</h4>
                               
                               {selectedReq.status === 'Pendente Pagamento' ? (
                                   <p className="text-sm text-amber-600 flex items-center gap-2">
                                       <AlertTriangle size={16}/> O fluxo iniciará automaticamente após a confirmação do pagamento.
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

                       {/* Attachments Section */}
                       <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2"><Paperclip size={16}/> Anexos</h4>
                                {role === 'admin' && !selectedReq.deleted && (
                                    <>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={handleFileUpload}
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1"
                                        >
                                            <Upload size={12}/> Adicionar
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            {(!selectedReq.attachments || selectedReq.attachments.length === 0) ? (
                                <div className="text-sm text-slate-400 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                                    Nenhum arquivo anexado.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedReq.attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                                    <FileText size={16}/>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{att.name}</p>
                                                    <p className="text-xs text-slate-500">Enviado por {att.uploadedBy} em {new Date(att.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => alert(`Baixando ${att.name}...`)} className="text-blue-600 hover:text-blue-800 p-2" title="Baixar">
                                                    <Download size={16}/>
                                                </button>
                                                {role === 'admin' && (
                                                    <button onClick={() => handleDeleteAttachment(att.id)} className="text-red-500 hover:text-red-700 p-2" title="Excluir">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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