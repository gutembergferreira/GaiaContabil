import { Routine, Document, Company, User, Notification, ChatMessage, AuditLog, DocCategory } from '../types';

// --- Initial Data ---

let CATEGORIES: string[] = ['Boletos', 'Impostos', 'Folha', 'Contratos', 'Documentos Solicitados', 'Outros'];

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
  },
  { 
    id: 'd3', title: 'Folha Pagamento Maio', category: 'Folha', date: '2024-05-05', companyId: 'c1', 
    status: 'Enviado', paymentStatus: 'N/A', 
    chat: [], auditLog: [] 
  }
];

let NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u2', title: 'Imposto a vencer', message: 'O DAS vence amanhã. Favor verificar a guia na aba de impostos.', read: false, timestamp: new Date().toISOString() }
];

// --- Store Functions (Simulating Backend) ---

// Categories
export const getCategories = () => CATEGORIES;
export const addCategory = (cat: string) => { if(!CATEGORIES.includes(cat)) CATEGORIES = [...CATEGORIES, cat]; };
export const deleteCategory = (cat: string) => { CATEGORIES = CATEGORIES.filter(c => c !== cat); };

// Companies
export const getCompanies = () => COMPANIES;
export const addCompany = (c: Company) => { COMPANIES = [...COMPANIES, c]; };
export const updateCompany = (c: Company) => { COMPANIES = COMPANIES.map(x => x.id === c.id ? c : x); };
export const deleteCompany = (id: string) => { COMPANIES = COMPANIES.filter(x => x.id !== id); };

// Users
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
  if (doc) {
    doc.chat = [...doc.chat, msg];
    updateDocument(doc);
  }
};

export const addAuditLog = (docId: string, log: AuditLog) => {
  const doc = DOCUMENTS.find(d => d.id === docId);
  if (doc) {
    doc.auditLog = [...doc.auditLog, log];
    updateDocument(doc);
  }
};

// Notifications
export const getNotifications = (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const getAllNotifications = () => [...NOTIFICATIONS].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const addNotification = (n: Notification) => { NOTIFICATIONS = [n, ...NOTIFICATIONS]; };
export const updateNotification = (n: Notification) => { NOTIFICATIONS = NOTIFICATIONS.map(x => x.id === n.id ? n : x); };
export const deleteNotification = (id: string) => { NOTIFICATIONS = NOTIFICATIONS.filter(n => n.id !== id); };

export const markNotificationRead = (id: string) => {
  NOTIFICATIONS = NOTIFICATIONS.map(n => n.id === id ? { ...n, read: true } : n);
};

// Mock Routines (kept static for dashboard demo)
export const MOCK_ROUTINES: Routine[] = [
  { id: '1', title: 'Fechamento Folha', clientName: 'Serviços LTDA', department: 'Pessoal', deadline: '2024-06-05', status: 'Pendente', competence: '05/2024' },
  { id: '2', title: 'Apuração ICMS', clientName: 'Comércio Varejo SA', department: 'Fiscal', deadline: '2024-06-10', status: 'Em Análise', competence: '05/2024' },
  { id: '3', title: 'Entrega DCTFWeb', clientName: 'Serviços LTDA', department: 'Contábil', deadline: '2024-06-15', status: 'Concluído', competence: '05/2024' },
  { id: '4', title: 'Renovação Alvará', clientName: 'Comércio Varejo SA', department: 'Legalização', deadline: '2024-06-20', status: 'Pendente', competence: '2024' },
];

export const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'João Silva', role: 'Vigilante', admissionDate: '2022-01-15', status: 'Ativo', worksite: 'Posto Alpha', vacationDue: '2024-08-15' },
];

export const CURRENT_CLIENT = {
  id: 'c1',
  name: 'Serviços Gerais LTDA',
  financials: {
    revenueMonth: 28500.00,
    revenueYear: 342000.00,
    receivables: 5200.00,
    payables: 3100.00,
    nextTaxDeadline: '20/06'
  }
};
