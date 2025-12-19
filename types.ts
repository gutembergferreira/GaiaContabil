export type Role = 'admin' | 'client';
export type Department = 'Contábil' | 'Fiscal' | 'Pessoal' | 'Legalização';
export type DocCategory = string;

export interface RequestTypeConfig {
  id: string;
  name: string;
  price: number;
}

export type DocStatus = 'Enviado' | 'Visualizado';
export type PaymentStatus = 'Pago' | 'Aberto' | 'N/A';

export type RequestStatus = 'Pendente Pagamento' | 'Pagamento em Análise' | 'Solicitada' | 'Visualizada' | 'Em Resolução' | 'Em Validação' | 'Resolvido';
export type RequestPaymentStatus = 'Pendente' | 'Em Análise' | 'Aprovado' | 'N/A';

// --- HR SPECIFIC TYPES ---
export type HRAdmissionStatus = 'Novo' | 'Validando' | 'Formulario com Erro' | 'Validado' | 'Finalizado';
export type HRRequestType = 'Férias' | 'Demissão' | 'Atestado';
export type HRRequestStatus = 'Solicitado' | 'Em Analise' | 'Pendencia' | 'Agendado' | 'Finalizado';

export interface WorkSite {
    id: string;
    companyId: string;
    name: string;
    description?: string;
}

export interface Employee {
    id: string;
    companyId: string;
    workSiteId?: string;
    name: string;
    role: string;
    admissionDate: string;
    status: 'Ativo' | 'Afastado' | 'Desligado';
    salary: number;
    cpf: string;
    rg?: string;
    pis?: string;
    phone?: string;
    email?: string;
    vacationDue: string;
}

export interface HRFieldFeedback {
    id: string;
    targetId: string; // ID da admissão ou solicitação
    fieldName: string;
    message: string;
    resolved: boolean;
}

export interface HRAdmission {
    id: string;
    companyId: string;
    status: HRAdmissionStatus;
    
    // Dados Pessoais
    fullName: string;
    cpf: string;
    rg: string;
    birthDate: string;
    gender: string;
    maritalStatus: string;
    
    // Contratual
    role: string;
    salary: number;
    workSiteId: string;
    expectedStartDate: string;
    
    // Documentação Extra
    pis?: string;
    tituloEleitor?: string;
    ctps?: string;
    address: string;
    
    clientId: string;
    createdAt: string;
    updatedAt: string;
}

export interface HRRequest {
    id: string;
    employeeId: string;
    companyId: string;
    type: HRRequestType;
    status: HRRequestStatus;
    details: any; // Campos específicos por tipo (json)
    clientId: string;
    createdAt: string;
    updatedAt: string;
}

// --- REST OF TYPES ---

export interface InterCredentials {
  clientId: string;
  clientSecret: string;
  certificateUploaded: boolean;
  pixKey: string;
}

export interface PaymentConfig {
  environment: 'sandbox' | 'production';
  enablePix: boolean;
  enableGateway: boolean;
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
  password?: string;
  role: Role;
  companyId?: string;
  photoUrl?: string;
  address?: string;
  phone?: string;
  cpf?: string;
}

export interface RequestAttachment {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
  entityType?: 'request' | 'admission' | 'hr_request';
  entityId?: string;
}

export interface Document {
  id: string;
  title: string;
  category: DocCategory;
  date: string;
  companyId: string;
  url?: string;
  status: DocStatus;
  paymentStatus: PaymentStatus; 
  amount?: number;
  competence?: string; 
  attachments?: RequestAttachment[];
  chat: ChatMessage[];
  auditLog: AuditLog[];
}

export interface ServiceRequest {
  id: string;
  protocol: string;
  title: string;
  type: string;
  price: number;
  description: string;
  status: RequestStatus;
  paymentStatus: RequestPaymentStatus;
  txid?: string;
  pixCopiaECola?: string;
  pixExpiration?: string;
  clientId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  attachments: RequestAttachment[];
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
  deadline: string;
  status: string;
  competence: string;
}