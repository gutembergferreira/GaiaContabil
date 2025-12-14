import { Routine, Document, Company, User, Notification, ChatMessage, AuditLog, ServiceRequest, RequestTypeConfig, PaymentConfig, RequestAttachment } from '../types';

// ==========================================
// API SERVICE (MOCK DATA + REAL API CALLS)
// ==========================================

// --- LOCAL STORAGE CACHE (Para UI rápida) ---
let USERS: User[] = [
  { id: 'u1', name: 'Carlos Contador', email: 'admin@maat.com', role: 'admin', password: 'admin' },
  { id: 'u2', name: 'Ana Empresária', email: 'cliente@demo.com', role: 'client', companyId: 'c1', password: '123' },
  { id: 'u3', name: 'Roberto Varejo', email: 'roberto@varejo.com', role: 'client', companyId: 'c2', password: '123' }
];

let COMPANIES: Company[] = [
  { id: 'c1', name: 'Empresa Demo LTDA', cnpj: '00.000.000/0001-00', address: 'Rua Exemplo, 100', contact: '1199999999' },
  { id: 'c2', name: 'Comércio Varejo SA', cnpj: '98.765.432/0001-10', address: 'Av B, 456', contact: '1188888888' }
];

let REQUESTS: ServiceRequest[] = [];
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

let NOTIFICATIONS: Notification[] = [
    { id: 'n1', userId: 'u2', title: 'Imposto a vencer', message: 'O DAS vence amanhã. Favor verificar a guia na aba de impostos.', read: false, timestamp: new Date().toISOString() }
];

const loadPaymentConfig = (): PaymentConfig => {
    const saved = localStorage.getItem('maat_payment_config');
    if (saved) return JSON.parse(saved);
    return {
        environment: 'sandbox',
        enablePix: false,
        enableGateway: false,
        inter: { clientId: '', clientSecret: '', certificateUploaded: false, pixKey: '' }
    };
};
let PAYMENT_CONFIG: PaymentConfig = loadPaymentConfig();
const API_URL = 'http://localhost:3001/api';

// --- FUNÇÕES DE API REAIS ---

export const loginUser = async (email: string, pass: string): Promise<User | null> => {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        
        if (!res.ok) throw new Error('Falha HTTP');

        const data = await res.json();
        if (data.success) {
            return data.user;
        }
        throw new Error(data.message);
    } catch (e) {
        console.warn("Backend offline ou login falhou. Usando Mock Local.", e);
        const mockUser = USERS.find(u => u.email === email && u.password === pass);
        return mockUser || null;
    }
};

export const testPixConnection = async (): Promise<{success: boolean, message: string, logs: string[]}> => {
    try {
        const res = await fetch(`${API_URL}/test-inter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: PAYMENT_CONFIG.inter.clientId,
                clientSecret: PAYMENT_CONFIG.inter.clientSecret
            })
        });
        const data = await res.json();
        return { success: data.success, message: data.message, logs: data.logs || [] };
    } catch (e: any) {
        return { success: false, message: "Falha de comunicação com Backend (3001).", logs: [e.message] };
    }
};

// --- DATA ACCESSORS ---
export const getUsers = () => USERS; 
export const setUsersCache = (users: User[]) => { USERS = users; };
export const getCompanies = () => COMPANIES;
let CATEGORIES = ['Boletos', 'Impostos', 'Folha', 'Contratos', 'Documentos Solicitados', 'Outros'];
export const getCategories = () => CATEGORIES;
export const addCategory = (cat: string) => { if(!CATEGORIES.includes(cat)) CATEGORIES = [...CATEGORIES, cat]; };
export const deleteCategory = (cat: string) => { CATEGORIES = CATEGORIES.filter(c => c !== cat); };

let REQUEST_TYPES: RequestTypeConfig[] = [
  { id: 'rt1', name: '2ª Via de Boleto', price: 0 },
  { id: 'rt2', name: 'Alteração Contratual', price: 150.00 },
  { id: 'rt3', name: 'Certidão Negativa', price: 50.00 },
];
export const getRequestTypes = () => REQUEST_TYPES;
export const addRequestType = (type: RequestTypeConfig) => { REQUEST_TYPES = [...REQUEST_TYPES, type]; };
export const deleteRequestType = (id: string) => { REQUEST_TYPES = REQUEST_TYPES.filter(t => t.id !== id); };

export const getPaymentConfig = () => PAYMENT_CONFIG;
export const updatePaymentConfig = (config: PaymentConfig) => { 
    PAYMENT_CONFIG = config; 
    localStorage.setItem('maat_payment_config', JSON.stringify(config));
};

export const getDocuments = (companyId: string) => DOCUMENTS.filter(d => d.companyId === companyId);
export const addDocument = (d: Document) => { DOCUMENTS = [d, ...DOCUMENTS]; };

export const updateDocument = (d: Document) => {
    const oldDoc = DOCUMENTS.find(doc => doc.id === d.id);
    if (oldDoc && oldDoc.paymentStatus !== 'Pago' && d.paymentStatus === 'Pago') {
         const admins = USERS.filter(u => u.role === 'admin');
         admins.forEach(admin => {
             addNotification({
                 id: Date.now().toString() + Math.random(),
                 userId: admin.id,
                 title: 'Pagamento Informado',
                 message: `A guia "${d.title}" foi marcada como PAGA pelo cliente.`,
                 read: false,
                 timestamp: new Date().toISOString()
             });
         });
    }
    DOCUMENTS = DOCUMENTS.map(doc => doc.id === d.id ? d : doc);
};

export const deleteDocument = (id: string) => { DOCUMENTS = DOCUMENTS.filter(d => d.id !== id); };
export const addDocumentMessage = (docId: string, msg: ChatMessage) => {
    const doc = DOCUMENTS.find(d => d.id === docId);
    if(doc) {
        doc.chat = [...doc.chat, msg];
        updateDocument(doc);
    }
};
export const addAuditLog = (docId: string, log: AuditLog) => {
    const doc = DOCUMENTS.find(d => d.id === docId);
    if(doc) {
        doc.auditLog = [...doc.auditLog, log];
        updateDocument(doc);
    }
};

export const getServiceRequests = (companyId?: string, includeDeleted = false) => {
    let reqs = REQUESTS;
    if (companyId) reqs = reqs.filter(r => r.companyId === companyId);
    if (!includeDeleted) reqs = reqs.filter(r => !r.deleted);
    return reqs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const addServiceRequest = (req: ServiceRequest) => { 
    REQUESTS = [req, ...REQUESTS]; 
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
    REQUESTS = REQUESTS.map(r => r.id === req.id ? req : r);
};
export const softDeleteServiceRequest = (id: string, user: string) => {
    const r = REQUESTS.find(x => x.id === id);
    if(r) { r.deleted = true; updateServiceRequest(r); }
};
export const restoreServiceRequest = (id: string, user: string) => {
    const r = REQUESTS.find(x => x.id === id);
    if(r) { r.deleted = false; updateServiceRequest(r); }
};
export const getDeletedServiceRequests = () => REQUESTS.filter(r => r.deleted);
export const addRequestAttachment = (reqId: string, attachment: RequestAttachment) => {
    const req = REQUESTS.find(r => r.id === reqId);
    if(req) {
        if(!req.attachments) req.attachments = [];
        req.attachments = [...req.attachments, attachment];
        updateServiceRequest(req);
    }
};
export const deleteRequestAttachment = (reqId: string, attId: string, user: string) => {
    const req = REQUESTS.find(r => r.id === reqId);
    if(req && req.attachments) {
        req.attachments = req.attachments.filter(a => a.id !== attId);
        updateServiceRequest(req);
    }
};
export const addRequestMessage = (reqId: string, msg: ChatMessage) => {
    const req = REQUESTS.find(r => r.id === reqId);
    if(req) { req.chat = [...req.chat, msg]; updateServiceRequest(req); }
};

export const getNotifications = (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const markNotificationRead = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.map(n => n.id === id ? { ...n, read: true } : n); };
export const getAllNotifications = () => NOTIFICATIONS;
export const addNotification = (n: Notification) => { NOTIFICATIONS = [n, ...NOTIFICATIONS]; };
export const updateNotification = (n: Notification) => { NOTIFICATIONS = NOTIFICATIONS.map(x => x.id === n.id ? n : x); };
export const deleteNotification = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.filter(n => n.id !== id); };

// Mock placeholders
export const MOCK_ROUTINES: Routine[] = [
  { id: '1', title: 'Fechamento Folha', clientName: 'Empresa Demo LTDA', department: 'Pessoal', deadline: '2024-06-05', status: 'Pendente', competence: '05/2024' },
  { id: '2', title: 'Apuração ICMS', clientName: 'Comércio Varejo SA', department: 'Fiscal', deadline: '2024-06-10', status: 'Em Análise', competence: '05/2024' },
  { id: '3', title: 'Balancete Mensal', clientName: 'Empresa Demo LTDA', department: 'Contábil', deadline: '2024-06-25', status: 'Concluído', competence: '04/2024' },
  { id: '4', title: 'Renovação Alvará', clientName: 'Comércio Varejo SA', department: 'Legalização', deadline: '2024-06-30', status: 'Pendente', competence: '2024' },
];

export const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'João Silva', role: 'Vigilante', admissionDate: '2022-01-15', status: 'Ativo', worksite: 'Posto Alpha', vacationDue: '2024-08-15' },
  { id: 'e2', name: 'Maria Souza', role: 'Aux. Limpeza', admissionDate: '2023-03-10', status: 'Ativo', worksite: 'Sede', vacationDue: '2024-03-10' },
];
export const CURRENT_CLIENT = { 
    id: 'c1', name: 'Empresa Demo LTDA', 
    financials: { revenueMonth: 28500.00, revenueYear: 342000.00, receivables: 5200.00, payables: 3100.00, nextTaxDeadline: '20/06' } 
};

// --- CRITICAL CHANGE: NO MOCKS FOR PRODUCTION ---
export const generatePixCharge = async (reqId: string, amount: number) => { 
    // Validação inicial básica
    if (!PAYMENT_CONFIG.inter.clientId) {
        throw new Error('CONFIG_ERROR: Client ID do Banco Inter não configurado nas Configurações.');
    }

    try {
        const res = await fetch(`${API_URL}/pix`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                amount, 
                protocol: 'REQ_REAL_' + reqId, // Envia ID real
                pixKey: PAYMENT_CONFIG.inter.pixKey, 
                clientId: PAYMENT_CONFIG.inter.clientId, 
                clientSecret: PAYMENT_CONFIG.inter.clientSecret, 
                requestData: { nome: 'Cliente Maat', cpf: '00000000000' } // Em produção, pegaria do cadastro do usuário
            })
        });

        const data = await res.json();

        if(!res.ok) {
            // Repassa o erro detalhado do backend para o frontend tratar
            const errorMsg = data.details?.error_description || data.error || data.message || 'Erro desconhecido ao gerar PIX';
            throw new Error(errorMsg);
        }

        return data; // { txid, pixCopiaECola } reais do Inter
    } catch (error: any) {
        console.error("Erro CRÍTICO na geração PIX:", error);
        throw error; // Lança o erro para o componente UI exibir. NÃO RETORNA MOCK.
    }
}

export const simulateWebhookPayment = (txid: string) => true;

// Helpers CRUD
export const addCompany = (c: Company) => { COMPANIES = [...COMPANIES, c]; };
export const updateCompany = (c: Company) => { COMPANIES = COMPANIES.map(x => x.id === c.id ? c : x); };
export const deleteCompany = (id: string) => { COMPANIES = COMPANIES.filter(x => x.id !== id); };
export const addUser = (u: User) => { USERS = [...USERS, u]; };
export const updateUser = (u: User) => { USERS = USERS.map(x => x.id === u.id ? u : x); };
export const deleteUser = (id: string) => { USERS = USERS.filter(x => x.id !== id); };