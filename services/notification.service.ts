import { Shipment } from '@/types';
import { router } from 'expo-router';
import { authService } from './auth.service';
import { shipmentFirestoreService } from './shipment-firestore.service';

class NotificationService {
  private notificationQueue: string[] = []; // IDs de envios já notificados
  private maxNotifications = 3; // Máximo de notificações por envio
  private notificationCooldown = 30000; // 30 segundos entre notificações

  /**
   * Verifica se deve notificar sobre um novo envio
   */
  shouldNotify(shipment: Shipment, courierCity: string): boolean {
    // Verifica se o envio está disponível
    if (shipment.state !== 'CREATED' && shipment.state !== 'COUNTER_OFFER' && shipment.state !== 'COURIER_ABANDONED') {
      return false;
    }

    // Verifica se é da mesma cidade
    if (shipment.city && shipment.city !== courierCity) {
      return false;
    }

    // Verifica se já foi notificado muitas vezes
    if ((shipment.notificationCount || 0) >= this.maxNotifications) {
      return false;
    }

    // Verifica cooldown
    if (shipment.lastNotificationAt) {
      const timeSinceLastNotification = Date.now() - shipment.lastNotificationAt.getTime();
      if (timeSinceLastNotification < this.notificationCooldown) {
        return false;
      }
    }

    // Verifica se já está na fila de notificações
    if (this.notificationQueue.includes(shipment.id)) {
      return false;
    }

    return true;
  }

  /**
   * Mostra notificação para o entregador
   */
  async showShipmentNotification(shipment: Shipment): Promise<void> {
    try {
      const session = await authService.getSession();
      if (!session || session.role !== 'courier') {
        return;
      }

      // Adiciona à fila de notificações
      this.notificationQueue.push(shipment.id);

      this.openShipmentDetails(shipment);
      // Atualiza contador de notificações
      await this.updateNotificationCount(shipment.id);

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Abre tela de detalhes do envio
   */
  private async openShipmentDetails(shipment: Shipment): Promise<void> {
    try {
      // Navega para tela de aceitar corrida com dados do envio
      router.push({
        pathname: '/aceitar/aceitar-corrida',
        params: {
          shipmentId: shipment.id,
          // Converte dados do envio para formato da tela de corrida
          passengerName: shipment.pickup.contato,
          passengerPhone: shipment.pickup.instrucoes, // Usar instruções como telefone temporariamente
          pickupAddress: shipment.pickup.endereco,
          pickupLat: shipment.pickup.lat.toString(),
          pickupLng: shipment.pickup.lng.toString(),
          destinationAddress: shipment.dropoff.endereco,
          destinationLat: shipment.dropoff.lat.toString(),
          destinationLng: shipment.dropoff.lng.toString(),
          basePrice: shipment.quote.preco.toString(),
          distance: shipment.quote.distKm.toString(),
          duration: shipment.quote.tempoMin.toString(),
          total: shipment.quote.preco.toString(),
        }
      });
    } catch (error) {
      console.error('Error opening shipment details:', error);
    }
  }

  /**
   * Rejeita envio
   */
  private async rejectShipment(shipment: Shipment): Promise<void> {
    try {
      // Remove da fila de notificações
      this.notificationQueue = this.notificationQueue.filter(id => id !== shipment.id);
      
      // Adiciona evento à timeline
      await shipmentFirestoreService.addTimelineEvent(shipment.id, {
        tipo: 'REJECTED_BY_COURIER',
        descricao: 'Entregador recusou a entrega',
        payload: {
          courierUid: (await authService.getSession())?.userId,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Shipment rejected by courier:', shipment.id);
    } catch (error) {
      console.error('Error rejecting shipment:', error);
    }
  }

  /**
   * Atualiza contador de notificações
   */
  private async updateNotificationCount(shipmentId: string): Promise<void> {
    try {
      await shipmentFirestoreService.updateShipmentState(shipmentId, 'CREATED', {
        notificationCount: (await shipmentFirestoreService.getShipmentById(shipmentId))?.notificationCount || 0 + 1,
        lastNotificationAt: new Date()
      });
    } catch (error) {
      console.error('Error updating notification count:', error);
    }
  }

  /**
   * Calcula distância entre dois pontos (Haversine)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Limpa fila de notificações
   */
  clearNotificationQueue(): void {
    this.notificationQueue = [];
  }

  /**
   * Remove envio específico da fila
   */
  removeFromQueue(shipmentId: string): void {
    this.notificationQueue = this.notificationQueue.filter(id => id !== shipmentId);
  }
}

export const notificationService = new NotificationService();
