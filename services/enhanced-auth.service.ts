import { firestore } from '@/config/firebase';
import { AuthUser, Session, UserRole, VehicleType } from '@/types';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

interface CompanyRegistrationData {
  companyName: string;
  cnpj: string;
  responsibleName: string;
  email: string;
  phone: string;
  password: string;
}

interface CourierRegistrationData {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: VehicleType;
  vehicleCapacity: number;
}

export class EnhancedAuthService {
  private static instance: EnhancedAuthService;
  private currentSession: Session | null = null;

  public static getInstance(): EnhancedAuthService {
    if (!EnhancedAuthService.instance) {
      EnhancedAuthService.instance = new EnhancedAuthService();
    }
    return EnhancedAuthService.instance;
  }

  // Observador simples da sessão (carrega do SecureStore ao iniciar)
  public onSessionChanged(callback: (session: Session | null) => void) {
    this.getSession().then(callback);
    return () => {};
  }

  // Login com email/senha usando coleção authUsers
  public async loginWithEmail(email: string, password: string): Promise<Session> {
    const user = await this.findAuthUserByEmail(email);
    if (!user) throw new Error('Usuário não encontrado');

    const passwordHash = await this.hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) throw new Error('Senha incorreta');

    const session = await this.createSession(user);
    await this.saveSession(session);
    return session;
  }

  // Registro de empresa com dados específicos
  public async registerCompany(data: CompanyRegistrationData): Promise<{ session: Session; firstLogin: boolean }> {
    const existing = await this.findAuthUserByEmail(data.email);
    if (existing) throw new Error('Este email já está em uso');

    const salt = await this.generateSalt();
    const passwordHash = await this.hashPassword(data.password, salt);

    const authUserData = {
      email: data.email,
      passwordHash,
      salt,
      role: 'cliente' as UserRole,
      nome: data.companyName,
      cnpj: data.cnpj,
      responsavel: data.responsibleName,
      telefone: data.phone,
      perfilCompleto: true,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(collection(firestore, 'authUsers'), authUserData);

    const authUser: AuthUser = {
      id: docRef.id,
      email: data.email,
      passwordHash,
      salt,
      role: 'cliente',
      nome: data.companyName,
      telefone: data.phone,
      cnpj: data.cnpj,
      responsavel: data.responsibleName,
      perfilCompleto: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const session = await this.createSession(authUser);
    await this.saveSession(session);
    
    return { session, firstLogin: true };
  }

  // Registro de entregador com dados específicos
  public async registerCourier(data: CourierRegistrationData): Promise<{ session: Session; firstLogin: boolean }> {
    const existing = await this.findAuthUserByEmail(data.email);
    if (existing) throw new Error('Este email já está em uso');

    const salt = await this.generateSalt();
    const passwordHash = await this.hashPassword(data.password, salt);

    const authUserData = {
      email: data.email,
      passwordHash,
      salt,
      role: 'courier' as UserRole,
      nome: data.fullName,
      cpf: data.cpf,
      telefone: data.phone,
      veiculo: data.vehicleType,
      capacidadeKg: data.vehicleCapacity,
      perfilCompleto: true,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
      isAdmin: false,
    };

    const docRef = await addDoc(collection(firestore, 'authUsers'), authUserData);

    const authUser: AuthUser = {
      id: docRef.id,
      email: data.email,
      passwordHash,
      salt,
      role: 'courier',
      nome: data.fullName,
      cpf: data.cpf,
      telefone: data.phone,
      veiculo: data.vehicleType,
      capacidadeKg: data.vehicleCapacity,
      perfilCompleto: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAdmin: false,
    };

    const session = await this.createSession(authUser);
    await this.saveSession(session);
    
    return { session, firstLogin: true };
  }

  // Login ou registro automático no primeiro acesso (email)
  public async loginOrRegisterWithEmail(
    email: string,
    password: string,
    displayName?: string,
    role: UserRole = 'cliente'
  ): Promise<{ session: Session; firstLogin: boolean }>{
    let firstLogin = false;
    const existingUser = await this.findAuthUserByEmail(email);
    let resolvedUser: AuthUser;
    if (!existingUser) {
      const created = await this.registerWithEmail(
        email,
        password,
        displayName || email.split('@')[0],
        role
      );
      console.log('User created:', created);
      // garantir flag de perfil incompleto
      await updateDoc(doc(firestore, 'authUsers', created.id), {
        perfilCompleto: false,
      });
      resolvedUser = { ...created, telefone: '', perfilCompleto: false } as AuthUser;
      firstLogin = true;
    } else {
      // valida senha
      const passwordHash = await this.hashPassword(password, existingUser.salt);
      if (passwordHash !== existingUser.passwordHash) throw new Error('Senha incorreta');
      resolvedUser = existingUser;
    }

    const session = await this.createSession(resolvedUser);
    await this.saveSession(session);
    return { session, firstLogin };
  }

  // Login ou registro automático no primeiro acesso (telefone)
  public async loginOrRegisterWithPhone(
    telefone: string,
    displayName?: string,
    role: UserRole = 'cliente'
  ): Promise<{ session: Session; firstLogin: boolean }>{
    const existing = await this.findAuthUserByPhone(telefone);
    let firstLogin = false;
    let user: AuthUser;
    if (!existing) {
      const salt = await this.generateSalt();
      const randomPassword = await this.generateToken();
      const passwordHash = await this.hashPassword(randomPassword, salt);
      const authUserData = {
        email: `${telefone.replace(/\D/g, '')}@pap.local`,
        passwordHash,
        salt,
        role,
        nome: displayName || 'Usuário',
        telefone,
        perfilCompleto: false,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        isAdmin: false,
      };
      const docRef = await addDoc(collection(firestore, 'authUsers'), authUserData);
      user = {
        id: docRef.id,
        email: authUserData.email,
        passwordHash,
        salt,
        role,
        nome: authUserData.nome,
        telefone,
        perfilCompleto: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false,
      };
      firstLogin = true;
    } else {
      user = existing;
    }

    const session = await this.createSession(user);
    await this.saveSession(session);
    return { session, firstLogin };
  }

  // Registro com email/senha na coleção authUsers
  public async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'cliente'
  ): Promise<AuthUser> {
    const existing = await this.findAuthUserByEmail(email);
    if (existing) throw new Error('Este email já está em uso');

    const salt = await this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    const authUserData = {
      email,
      passwordHash,
      salt,
      role,
      nome: displayName,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(collection(firestore, 'authUsers'), authUserData);

    const authUser: AuthUser = {
      id: docRef.id,
      email,
      passwordHash,
      salt,
      role,
      nome: displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAdmin: false,
    };
    return authUser;
  }

  public async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('session');
    this.currentSession = null;
  }

  public async getSession(): Promise<Session | null> {
    if (this.currentSession) return this.currentSession;
    const sessionRaw = await SecureStore.getItemAsync('session');
    if (!sessionRaw) return null;
    try {
      const session = JSON.parse(sessionRaw) as Session;
      this.currentSession = session;
      return session;
    } catch {
      return null;
    }
  }

  public async getCurrentUserData(): Promise<AuthUser | null> {
    const session = await this.getSession();
    if (!session) return null;
    const userDoc = await getDoc(doc(firestore, 'authUsers', session.userId));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data.email,
      passwordHash: data.passwordHash,
      salt: data.salt,
      role: data.role,
      nome: data.nome,
      telefone: data.telefone,
      cnpj: data.cnpj,
      responsavel: data.responsavel,
      cpf: data.cpf,
      veiculo: data.veiculo,
      capacidadeKg: data.capacidadeKg,
      perfilCompleto: data.perfilCompleto,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isAdmin: data.isAdmin,
    } as AuthUser;
  }

  public async updateUserProfile(updates: Partial<AuthUser>): Promise<void> {
    const session = await this.getSession();
    if (!session) throw new Error('Usuário não autenticado');

    const userRef = doc(firestore, 'authUsers', session.userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  private async findAuthUserByEmail(email: string): Promise<AuthUser | null> {
    const q = query(collection(firestore, 'authUsers'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      passwordHash: data.passwordHash,
      salt: data.salt,
      role: data.role,
      nome: data.nome,
      telefone: data.telefone,
      cnpj: data.cnpj,
      responsavel: data.responsavel,
      cpf: data.cpf,
      veiculo: data.veiculo,
      capacidadeKg: data.capacidadeKg,
      perfilCompleto: data.perfilCompleto,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isAdmin: data.isAdmin,
    } as AuthUser;
  }

  private async findAuthUserByPhone(telefone: string): Promise<AuthUser | null> {
    const q = query(collection(firestore, 'authUsers'), where('telefone', '==', telefone));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      passwordHash: data.passwordHash,
      salt: data.salt,
      role: data.role,
      nome: data.nome,
      telefone: data.telefone,
      cnpj: data.cnpj,
      responsavel: data.responsavel,
      cpf: data.cpf,
      veiculo: data.veiculo,
      capacidadeKg: data.capacidadeKg,
      perfilCompleto: data.perfilCompleto,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isAdmin: data.isAdmin,
    } as AuthUser;
  }

  private async createSession(user: AuthUser): Promise<Session> {
    const token = await this.generateToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dias
    return {
      token,
      userId: user.id,
      role: user.role,
      nome: user.nome,
      telefone: user.telefone,
      expiresAt,
    };
  }

  private async saveSession(session: Session): Promise<void> {
    this.currentSession = session;
    await SecureStore.setItemAsync('session', JSON.stringify(session));
  }

  private async generateSalt(): Promise<string> {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${password}:${salt}`
    );
  }

  private async generateToken(): Promise<string> {
    const bytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private handleAuthError(error: any): Error {
    console.error('Auth error:', error);
    return new Error(error?.message || 'Erro de autenticação');
  }
}

export const enhancedAuthService = EnhancedAuthService.getInstance();