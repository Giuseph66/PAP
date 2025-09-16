import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { estimatePrice } from '@/services/pricing.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { Shipment, ShipmentState } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

// Estado labels e cores
const stateLabels: Record<ShipmentState, string> = {
  CREATED: 'Criado',
  PRICED: 'Precificado',
  PAYMENT_PENDING: 'Aguardando Pagamento',
  PAID: 'Pago',
  DISPATCHING: 'Procurando Entregador',
  ASSIGNED: 'Entregador Atribuído',
  ARRIVED_PICKUP: 'Chegou na Coleta',
  PICKED_UP: 'Coletado',
  EN_ROUTE: 'Em Trânsito',
  ARRIVED_DROPOFF: 'Chegou na Entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  OFFERED: 'Oferta Recebida',
  COUNTER_OFFER: 'Contra-Oferta',
  ACCEPTED_OFFER: 'Oferta Aceita',
  COURIER_ABANDONED: 'Entregador Abandonou',
};

const stateColors: Record<ShipmentState, string> = {
  CREATED: '#6b7280',
  PRICED: '#3b82f6',
  PAYMENT_PENDING: '#f59e0b',
  PAID: '#10b981',
  DISPATCHING: '#8b5cf6',
  ASSIGNED: '#06b6d4',
  ARRIVED_PICKUP: '#06b6d4',
  PICKED_UP: '#10b981',
  EN_ROUTE: '#10b981',
  ARRIVED_DROPOFF: '#10b981',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
  OFFERED: '#f59e0b',
  COUNTER_OFFER: '#8b5cf6',
  ACCEPTED_OFFER: '#10b981',
  COURIER_ABANDONED: '#f59e0b',
};

export default function ShipmentDetailsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<{
    basePrice: number;
    variablePrice: number;
    weightMultiplier: number;
    fragilityMultiplier: number;
    total: number;
  } | null>(null);

  const fetchShipment = async () => {
      try {
        setIsLoading(true);
        const shipmentId = params.id as string;
        
        if (!shipmentId) {
          throw new Error('ID do envio não fornecido');
        }
        
        // Fetch the shipment from Firestore
        const shipmentData = await shipmentFirestoreService.getShipmentById(shipmentId);
        
        if (!shipmentData) {
          throw new Error('Envio não encontrado');
        }
        
        // Convert to Shipment type
        const shipment: Shipment = {
          id: shipmentData.id,
          clienteUid: shipmentData.clienteUid,
        clienteName: shipmentData.clienteName,  
        clientePhone: shipmentData.clientePhone,
          pickup: shipmentData.pickup,
          dropoff: shipmentData.dropoff,
          pacote: shipmentData.pacote,
          quote: shipmentData.quote,
          state: shipmentData.state,
          courierUid: shipmentData.courierUid,
          etaMin: shipmentData.etaMin,
          timeline: shipmentData.timeline,
          createdAt: shipmentData.createdAt,
          updatedAt: shipmentData.updatedAt,
        // Sistema de ofertas
        offers: shipmentData.offers,
        currentOffer: shipmentData.currentOffer,
        notificationCount: shipmentData.notificationCount,
        lastNotificationAt: shipmentData.lastNotificationAt,
        city: shipmentData.city,
        rejectionCount: shipmentData.rejectionCount,
        };
        
        setShipment(shipment);
        
        // Calculate price breakdown
        const pricing = estimatePrice({
          distanceKm: shipment.quote.distKm,
          weightKg: shipment.pacote.pesoKg,
          fragil: shipment.pacote.fragil,
        });
        
        // Se há oferta aceita, usa o preço da oferta
        const finalPrice = (shipment.currentOffer && shipment.state === 'ACCEPTED_OFFER') 
          ? shipment.currentOffer.offeredPrice 
          : pricing.total;
        
        setPriceBreakdown({
          basePrice: pricing.basePrice,
          variablePrice: pricing.variablePrice,
          weightMultiplier: shipment.pacote.pesoKg > 5 ? 20 : 0,
          fragilityMultiplier: shipment.pacote.fragil ? 15 : 0,
          total: finalPrice,
        });
      } catch (err) {
        console.error('Error fetching shipment:', err);
        setError('Falha ao carregar detalhes do envio');
        Alert.alert('Erro', 'Falha ao carregar detalhes do envio');
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchShipment();
  }, [params.id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTimelineDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case 'CREATED':
        return 'add-circle';
      case 'ACCEPTED':
        return 'check-circle';
      case 'COURIER_ABANDONED':
        return 'cancel';
      case 'OFFER_ACCEPTED':
        return 'handshake';
      case 'OFFER_REJECTED':
        return 'cancel';
      case 'PICKED_UP':
        return 'inventory';
      case 'DELIVERED':
        return 'local-shipping';
      case 'PAID':
        return 'payment';
      default:
        return 'info';
    }
  };

  const getTimelineColor = (tipo: string) => {
    switch (tipo) {
      case 'CREATED':
        return '#6b7280';
      case 'ACCEPTED':
        return '#10b981';
      case 'COURIER_ABANDONED':
        return '#f59e0b';
      case 'OFFER_ACCEPTED':
        return '#8b5cf6';
      case 'OFFER_REJECTED':
        return '#ef4444';
      case 'PICKED_UP':
        return '#10b981';
      case 'DELIVERED':
        return '#22c55e';
      case 'PAID':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const handlePayNow = () => {
    // Navigate to payment screen with shipment ID
    router.push(`/payment/confirm?id=${shipment?.id}`);
  };

  const handleAcceptOffer = async () => {
    if (!shipment?.currentOffer) return;
    
    try {
      // Atualiza o estado para ACCEPTED_OFFER e define o courierUid
      await shipmentFirestoreService.updateShipmentState(shipment.id, 'ACCEPTED_OFFER', {
        courierUid: shipment.currentOffer.courierUid
      });
      
      // Adiciona evento à timeline
      await shipmentFirestoreService.addTimelineEvent(shipment.id, {
        tipo: 'OFFER_ACCEPTED',
        descricao: `Cliente aceitou oferta de ${formatPrice(shipment.currentOffer.offeredPrice)}`,
        payload: {
          courierUid: shipment.currentOffer.courierUid,
          offeredPrice: shipment.currentOffer.offeredPrice,
          originalPrice: shipment.quote.preco,
          timestamp: new Date().toISOString()
        }
      });
      
      Alert.alert(
        'Oferta Aceita!',
        `Você aceitou a oferta de ${formatPrice(shipment.currentOffer.offeredPrice)}. O envio será processado com o novo valor.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Recarrega os dados do envio
              fetchShipment();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting offer:', error);
      Alert.alert('Erro', 'Falha ao aceitar oferta. Tente novamente.');
    }
  };

  const handleRejectOffer = async () => {
    if (!shipment?.currentOffer) return;
    
    try {
      // Atualiza o estado para CREATED (volta ao estado original)
      await shipmentFirestoreService.updateShipmentState(shipment.id, 'CREATED');
      
      // Remove a oferta atual
      await shipmentFirestoreService.updateShipmentState(shipment.id, 'CREATED', {
        currentOffer: undefined
      });
      
      // Adiciona evento à timeline
      await shipmentFirestoreService.addTimelineEvent(shipment.id, {
        tipo: 'OFFER_REJECTED',
        descricao: `Cliente rejeitou oferta de ${formatPrice(shipment.currentOffer.offeredPrice)}`,
        payload: {
          courierUid: shipment.currentOffer.courierUid,
          offeredPrice: shipment.currentOffer.offeredPrice,
          originalPrice: shipment.quote.preco,
          timestamp: new Date().toISOString()
        }
      });
      
      Alert.alert(
        'Oferta Rejeitada',
        'A oferta foi rejeitada. O envio voltou ao estado original.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Recarrega os dados do envio
              fetchShipment();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error rejecting offer:', error);
      Alert.alert('Erro', 'Falha ao rejeitar oferta. Tente novamente.');
    }
  };

  if (isLoading) {
    return <Loading text="Carregando detalhes do envio..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Erro ao carregar envio
          </Text>
          <Text style={[styles.errorMessage, { color: colors.tabIconDefault }]}>
            {error}
          </Text>
          <Button
            title="Tentar novamente"
            onPress={() => router.back()}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="info" size={48} color={colors.tabIconDefault} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Envio não encontrado
          </Text>
          <Text style={[styles.errorMessage, { color: colors.tabIconDefault }]}>
            O envio solicitado não foi encontrado
          </Text>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialIcons 
              name="info" 
              size={24} 
              color={stateColors[shipment.state]} 
            />
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              Status do Envio
            </Text>
          </View>
          <Text style={[styles.statusValue, { color: stateColors[shipment.state] }]}>
            {stateLabels[shipment.state]}
          </Text>
        </Card>

        {/* Shipment details */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Detalhes do Envio
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              ID do Envio:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.id}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Criado em:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(shipment.createdAt)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Última atualização:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(shipment.updatedAt)}
            </Text>
          </View>
        </Card>

        {/* Package details */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Informações do Pacote
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Peso:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.pacote.pesoKg} kg
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Dimensões:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.pacote.dim.c} x {shipment.pacote.dim.l} x {shipment.pacote.dim.a} cm
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Valor Declarado:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatPrice(shipment.pacote.valorDeclarado)}
            </Text>
          </View>
          
          {shipment.pacote.fragil && (
            <View style={styles.fragileBadge}>
              <MaterialIcons name="warning" size={16} color="#ffffff" />
              <Text style={styles.fragileText}>Pacote Frágil</Text>
            </View>
          )}
        </Card>

        {/* Addresses */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Endereços
          </Text>
          
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <MaterialIcons name="location-on" size={20} color="#10b981" />
              <Text style={[styles.addressTitle, { color: colors.text }]}>
                Coleta
              </Text>
            </View>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {shipment.pickup.endereco}
            </Text>
            <Text style={[styles.contactText, { color: colors.tabIconDefault }]}>
              Contato: {shipment.pickup.contato}
            </Text>
            {shipment.pickup.instrucoes ? (
              <Text style={[styles.instructionsText, { color: colors.tabIconDefault }]}>
                Instruções: {shipment.pickup.instrucoes}
              </Text>
            ) : null}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <MaterialIcons name="flag" size={20} color="#ef4444" />
              <Text style={[styles.addressTitle, { color: colors.text }]}>
                Entrega
              </Text>
            </View>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {shipment.dropoff.endereco}
            </Text>
            <Text style={[styles.contactText, { color: colors.tabIconDefault }]}>
              Contato: {shipment.dropoff.contato}
            </Text>
            {shipment.dropoff.instrucoes ? (
              <Text style={[styles.instructionsText, { color: colors.tabIconDefault }]}>
                Instruções: {shipment.dropoff.instrucoes}
              </Text>
            ) : null}
          </View>
        </Card>

        {/* Route information */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Informações da Rota
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Distância:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.quote.distKm.toFixed(1)} km
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Tempo Estimado:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.quote.tempoMin} minutos
            </Text>
          </View>
        </Card>

        {/* Current Offer */}
        {shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED') && (
          <Card style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <MaterialIcons name="handshake" size={24} color="#8b5cf6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Oferta do Entregador
              </Text>
            </View>
            
            <View style={styles.offerContent}>
              <View style={styles.offerPriceRow}>
                <Text style={[styles.offerPriceLabel, { color: colors.tabIconDefault }]}>
                  Valor Ofertado:
                </Text>
                <Text style={[styles.offerPriceValue, { color: '#8b5cf6' }]}>
                  {formatPrice(shipment.currentOffer.offeredPrice)}
                </Text>
              </View>
              
              <View style={styles.offerPriceRow}>
                <Text style={[styles.offerPriceLabel, { color: colors.tabIconDefault }]}>
                  Valor Original:
                </Text>
                <Text style={[styles.offerOriginalPrice, { color: colors.tabIconDefault }]}>
                  {formatPrice(shipment.quote.preco)}
                </Text>
              </View>
              
              <View style={styles.offerPriceRow}>
                <Text style={[styles.offerPriceLabel, { color: colors.tabIconDefault }]}>
                  Diferença:
                </Text>
                <Text style={[styles.offerDifference, { 
                  color: shipment.currentOffer.offeredPrice >= shipment.quote.preco ? '#10b981' : '#ef4444' 
                }]}>
                  {shipment.currentOffer.offeredPrice >= shipment.quote.preco ? '+' : ''}
                  {formatPrice(shipment.currentOffer.offeredPrice - shipment.quote.preco)}
                  {' '}({((shipment.currentOffer.offeredPrice - shipment.quote.preco) / shipment.quote.preco * 100).toFixed(0)}%)
                </Text>
              </View>
            </View>
            
            {shipment.currentOffer.message && (
              <View style={styles.offerMessageContainer}>
                <MaterialIcons name="message" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.offerMessage, { color: colors.text }]}>
                  "{shipment.currentOffer.message}"
                </Text>
              </View>
            )}
            
            <View style={styles.offerCourierContainer}>
              <MaterialIcons name="person" size={16} color={colors.tabIconDefault} />
              <Text style={[styles.offerCourier, { color: colors.tabIconDefault }]}>
                Oferta feita por: {shipment.currentOffer.courierName}
              </Text>
            </View>
            
            <View style={styles.offerActions}>
              <Button
                title="Aceitar Oferta"
                onPress={() => {
                  Alert.alert(
                    'Aceitar Oferta',
                    `Deseja aceitar a oferta de ${formatPrice(shipment.currentOffer!.offeredPrice)}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Aceitar', 
                        onPress: handleAcceptOffer
                      }
                    ]
                  );
                }}
                style={styles.acceptOfferButton}
                size="sm"
              />
              <Button
                title="Rejeitar"
                onPress={() => {
                  Alert.alert(
                    'Rejeitar Oferta',
                    'Deseja rejeitar esta oferta?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Rejeitar', 
                        onPress: handleRejectOffer
                      }
                    ]
                  );
                }}
                variant="outline"
                style={styles.rejectOfferButton}
                size="sm"
              />
            </View>
          </Card>
        )}

        {/* Timeline */}
        {shipment.timeline && shipment.timeline.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.timelineHeader}>
              <MaterialIcons name="timeline" size={24} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Histórico do Envio
              </Text>
            </View>
            
            <View style={styles.timelineContainer}>
              {shipment.timeline
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((event, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineIconContainer, 
                        { backgroundColor: getTimelineColor(event.tipo) }
                      ]}>
                        <MaterialIcons 
                          name={getTimelineIcon(event.tipo)} 
                          size={20} 
                          color="#ffffff" 
                        />
                      </View>
                      {index < shipment.timeline.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineDescription, { color: colors.text }]}>
                        {event.descricao}
                      </Text>
                      
                      <Text style={[styles.timelineTime, { color: colors.tabIconDefault }]}>
                        {formatTimelineDate(event.timestamp)}
                      </Text>
                      
                      {/* Mostra informações específicas baseadas no tipo */}
                      {event.tipo === 'COURIER_ABANDONED' && event.payload?.reason && (
                        <View style={[styles.timelineDetails, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                          <MaterialIcons name="info" size={16} color="#f59e0b" />
                          <Text style={[styles.timelineDetailText, { color: '#92400e' }]}>
                            Motivo: {event.payload.reason}
                          </Text>
                        </View>
                      )}
                      
                      {event.tipo === 'OFFER_ACCEPTED' && event.payload?.offeredPrice && (
                        <View style={[styles.timelineDetails, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                          <MaterialIcons name="attach-money" size={16} color="#8b5cf6" />
                          <Text style={[styles.timelineDetailText, { color: '#6b46c1' }]}>
                            Valor aceito: {formatPrice(event.payload.offeredPrice)}
                          </Text>
                        </View>
                      )}
                      
                      {event.tipo === 'ACCEPTED' && event.payload?.courierName && (
                        <View style={[styles.timelineDetails, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                          <MaterialIcons name="person" size={16} color="#10b981" />
                          <Text style={[styles.timelineDetailText, { color: '#047857' }]}>
                            Entregador: {event.payload.courierName}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          </Card>
        )}

        {/* Price breakdown */}
        {priceBreakdown && (
          <Card style={styles.section}>
            <View style={styles.priceHeader}>
              <MaterialIcons name="receipt" size={24} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Detalhamento do Preço
              </Text>
            </View>
            
            <View style={styles.priceBreakdownContent}>
              <View style={styles.priceBreakdownRow}>
                <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                  Taxa base (até 0,5km):
                </Text>
                <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                  {formatPrice(priceBreakdown.basePrice)}
                </Text>
              </View>
              
              {priceBreakdown.variablePrice > 0 && (
                <View style={styles.priceBreakdownRow}>
                  <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                    Taxa por km adicional:
                  </Text>
                  <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                    {formatPrice(priceBreakdown.variablePrice)}
                  </Text>
                </View>
              )}
              
              {priceBreakdown.weightMultiplier > 0 && (
                <View style={styles.priceBreakdownRow}>
                  <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                    Taxa por peso (+{priceBreakdown.weightMultiplier}%):
                  </Text>
                  <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                    {formatPrice((priceBreakdown.basePrice + priceBreakdown.variablePrice) * (priceBreakdown.weightMultiplier / 100))}
                  </Text>
                </View>
              )}
              
              {priceBreakdown.fragilityMultiplier > 0 && (
                <View style={styles.priceBreakdownRow}>
                  <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                    Taxa por fragilidade (+{priceBreakdown.fragilityMultiplier}%):
                  </Text>
                  <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                    {formatPrice((priceBreakdown.basePrice + priceBreakdown.variablePrice) * (priceBreakdown.fragilityMultiplier / 100))}
                  </Text>
                </View>
              )}
              
              <View style={[styles.priceBreakdownDivider, { backgroundColor: colors.border }]} />
              
              {/* Mostra desconto/aumento da oferta se aplicável */}
              {shipment.currentOffer && shipment.state === 'ACCEPTED_OFFER' && (
                <>
                  <View style={styles.priceBreakdownRow}>
                    <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                      Preço Original:
                    </Text>
                    <Text style={[styles.priceBreakdownValue, { color: colors.tabIconDefault, textDecorationLine: 'line-through' }]}>
                      {formatPrice(shipment.quote.preco)}
                    </Text>
                  </View>
                  
                  <View style={styles.priceBreakdownRow}>
                    <Text style={[styles.priceBreakdownLabel, { color: '#8b5cf6' }]}>
                      Desconto/Aumento:
                    </Text>
                    <Text style={[styles.priceBreakdownValue, { 
                      color: shipment.currentOffer.offeredPrice >= shipment.quote.preco ? '#ef4444' : '#10b981' 
                    }]}>
                      {shipment.currentOffer.offeredPrice >= shipment.quote.preco ? '+' : ''}
                      {formatPrice(shipment.currentOffer.offeredPrice - shipment.quote.preco)}
                      {' '}({((shipment.currentOffer.offeredPrice - shipment.quote.preco) / shipment.quote.preco * 100).toFixed(0)}%)
                    </Text>
                  </View>
                  
                  <View style={[styles.priceBreakdownDivider, { backgroundColor: colors.border }]} />
                </>
              )}
              
              <View style={styles.priceBreakdownRow}>
                <Text style={[styles.priceBreakdownTotalLabel, { color: colors.text }]}>
                  Total:
                </Text>
                <Text style={[styles.priceBreakdownTotalValue, { color: colors.tint }]}>
                  {formatPrice(priceBreakdown.total)}
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
      
      {/* Sticky payment button */}
      <View style={[styles.stickyFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={`Pagar Agora - ${formatPrice(priceBreakdown?.total || shipment.quote.preco)}`}
          onPress={handlePayNow}
          size="lg"
          fullWidth
          style={styles.payButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for sticky footer
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 8,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  statusCard: {
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  fragileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  fragileText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addressCard: {
    marginBottom: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 16,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceBreakdownContent: {
    gap: 12,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceBreakdownLabel: {
    fontSize: 14,
    flex: 1,
  },
  priceBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  priceBreakdownDivider: {
    height: 1,
    marginVertical: 8,
  },
  priceBreakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  priceBreakdownTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34, // Safe area bottom
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  payButton: {
    marginBottom: 0,
  },
  // Estilos para ofertas
  offerCard: {
    marginBottom: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderStyle: 'dashed' as const,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  offerContent: {
    marginBottom: 16,
  },
  offerPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerPriceLabel: {
    fontSize: 16,
  },
  offerPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  offerOriginalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  offerDifference: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  offerMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  offerMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
  },
  offerCourierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  offerCourier: {
    fontSize: 14,
    marginLeft: 8,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptOfferButton: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  rejectOfferButton: {
    flex: 1,
  },
  // Estilos para timeline
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    minHeight: 20,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 8,
  },
  timelineDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 14,
    marginBottom: 8,
  },
  timelineDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineDetailText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
});