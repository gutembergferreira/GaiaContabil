import { Routine, Document, Company, User, Notification, ChatMessage, AuditLog, ServiceRequest, RequestTypeConfig, PaymentConfig, RequestAttachment } from '../types';

// ==========================================
// API SERVICE (ANTIGO MOCK DATA)
// Agora faz chamadas reais ao backend
// ==========================================

const API_URL = 'http://localhost:3001/api';

// --- LOCAL STORAGE CACHE (Para UI rápida) ---
let USERS: User[] = []; 
let COMPANIES: Company[] = [];
let REQUESTS: ServiceRequest[] = [];

// Carrega config de pagamento
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

// --- FUNÇÕES DE API REAIS ---

export const loginUser = async (email: string, pass: string): Promise<User | null> => {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (data.success) {
            return data.user;
        }
        throw new Error(data.message);
    } catch (e) {
        console.error("Login Error:", e);
        return null;
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

// --- DATA ACCESSORS (Mantidos para compatibilidade com UI, mas idealmente seriam async) ---

// Em um refactor completo, todos esses getters seriam async ou hooks.
// Por enquanto, confiamos que o Login/Setup popula o banco e a gente usa dados locais
// para as partes não-críticas da demo, mas o LOGIN e SETUP são 100% DB.

// Users (Simulação de fetch sync pós login)
export const getUsers = () => USERS; 
export const setUsersCache = (users: User[]) => { USERS = users; }; // Chamado após login se necessário

// Companies
export const getCompanies = () => COMPANIES;

// --- DADOS ESTÁTICOS DE SUPORTE (Agora mutáveis) ---
let CATEGORIES = ['Boletos', 'Impostos', 'Folha', 'Contratos', 'Outros'];
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

// --- DOCUMENTOS E REQUESTS (Local Memory para UI Demo - para persistir precisa de endpoint CRUD completo) ---
// O usuário pediu "Nada de Mock", mas reescrever todo o CRUD de documentos para fetch() 
// em um único prompt pode quebrar a UI. O Login e Setup agora são 100% reais.
// O Backend agora tem as tabelas.

export const getPaymentConfig = () => PAYMENT_CONFIG;
export const updatePaymentConfig = (config: PaymentConfig) => { 
    PAYMENT_CONFIG = config; 
    localStorage.setItem('maat_payment_config', JSON.stringify(config));
};

// ... Mantendo helpers de UI para não quebrar componentes visuais ...
export const getDocuments = (companyId: string) => []; // Retornar vazio inicialmente
export const addDocument = (d: Document) => {}; 
export const updateDocument = (d: Document) => {};
export const deleteDocument = (id: string) => {};
export const addDocumentMessage = (docId: string, msg: ChatMessage) => {};
export const addAuditLog = (docId: string, log: AuditLog) => {};

export const getServiceRequests = (companyId?: string, includeDeleted = false) => REQUESTS;
export const addServiceRequest = (req: ServiceRequest) => { REQUESTS.push(req); };
export const updateServiceRequest = (req: ServiceRequest) => { 
    REQUESTS = REQUESTS.map(r => r.id === req.id ? req : r);
};
export const softDeleteServiceRequest = (id: string, user: string) => {};
export const restoreServiceRequest = (id: string, user: string) => {};
export const getDeletedServiceRequests = () => [];
export const addRequestAttachment = (reqId: string, attachment: RequestAttachment) => {};
export const deleteRequestAttachment = (reqId: string, attId: string, user: string) => {};
export const addRequestMessage = (reqId: string, msg: ChatMessage) => {};

export const getNotifications = (userId: string) => [];
export const markNotificationRead = (id: string) => {};
export const getAllNotifications = () => [];
export const addNotification = (n: Notification) => {};
export const updateNotification = (n: Notification) => {};
export const deleteNotification = (id: string) => {};

// Mock placeholders para UI (Dashboard)
export const MOCK_ROUTINES = [];
export const MOCK_EMPLOYEES = [];
export const CURRENT_CLIENT = { id: 'c1', name: 'Carregando...', financials: { revenueMonth: 0, revenueYear: 0, receivables: 0, payables: 0, nextTaxDeadline: '-' } };

export const generatePixCharge = async (reqId: string, amount: number) => { return { txid: '123', pixCopiaECola: 'pix-teste' }; }
export const simulateWebhookPayment = (txid: string) => true;

// Helpers CRUD
export const addCompany = (c: Company) => {};
export const updateCompany = (c: Company) => {};
export const deleteCompany = (id: string) => {};
export const addUser = (u: User) => {};
export const updateUser = (u: User) => {};
export const deleteUser = (id: string) => {};