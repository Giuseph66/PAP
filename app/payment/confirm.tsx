import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { createPixPayment, getPaymentStatus } from '@/services/mercado-pago.service';
import { paymentService } from '@/services/payment.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { walletService } from '@/services/wallet.service';
import { Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Image,
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
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'cash'>('pix');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCodeEmv, setQrCodeEmv] = useState<string | null>(null);
  const [isPixFlowActive, setIsPixFlowActive] = useState(false);
  const [mpPaymentId, setMpPaymentId] = useState<string | number | null>(null);
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

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
          paymentPaid: (shipmentData as any).paymentPaid,
          paymentIntent: (shipmentData as any).paymentIntent,
        };
        
        setShipment(shipment);

        // Reidrata um PIX já existente (carregado do banco)
        const intent = (shipmentData as any).paymentIntent as any | undefined;
        if (intent && intent.method === 'PIX' && (intent.qrCodeBase64 || intent.qrCode) && intent.mpPaymentId) {
          setQrCodeBase64(intent.qrCodeBase64 || null);
          setQrCodeEmv(intent.qrCode || null);
          setMpPaymentId(intent.mpPaymentId);
          setIsPixFlowActive(true);
          // Reinicia polling se ainda não aprovado
          if (intent.status !== 'approved') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            const totalAmount = shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER')
              ? shipment.currentOffer.offeredPrice
              : shipment.quote.preco;
            pollingRef.current = setInterval(async () => {
              try {
                const statusResp = await getPaymentStatus(String(intent.mpPaymentId));
                const status = statusResp?.status;
                if (status === 'approved') {
                  if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
                  try { await shipmentFirestoreService.updateShipmentFields(shipment.id, { paymentPaid: true }); } catch (error) { console.error('Error updating shipment:', error); }
                  try { await walletService.creditSaldo(Math.round(Number(totalAmount) * 100), { reason: 'PIX aprovado', shipmentId: shipment.id }); } catch (error) { console.error('Error crediting saldo:', error); }
                  try { await paymentService.markApproved({ shipmentId: shipment.id, paymentId: String(intent.mpPaymentId), mpPaymentId: String(intent.mpPaymentId), paidByUserId: shipment.clienteUid, acceptedByCourierId: shipment.courierUid }); } catch (error) { console.error('Error marking payment as approved:', error); }
                  Alert.alert('Pagamento Confirmado!', 'Seu envio foi pago com sucesso.');
                  router.replace(`/confirmacao/qr-display?id=${shipment.id}`);
                } else if (status === 'expired' || status === 'cancelled' || status === 'rejected') {
                  if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
                  Alert.alert('Pagamento não concluído', `Status: ${String(status)}`);
                }
              } catch (error) { console.error('Error polling payment status:', error); }
            }, 3000);
          }
        }
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
    const userData = await authService.getCurrentUserData();

    // Se já existe um PIX ativo, apenas verificar status
    if (isPixFlowActive && mpPaymentId) {
      setIsLoading(true);
      try {
        const statusResp = await getPaymentStatus(String(mpPaymentId));
        console.log('statusResp', statusResp);
        const status = statusResp?.status;

        if (status === 'approved') {
          // Já estava pago, marcar novamente para garantir
          try { await shipmentFirestoreService.updateShipmentFields(shipment.id, { paymentPaid: true }); } catch (error) { console.error('Error updating shipment:', error); }
          Alert.alert('Pagamento Confirmado!', 'Seu envio foi pago com sucesso.');
          router.replace(`/confirmacao/qr-display?id=${shipment.id}`);
        } else if (status === 'expired' || status === 'cancelled' || status === 'rejected') {
          Alert.alert('Pagamento não concluído', `Status: ${String(status)}`);
        } else {
          Alert.alert('Pagamento Pendente', 'Aguardando confirmação do pagamento...');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        Alert.alert('Erro', 'Falha ao verificar pagamento. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Caso contrário, criar novo pagamento PIX
    setIsLoading(true);
    try {
      const amount = shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER')
        ? shipment.currentOffer.offeredPrice
        : shipment.quote.preco;

      if (selectedMethod === 'cash') {
        setIsLoading(false);
        Alert.alert('Pagamento em dinheiro', 'Combine o pagamento diretamente com o entregador.');
        return;
      }

      // PIX: criar QR e mostrar imediatamente
      const mp = await createPixPayment({
        transaction_amount: Number(amount),
        description: `Envio ${shipment.id}`,
        external_reference: shipment.id,
        notification_url: `${process.env.EXPO_PUBLIC_WEBHOOK_URL}/webhook`,
        payer: {
          email: userData?.email || 'cliente@example.com',
        },
      });

      const tx = mp?.point_of_interaction?.transaction_data || {};
      const qr = tx.qr_code || null;
      const qrB64 = tx.qr_code_base64 || null;
      if (!qr && !qrB64) throw new Error('PIX não retornou QR Code');

      setQrCodeBase64(qrB64);
      setQrCodeEmv(qr);
      setMpPaymentId(mp.id);
      setIsPixFlowActive(true);
      setIsLoading(false);

      // Persistir pagamento e intent no shipment
      try {
        await paymentService.createPaymentRecord({
          shipmentId: shipment.id,
          metodo: 'PIX',
          valor: Number(amount),
          mpPaymentId: mp.id,
          qrCode: qr || undefined,
          qrCodeBase64: qrB64 || undefined,
          paidByUserId: shipment.clienteUid,
          acceptedByCourierId: shipment.courierUid,
        });
      } catch (error) { console.error('Error creating payment record:', error); }

      // Polling de status em background (3s)
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          if (!mp.id) return;
          const statusResp = await getPaymentStatus(mp.id);
          console.log('statusResp', statusResp);
          const status = statusResp?.status;
          if (status === 'approved') {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
            try { await shipmentFirestoreService.updateShipmentFields(shipment.id, { paymentPaid: true }); } catch (error) { console.error('Error updating shipment:', error); }
            try { await walletService.creditSaldo(Math.round(Number(amount) * 100), { reason: 'PIX aprovado', shipmentId: shipment.id }); } catch (error) { console.error('Error crediting saldo:', error); }
            try { await paymentService.markApproved({ shipmentId: shipment.id, paymentId: String(mp.id), mpPaymentId: mp.id, paidByUserId: shipment.clienteUid, acceptedByCourierId: shipment.courierUid }); } catch (error) { console.error('Error marking payment as approved:', error); throw error; }
            Alert.alert('Pagamento Confirmado!', 'Seu envio foi pago com sucesso.');
            router.replace(`/confirmacao/qr-display?id=${shipment.id}`);
          } else if (status === 'expired' || status === 'cancelled' || status === 'rejected') {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
            Alert.alert('Pagamento não concluído', `Status: ${String(status)}`);
            router.replace(`/confirmacao/qr-display?id=${shipment.id}`);
          }
        } catch (error) { console.error('Error polling payment status:', error); }
      }, 3000);
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Erro', 'Falha no fluxo PIX. Tente novamente.');
    } finally {
      // isLoading já atualizado ao exibir o QR
    }
  };

  React.useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

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
          <TouchableOpacity
            onPress={() => setSelectedMethod('pix')}
            style={[styles.paymentMethod, { borderColor: selectedMethod === 'pix' ? colors.tint : colors.border }]}
          >
            <MaterialIcons name="qr-code" size={24} color={selectedMethod === 'pix' ? colors.tint : colors.tabIconDefault} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>PIX</Text>
              <Text style={[styles.paymentMethodSubtitle, { color: colors.tabIconDefault }]}>Pagamento instantâneo</Text>
            </View>
            {selectedMethod === 'pix' && <MaterialIcons name="check-circle" size={24} color={colors.tint} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedMethod('cash')}
            style={[styles.paymentMethod, { borderColor: selectedMethod === 'cash' ? colors.tint : colors.border }]}
          >
            <MaterialIcons name="local-atm" size={24} color={selectedMethod === 'cash' ? colors.tint : colors.tabIconDefault} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>Dinheiro</Text>
              <Text style={[styles.paymentMethodSubtitle, { color: colors.tabIconDefault }]}>Pague diretamente ao entregador</Text>
            </View>
            {selectedMethod === 'cash' && <MaterialIcons name="check-circle" size={24} color={colors.tint} />}
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

        {selectedMethod === 'pix' && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>QR PIX</Text>
            <View style={{ alignItems: 'center', gap: 12 }}>
              {isPixFlowActive && qrCodeBase64 && (
                <Image
                  source={{ uri: `data:image/png;base64,${qrCodeBase64}` }}
                  style={{ width: 220, height: 220, marginBottom: 8 }}
                />
              )}
              {isPixFlowActive && !!qrCodeEmv && (
                <View style={{ flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.infoText, { color: colors.text }]} selectable numberOfLines={4}>
                    {qrCodeEmv}
                  </Text>
                  <TouchableOpacity onPress={() => Clipboard.setString(qrCodeEmv)}>
                    <MaterialIcons name="content-copy" size={24} color={colors.tint} />
                    <Text style={[styles.infoText, { color: colors.text }]}>Copiar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!isPixFlowActive && (
                <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>Toque em Confirmar para gerar o QR</Text>
              )}
            </View>
          </Card>
        )}

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
          title={`${isPixFlowActive ? 'Verificar Pagamento' : 'Confirmar Pagamento'} - ${shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER') 
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
