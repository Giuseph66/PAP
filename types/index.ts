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
  /** Flag independente do estado para indicar pagamento efetuado */
  paymentPaid?: boolean;
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
  // Pagamento atual (intent)
  paymentIntent?: {
    method: 'PIX' | 'CASH';
    mpPaymentId?: string; // id do Mercado Pago
    qrCode?: string; // EMV copia e cola
    qrCodeBase64?: string; // imagem
    status?: 'pending' | 'approved' | 'expired' | 'cancelled' | 'rejected';
    updatedAt?: Date;
  };
  /** Token de confirmação de entrega */
  deliveryToken?: string;
  deliveryTokenGeneratedAt?: Date;
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
  // Quem pagou e quem aceitou (se aplicável)
  paidByUserId?: string;
  acceptedByCourierId?: string;
  /** Data da entrega confirmada (base para cálculo de idade) */
  deliveredAt?: Date;
  /** Entrega confirmada via QR */
  deliveryConfirmed?: boolean;
  /** Total já sacado deste pagamento (em reais) */
  withdrawnAmount?: number;
  /** Histórico de saques deste pagamento */
  withdrawals?: Array<{
    amount: number; // em reais
    payoutId?: string;
    at?: Date;
  }>;
}

// Payout allocation breakdown
export interface PayoutAllocation {
  paymentId: string;
  shipmentId?: string;
  originalPaymentValue: number; // valor do pagamento em reais
  availableBefore: number; // disponível antes da alocação
  allocated: number; // valor alocado em reais
  ageDays: number;
  feePercent: number; // percentual aplicado
  feeAmount: number; // em reais
  netAmount: number; // em reais
  deliveredAt?: Date;
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
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'CANCELLED' | 'FAILED';

export interface Payout {
  id: string;
  courierUid: string;
  valor: number; // Valor original em centavos
  valorComDesconto: number; // Valor final em centavos (após desconto)
  percentualDesconto: number; // 10 ou 5 (percentual)
  valorDesconto: number; // Valor do desconto em centavos
  chavePix: string; // Chave PIX (CPF, email, telefone, aleatória)
  nomeTitular: string; // Nome da conta que vai receber
  status: PayoutStatus;
  mensagemAdmin?: string; // Feedback do admin (ex: "Chave PIX inválida")
  deliveryIds: string[]; // IDs das entregas associadas
  deliveryDates: Date[]; // Datas de criação das entregas
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date; // Quando foi aprovado
  processedAt?: Date; // Quando foi processado/pago
}

export interface PayoutFeeConfig {
  id: string; // sempre "config"
  feeImmediate: number; // Taxa de saque imediato (10)
  feeDelayed: number; // Taxa de saque em até 30 dias (5)
  updatedAt: Date;
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
  avatar?: string;
  telefone: string;
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
  /** Saldo em centavos para pagamentos via carteira/cache */
  saldoCentavos?: number;
  /** Orçamento mensal (empresa): limite de gastos, em centavos */
  budgetCompanyLimitCentavos?: number;
  /** Meta mensal (entregador): receita/meta a alcançar, em centavos */
  budgetCourierTargetCentavos?: number;
  user: User;
}

export interface Session {
  token: string; // random session token
  userId: string; // AuthUser.id
  nome : string;
  telefone : string;
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

// Version & Maintenance Types
export type AppVersionUpdateType = 'optional' | 'required';

export interface AppVersionConfig {
  id: string; // sempre "current"
  currentVersion: string; // ex: "1.0.0"
  minimumVersion: string; // ex: "1.0.0" - versão mínima obrigatória
  updateType: AppVersionUpdateType; // optional | required
  releaseNotes?: string;
  forceUpdateUrl?: string; // link para loja (Google Play, App Store)
  updatedAt: Date;
}

export interface MaintenanceConfig {
  id: string; // sempre "current"
  isEnabled: boolean;
  startAt: Date; // quando começa a manutenção
  durationMinutes: number; // quanto tempo vai durar
  message: string; // mensagem para o usuário
  updatedAt: Date;
}

// Estado local para verificação na inicialização
export interface AppStartupState {
  versionStatus: 'ok' | 'outdated' | 'blocked'; // ok: usar app | outdated: aviso | blocked: impedir uso
  maintenanceStatus: 'ok' | 'maintenance'; // ok: usar app | maintenance: bloquear e avisar
  maintenanceData?: MaintenanceConfig;
  versionData?: AppVersionConfig;
}
