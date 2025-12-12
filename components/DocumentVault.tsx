import React, { useState, useEffect } from 'react';
import { getDocuments, addDocument, updateDocument, addDocumentMessage, addAuditLog, getCategories } from '../services/mockData';
import { Document, Role, DocCategory, ChatMessage } from '../types';
import { FileText, Download, CheckCircle, Upload, Filter, Building, CreditCard, MessageCircle, Clock, Eye, Send, X, Plus } from 'lucide-react';

interface DocumentVaultProps {
  role: Role;
  currentCompanyId: string;
  currentUser: { id: string; name: string };
}

const DocumentVault: React.FC<DocumentVaultProps> = ({ role, currentCompanyId, currentUser }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterName, setFilterName] = useState('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Upload Form
  const [uploadData, setUploadData] = useState({ title: '', category: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  
  // Chat Input
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    // Load categories
    const cats = getCategories();
    setCategories(cats);
    if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
    }
    
    // Load documents for current company
    setDocuments(getDocuments(currentCompanyId));
  }, [currentCompanyId, isUploadOpen, selectedDoc]); 

  // Filter Logic
  const filteredDocs = documents.filter(doc => {
     const matchesCategory = doc.category === selectedCategory;
     
     const docDate = new Date(doc.date);
     const matchesMonth = filterMonth ? (docDate.getMonth() + 1).toString() === filterMonth : true;
     const matchesYear = filterYear ? docDate.getFullYear().toString() === filterYear : true;
     const matchesName = filterName ? doc.title.toLowerCase().includes(filterName.toLowerCase()) : true;

     return matchesCategory && matchesMonth && matchesYear && matchesName;
  });

  const handleUpload = (e: React.FormEvent) => {
     e.preventDefault();
     const newDoc: Document = {
         id: Date.now().toString(),
         title: uploadData.title,
         category: uploadData.category,
         date: uploadData.date,
         companyId: currentCompanyId,
         status: 'Enviado',
         paymentStatus: (uploadData.category === 'Boletos' || uploadData.category === 'Impostos') ? 'Aberto' : 'N/A',
         amount: uploadData.amount,
         chat: [],
         auditLog: [{ id: Date.now().toString(), action: 'Upload', user: currentUser.name, timestamp: new Date().toISOString() }]
     };
     addDocument(newDoc);
     setIsUploadOpen(false);
     setUploadData({ title: '', category: categories[0] || '', amount: 0, date: new Date().toISOString().split('T')[0] });
  };

  const openDocument = (doc: Document) => {
     // Workflow Logic: If Client opens 'Enviado', switch to 'Visualizado'
     if (role === 'client' && doc.status === 'Enviado') {
         const updatedDoc = { ...doc, status: 'Visualizado' as const };
         updateDocument(updatedDoc);
         addAuditLog(doc.id, { id: Date.now().toString(), action: 'Visualizado', user: currentUser.name, timestamp: new Date().toISOString() });
         setSelectedDoc(updatedDoc);
     } else {
         setSelectedDoc(doc);
     }
  };

  const togglePayment = (doc: Document) => {
     const newStatus = doc.paymentStatus === 'Pago' ? 'Aberto' : 'Pago';
     const updatedDoc = { ...doc, paymentStatus: newStatus as any };
     updateDocument(updatedDoc);
     addAuditLog(doc.id, { id: Date.now().toString(), action: `Marcado como ${newStatus}`, user: currentUser.name, timestamp: new Date().toISOString() });
     setSelectedDoc(updatedDoc);
  };

  const sendMessage = () => {
     if (!chatInput.trim() || !selectedDoc) return;
     const msg: ChatMessage = {
         id: Date.now().toString(),
         sender: currentUser.name,
         role: role,
         text: chatInput,
         timestamp: new Date().toISOString()
     };
     addDocumentMessage(selectedDoc.id, msg);
     setChatInput('');
     // Refresh selected doc to show new message
     setSelectedDoc({ ...selectedDoc, chat: [...selectedDoc.chat, msg] });
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">Arquivos da Empresa</h2>
            
            <div className="flex gap-2">
                {role === 'admin' ? (
                  <button 
                      onClick={() => setIsUploadOpen(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                  >
                      <Upload size={18} /> Upload Arquivo
                  </button>
                ) : (
                  <span className="text-sm text-slate-500 italic">Visualização de Arquivos</span>
                )}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
                type="text" 
                placeholder="Pesquisar nome do arquivo..." 
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="border rounded-lg p-2 text-sm"
            />
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border rounded-lg p-2 text-sm">
                <option value="">Todos os Meses</option>
                {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>
                ))}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded-lg p-2 text-sm">
                <option value="">Todos os Anos</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
            </select>
         </div>

         {/* Categories Tabs */}
         <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-1">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                        selectedCategory === cat 
                        ? 'bg-slate-100 text-blue-600 border-b-2 border-blue-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {cat}
                </button>
            ))}
         </div>
      </div>

      {/* Document List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDocument(doc)}>
               <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg ${doc.category === 'Boletos' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      <FileText size={24} />
                  </div>
                  <div className="flex gap-1">
                      {doc.status === 'Enviado' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full font-bold">Novo</span>}
                      {doc.status === 'Visualizado' && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><Eye size={10}/> Visto</span>}
                  </div>
               </div>
               <h3 className="font-semibold text-slate-800 truncate" title={doc.title}>{doc.title}</h3>
               <p className="text-xs text-slate-500 mb-2">{new Date(doc.date).toLocaleDateString()}</p>
               
               {(doc.category === 'Boletos' || doc.category === 'Impostos') && (
                   <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                       <span className="font-bold text-slate-700">R$ {doc.amount?.toFixed(2)}</span>
                       <span className={`text-xs px-2 py-1 rounded font-medium ${doc.paymentStatus === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                           {doc.paymentStatus}
                       </span>
                   </div>
               )}
            </div>
         ))}
         {filteredDocs.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-400">
                 Nenhum documento encontrado com os filtros atuais.
             </div>
         )}
      </div>

      {/* Upload Modal (Admin Only) */}
      {isUploadOpen && role === 'admin' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4">Upload de Arquivo</h3>
                  <form onSubmit={handleUpload} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Título do Arquivo</label>
                          <input required type="text" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} className="w-full border rounded-lg p-2" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Categoria</label>
                          <select value={uploadData.category} onChange={e => setUploadData({...uploadData, category: e.target.value as any})} className="w-full border rounded-lg p-2">
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      {(uploadData.category === 'Boletos' || uploadData.category === 'Impostos') && (
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                              <input type="number" step="0.01" value={uploadData.amount} onChange={e => setUploadData({...uploadData, amount: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" />
                          </div>
                      )}
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Data de Referência</label>
                          <input type="date" value={uploadData.date} onChange={e => setUploadData({...uploadData, date: e.target.value})} className="w-full border rounded-lg p-2" />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enviar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
                  {/* Left: Details */}
                  <div className="flex-1 p-6 overflow-y-auto">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">{selectedDoc.title}</h2>
                              <span className="text-sm text-slate-500">{selectedDoc.category} • {new Date(selectedDoc.date).toLocaleDateString()}</span>
                          </div>
                          <button onClick={() => setSelectedDoc(null)} className="md:hidden"><X /></button>
                      </div>

                      <div className="flex gap-4 mb-6">
                         <div className="bg-slate-50 p-4 rounded-lg flex-1 border border-slate-100">
                            <span className="text-xs text-slate-400 block uppercase">Status</span>
                            <span className="font-semibold text-slate-700">{selectedDoc.status}</span>
                         </div>
                         {(selectedDoc.category === 'Boletos' || selectedDoc.category === 'Impostos') && (
                            <div className="bg-slate-50 p-4 rounded-lg flex-1 border border-slate-100">
                                <span className="text-xs text-slate-400 block uppercase">Pagamento</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`font-bold ${selectedDoc.paymentStatus === 'Pago' ? 'text-green-600' : 'text-red-600'}`}>{selectedDoc.paymentStatus}</span>
                                    <button 
                                        onClick={() => togglePayment(selectedDoc)} 
                                        className="text-xs text-blue-600 underline"
                                    >
                                        Alterar
                                    </button>
                                </div>
                            </div>
                         )}
                      </div>

                      <div className="mb-6">
                        <button className="w-full bg-blue-50 text-blue-600 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                           <Download size={20} /> Baixar Arquivo
                        </button>
                      </div>

                      <div className="mb-6">
                          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Clock size={16}/> Histórico de Auditoria</h4>
                          <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                              {selectedDoc.auditLog.map(log => (
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
                          <h4 className="font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={18}/> Dúvidas / Chat</h4>
                          <button onClick={() => setSelectedDoc(null)} className="hidden md:block text-slate-400 hover:text-slate-600"><X size={20}/></button>
                      </div>
                      
                      <div className="flex-1 p-4 overflow-y-auto space-y-4">
                          {selectedDoc.chat.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Nenhuma mensagem.</p>}
                          {selectedDoc.chat.map(msg => (
                              <div key={msg.id} className={`flex flex-col ${msg.role === role ? 'items-end' : 'items-start'}`}>
                                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === role ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                                      {msg.text}
                                  </div>
                                  <span className="text-[10px] text-slate-400 mt-1">{msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                          ))}
                      </div>

                      <div className="p-4 bg-white border-t border-slate-200">
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={chatInput}
                                  onChange={e => setChatInput(e.target.value)}
                                  placeholder="Digite sua dúvida..." 
                                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                              />
                              <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                                  <Send size={18} />
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DocumentVault;
