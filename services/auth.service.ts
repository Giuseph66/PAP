import { firestore } from '@/config/firebase';
import { AuthUser, Session, UserRole } from '@/types';
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

export class AuthService {
  private static instance: AuthService;
  private currentSession: Session | null = null;
  private sessionObservers: Set<(session: Session | null) => void> = new Set();

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Observador da sessão com notificações em tempo real
  public onSessionChanged(callback: (session: Session | null) => void) {
    this.sessionObservers.add(callback);
    
    // Notifica imediatamente com a sessão atual
    this.getSession().then(callback);
    
    // Retorna função de cleanup
    return () => {
      this.sessionObservers.delete(callback);
    };
  }

  // Notifica todos os observadores sobre mudança de sessão
  private notifySessionChange(session: Session | null) {
    this.currentSession = session;
    this.sessionObservers.forEach(callback => {
      try {
        callback(session);
      } catch (error) {
        console.error('Error in session observer:', error);
      }
    });
  }

  public async loginWithPhone(phone: string, password: string): Promise<Session> {
    const user = await this.findAuthUserByPhone(phone);
    if (!user) throw new Error('Usuário não encontrado');

    const passwordHash = await this.hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) throw new Error('Senha incorreta');

    const session = await this.createSession(user);
    await this.saveSession(session);
    return session;
  }

  // Login com email/senha usando coleção authUsers
  public async loginWithEmail(email: string, password: string): Promise<Session> {
    const user = await this.findAuthUserByEmail(email);
    if (!user) throw new Error('Usuário não encontrado');

    const passwordHash = await this.hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) throw new Error('Senha incorreta');

    const session = await this.createSession(user);
    await this.saveSession(session);
    
    // Notifica observadores sobre mudança de sessão
    this.notifySessionChange(session);
    
    return session;
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
      resolvedUser = { ...created, telefone: undefined, perfilCompleto: false } as AuthUser;
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
      } as AuthUser;
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
    } as AuthUser;
    return authUser;
  }

  public async logout(): Promise<void> {
    await this.clearSession();
    
    // Notifica observadores sobre logout
    this.notifySessionChange(null);
  }

  private async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync('session');
    this.currentSession = null;
  }

  public async getSession(): Promise<Session | null> {
    if (this.currentSession) return this.currentSession;
    const sessionRaw = await SecureStore.getItemAsync('session');
    if (!sessionRaw) {
      this.notifySessionChange(null);
      return null;
    }
    try {
      const session = JSON.parse(sessionRaw) as Session;
      // Valida se a sessão tem os campos obrigatórios
      if (!session.userId || !session.token || !session.role) {
        console.warn('Invalid session data, clearing session');
        await this.clearSession();
        this.notifySessionChange(null);
        return null;
      }
      this.currentSession = session;
      this.notifySessionChange(session);
      return session;
    } catch (error) {
      console.error('Error parsing session:', error);
      await this.clearSession();
      this.notifySessionChange(null);
      return null;
    }
  }

  public async getCurrentUserData(): Promise<AuthUser | null> {
    const session = await this.getSession();
    
    if (!session || !session.userId) return null;
    
    try {
      const userDoc = await getDoc(doc(firestore, 'authUsers', session.userId));
      if (!userDoc.exists()) return null;
      const data = userDoc.data();
      return data as AuthUser;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  public async updateUserProfile(updates: Partial<AuthUser>): Promise<void> {
    const session = await this.getSession();
    if (!session || !session.userId) throw new Error('Usuário não autenticado');

    try {
      const userRef = doc(firestore, 'authUsers', session.userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Falha ao atualizar perfil');
    }
  }

  private async findAuthUserByEmail(email: string): Promise<AuthUser | null> {
    const q = query(collection(firestore, 'authUsers'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as AuthUser;
  }

  private async findAuthUserByPhone(telefone: string): Promise<AuthUser | null> {
    const q = query(collection(firestore, 'authUsers'), where('telefone', '==', telefone));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as AuthUser;
  }

  // Admin methods
  public async getAllUsers(): Promise<AuthUser[]> {
    const session = await this.getSession();
    if (!session || !session.userId) throw new Error('Usuário não autenticado');
    
    // Check if current user is admin
    const currentUser = await this.getCurrentUserData();
    if (!currentUser?.isAdmin) throw new Error('Acesso negado: apenas administradores');

    try {
      const q = query(collection(firestore, 'authUsers'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuthUser));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Falha ao carregar usuários');
    }
  }

  public async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    const session = await this.getSession();
    if (!session || !session.userId) throw new Error('Usuário não autenticado');
    
    // Check if current user is admin
    const currentUser = await this.getCurrentUserData();
    if (!currentUser?.isAdmin) throw new Error('Acesso negado: apenas administradores');

    try {
      const userRef = doc(firestore, 'authUsers', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Falha ao atualizar papel do usuário');
    }
  }

  public async updateCurrentUserRole(newRole: UserRole): Promise<void> {
    const session = await this.getSession();
    if (!session || !session.userId) throw new Error('Usuário não autenticado');
    
    // Check if current user is admin
    const currentUser = await this.getCurrentUserData();
    if (!currentUser?.isAdmin) throw new Error('Acesso negado: apenas administradores');

    try {
      const userRef = doc(firestore, 'authUsers', session.userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      // Update current session
      this.currentSession = {
        ...session,
        role: newRole,
      };
      
      // Save updated session
      await this.saveSession(this.currentSession);
    } catch (error) {
      console.error('Error updating current user role:', error);
      throw new Error('Falha ao atualizar seu papel');
    }
  }

  private async createSession(user: AuthUser): Promise<Session> {
    const token = await this.generateToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dias
    return {
      token,
      userId: user.id,
      role: user.role,
      nome: user.nome || '',
      telefone: user.telefone || '',
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

export const authService = AuthService.getInstance();
