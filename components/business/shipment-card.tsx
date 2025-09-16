import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Shipment, ShipmentState } from '@/types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ShipmentCardProps {
  shipment: Shipment;
  onPress?: () => void;
  showCourier?: boolean;
}

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
  COURIER_ABANDONED: 'Abandonado',
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
  COURIER_ABANDONED: '#ef4444',
};

export function ShipmentCard({ shipment, onPress, showCourier = false }: ShipmentCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatAddress = (address: string, maxLength: number = 30) => {
    return address.length > maxLength ? `${address.substring(0, maxLength)}...` : address;
  };

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
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStateIcon = (state: ShipmentState) => {
    switch (state) {
      case 'DELIVERED':
        return 'checkmark.circle.fill';
      case 'CANCELLED':
        return 'xmark.circle.fill';
      case 'EN_ROUTE':
        return 'truck.box.fill';
      case 'PICKED_UP':
        return 'shippingbox.fill';
      case 'ARRIVED_PICKUP':
        return 'location.fill';
      case 'ARRIVED_DROPOFF':
        return 'location.fill';
      case 'OFFERED':
        return 'hand.raised.fill';
      case 'COUNTER_OFFER':
        return 'hand.raised.fill';
      case 'ACCEPTED_OFFER':
        return 'checkmark.circle.fill';
      case 'COURIER_ABANDONED':
        return 'xmark.circle.fill';
      default:
        return 'clock.fill';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.stateContainer}>
            <IconSymbol
              name={getStateIcon(shipment.state)}
              size={16}
              color={stateColors[shipment.state]}
            />
            <Text style={[styles.state, { color: stateColors[shipment.state] }]}>
              {stateLabels[shipment.state]}
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.text }]}>
            {shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') 
              ? formatPrice(shipment.currentOffer.offeredPrice)
              : formatPrice(shipment.quote.preco)
            }
          </Text>
        </View>

        <View style={styles.addresses}>
          <View style={styles.addressRow}>
            <IconSymbol name="location.circle.fill" size={16} color="#10b981" />
            <Text style={[styles.addressText, { color: colors.text }]}>
              {formatAddress(shipment.pickup.endereco)}
            </Text>
          </View>
          
          <View style={styles.divider}>
            <View style={[styles.dottedLine, { borderColor: colors.border }]} />
          </View>
          
          <View style={styles.addressRow}>
            <IconSymbol name="flag.circle.fill" size={16} color="#ef4444" />
            <Text style={[styles.addressText, { color: colors.text }]}>
              {formatAddress(shipment.dropoff.endereco)}
            </Text>
          </View>
        </View>

        {/* Exibe oferta atual se houver */}
        {shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') && (
          <View style={[styles.offerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.offerHeader}>
              <IconSymbol 
                name="hand.raised.fill" 
                size={16} 
                color={shipment.state === 'ACCEPTED_OFFER' ? '#10b981' : '#8b5cf6'} 
              />
              <Text style={[styles.offerTitle, { color: colors.text }]}>
                {shipment.state === 'ACCEPTED_OFFER' ? 'Oferta Aceita' : 'Oferta do Entregador'}
              </Text>
            </View>
            <View style={styles.offerContent}>
              <Text style={[styles.offerPrice, { 
                color: shipment.state === 'ACCEPTED_OFFER' ? '#10b981' : '#8b5cf6' 
              }]}>
                {formatPrice(shipment.currentOffer.offeredPrice)}
              </Text>
              <Text style={[styles.offerOriginalPrice, { color: colors.tabIconDefault }]}>
                (Original: {formatPrice(shipment.quote.preco)})
              </Text>
            </View>
            {shipment.currentOffer.message && (
              <Text style={[styles.offerMessage, { color: colors.text }]}>
                "{shipment.currentOffer.message}"
              </Text>
            )}
            <Text style={[styles.offerCourier, { color: colors.tabIconDefault }]}>
              Por: {shipment.currentOffer.courierName}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.info}>
            <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
              {formatDate(shipment.createdAt)}
            </Text>
            <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
              {shipment.quote.distKm.toFixed(1)} km • {shipment.quote.tempoMin} min
            </Text>
          </View>
          
          {showCourier && shipment.courierUid && (
            <View style={styles.courierInfo}>
              <IconSymbol name="person.circle.fill" size={16} color={colors.tint} />
              <Text style={[styles.courierText, { color: colors.tint }]}>
                Entregador Atribuído
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  state: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addresses: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  addressText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  divider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dottedLine: {
    width: 2,
    height: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 2,
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courierText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Estilos para ofertas
  offerContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  offerOriginalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  offerMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  offerCourier: {
    fontSize: 11,
    fontWeight: '500',
  },
});
