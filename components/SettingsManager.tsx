import React, { useState, useEffect, useRef } from 'react';
import CompanyManager from './CompanyManager';
import UserManager from './UserManager';
import { 
    getCategories, addCategory, deleteCategory, 
    getRequestTypes, addRequestType, deleteRequestType, 
    getPaymentConfig, updatePaymentConfig, testPixConnection
} from '../services/mockData';
import { Trash2, Plus, RotateCcw, CheckCircle, AlertTriangle, RefreshCw, Server, Upload } from 'lucide-react';
import { RequestTypeConfig, PaymentConfig } from '../types';
import { getDbConfig, resetSystem } from '../services/dbService';

const SettingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'requestTypes' | 'companies' | 'users' | 'payments' | 'database'>('categories');
  
  // Categories State
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');

  // Request Types State
  const [requestTypes, setRequestTypes] = useState<RequestTypeConfig[]>([]);
  const [newReqType, setNewReqType] = useState('');
  const [newReqPrice, setNewReqPrice] = useState<number>(0);

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(getPaymentConfig());
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  // DB Config Display
  const [dbConfig, setDbConfig] = useState(getDbConfig());

  // Upload Logic
  const [uploadState, setUploadState] = useState({ crt: false, key: false });
  const crtInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategories(getCategories());
    setRequestTypes(getRequestTypes());
    setPaymentConfig(getPaymentConfig());
    setDbConfig(getDbConfig());
    
    // Check local storage for upload status visual
    const savedUploads = localStorage.getItem('maat_cert_status');
    if (savedUploads) {
        setUploadState(JSON.parse(savedUploads));
    }
  }, []);

  const handlePaymentSave = (e: React.FormEvent) => {
      e.preventDefault();
      updatePaymentConfig(paymentConfig);
      alert('Configurações salvas e persistidas!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'crt' | 'key') => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      
      const formData = new FormData();
      formData.append(type, file);

      try {
          // Upload to Backend
          const res = await fetch('http://localhost:3001/api/upload-cert', {
              method: 'POST',
              body: formData
          });
          
          if (res.ok) {
              const newState = { ...uploadState, [type]: true };
              setUploadState(newState);
              localStorage.setItem('maat_cert_status', JSON.stringify(newState)); // Persist visual state
              
              if (type === 'crt') {
                  const newConfig = {...paymentConfig, inter: {...paymentConfig.inter, certificateUploaded: true}};
                  updatePaymentConfig(newConfig);
                  setPaymentConfig(newConfig);
              }
              alert(`${type.toUpperCase()} enviado com sucesso para o servidor.`);
          } else {
              throw new Error('Falha no upload');
          }

      } catch (err) {
          alert('Erro ao enviar arquivo para o servidor. Verifique se o backend (porta 3001) está rodando.');
      }
  };

  const handleTestConnection = async () => {
      setTestStatus('loading');
      setTestMessage('Testando conexão com Backend e Certificados...');
      
      const result = await testPixConnection();
      
      if (result.success) {
          setTestStatus('success');
          setTestMessage(result.message);
      } else {
          setTestStatus('error');
          setTestMessage(result.message);
      }
  };
  
  // ... Handlers simples
  const handleAddCategory = () => { if (newCatName.trim()) { addCategory(newCatName.trim()); setCategories(getCategories()); setNewCatName(''); } };
  const handleDeleteCategory = (cat: string) => { if (confirm(`Excluir ${cat}?`)) { deleteCategory(cat); setCategories(getCategories()); } };
  const handleAddRequestType = () => { if (newReqType.trim()) { addRequestType({id: Date.now().toString(), name: newReqType.trim(), price: newReqPrice}); setRequestTypes(getRequestTypes()); setNewReqType(''); } };
  const handleDeleteRequestType = (id: string) => { if (confirm('Excluir?')) { deleteRequestType(id); setRequestTypes(getRequestTypes()); } };
  const handleResetDb = () => { if(confirm('Isso apagará a configuração de conexão local. Continuar?')) resetSystem(); };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>

      <div className="flex overflow-x-auto gap-4 border-b border-slate-200 pb-1">
        {['categories', 'requestTypes', 'companies', 'users', 'payments', 'database'].map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={`pb-3 px-4 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                {tab === 'requestTypes' ? 'Serviços' : tab}
            </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'categories' && (
           <div className="max-w-xl space-y-4">
               <div className="flex gap-2">
                   <input className="border p-2 rounded w-full" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nova categoria..." />
                   <button onClick={handleAddCategory} className="bg-blue-600 text-white p-2 rounded">Adicionar</button>
               </div>
               <div className="space-y-2">
                   {categories.map(c => (
                       <div key={c} className="flex justify-between p-2 bg-slate-50 rounded border">
                           <span>{c}</span>
                           <button onClick={() => handleDeleteCategory(c)} className="text-red-500"><Trash2 size={16}/></button>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {activeTab === 'requestTypes' && (
           <div className="max-w-xl space-y-4">
               <div className="flex gap-2">
                   <input className="border p-2 rounded w-full" value={newReqType} onChange={e => setNewReqType(e.target.value)} placeholder="Nome do serviço..." />
                   <input className="border p-2 rounded w-24" type="number" value={newReqPrice} onChange={e => setNewReqPrice(Number(e.target.value))} placeholder="R$" />
                   <button onClick={handleAddRequestType} className="bg-blue-600 text-white p-2 rounded">Add</button>
               </div>
               {requestTypes.map(t => (
                   <div key={t.id} className="flex justify-between p-2 bg-slate-50 rounded border">
                       <span>{t.name} (R$ {t.price})</span>
                       <button onClick={() => handleDeleteRequestType(t.id)} className="text-red-500"><Trash2 size={16}/></button>
                   </div>
               ))}
           </div>
        )}

        {activeTab === 'companies' && <CompanyManager />}
        {activeTab === 'users' && <UserManager />}

        {activeTab === 'payments' && (
            <div className="max-w-3xl bg-white p-6 rounded-xl border border-slate-200">
                <form onSubmit={handlePaymentSave} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="enablePix"
                                checked={paymentConfig.enablePix} 
                                onChange={e => setPaymentConfig({...paymentConfig, enablePix: e.target.checked})} 
                                className="w-5 h-5 text-blue-600"
                            />
                            <label htmlFor="enablePix" className="font-bold text-lg text-slate-800 cursor-pointer">Habilitar Integração PIX (Banco Inter)</label>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded text-xs">
                             <span className="font-bold text-slate-500">Ambiente:</span>
                             <select 
                                value={paymentConfig.environment} 
                                onChange={e => setPaymentConfig({...paymentConfig, environment: e.target.value as any})}
                                className="bg-transparent border-none focus:ring-0 text-slate-700 font-medium"
                            >
                                <option value="sandbox">Sandbox (Teste)</option>
                                <option value="production">Produção</option>
                            </select>
                        </div>
                    </div>

                    {paymentConfig.enablePix && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID</label>
                                        <input className="border border-slate-300 p-2.5 w-full rounded-lg" value={paymentConfig.inter.clientId} onChange={e => setPaymentConfig({...paymentConfig, inter: {...paymentConfig.inter, clientId: e.target.value}})} placeholder="Insira o Client ID" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Secret</label>
                                        <input className="border border-slate-300 p-2.5 w-full rounded-lg" type="password" value={paymentConfig.inter.clientSecret} onChange={e => setPaymentConfig({...paymentConfig, inter: {...paymentConfig.inter, clientSecret: e.target.value}})} placeholder="Insira o Client Secret" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave Pix</label>
                                        <input className="border border-slate-300 p-2.5 w-full rounded-lg" value={paymentConfig.inter.pixKey} onChange={e => setPaymentConfig({...paymentConfig, inter: {...paymentConfig.inter, pixKey: e.target.value}})} placeholder="CPF/CNPJ/Email/Aleatória" />
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><Server size={16}/> Certificados mTLS</h4>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Os arquivos <b>certificado.crt</b> e <b>chave.key</b> são obrigatórios para autenticação com o Banco Inter. Faça o upload abaixo.
                                    </p>
                                    
                                    <div className="space-y-3">
                                        <div 
                                            className={`border-2 border-dashed p-3 text-center cursor-pointer rounded-lg transition-colors flex items-center justify-between px-4
                                            ${uploadState.crt ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-slate-300 hover:border-blue-400'}`} 
                                            onClick={() => crtInputRef.current?.click()}
                                        >
                                            <span className="text-sm font-medium flex items-center gap-2">
                                                {uploadState.crt ? <CheckCircle size={16}/> : <Upload size={16}/>}
                                                {uploadState.crt ? 'Certificado (CRT) Enviado' : 'Upload Certificado (.crt)'}
                                            </span>
                                            <input type="file" ref={crtInputRef} className="hidden" accept=".crt" onChange={e => handleFileUpload(e, 'crt')} />
                                        </div>

                                        <div 
                                            className={`border-2 border-dashed p-3 text-center cursor-pointer rounded-lg transition-colors flex items-center justify-between px-4
                                            ${uploadState.key ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-slate-300 hover:border-blue-400'}`} 
                                            onClick={() => keyInputRef.current?.click()}
                                        >
                                            <span className="text-sm font-medium flex items-center gap-2">
                                                {uploadState.key ? <CheckCircle size={16}/> : <Upload size={16}/>}
                                                {uploadState.key ? 'Chave Privada (KEY) Enviada' : 'Upload Chave (.key)'}
                                            </span>
                                            <input type="file" ref={keyInputRef} className="hidden" accept=".key" onChange={e => handleFileUpload(e, 'key')} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={handleTestConnection} 
                                    disabled={testStatus === 'loading'}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                                >
                                    {testStatus === 'loading' ? <RefreshCw className="animate-spin" size={18}/> : <Server size={18}/>}
                                    Testar Conexão API
                                </button>
                                
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                    <CheckCircle size={18}/> Salvar Configurações
                                </button>
                            </div>

                            {/* Test Results Area */}
                            {testStatus !== 'idle' && (
                                <div className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${testStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' : testStatus === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                                    {testStatus === 'success' ? <CheckCircle size={18} className="mt-0.5"/> : testStatus === 'error' ? <AlertTriangle size={18} className="mt-0.5"/> : null}
                                    <div>
                                        <p className="font-bold">{testStatus === 'success' ? 'Sucesso' : testStatus === 'error' ? 'Erro' : 'Testando...'}</p>
                                        <p>{testMessage}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>
        )}

        {activeTab === 'database' && (
             <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Server size={20}/> Status do Banco de Dados</h3>
                 <div className="mb-6 space-y-2 text-sm">
                     <div className="flex justify-between border-b border-slate-100 py-2">
                         <span className="text-slate-500">Host</span>
                         <span className="font-mono text-slate-800">{dbConfig?.host || 'Não configurado'}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-2">
                         <span className="text-slate-500">Database</span>
                         <span className="font-mono text-slate-800">{dbConfig?.dbName || '-'}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-100 py-2">
                         <span className="text-slate-500">Usuário</span>
                         <span className="font-mono text-slate-800">{dbConfig?.user || '-'}</span>
                     </div>
                 </div>
                 <button onClick={handleResetDb} className="bg-slate-800 text-white w-full py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors">
                     <RotateCcw size={18}/> Resetar Conexão Local
                 </button>
             </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManager;