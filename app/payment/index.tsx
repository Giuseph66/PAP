import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createPixPayment, getPaymentStatus } from '@/services/mercado-pago.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Payment method types
type PaymentMethod = 'pix'|'cash';

interface PaymentParams {
  amount?: string;
  description?: string;
  shipmentId?: string;
}

export default function PaymentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<any>();
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>('pix');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPixFlowActive, setIsPixFlowActive] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCodeEmv, setQrCodeEmv] = useState<string | null>(null);
  const [mpPaymentId, setMpPaymentId] = useState<string | number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Format amount from params (if available)
  const amount = params.amount ? parseFloat(params.amount as string).toFixed(2) : '0.00';
  const description = params.description || 'Pagamento de entrega';
  const resolvedShipmentId = (params as any)?.shipmentId || (params as any)?.id || undefined;

  // Format card number with spaces
  const formatCardNumber = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    let formatted = numbers;
    
    if (numbers.length >= 4) {
      formatted = `${numbers.substring(0, 4)}`;
      if (numbers.length > 4) {
        formatted += ` ${numbers.substring(4, 8)}`;
        if (numbers.length > 8) {
          formatted += ` ${numbers.substring(8, 12)}`;
          if (numbers.length > 12) {
            formatted += ` ${numbers.substring(12, 16)}`;
          }
        }
      }
    }
    
    return formatted.substring(0, 19);
  };

  // Format expiry date
  const formatExpiryDate = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    
    if (numbers.length >= 2) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}`;
    }
    
    return numbers;
  };

  // Format CVV
  const formatCvv = (text: string) => {
    return text.replace(/\D/g, '').substring(0, 3);
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiryDate(text);
    setExpiryDate(formatted);
  };

  const handleCvvChange = (text: string) => {
    const formatted = formatCvv(text);
    setCvv(formatted);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Erro', 'Selecione um método de pagamento');
      return;
    }
    // cash não necessita geração de QR; apenas registra intenção

    const numericAmount = parseFloat(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Erro', 'Valor inválido para pagamento');
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedMethod === 'pix') {
        const externalRef = resolvedShipmentId ? String(resolvedShipmentId) : `generic-${Date.now()}`;
        const mp = await createPixPayment({
          transaction_amount: numericAmount,
          description: description || `Pagamento ${externalRef}`,
          notification_url: `${process.env.EXPO_PUBLIC_WEBHOOK_URL}/webhook`,
          external_reference: externalRef,
          payer: { email: 'cliente@example.com' },
        });

        const tx = mp?.point_of_interaction?.transaction_data || {} as any;
        const qrB64 = tx.qr_code_base64 || null;
        const qrEmv = tx.qr_code || null;

        setQrCodeBase64(qrB64);
        setQrCodeEmv(qrEmv);
        setMpPaymentId(mp.id);
        setIsPixFlowActive(true);
        setIsProcessing(false);

        // Inicia polling de status até approved/timeout
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          try {
            if (!mp.id) return;
            const st = await getPaymentStatus(mp.id);
            const status = st?.status;
            if (status === 'approved') {
              if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
              if (resolvedShipmentId) {
                try { await shipmentFirestoreService.updateShipmentFields(String(resolvedShipmentId), { paymentPaid: true }); } catch {}
              }
              Alert.alert('Pagamento aprovado!', 'Seu pagamento via PIX foi confirmado.');
            } else if (status === 'expired' || status === 'cancelled' || status === 'rejected') {
              if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
              Alert.alert('Pagamento não concluído', `Status: ${String(status)}`);
            }
          } catch {}
        }, 2000);
      } else if (selectedMethod === 'cash') {
        setIsProcessing(false);
        Alert.alert('Pagamento em dinheiro', 'Combine com o entregador o pagamento em espécie.');
      }
    } catch (e) {
      setIsProcessing(false);
      Alert.alert('Erro', 'Falha ao iniciar pagamento PIX.');
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const renderPaymentOptions = () => {
    return (
      <Card style={[styles.card, { backgroundColor: colors.card }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Método de Pagamento</Text>
        
        <View style={styles.methodGrid}>
          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedMethod === 'pix' && styles.methodOptionSelected,
              { backgroundColor: selectedMethod === 'pix' ? colors.tint + '20' : colors.backgroundLight }
            ]}
            onPress={() => setSelectedMethod('pix')}
          >
            <View style={[
              styles.methodIconContainer,
              selectedMethod === 'pix' && styles.methodIconSelected
            ]}>
              <MaterialIcons name="qr-code" size={24} color={selectedMethod === 'pix' ? colors.tint : colors.text} />
            </View>
            <Text style={[styles.methodText, { color: colors.text }]}>PIX</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedMethod === 'cash' && styles.methodOptionSelected,
              { backgroundColor: selectedMethod === 'cash' ? colors.tint + '20' : colors.backgroundLight }
            ]}
            onPress={() => setSelectedMethod('cash')}
          >
            <View style={[
              styles.methodIconContainer,
              selectedMethod === 'cash' && styles.methodIconSelected
            ]}>
              <MaterialIcons name="local-atm" size={24} color={selectedMethod === 'cash' ? colors.tint : colors.text} />
            </View>
            <Text style={[styles.methodText, { color: colors.text }]}>Dinheiro</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderPaymentForm = () => {
    if (selectedMethod === 'pix') {
      return (
        <Card style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pagamento via PIX</Text>
          
          <View style={styles.pixContainer}>
            {isPixFlowActive && qrCodeBase64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${qrCodeBase64}` }}
                style={{ width: 220, height: 220, marginBottom: 16 }}
              />
            ) : (
              <MaterialIcons name="qr-code" size={80} color={colors.tint} style={styles.pixIcon} />
            )}
            <Text style={[styles.pixText, { color: colors.text }]}>
              {isPixFlowActive ? 'Use o QR abaixo no seu banco' : 'Toque em Confirmar para gerar o QR PIX'}
            </Text>
            {isPixFlowActive && !!qrCodeEmv && (
              <Text style={[styles.pixDescription, { color: colors.textSecondary }]}
                selectable
                numberOfLines={4}
              >
                {qrCodeEmv}
              </Text>
            )}
          </View>
        </Card>
      );
    }
    if (selectedMethod === 'cash') {
      return (
        <Card style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pagamento em Dinheiro</Text>
          <View style={styles.pixContainer}>
            <MaterialIcons name="local-atm" size={80} color={colors.tint} style={styles.pixIcon} />
            <Text style={[styles.pixText, { color: colors.text }]}>Combine o pagamento diretamente com o entregador</Text>
          </View>
        </Card>
      );
    }
    
    if (selectedMethod === 'cash') {
      return (
        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do Cartão</Text>
          
          <Input
            value={cardNumber}
            onChangeText={handleCardNumberChange}
            placeholder="Número do cartão"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundLight }]}
            keyboardType="numeric"
            maxLength={19}
          />
          
          <Input
            value={cardName}
            onChangeText={setCardName}
            placeholder="Nome no cartão"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundLight }]}
          />
          
          <View style={styles.cardRow}>
            <Input
              value={expiryDate}
              onChangeText={handleExpiryChange}
              placeholder="MM/AA"
              placeholderTextColor={colors.textSecondary}
              style={[styles.halfInput, { color: colors.text, backgroundColor: colors.backgroundLight }]}
              keyboardType="numeric"
              maxLength={5}
            />
            
            <Input
              value={cvv}
              onChangeText={handleCvvChange}
              placeholder="CVV"
              placeholderTextColor={colors.textSecondary}
              style={[styles.halfInput, { color: colors.text, backgroundColor: colors.backgroundLight }]}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
            />
          </View>
        </Card>
      );
    }
    
    return null;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pagamento</Text>
        <View style={{ width: 24 }} /> {/* Spacer for alignment */}
      </View>

      <View style={styles.content}>
        <Card style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Descrição:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{description}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total:</Text>
            <Text style={[styles.summaryTotal, { color: colors.text }]}>R$ {amount}</Text>
          </View>
        </Card>

        {renderPaymentOptions()}
        {renderPaymentForm()}

        <Button 
          onPress={handleConfirmPayment}
          disabled={!selectedMethod || isProcessing}
          style={[styles.payButton, (!selectedMethod || isProcessing) && styles.payButtonDisabled]}
        >
          {isProcessing ? (
            <>
              <MaterialIcons name="autorenew" size={20} color="white" style={styles.buttonSpinner} />
              <Text style={styles.buttonText}>Processando...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="payment" size={20} color="white" />
              <Text style={styles.buttonText}>Confirmar Pagamento</Text>
            </>
          )}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 40,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  methodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  methodOption: {
    flex: 0.48,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  methodOptionSelected: {
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  methodIconSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  input: {
    fontSize: 16,
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    fontSize: 16,
    padding: 14,
    borderRadius: 8,
    flex: 0.48,
  },
  pixContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pixIcon: {
    marginBottom: 16,
  },
  pixText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  pixDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSpinner: {
    // Nota: RN não suporta 'animation' CSS nativa; manter só estilo básico
    transform: [{ rotate: '0deg' }],
  },
});