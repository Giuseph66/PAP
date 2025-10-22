import { firestore } from '@/config/firebase';
import {
    addDoc,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { authService } from './auth.service';

export type SupportType = 'reclamacao' | 'sugestao' | 'duvida' | 'bug';
export type SupportStatus = 'aberto' | 'em_analise' | 'resolvido' | 'fechado';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  tipo: SupportType;
  assunto: string;
  descricao: string;
  status: SupportStatus;
  prioridade: 'baixa' | 'media' | 'alta';
  anexos?: string[]; // URLs de arquivos no Storage (opcional)
  resposta?: string;
  dataResposta?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class SupportService {
  private static instance: SupportService;

  private constructor() {}

  public static getInstance(): SupportService {
    if (!SupportService.instance) {
      SupportService.instance = new SupportService();
    }
    return SupportService.instance;
  }

  /**
   * Criar um novo ticket de suporte
   */
  public async createTicket(
    tipo: SupportType,
    assunto: string,
    descricao: string,
    prioridade: 'baixa' | 'media' | 'alta' = 'media'
  ): Promise<string> {
    try {
      const session = await authService.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const userData = await authService.getCurrentUserData();
      if (!userData) throw new Error('Dados do usuário não encontrados');

      const ticketData = {
        userId: session.userId,
        userName: userData.nome,
        userEmail: userData.email,
        userPhone: userData.telefone || '',
        tipo,
        assunto,
        descricao,
        prioridade,
        status: 'aberto' as SupportStatus,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(firestore, 'support'), ticketData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar ticket de suporte:', error);
      throw new Error('Falha ao criar ticket de suporte');
    }
  }

  /**
   * Obter tickets do usuário
   */
  public async getUserTickets(limit_count: number = 20): Promise<SupportTicket[]> {
    try {
      const session = await authService.getSession();
      if (!session) return [];

      const q = query(
        collection(firestore, 'support'),
        where('userId', '==', session.userId),
        orderBy('createdAt', 'desc'),
        limit(limit_count)
      );

      const querySnapshot = await getDocs(q);
      const tickets: SupportTicket[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userPhone: data.userPhone,
          tipo: data.tipo,
          assunto: data.assunto,
          descricao: data.descricao,
          status: data.status,
          prioridade: data.prioridade,
          resposta: data.resposta,
          dataResposta: data.dataResposta?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as SupportTicket);
      });

      return tickets;
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      return [];
    }
  }

  /**
   * Obter um ticket específico
   */
  public async getTicket(ticketId: string): Promise<SupportTicket | null> {
    try {
      const q = query(
        collection(firestore, 'support'),
        where('__name__', '==', ticketId)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userPhone: data.userPhone,
        tipo: data.tipo,
        assunto: data.assunto,
        descricao: data.descricao,
        status: data.status,
        prioridade: data.prioridade,
        resposta: data.resposta,
        dataResposta: data.dataResposta?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SupportTicket;
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
      return null;
    }
  }
}

export const supportService = SupportService.getInstance();
