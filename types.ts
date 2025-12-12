export type Role = 'admin' | 'client';

export type Department = 'Contábil' | 'Fiscal' | 'Pessoal' | 'Legalização';

export type DocCategory = string;

export type DocStatus = 'Enviado' | 'Visualizado';
export type PaymentStatus = 'Pago' | 'Aberto' | 'N/A';

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

export interface Document {
  id: string;
  title: string;
  category: DocCategory;
  date: string; // ISO date
  companyId: string;
  url?: string;
  
  // Status workflow
  status: DocStatus;
  paymentStatus: PaymentStatus; // Only for Boletos/Impostos

  // Metadata
  amount?: number;
  competence?: string; // MM/YYYY

  // Interactions
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
