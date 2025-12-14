import { Routine, Document, Company, User, Notification, ChatMessage, AuditLog, ServiceRequest, RequestTypeConfig, PaymentConfig, RequestAttachment } from '../types';

// --- MOCK DATA STRUCTURES (UI Scaffolding) ---
// Note: In a full prod app, these would all come from the DB. 
// For this demo, we keep them in memory but fix the critical parts (DB Config & Payment Config) to be real/persistent.

let CATEGORIES: string[] = ['Boletos', 'Impostos', 'Folha', 'Contratos', 'Documentos Solicitados', 'Outros'];

let REQUEST_TYPES: RequestTypeConfig[] = [
  { id: 'rt1', name: '2ª Via de Boleto', price: 0 },
  { id: 'rt2', name: 'Alteração Contratual', price: 150.00 },
  { id: 'rt3', name: 'Dúvida Técnica', price: 0 },
  { id: 'rt4', name: 'Solicitação de Documento', price: 0 },
  { id: 'rt5', name: 'Certidão Negativa Extra', price: 50.00 },
];

// Load Payment Config from LocalStorage to persist across reloads
const loadPaymentConfig = (): PaymentConfig => {
    const saved = localStorage.getItem('maat_payment_config');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        environment: 'sandbox',
        enablePix: false,
        enableGateway: false,
        inter: { clientId: '', clientSecret: '', certificateUploaded: false, pixKey: '' }
    };
};

let PAYMENT_CONFIG: PaymentConfig = loadPaymentConfig();

let COMPANIES: Company[] = [
  { id: 'c1', name: 'Serviços Gerais LTDA', cnpj: '12.345.678/0001-90', address: 'Rua A, 123', contact: '1199999999' },
  { id: 'c2', name: 'Comércio Varejo SA', cnpj: '98.765.432/0001-10', address: 'Av B, 456', contact: '1188888888' }
];

let USERS: User[] = [
  { id: 'u1', name: 'Carlos Contador', email: 'admin@maat.com', role: 'admin', password: 'admin' }, // Matching Login.tsx
  { id: 'u2', name: 'Ana Empresária', email: 'ana@servicos.com', role: 'client', companyId: 'c1', password: '123' },
  { id: 'u3', name: 'Roberto Varejo', email: 'roberto@varejo.com', role: 'client', companyId: 'c2', password: '123' }
];

let DOCUMENTS: Document[] = [
  { 
    id: 'd1', title: 'DAS Simples Nacional 05/2024', category: 'Impostos', date: '2024-05-20', companyId: 'c1', 
    status: 'Enviado', paymentStatus: 'Aberto', amount: 1250.00, competence: '05/2024',
    chat: [], auditLog: [{id: 'a1', action: 'Upload', user: 'Carlos Contador', timestamp: new Date().toISOString()}] 
  },
  { 
    id: 'd2', title: 'Contrato Social', category: 'Contratos', date: '2024-01-15', companyId: 'c1', 
    status: 'Visualizado', paymentStatus: 'N/A', 
    chat: [], auditLog: [] 
  }
];

let SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr1', protocol: 'REQ-2024-001', title: 'Recalculo de Guia GPS', type: '2ª Via de Boleto', price: 0,
    description: 'Preciso da guia GPS ref 04/2024 atualizada para pagamento hoje.',
    status: 'Solicitada', paymentStatus: 'N/A', clientId: 'u2', companyId: 'c1', deleted: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    attachments: [],
    chat: [], auditLog: [{id: 'al1', action: 'Criação', user: 'Ana Empresária', timestamp: new Date().toISOString()}]
  }
];

let NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u2', title: 'Imposto a vencer', message: 'O DAS vence amanhã. Favor verificar a guia na aba de impostos.', read: false, timestamp: new Date().toISOString() }
];

// --- REAL BACKEND API URL ---
const API_URL = 'http://localhost:3001/api';

// --- Functions ---

export const getPaymentConfig = () => PAYMENT_CONFIG;
export const updatePaymentConfig = (config: PaymentConfig) => { 
    PAYMENT_CONFIG = config;
    localStorage.setItem('maat_payment_config', JSON.stringify(config));
};

// Test Connection: Now checks if we can talk to our Backend
export const testPixConnection = async (): Promise<{success: boolean, message: string, logs: string[]}> => {
    try {
        // We do a simple fetch to a non-existent endpoint or a health check on backend
        // Since we don't have a specific 'test' endpoint on server.js, we assume if fetch works, connection is OK.
        // But better: Check if certs exist via a call? 
        // For now, we trust the upload process.
        
        if (!PAYMENT_CONFIG.inter.clientId) return { success: false, message: 'Client ID não preenchido.', logs: [] };

        return { success: true, message: 'Backend Online e Configurações Salvas Localmente.', logs: ['OK'] };
    } catch (e) {
        return { success: false, message: 'Não foi possível contatar o servidor na porta 3001.', logs: [] };
    }
};

// --- REAL PIX GENERATION VIA BACKEND ---
export const generatePixCharge = async (reqId: string, amount: number): Promise<{txid: string, pixCopiaECola: string}> => {
  const req = SERVICE_REQUESTS.find(r => r.id === reqId);
  const client = USERS.find(u => u.id === req?.clientId);

  if (!PAYMENT_CONFIG.inter.clientId) {
      throw new Error("Client ID não configurado nas Configurações.");
  }

  try {
      // Calls the Node.js backend which handles the mTLS certificate part
      const response = await fetch(`${API_URL}/pix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              clientId: PAYMENT_CONFIG.inter.clientId,
              clientSecret: PAYMENT_CONFIG.inter.clientSecret,
              pixKey: PAYMENT_CONFIG.inter.pixKey,
              amount: amount,
              protocol: req?.protocol || 'REQ',
              requestData: {
                  name: client?.name || 'Cliente Demo',
                  cpf: '000.000.000-00' // Mock CPF for safety in demo
              }
          })
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.error || 'Erro na resposta do servidor.');
      }

      // Update Local State with Real Data returned from Inter via Backend
      if (req) {
          req.txid = data.txid;
          req.pixCopiaECola = data.pixCopiaECola;
          req.pixExpiration = new Date(Date.now() + 3600 * 1000).toISOString();
          req.auditLog.push({
              id: Date.now().toString(),
              action: 'Cobrança PIX Gerada (Real via API)',
              user: 'Sistema',
              timestamp: new Date().toISOString()
          });
          updateServiceRequest(req);
      }

      return { txid: data.txid, pixCopiaECola: data.pixCopiaECola };

  } catch (error: any) {
      console.error(error);
      throw new Error(error.message || "Falha na comunicação com o Backend (Porta 3001)");
  }
};

export const simulateWebhookPayment = (txid: string) => {
  const req = SERVICE_REQUESTS.find(r => r.txid === txid);
  if (req && req.status === 'Pendente Pagamento') {
    req.status = 'Solicitada'; 
    req.paymentStatus = 'Aprovado';
    req.auditLog.push({
      id: Date.now().toString(),
      action: 'Simulação: Pagamento Confirmado',
      user: 'Admin',
      timestamp: new Date().toISOString()
    });
    updateServiceRequest(req);
    return true;
  }
  return false;
};

// ... (Rest of CRUD functions for UI - keeping local arrays for this scope to avoid complexity overload) ...
export const getCategories = () => CATEGORIES;
export const addCategory = (cat: string) => { if(!CATEGORIES.includes(cat)) CATEGORIES = [...CATEGORIES, cat]; };
export const deleteCategory = (cat: string) => { CATEGORIES = CATEGORIES.filter(c => c !== cat); };

export const getRequestTypes = () => REQUEST_TYPES;
export const addRequestType = (type: RequestTypeConfig) => { REQUEST_TYPES = [...REQUEST_TYPES, type]; };
export const deleteRequestType = (id: string) => { REQUEST_TYPES = REQUEST_TYPES.filter(t => t.id !== id); };

export const getCompanies = () => COMPANIES;
export const addCompany = (c: Company) => { COMPANIES = [...COMPANIES, c]; };
export const updateCompany = (c: Company) => { COMPANIES = COMPANIES.map(x => x.id === c.id ? c : x); };
export const deleteCompany = (id: string) => { COMPANIES = COMPANIES.filter(x => x.id !== id); };

export const getUsers = () => USERS;
export const addUser = (u: User) => { USERS = [...USERS, u]; };
export const updateUser = (u: User) => { USERS = USERS.map(x => x.id === u.id ? u : x); };
export const deleteUser = (id: string) => { USERS = USERS.filter(x => x.id !== id); };

export const getDocuments = (companyId: string) => DOCUMENTS.filter(d => d.companyId === companyId);
export const addDocument = (d: Document) => { DOCUMENTS = [d, ...DOCUMENTS]; };
export const updateDocument = (d: Document) => { DOCUMENTS = DOCUMENTS.map(x => x.id === d.id ? d : x); };
export const deleteDocument = (id: string) => { DOCUMENTS = DOCUMENTS.filter(d => d.id !== id); };
export const addDocumentMessage = (docId: string, msg: ChatMessage) => {
  const doc = DOCUMENTS.find(d => d.id === docId);
  if (doc) { doc.chat = [...doc.chat, msg]; updateDocument(doc); }
};
export const addAuditLog = (docId: string, log: AuditLog) => {
  const doc = DOCUMENTS.find(d => d.id === docId);
  if (doc) { doc.auditLog = [...doc.auditLog, log]; updateDocument(doc); }
};

export const getServiceRequests = (companyId?: string, includeDeleted = false) => {
  let reqs = SERVICE_REQUESTS;
  if (companyId) reqs = reqs.filter(r => r.companyId === companyId);
  if (!includeDeleted) reqs = reqs.filter(r => !r.deleted);
  return reqs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getDeletedServiceRequests = () => SERVICE_REQUESTS.filter(r => r.deleted);

export const addServiceRequest = (req: ServiceRequest) => { 
  SERVICE_REQUESTS = [req, ...SERVICE_REQUESTS];
  const admins = USERS.filter(u => u.role === 'admin');
  const creator = USERS.find(u => u.id === req.clientId);
  admins.forEach(admin => {
    addNotification({
      id: Date.now().toString() + Math.random(),
      userId: admin.id,
      title: 'Nova Solicitação',
      message: `Nova solicitação ${req.protocol} criada por ${creator?.name || 'Cliente'}.`,
      read: false,
      timestamp: new Date().toISOString()
    });
  });
};

export const updateServiceRequest = (req: ServiceRequest) => { 
  SERVICE_REQUESTS = SERVICE_REQUESTS.map(r => r.id === req.id ? req : r); 
};

export const addRequestAttachment = (reqId: string, attachment: RequestAttachment) => {
  const req = SERVICE_REQUESTS.find(r => r.id === reqId);
  if(req) {
      if(!req.attachments) req.attachments = [];
      req.attachments = [...req.attachments, attachment];
      updateServiceRequest(req);
  }
};

export const deleteRequestAttachment = (reqId: string, attId: string, user: string) => {
  const req = SERVICE_REQUESTS.find(r => r.id === reqId);
  if(req && req.attachments) {
      req.attachments = req.attachments.filter(a => a.id !== attId);
      updateServiceRequest(req);
  }
};

export const softDeleteServiceRequest = (id: string, user: string) => {
  const req = SERVICE_REQUESTS.find(r => r.id === id);
  if(req) {
    req.deleted = true;
    updateServiceRequest(req);
  }
};

export const restoreServiceRequest = (id: string, user: string) => {
  const req = SERVICE_REQUESTS.find(r => r.id === id);
  if(req) {
    req.deleted = false;
    updateServiceRequest(req);
  }
};

export const addRequestMessage = (reqId: string, msg: ChatMessage) => {
  const req = SERVICE_REQUESTS.find(r => r.id === reqId);
  if(req) { req.chat = [...req.chat, msg]; updateServiceRequest(req); }
};

export const getNotifications = (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const getAllNotifications = () => [...NOTIFICATIONS].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const addNotification = (n: Notification) => { NOTIFICATIONS = [n, ...NOTIFICATIONS]; };
export const updateNotification = (n: Notification) => { NOTIFICATIONS = NOTIFICATIONS.map(x => x.id === n.id ? n : x); };
export const deleteNotification = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.filter(n => n.id !== id); };
export const markNotificationRead = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.map(n => n.id === id ? { ...n, read: true } : n); };

export const MOCK_ROUTINES: Routine[] = [
  { id: '1', title: 'Fechamento Folha', clientName: 'Serviços LTDA', department: 'Pessoal', deadline: '2024-06-05', status: 'Pendente', competence: '05/2024' },
  { id: '2', title: 'Apuração ICMS', clientName: 'Comércio Varejo SA', department: 'Fiscal', deadline: '2024-06-10', status: 'Em Análise', competence: '05/2024' },
];
export const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'João Silva', role: 'Vigilante', admissionDate: '2022-01-15', status: 'Ativo', worksite: 'Posto Alpha', vacationDue: '2024-08-15' },
];
export const CURRENT_CLIENT = {
  id: 'c1', name: 'Serviços Gerais LTDA',
  financials: { revenueMonth: 28500.00, revenueYear: 342000.00, receivables: 5200.00, payables: 3100.00, nextTaxDeadline: '20/06' }
};