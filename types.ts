export type Role = 'admin' | 'client';

export type Department = 'Contábil' | 'Fiscal' | 'Pessoal' | 'Legalização';

export type DocCategory = string;

// Changed to object to support price/config
export interface RequestTypeConfig {
  id: string;
  name: string;
  price: number; // 0 = free
}

export type DocStatus = 'Enviado' | 'Visualizado';
export type PaymentStatus = 'Pago' | 'Aberto' | 'N/A';

export type RequestStatus = 'Pendente Pagamento' | 'Pagamento em Análise' | 'Solicitada' | 'Visualizada' | 'Em Resolução' | 'Em Validação' | 'Resolvido';
export type RequestPaymentStatus = 'Pendente' | 'Em Análise' | 'Aprovado' | 'N/A';

export interface InterCredentials {
  clientId: string;
  clientSecret: string;
  certificateUploaded: boolean; // Mock check for .crt and .key
  pixKey: string;
}

export interface PaymentConfig {
  enablePix: boolean;
  enableGateway: boolean; // Future placeholder
  inter: InterCredentials;
}

export interface ChatMessage {
  id: string;
  sender: string;
  role: Role;
  text: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  contact: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In real app, hashed
  role: Role;
  companyId?: string; // If client
  photoUrl?: string;
  address?: string;
  phone?: string;
}

export interface RequestAttachment {
  id: string;
  name: string;
  url: string; // Mock URL
  uploadedBy: string; // User name
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  category: DocCategory;
  date: string; // ISO date
  companyId: string;
  url?: string;
  status: DocStatus;
  paymentStatus: PaymentStatus; 
  amount?: number;
  competence?: string; 
  attachments?: RequestAttachment[]; // Added to match Request structure
  chat: ChatMessage[];
  auditLog: AuditLog[];
}

export interface ServiceRequest {
  id: string;
  protocol: string; // e.g., SRV-2024-001
  title: string;
  type: string; // Name of the type
  price: number;
  description: string;
  
  status: RequestStatus;
  paymentStatus: RequestPaymentStatus;
  
  // PIX Fields
  txid?: string;
  pixCopiaECola?: string;
  pixExpiration?: string; // ISO Date for expiration (60 mins)

  clientId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean; // Soft delete
  attachments: RequestAttachment[]; // Added attachments
  chat: ChatMessage[];
  auditLog: AuditLog[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export interface Routine {
  id: string;
  title: string;
  clientName: string;
  department: Department;
  deadline: string; // ISO date
  status: string;
  competence: string; // e.g., "05/2024"
}