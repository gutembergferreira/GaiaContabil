import { Routine, Document, Company, User, Notification, ChatMessage, AuditLog, ServiceRequest, RequestTypeConfig, PaymentConfig } from '../types';

// --- Initial Data ---

let CATEGORIES: string[] = ['Boletos', 'Impostos', 'Folha', 'Contratos', 'Documentos Solicitados', 'Outros'];

let REQUEST_TYPES: RequestTypeConfig[] = [
  { id: 'rt1', name: '2ª Via de Boleto', price: 0 },
  { id: 'rt2', name: 'Alteração Contratual', price: 150.00 },
  { id: 'rt3', name: 'Dúvida Técnica', price: 0 },
  { id: 'rt4', name: 'Solicitação de Documento', price: 0 },
  { id: 'rt5', name: 'Certidão Negativa Extra', price: 50.00 },
];

let PAYMENT_CONFIG: PaymentConfig = {
  enablePix: false,
  enableGateway: false,
  inter: {
    clientId: '',
    clientSecret: '',
    certificateUploaded: false,
    pixKey: ''
  }
};

let COMPANIES: Company[] = [
  { id: 'c1', name: 'Serviços Gerais LTDA', cnpj: '12.345.678/0001-90', address: 'Rua A, 123', contact: '1199999999' },
  { id: 'c2', name: 'Comércio Varejo SA', cnpj: '98.765.432/0001-10', address: 'Av B, 456', contact: '1188888888' }
];

let USERS: User[] = [
  { id: 'u1', name: 'Carlos Contador', email: 'admin@contabil.com', role: 'admin', password: '123' },
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
    chat: [], auditLog: [{id: 'al1', action: 'Criação', user: 'Ana Empresária', timestamp: new Date().toISOString()}]
  }
];

let NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u2', title: 'Imposto a vencer', message: 'O DAS vence amanhã. Favor verificar a guia na aba de impostos.', read: false, timestamp: new Date().toISOString() }
];

// --- Store Functions ---

// Payment Config
export const getPaymentConfig = () => PAYMENT_CONFIG;
export const updatePaymentConfig = (config: PaymentConfig) => { PAYMENT_CONFIG = config; };

// Inter API Simulation
export const generatePixCharge = async (reqId: string, amount: number): Promise<{txid: string, pixCopiaECola: string}> => {
  // Simulates:
  // 1. Authenticate with ClientID/Secret + Cert -> Get Token
  // 2. POST /cob -> Get txid & copiaEcola
  
  if (!PAYMENT_CONFIG.inter.clientId || !PAYMENT_CONFIG.inter.certificateUploaded) {
    throw new Error("Configuração de pagamento incompleta.");
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const txid = `TXID-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      // Mock Pix Copia e Cola
      const pixCopiaECola = `00020126360014BR.GOV.BCB.PIX0114${PAYMENT_CONFIG.inter.pixKey || 'CHAVE-ALEATORIA'}5204000053039865802BR5913ContabilConnect6008SaoPaulo62070503***6304${txid}`;
      
      // Update Request in DB
      const req = SERVICE_REQUESTS.find(r => r.id === reqId);
      if (req) {
        req.txid = txid;
        req.pixCopiaECola = pixCopiaECola;
        // 60 minutes validity
        req.pixExpiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        req.auditLog.push({
          id: Date.now().toString(),
          action: 'Cobrança PIX Gerada (Aguardando Webhook)',
          user: 'Sistema',
          timestamp: new Date().toISOString()
        });
        updateServiceRequest(req);
      }
      resolve({ txid, pixCopiaECola });
    }, 1000);
  });
};

// Simulate Webhook Callback (Called by "Simulate Bank App" button in UI)
export const simulateWebhookPayment = (txid: string) => {
  const req = SERVICE_REQUESTS.find(r => r.txid === txid);
  if (req && req.status === 'Pendente Pagamento') {
    req.status = 'Solicitada'; // Workflow starts
    req.paymentStatus = 'Aprovado';
    req.auditLog.push({
      id: Date.now().toString(),
      action: 'Webhook: Pagamento Confirmado',
      user: 'Banco Inter API',
      timestamp: new Date().toISOString()
    });
    
    // Notify Admin
    const admins = USERS.filter(u => u.role === 'admin');
    admins.forEach(admin => {
        addNotification({
            id: Date.now().toString(),
            userId: admin.id,
            title: 'Pagamento PIX Recebido',
            message: `O pagamento do pedido ${req.protocol} foi confirmado via Webhook.`,
            read: false,
            timestamp: new Date().toISOString()
        });
    });

    updateServiceRequest(req);
    return true;
  }
  return false;
};

// Categories
export const getCategories = () => CATEGORIES;
export const addCategory = (cat: string) => { if(!CATEGORIES.includes(cat)) CATEGORIES = [...CATEGORIES, cat]; };
export const deleteCategory = (cat: string) => { CATEGORIES = CATEGORIES.filter(c => c !== cat); };

// Request Types (Config)
export const getRequestTypes = () => REQUEST_TYPES;
export const addRequestType = (type: RequestTypeConfig) => { REQUEST_TYPES = [...REQUEST_TYPES, type]; };
export const deleteRequestType = (id: string) => { REQUEST_TYPES = REQUEST_TYPES.filter(t => t.id !== id); };

// Companies & Users
export const getCompanies = () => COMPANIES;
export const addCompany = (c: Company) => { COMPANIES = [...COMPANIES, c]; };
export const updateCompany = (c: Company) => { COMPANIES = COMPANIES.map(x => x.id === c.id ? c : x); };
export const deleteCompany = (id: string) => { COMPANIES = COMPANIES.filter(x => x.id !== id); };

export const getUsers = () => USERS;
export const addUser = (u: User) => { USERS = [...USERS, u]; };
export const updateUser = (u: User) => { USERS = USERS.map(x => x.id === u.id ? u : x); };
export const deleteUser = (id: string) => { USERS = USERS.filter(x => x.id !== id); };

// Documents
export const getDocuments = (companyId: string) => DOCUMENTS.filter(d => d.companyId === companyId);
export const addDocument = (d: Document) => { DOCUMENTS = [d, ...DOCUMENTS]; };
export const updateDocument = (d: Document) => { DOCUMENTS = DOCUMENTS.map(x => x.id === d.id ? d : x); };
export const addDocumentMessage = (docId: string, msg: ChatMessage) => {
  const doc = DOCUMENTS.find(d => d.id === docId);
  if (doc) { doc.chat = [...doc.chat, msg]; updateDocument(doc); }
};
export const addAuditLog = (docId: string, log: AuditLog) => {
  const doc = DOCUMENTS.find(d => d.id === docId);
  if (doc) { doc.auditLog = [...doc.auditLog, log]; updateDocument(doc); }
};

// Service Requests
export const getServiceRequests = (companyId?: string, includeDeleted = false) => {
  let reqs = SERVICE_REQUESTS;
  if (companyId) reqs = reqs.filter(r => r.companyId === companyId);
  if (!includeDeleted) reqs = reqs.filter(r => !r.deleted);
  return reqs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getDeletedServiceRequests = () => SERVICE_REQUESTS.filter(r => r.deleted);

export const addServiceRequest = (req: ServiceRequest) => { 
  SERVICE_REQUESTS = [req, ...SERVICE_REQUESTS];
  
  // Notify Admins
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

export const softDeleteServiceRequest = (id: string, user: string) => {
  const req = SERVICE_REQUESTS.find(r => r.id === id);
  if(req) {
    req.deleted = true;
    req.auditLog.push({ id: Date.now().toString(), action: 'Enviado para Lixeira', user, timestamp: new Date().toISOString() });
    updateServiceRequest(req);
  }
};

export const restoreServiceRequest = (id: string, user: string) => {
  const req = SERVICE_REQUESTS.find(r => r.id === id);
  if(req) {
    req.deleted = false;
    req.auditLog.push({ id: Date.now().toString(), action: 'Restaurado da Lixeira', user, timestamp: new Date().toISOString() });
    updateServiceRequest(req);
  }
};

export const addRequestMessage = (reqId: string, msg: ChatMessage) => {
  const req = SERVICE_REQUESTS.find(r => r.id === reqId);
  if(req) { req.chat = [...req.chat, msg]; updateServiceRequest(req); }
};

// Notifications
export const getNotifications = (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const getAllNotifications = () => [...NOTIFICATIONS].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const addNotification = (n: Notification) => { NOTIFICATIONS = [n, ...NOTIFICATIONS]; };
export const updateNotification = (n: Notification) => { NOTIFICATIONS = NOTIFICATIONS.map(x => x.id === n.id ? n : x); };
export const deleteNotification = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.filter(n => n.id !== id); };
export const markNotificationRead = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.map(n => n.id === id ? { ...n, read: true } : n); };

// Mock Routines
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
