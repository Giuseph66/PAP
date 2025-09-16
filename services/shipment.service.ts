import { firestore } from '@/config/firebase';
import {
    AddressRef,
    CreateShipmentForm,
    Package,
    Quote,
    Shipment,
    ShipmentState,
    TimelineEvent
} from '@/types';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';

export class ShipmentService {
  private static instance: ShipmentService;

  public static getInstance(): ShipmentService {
    if (!ShipmentService.instance) {
      ShipmentService.instance = new ShipmentService();
    }
    return ShipmentService.instance;
  }

  /**
   * Criar um novo envio
   */
  public async createShipment(
    clienteUid: string,
    form: CreateShipmentForm,
    pickupAddress: AddressRef,
    dropoffAddress: AddressRef,
    quote: Quote
  ): Promise<string> {
    try {
      const shipmentData: Omit<Shipment, 'id'> = {
        clienteUid,
        pickup: {
          lat: pickupAddress.lat,
          lng: pickupAddress.lng,
          endereco: pickupAddress.endereco,
          contato: form.pickup.contato,
          instrucoes: form.pickup.instrucoes,
        },
        dropoff: {
          lat: dropoffAddress.lat,
          lng: dropoffAddress.lng,
          endereco: dropoffAddress.endereco,
          contato: form.dropoff.contato,
          instrucoes: form.dropoff.instrucoes,
        },
        pacote: form.pacote,
        quote,
        state: 'PRICED',
        timeline: [{
          tipo: 'CREATED',
          timestamp: new Date(),
          descricao: 'Envio criado',
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(firestore, 'shipments'), {
        ...shipmentData,
        createdAt: Timestamp.fromDate(shipmentData.createdAt),
        updatedAt: Timestamp.fromDate(shipmentData.updatedAt),
        timeline: shipmentData.timeline.map(event => ({
          ...event,
          timestamp: Timestamp.fromDate(event.timestamp),
        })),
      });

      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar envio:', error);
      throw new Error('Falha ao criar envio');
    }
  }

  /**
   * Obter envio por ID
   */
  public async getShipment(shipmentId: string): Promise<Shipment | null> {
    try {
      const docRef = doc(firestore, 'shipments', shipmentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return this.mapFirestoreToShipment(shipmentId, data);
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar envio:', error);
      throw new Error('Falha ao buscar envio');
    }
  }

  /**
   * Obter envios do cliente
   */
  public async getClientShipments(
    clienteUid: string,
    limitCount: number = 20
  ): Promise<Shipment[]> {
    try {
      const q = query(
        collection(firestore, 'shipments'),
        where('clienteUid', '==', clienteUid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const shipments: Shipment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shipments.push(this.mapFirestoreToShipment(doc.id, data));
      });

      return shipments;
    } catch (error) {
      console.error('Erro ao buscar envios do cliente:', error);
      throw new Error('Falha ao buscar envios');
    }
  }

  /**
   * Obter envios do entregador
   */
  public async getCourierShipments(
    courierUid: string,
    limitCount: number = 20
  ): Promise<Shipment[]> {
    try {
      const q = query(
        collection(firestore, 'shipments'),
        where('courierUid', '==', courierUid),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const shipments: Shipment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shipments.push(this.mapFirestoreToShipment(doc.id, data));
      });

      return shipments;
    } catch (error) {
      console.error('Erro ao buscar envios do entregador:', error);
      throw new Error('Falha ao buscar envios');
    }
  }

  /**
   * Atualizar estado do envio
   */
  public async updateShipmentState(
    shipmentId: string,
    newState: ShipmentState,
    courierUid?: string,
    additionalData?: Partial<Shipment>
  ): Promise<void> {
    try {
      const docRef = doc(firestore, 'shipments', shipmentId);
      
      const updateData: any = {
        state: newState,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (courierUid) {
        updateData.courierUid = courierUid;
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await updateDoc(docRef, updateData);

      // Adicionar evento à timeline
      await this.addTimelineEvent(shipmentId, {
        tipo: newState,
        timestamp: new Date(),
        descricao: this.getStateDescription(newState),
      });

    } catch (error) {
      console.error('Erro ao atualizar estado do envio:', error);
      throw new Error('Falha ao atualizar envio');
    }
  }

  /**
   * Adicionar evento à timeline
   */
  public async addTimelineEvent(
    shipmentId: string,
    event: TimelineEvent
  ): Promise<void> {
    try {
      const eventsRef = collection(firestore, `shipments/${shipmentId}/events`);
      await addDoc(eventsRef, {
        ...event,
        timestamp: Timestamp.fromDate(event.timestamp),
        createdAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Erro ao adicionar evento:', error);
      throw new Error('Falha ao adicionar evento');
    }
  }

  /**
   * Observar mudanças em tempo real de um envio
   */
  public subscribeToShipment(
    shipmentId: string,
    callback: (shipment: Shipment | null) => void
  ): () => void {
    const docRef = doc(firestore, 'shipments', shipmentId);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback(this.mapFirestoreToShipment(doc.id, data));
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Erro no listener do envio:', error);
      callback(null);
    });
  }

  /**
   * Observar envios do cliente em tempo real
   */
  public subscribeToClientShipments(
    clienteUid: string,
    callback: (shipments: Shipment[]) => void,
    limitCount: number = 20
  ): () => void {
    const q = query(
      collection(firestore, 'shipments'),
      where('clienteUid', '==', clienteUid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (querySnapshot) => {
      const shipments: Shipment[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shipments.push(this.mapFirestoreToShipment(doc.id, data));
      });

      callback(shipments);
    }, (error) => {
      console.error('Erro no listener dos envios:', error);
      callback([]);
    });
  }

  /**
   * Cancelar envio
   */
  public async cancelShipment(
    shipmentId: string,
    reason: string
  ): Promise<void> {
    try {
      await this.updateShipmentState(shipmentId, 'CANCELLED');
      
      await this.addTimelineEvent(shipmentId, {
        tipo: 'CANCELLED',
        timestamp: new Date(),
        descricao: `Envio cancelado: ${reason}`,
        payload: { reason },
      });
    } catch (error) {
      console.error('Erro ao cancelar envio:', error);
      throw new Error('Falha ao cancelar envio');
    }
  }

  /**
   * Calcular cotação
   */
  public async calculateQuote(
    pickupAddress: AddressRef,
    dropoffAddress: AddressRef,
    packageInfo: Package
  ): Promise<Quote> {
    try {
      // Simular cálculo de distância
      const distKm = this.calculateDistance(
        pickupAddress.lat,
        pickupAddress.lng,
        dropoffAddress.lat,
        dropoffAddress.lng
      );

      // Regras de precificação
      const basePrice = 5.00;
      const pricePerKm = 2.50;
      const weightMultiplier = packageInfo.pesoKg > 5 ? 1.2 : 1.0;
      const fragileMultiplier = packageInfo.fragil ? 1.15 : 1.0;
      const volumeMultiplier = this.calculateVolumeMultiplier(packageInfo.dim);
      
      const calculatedPrice = (basePrice + (distKm * pricePerKm)) * 
                             weightMultiplier * 
                             fragileMultiplier * 
                             volumeMultiplier;

      const estimatedTime = Math.max(15, Math.round(distKm * 3)); // 3 min per km, min 15 min

      return {
        preco: Math.max(8.00, calculatedPrice), // Preço mínimo
        distKm: Math.max(0.5, distKm),
        tempoMin: estimatedTime,
        moeda: 'BRL',
      };
    } catch (error) {
      console.error('Erro ao calcular cotação:', error);
      throw new Error('Falha ao calcular cotação');
    }
  }

  /**
   * Mapear dados do Firestore para Shipment
   */
  private mapFirestoreToShipment(id: string, data: any): Shipment {
    return {
      id,
      clienteUid: data.clienteUid,
      pickup: data.pickup,
      dropoff: data.dropoff,
      pacote: data.pacote,
      quote: data.quote,
      state: data.state,
      courierUid: data.courierUid,
      etaMin: data.etaMin,
      timeline: (data.timeline || []).map((event: any) => ({
        ...event,
        timestamp: event.timestamp?.toDate() || new Date(),
      })),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  /**
   * Calcular distância entre dois pontos
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Calcular multiplicador baseado no volume
   */
  private calculateVolumeMultiplier(dimensions: { c: number; l: number; a: number }): number {
    const volume = dimensions.c * dimensions.l * dimensions.a; // cm³
    
    if (volume > 50000) return 1.3; // Muito grande
    if (volume > 20000) return 1.15; // Grande
    if (volume > 5000) return 1.05; // Médio
    return 1.0; // Pequeno
  }

  /**
   * Obter descrição do estado
   */
  private getStateDescription(state: ShipmentState): string {
    const descriptions: Record<ShipmentState, string> = {
      CREATED: 'Envio criado',
      PRICED: 'Preço calculado',
      PAYMENT_PENDING: 'Aguardando pagamento',
      PAID: 'Pagamento confirmado',
      DISPATCHING: 'Procurando entregador',
      ASSIGNED: 'Entregador atribuído',
      ARRIVED_PICKUP: 'Entregador chegou na coleta',
      PICKED_UP: 'Pacote coletado',
      EN_ROUTE: 'Em trânsito para entrega',
      ARRIVED_DROPOFF: 'Entregador chegou na entrega',
      DELIVERED: 'Pacote entregue',
      CANCELLED: 'Envio cancelado',
    };
    
    return descriptions[state] || 'Estado atualizado';
  }
}

// Export singleton instance
export const shipmentService = ShipmentService.getInstance();
