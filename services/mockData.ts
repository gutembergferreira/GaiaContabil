import { Routine, Document, Company, User, Notification, ChatMessage, AuditLog, ServiceRequest, RequestTypeConfig, PaymentConfig, RequestAttachment, Employee, WorkSite, HRAdmission, HRRequest, HRFieldFeedback } from '../types';

let USERS: User[] = [];
let COMPANIES: Company[] = [];
let REQUESTS: ServiceRequest[] = [];
let DOCUMENTS: Document[] = [];
let NOTIFICATIONS: Notification[] = [];
let CATEGORIES: string[] = [];
let REQUEST_TYPES: RequestTypeConfig[] = [];

// HR STATE
let WORK_SITES: WorkSite[] = [];
let EMPLOYEES: Employee[] = [];
let HR_ADMISSIONS: HRAdmission[] = [];
let HR_REQUESTS: HRRequest[] = [];
let FIELD_FEEDBACK: HRFieldFeedback[] = [];

const API_URL = 'http://localhost:3001/api';

export const fetchInitialData = async () => {
    try {
        const res = await fetch(`${API_URL}/sync`);
        if (!res.ok) throw new Error('Failed to sync');
        const data = await res.json();
        
        USERS = data.users;
        COMPANIES = data.companies;
        CATEGORIES = data.categories;
        REQUEST_TYPES = data.requestTypes;
        NOTIFICATIONS = data.notifications;
        
        WORK_SITES = data.workSites;
        EMPLOYEES = data.employees;
        HR_ADMISSIONS = data.hrAdmissions;
        HR_REQUESTS = data.hrRequests;
        FIELD_FEEDBACK = data.fieldFeedback;

        REQUESTS = data.requests.map((r: any) => ({
            ...r,
            attachments: data.attachments.filter((a: any) => a.entityId === r.id && (a.entityType === 'request' || !a.entityType)),
            chat: data.chat.filter((c: any) => c.entityId === r.id),
            auditLog: []
        }));

        DOCUMENTS = data.documents.map((d: any) => ({
            ...d,
            chat: data.chat.filter((c: any) => c.entityId === d.id),
            auditLog: [],
            attachments: data.attachments.filter((a: any) => a.entityId === d.id && a.entityType === 'document')
        }));

        console.log("Dados sincronizados com o banco de dados.");
        return true;
    } catch (e) {
        console.error("Erro ao sincronizar dados:", e);
        return false;
    }
};

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
            await fetchInitialData(); 
            return data.user;
        }
        return null;
    } catch (e) { return null; }
};

// GETTERS
export const getUsers = () => USERS;
export const getCompanies = () => COMPANIES;
export const getCategories = () => CATEGORIES;
export const getRequestTypes = () => REQUEST_TYPES;
export const getDocuments = (companyId: string) => DOCUMENTS.filter(d => d.companyId === companyId);

export const getServiceRequests = (companyId?: string, includeDeleted = false) => {
    let reqs = REQUESTS;
    if (companyId) reqs = reqs.filter(r => r.companyId === companyId);
    if (!includeDeleted) reqs = reqs.filter(r => !r.deleted);
    return reqs;
};

export const getDeletedServiceRequests = () => REQUESTS.filter(r => r.deleted);
export const getNotifications = (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId);
export const getAllNotifications = () => NOTIFICATIONS;

// HR GETTERS
export const getWorkSites = (companyId: string) => WORK_SITES.filter(s => s.companyId === companyId);
export const getEmployees = (companyId: string) => EMPLOYEES.filter(e => e.companyId === companyId);
export const getHRAdmissions = (companyId: string) => HR_ADMISSIONS.filter(a => a.companyId === companyId);
export const getHRRequests = (companyId: string) => HR_REQUESTS.filter(r => r.companyId === companyId);
export const getFieldFeedback = (targetId: string) => FIELD_FEEDBACK.filter(f => f.targetId === targetId);

// HR MUTATIONS (PERSISTENT)
export const addHRAdmission = async (adm: HRAdmission) => { 
    await fetch(`${API_URL}/hr/admission`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(adm)
    });
    await fetchInitialData();
};
export const updateHRAdmission = async (adm: HRAdmission) => { 
    await fetch(`${API_URL}/hr/admission`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(adm)
    });
    await fetchInitialData();
};
export const addHRRequest = async (req: HRRequest) => { 
    await fetch(`${API_URL}/hr/request`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(req)
    });
    await fetchInitialData();
};
export const updateHRRequest = async (req: HRRequest) => { 
    await fetch(`${API_URL}/hr/request`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(req)
    });
    await fetchInitialData();
};
export const addFieldFeedback = async (f: HRFieldFeedback) => { 
    await fetch(`${API_URL}/hr/feedback`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(f)
    });
    await fetchInitialData();
};
export const resolveFieldFeedback = async (id: string) => { 
    const feedback = FIELD_FEEDBACK.find(f => f.id === id);
    if (feedback) {
        await addFieldFeedback({...feedback, resolved: true});
    }
};
export const addWorkSite = async (ws: WorkSite) => { 
    await fetch(`${API_URL}/hr/worksite`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(ws)
    });
    await fetchInitialData();
};
export const addEmployee = async (e: Employee) => { 
    await fetch(`${API_URL}/hr/employee`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(e)
    });
    await fetchInitialData();
};

export const getPaymentConfig = () => {
    const saved = localStorage.getItem('maat_payment_config');
    if (saved) return JSON.parse(saved);
    return { environment: 'sandbox', enablePix: false, enableGateway: false, inter: { clientId: '', clientSecret: '', certificateUploaded: false, pixKey: '' } };
};
export const updatePaymentConfig = (config: PaymentConfig) => { localStorage.setItem('maat_payment_config', JSON.stringify(config)); };

export const generatePixCharge = async (reqId: string, amount: number) => { 
    const config = getPaymentConfig();
    const req = REQUESTS.find(r => r.id === reqId);
    const clientUser = USERS.find(u => u.id === req?.clientId);
    try {
        const res = await fetch(`${API_URL}/pix`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ amount, protocol: 'REQ_' + reqId, pixKey: config.inter.pixKey, clientId: config.inter.clientId, clientSecret: config.inter.clientSecret, requestData: { name: clientUser?.name || 'Cliente', cpf: clientUser?.cpf || '00000000000' } })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.details?.error_description || data.error || 'Erro PIX');
        return data;
    } catch (error: any) { throw error; }
};

export const MOCK_ROUTINES: Routine[] = [];
export const MOCK_EMPLOYEES = [];
export const CURRENT_CLIENT = { id: 'c1', name: 'Empresa Demo', financials: { revenueMonth: 0, revenueYear: 0, receivables: 0, payables: 0, nextTaxDeadline: '' } };

export const addServiceRequest = (req: ServiceRequest) => { REQUESTS = [req, ...REQUESTS]; };
export const updateServiceRequest = (req: ServiceRequest) => { REQUESTS = REQUESTS.map(r => r.id === req.id ? req : r); };
export const addDocument = (d: Document) => { DOCUMENTS = [d, ...DOCUMENTS]; };
export const updateDocument = (d: Document) => { DOCUMENTS = DOCUMENTS.map(doc => doc.id === d.id ? d : doc); };
export const markNotificationRead = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.map(n => n.id === id ? { ...n, read: true } : n); };
export const deleteDocument = (id: string) => { DOCUMENTS = DOCUMENTS.filter(d => d.id !== id); };
export const addDocumentMessage = (docId: string, msg: ChatMessage) => { DOCUMENTS = DOCUMENTS.map(d => d.id === docId ? { ...d, chat: [...d.chat, msg] } : d); };
export const addAuditLog = (docId: string, log: AuditLog) => { DOCUMENTS = DOCUMENTS.map(d => d.id === docId ? { ...d, auditLog: [...d.auditLog, log] } : d); };
export const softDeleteServiceRequest = (id: string, user: string) => { REQUESTS = REQUESTS.map(r => r.id === id ? { ...r, deleted: true } : r); };
export const restoreServiceRequest = (id: string, user: string) => { REQUESTS = REQUESTS.map(r => r.id === id ? { ...r, deleted: false } : r); };
export const addRequestAttachment = (reqId: string, attachment: RequestAttachment) => { REQUESTS = REQUESTS.map(r => r.id === reqId ? { ...r, attachments: [...r.attachments, attachment] } : r); };
export const deleteRequestAttachment = (reqId: string, attId: string, user: string) => { REQUESTS = REQUESTS.map(r => r.id === reqId ? { ...r, attachments: r.attachments.filter(a => a.id !== attId) } : r); };
export const addRequestMessage = (reqId: string, msg: ChatMessage) => { REQUESTS = REQUESTS.map(r => r.id === reqId ? { ...r, chat: [...r.chat, msg] } : r); };
export const addNotification = (n: Notification) => { NOTIFICATIONS = [n, ...NOTIFICATIONS]; };
export const updateNotification = (n: Notification) => { NOTIFICATIONS = NOTIFICATIONS.map(x => x.id === n.id ? n : x); };
export const deleteNotification = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.filter(n => n.id !== id); };
export const addCategory = (cat: string) => { if (!CATEGORIES.includes(cat)) CATEGORIES = [...CATEGORIES, cat]; };
export const deleteCategory = (cat: string) => { CATEGORIES = CATEGORIES.filter(c => c !== cat); };
export const addRequestType = (t: RequestTypeConfig) => { REQUEST_TYPES = [...REQUEST_TYPES, t]; };
export const deleteRequestType = (id: string) => { REQUEST_TYPES = REQUEST_TYPES.filter(t => t.id !== id); };
export const addUser = (u: User) => { USERS = [...USERS, u]; };
export const updateUser = (u: User) => { USERS = USERS.map(x => x.id === u.id ? u : x); };
export const deleteUser = (id: string) => { USERS = USERS.filter(u => u.id !== id); };
export const addCompany = (c: Company) => { COMPANIES = [...COMPANIES, c]; };
export const updateCompany = (c: Company) => { COMPANIES = COMPANIES.map(x => x.id === c.id ? c : x); };
export const deleteCompany = (id: string) => { COMPANIES = COMPANIES.filter(c => c.id !== id); };
export const testPixConnection = async () => ({ success: true, message: 'Backend conectado.', logs: []});
export const simulateWebhookPayment = (txid: string) => {
    let success = false;
    REQUESTS = REQUESTS.map(r => {
        if (r.txid === txid) {
            success = true;
            return { ...r, status: 'Solicitada', paymentStatus: 'Aprovado' };
        }
        return r;
    });
    return success;
};
