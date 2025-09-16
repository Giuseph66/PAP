// User Types
export type UserRole = 'cliente' | 'courier' | 'admin';

export interface User {
  uid: string;
  role: UserRole;
  nome: string;
  telefone: string;
  email: string;
  docsVerificados: boolean;
  createdAt: Date;
  updatedAt: Date;
  enderecos: AddressRef[];
  // Company specific fields
  cnpj?: string;
  responsavel?: string;
  // Courier specific fields
  cpf?: string;
  veiculo?: VehicleType;
  capacidadeKg?: number;
  isAdmin?: boolean;
}

export interface AddressRef {
  id: string;
  label: string;
  lat: number;
  lng: number;
  endereco: string;
}

// Courier Types
export type CourierStatus = 'offline' | 'online' | 'em_corrida';
export type VehicleType = 'moto' | 'carro' | 'bike';

export interface Courier {
  uid: string;
  status: CourierStatus;
  veiculo: VehicleType;
  capacidadeKg: number;
  score: number;
  kyc: {
    aprovado: boolean;
    [key: string]: any;
  };
  ultimoHeartbeat: Date;
}

// Shipment Types
export type ShipmentState = 
  | 'CREATED'
  | 'PRICED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'ARRIVED_PICKUP'
  | 'PICKED_UP'
  | 'EN_ROUTE'
  | 'ARRIVED_DROPOFF'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'OFFERED'
  | 'COUNTER_OFFER'
  | 'ACCEPTED_OFFER'
  | 'COURIER_ABANDONED';  

export interface LocationPoint {
  lat: number;
  lng: number;
  endereco: string;
  contato: string;
  instrucoes?: string;
}

export interface Package {
  pesoKg: number;
  dim: {
    c: number; // comprimento
    l: number; // largura
    a: number; // altura
  };
  fragil: boolean;
  valorDeclarado: number;
  fotos: string[];
}

export interface Quote {
  preco: number;
  distKm: number;
  tempoMin: number;
  moeda: string;
}

export interface TimelineEvent {
  tipo: string;
  timestamp: Date;
  descricao: string;
  payload?: any;
}

export interface CourierOffer {
  courierUid: string;
  courierName: string;
  offeredPrice: number;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface Shipment {
  id: string;
  clienteUid: string;
  clienteName: string;
  clientePhone: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  pacote: Package;
  quote: Quote;
  state: ShipmentState;
  courierUid?: string;
  etaMin?: number;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  // Sistema de ofertas
  offers?: CourierOffer[];
  currentOffer?: CourierOffer;
  notificationCount?: number; // Quantas vezes foi notificado
  lastNotificationAt?: Date;
  city?: string; // Cidade do pickup para filtro
  // Sistema de rejeições
  rejectionCount?: number; // Quantas vezes foi rejeitado
}

// Payment Types
export type PaymentMethod = 'PIX' | 'CARD';
export type PaymentStatus = 'INTENT' | 'CONFIRMED' | 'CAPTURED' | 'REFUNDED';

export interface Payment {
  id: string;
  shipmentId: string;
  metodo: PaymentMethod;
  status: PaymentStatus;
  valor: number;
  pspRefs: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Chat Types
export type ChatSender = 'cliente' | 'courier' | 'suporte';
export type MessageType = 'texto' | 'imagem' | 'template';

export interface ChatMessage {
  id: string;
  from: ChatSender;
  tipo: MessageType;
  conteudo: string;
  createdAt: Date;
}

// Location Types
export interface CourierLocation {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  updatedAt: Date;
  geohash: string;
}

// Payout Types
export type PayoutStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Payout {
  id: string;
  courierUid: string;
  valor: number;
  chavePix: string;
  status: PayoutStatus;
  corridasRefs: string[];
  createdAt: Date;
}

// Form Types
export interface CreateShipmentForm {
  pickup: Omit<LocationPoint, 'lat' | 'lng'> & { address: string };
  dropoff: Omit<LocationPoint, 'lat' | 'lng'> & { address: string };
  pacote: Omit<Package, 'fotos'>;
}

export interface LoginForm {
  telefone?: string;
  email?: string;
  password?: string;
  codigo?: string; // OTP
}

// Custom Auth (Firestore collection-based)
export interface AuthUser {
  id: string; // document id
  email: string;
  passwordHash: string; // salted hash
  salt: string;
  role: UserRole;
  nome: string;
  telefone?: string;
  perfilCompleto?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Company specific fields
  cnpj?: string;
  responsavel?: string;
  // Courier specific fields
  cpf?: string;
  veiculo?: VehicleType;
  capacidadeKg?: number;
  isAdmin?: boolean;
  user: User;
}

export interface Session {
  token: string; // random session token
  userId: string; // AuthUser.id
  role: UserRole;
  expiresAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation Types
export interface NavigationParams {
  shipmentId?: string;
  offerId?: string;
  paymentId?: string;
}
