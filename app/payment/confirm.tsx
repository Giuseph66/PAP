import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Mock data for demonstration
// const mockShipment: Shipment = {
//   id: '1',
//   clienteUid: 'user1',
//   pickup: {
//     lat: -23.5505,
//     lng: -46.6333,
//     endereco: 'Rua Augusta, 123 - Consolação, São Paulo - SP',
//     contato: 'João Silva',
//     instrucoes: 'Portaria principal',
//   },
//   dropoff: {
//     lat: -23.5614,
//     lng: -46.6562,
//     endereco: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
//     contato: 'Maria Santos',
//     instrucoes: 'Apartamento 45, bloco B',
//   },
//   pacote: {
//     pesoKg: 2.5,
//     dim: { c: 30, l: 20, a: 15 },
//     fragil: false,
//     valorDeclarado: 150,
//     fotos: [],
//   },
//   quote: {
//     preco: 12.50,
//     distKm: 3.2,
//     tempoMin: 25,
//     moeda: 'BRL',
//   },
//   state: 'CREATED',
//   courierUid: undefined,
//   etaMin: 25,
//   timeline: [],
//   createdAt: new Date('2024-01-15T10:30:00'),
//   updatedAt: new Date('2024-01-15T11:15:00'),
// };

export default function PaymentConfirmationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (err) {
        console.error('Error fetching shipment:', err);
        setError('Falha ao carregar detalhes do envio');
        Alert.alert('Erro', 'Falha ao carregar detalhes do envio');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipment();
  }, [params.id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleConfirmPayment = async () => {
    if (!shipment) return;
    
    setIsLoading(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update shipment state to PAID
      await shipmentFirestoreService.updateShipmentState(shipment.id, 'PAID');
      
      Alert.alert(
        'Pagamento Confirmado!',
        'Seu envio foi pago com sucesso e está pronto para ser coletado.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Erro', 'Falha ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading text="Carregando detalhes do envio..." />;
  }

  if (error || !shipment) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {error || 'Envio não encontrado'}
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
        <View style={styles.header}>
          <MaterialIcons name="account-balance" size={48} color={colors.tint} />
          <Text style={[styles.title, { color: colors.text }]}>
            Confirmar Pagamento
          </Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            Revise as informações antes de confirmar
          </Text>
        </View>

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
              De:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.pickup.endereco.substring(0, 30)}...
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Para:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.dropoff.endereco.substring(0, 30)}...
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
              Pacote:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {shipment.pacote.pesoKg}kg
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Método de Pagamento
          </Text>
          
          <TouchableOpacity style={[styles.paymentMethod, { borderColor: colors.tint }]}>
            <MaterialIcons name="credit-card" size={24} color={colors.tint} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>
                Cartão de Crédito
              </Text>
              <Text style={[styles.paymentMethodSubtitle, { color: colors.tabIconDefault }]}>
                **** **** **** 1234
              </Text>
            </View>
            <MaterialIcons name="check-circle" size={24} color={colors.tint} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.paymentMethod, { borderColor: colors.border }]}>
            <MaterialIcons name="account-balance" size={24} color={colors.tabIconDefault} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>
                Transferência Bancária
              </Text>
              <Text style={[styles.paymentMethodSubtitle, { color: colors.tabIconDefault }]}>
                PIX, TED, DOC
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.paymentMethod, { borderColor: colors.border }]}>
            <MaterialIcons name="account-balance-wallet" size={24} color={colors.tabIconDefault} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>
                Saldo em Conta
              </Text>
              <Text style={[styles.paymentMethodSubtitle, { color: colors.tabIconDefault }]}>
                R$ 0,00 disponível
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Current Offer */}
        {shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') && (
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
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Resumo do Pagamento
          </Text>
          
          {/* Mostra preço original se há oferta aceita */}
          {shipment.currentOffer && shipment.state === 'ACCEPTED_OFFER' && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>
                Preço Original:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.tabIconDefault, textDecorationLine: 'line-through' }]}>
                {formatPrice(shipment.quote.preco)}
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>
              Valor do Envio:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') 
                ? formatPrice(shipment.currentOffer.offeredPrice)
                : formatPrice(shipment.quote.preco)
              }
            </Text>
          </View>
          
          {/* Mostra desconto/aumento se há oferta aceita */}
          {shipment.currentOffer && shipment.state === 'ACCEPTED_OFFER' && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#8b5cf6' }]}>
                Desconto/Aumento:
              </Text>
              <Text style={[styles.summaryValue, { 
                color: shipment.currentOffer.offeredPrice >= shipment.quote.preco ? '#ef4444' : '#10b981' 
              }]}>
                {shipment.currentOffer.offeredPrice >= shipment.quote.preco ? '+' : ''}
                {formatPrice(shipment.currentOffer.offeredPrice - shipment.quote.preco)}
                {' '}({((shipment.currentOffer.offeredPrice - shipment.quote.preco) / shipment.quote.preco * 100).toFixed(0)}%)
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>
              Taxas:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatPrice(0)}
            </Text>
          </View>
          
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotalLabel, { color: colors.text }]}>
              Total:
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.tint }]}>
              {shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') 
                ? formatPrice(shipment.currentOffer.offeredPrice)
                : formatPrice(shipment.quote.preco)
              }
            </Text>
          </View>
        </Card>

        <View style={styles.infoContainer}>
          <MaterialIcons name="info" size={20} color={colors.tint} />
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            Ao confirmar o pagamento, você concorda com os termos de serviço e política de privacidade.
          </Text>
        </View>
      </ScrollView>
      
      {/* Sticky buttons */}
      <View style={[styles.stickyFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title="Cancelar"
          onPress={() => router.back()}
          variant="outline"
          style={styles.cancelButton}
          disabled={isLoading}
        />
        <Button
          title={`Confirmar Pagamento - ${shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') 
            ? formatPrice(shipment.currentOffer.offeredPrice)
            : formatPrice(shipment.quote.preco)
          }`}
          onPress={handleConfirmPayment}
          loading={isLoading}
          size="lg"
          fullWidth
          style={styles.confirmButton}
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
    paddingBottom: 120, // Space for sticky footer
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
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
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
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
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
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
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
  },
  offerCourier: {
    fontSize: 14,
    marginLeft: 8,
  },
});
