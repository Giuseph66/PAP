import { firestore } from '@/config/firebase';
import { CourierOffer, LocationPoint, Package, Quote, Shipment, ShipmentState, TimelineEvent } from '@/types';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

export interface CreateShipmentData {
  clienteUid: string;
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
  notificationCount?: number;
  lastNotificationAt?: Date;
  city?: string;
  // Sistema de rejeições
  rejectionCount?: number;
}

export interface ShipmentDocument extends CreateShipmentData {
  id: string;
}

class ShipmentFirestoreService {
  private collectionName = 'shipments';

  /**
   * Cria um novo envio no Firestore
   */
  async createShipment(data: CreateShipmentData): Promise<string> {
    try {
      // Remove campos undefined para evitar erro no Firestore
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      const shipmentData = {
        ...cleanData,
        createdAt: Timestamp.fromDate(data.createdAt),
        updatedAt: Timestamp.fromDate(data.updatedAt),
        timeline: data.timeline.map(event => ({
          ...event,
          timestamp: Timestamp.fromDate(event.timestamp)
        }))
      };

      const docRef = await addDoc(collection(firestore, this.collectionName), shipmentData);
      
      console.log('Shipment created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw new Error('Falha ao criar envio no banco de dados');
    }
  }

  /**
   * Atualiza o estado de um envio
   */
  async updateShipmentState(shipmentId: string, newState: ShipmentState, additionalData?: Partial<CreateShipmentData>): Promise<void> {
    try {
      const shipmentRef = doc(firestore, this.collectionName, shipmentId);
      const updateData: any = {
        state: newState,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await updateDoc(shipmentRef, updateData);
      console.log('Shipment state updated:', shipmentId, newState);
    } catch (error) {
      console.error('Error updating shipment state:', error);
      throw new Error('Falha ao atualizar estado do envio');
    }
  }

  /**
   * Atualiza o contador de rejeições de um envio
   */
  async updateShipmentRejectionCount(shipmentId: string, rejectionCount: number): Promise<void> {
    try {
      const shipmentRef = doc(firestore, this.collectionName, shipmentId);
      await updateDoc(shipmentRef, {
        rejectionCount: rejectionCount,
        updatedAt: Timestamp.fromDate(new Date())
      });
      console.log('Rejection count updated:', shipmentId, rejectionCount);
    } catch (error) {
      console.error('Error updating rejection count:', error);
      throw new Error('Falha ao atualizar contador de rejeições');
    }
  }

  /**
   * Busca um envio por ID
   */
  async getShipmentById(shipmentId: string): Promise<Shipment | null> {
    try {
      const shipmentRef = doc(firestore, this.collectionName, shipmentId);
      const shipmentSnap = await getDoc(shipmentRef);

      if (!shipmentSnap.exists()) {
        return null;
      }

      const data = shipmentSnap.data();
      return {
        id: shipmentSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        timeline: data.timeline.map((event: any) => ({
          ...event,
          timestamp: event.timestamp.toDate()
        })),
        offers: data.offers?.map((offer: any) => ({
          ...offer,
          createdAt: offer.createdAt.toDate(),
          expiresAt: offer.expiresAt.toDate()
        })),
        currentOffer: data.currentOffer ? {
          ...data.currentOffer,
          createdAt: data.currentOffer.createdAt.toDate(),
          expiresAt: data.currentOffer.expiresAt.toDate()
        } : undefined,
        lastNotificationAt: data.lastNotificationAt?.toDate(),
        rejectionCount: data.rejectionCount || 0
      } as Shipment;
    } catch (error) {
      console.error('Error getting shipment:', error);
      throw new Error('Falha ao buscar envio');
    }
  }

  /**
   * Lista envios de um cliente
   */
  async getShipmentsByClient(clienteUid: string, limitCount: number = 50): Promise<ShipmentDocument[]> {
    try {
      // Query simplificada sem orderBy para evitar necessidade de índice composto
      const q = query(
        collection(firestore, this.collectionName),
        where('clienteUid', '==', clienteUid),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const shipments: ShipmentDocument[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shipments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          timeline: data.timeline.map((event: any) => ({
            ...event,
            timestamp: event.timestamp.toDate()
          }))
        } as ShipmentDocument);
      });

      // Ordena no cliente por data de criação (mais recente primeiro)
      return shipments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting client shipments:', error);
      throw new Error('Falha ao buscar envios do cliente');
    }
  }

  /**
   * Lista envios disponíveis para entregadores
   */
  async getAvailableShipments(limitCount: number = 20): Promise<ShipmentDocument[]> {
    try {
      // Query simplificada sem orderBy para evitar necessidade de índice composto
      const q = query(
        collection(firestore, this.collectionName),
        where('state', '==', 'CREATED'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const shipments: ShipmentDocument[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shipments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          timeline: data.timeline.map((event: any) => ({
            ...event,
            timestamp: event.timestamp.toDate()
          }))
        } as ShipmentDocument);
      });

      // Ordena no cliente por data de criação (mais antigo primeiro para prioridade)
      return shipments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.error('Error getting available shipments:', error);
      throw new Error('Falha ao buscar envios disponíveis');
    }
  }

  /**
   * Adiciona evento à timeline do envio
   */
  async addTimelineEvent(shipmentId: string, event: Omit<TimelineEvent, 'timestamp'>): Promise<void> {
    try {
      const shipmentRef = doc(firestore, this.collectionName, shipmentId);
      const shipment = await this.getShipmentById(shipmentId);
      
      if (!shipment) {
        throw new Error('Envio não encontrado');
      }

      const newEvent: TimelineEvent = {
        ...event,
        timestamp: new Date()
      };

      const updatedTimeline = [...shipment.timeline, newEvent];

      await updateDoc(shipmentRef, {
        timeline: updatedTimeline.map(event => ({
          ...event,
          timestamp: Timestamp.fromDate(event.timestamp)
        })),
        updatedAt: Timestamp.fromDate(new Date())
      });

      console.log('Timeline event added:', shipmentId, event.tipo);
    } catch (error) {
      console.error('Error adding timeline event:', error);
      throw new Error('Falha ao adicionar evento à timeline');
    }
  }

  /**
   * Lista envios de um entregador específico
   */
  async getShipmentsByCourier(courierUid: string, limitCount: number = 50): Promise<ShipmentDocument[]> {
    try {
      // Validação do courierUid
      if (!courierUid || courierUid.trim() === '') {
        console.warn('getShipmentsByCourier: courierUid inválido ou vazio');
        return [];
      }
      
      const q = query(
        collection(firestore, this.collectionName),
        where('courierUid', '==', courierUid),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const shipments: ShipmentDocument[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shipments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          timeline: data.timeline.map((event: any) => ({
            ...event,
            timestamp: event.timestamp.toDate()
          })),
          offers: data.offers?.map((offer: any) => ({
            ...offer,
            createdAt: offer.createdAt.toDate(),
            expiresAt: offer.expiresAt.toDate()
          })),
          currentOffer: data.currentOffer ? {
            ...data.currentOffer,
            createdAt: data.currentOffer.createdAt.toDate(),
            expiresAt: data.currentOffer.expiresAt.toDate()
          } : undefined,
          lastNotificationAt: data.lastNotificationAt?.toDate(),
        } as ShipmentDocument);
      });
      
      // Ordena por data de atualização (mais recente primeiro)
      return shipments.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error getting shipments by courier:', error);
      return [];
    }
  }
}

export const shipmentFirestoreService = new ShipmentFirestoreService();
