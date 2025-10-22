import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// Function to generate a unique token
const generateUniqueToken = (): string => {
  // Generate a random 10-character alphanumeric string
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 10; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
};

export default function QrDisplayScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [courierPhone, setCourierPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Load shipment and check if payment is completed
  useEffect(() => {
    const loadShipmentAndCheckPayment = async () => {
      setIsLoading(true);

      try {
        const shipmentId = params.id as string;

        if (!shipmentId) {
          throw new Error('ID do envio não fornecido');
        }

        // Load shipment from Firestore
        const shipmentData = await shipmentFirestoreService.getShipmentById(shipmentId);

        if (!shipmentData) {
          throw new Error('Envio não encontrado');
        }

        setShipment(shipmentData);

        // Check if payment is confirmed
        const paymentConfirmed = shipmentData.paymentPaid === true;
        setPaymentCompleted(paymentConfirmed);

        if (paymentConfirmed) {
          // Check if token already exists
          if (shipmentData.deliveryToken) {
            setToken(shipmentData.deliveryToken);
          } else {
            // Generate new token if none exists
            const newToken = generateUniqueToken();
            setToken(newToken);

            // Save token to database
            try {
              await shipmentFirestoreService.updateShipmentFields(shipmentData.id, {
                deliveryToken: newToken,
                deliveryTokenGeneratedAt: new Date()
              });
            } catch (error) {
              console.error('Error saving delivery token:', error);
            }
          }
        }

        // Se houver courier atribuído, buscar telefone
        if (shipmentData.courierUid) {
          try {
            const courier = await authService.getUserById(shipmentData.courierUid);
            setCourierPhone(courier?.telefone || null);
          } catch {}
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading shipment:', error);
        setIsLoading(false);
        Alert.alert('Erro', 'Não foi possível carregar os dados do envio');
      }
    };

    loadShipmentAndCheckPayment();
  }, [params.id]);

  const handleGenerateToken = async () => {
    if (!paymentCompleted || !shipment) {
      Alert.alert(
        'Pagamento Pendente',
        'O código só pode ser gerado após a finalização do pagamento.',
        [{ text: 'OK' }]
      );
      return;
    }

    const newToken = generateUniqueToken();
    setToken(newToken);

    // Save token to database
    try {
      await shipmentFirestoreService.updateShipmentFields(shipment.id, {
        deliveryToken: newToken,
        deliveryTokenGeneratedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving delivery token:', error);
      Alert.alert('Erro', 'Não foi possível salvar o código de confirmação');
    }
  };

  const handleNavigateToScanner = () => {
    if (!token) {
      Alert.alert('Aviso', 'Gere um código primeiro antes de continuar');
      return;
    }
    router.push('/confirmacao/qr-scanner');
  };

  const handleShareToken = () => {
    if (!token || !shipment) return;

    // Share functionality - for now just show an alert
    Alert.alert(
      'Compartilhar Token',
      `Token de entrega: ${token}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Copiar', onPress: () => {} }
      ]
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Confirmação de Entrega</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <View style={styles.content}>
        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <MaterialIcons 
            name={paymentCompleted ? "verified" : "payment"} 
            size={64} 
            color={paymentCompleted ? "#10b981" : "#f59e0b"} 
            style={styles.icon} 
          />
          
          <Text style={[styles.title, { color: colors.text }]}>
            {paymentCompleted ? "Pagamento Confirmado!" : "Pagamento Pendente"}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {paymentCompleted
              ? "Agora você pode gerar seu código de confirmação para a entrega"
              : "Finalize o pagamento para gerar o código de confirmação"}
          </Text>
        </Card>

        {paymentCompleted && (
          <Card style={[styles.qrCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Código de Confirmação</Text>

            {/* Delivery info */}
            {shipment && (
              <View style={styles.shipmentInfo}>
                <Text style={[styles.shipmentAddress, { color: colors.text }]}>
                  📍 {shipment.dropoff.endereco.substring(0, 60)}...
                </Text>
                <View style={{ alignItems: 'center' }}>
                {courierPhone && (
                  <TouchableOpacity
                    onPress={() => {
                      const phone = courierPhone.replace(/\D/g, '');
                      Linking.openURL(`https://wa.me/+55${phone}`);
                    }}
                    style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                  >
                    <MaterialIcons name="phone" size={16} color="white" />
                    <Text style={styles.contactButtonText}>WhatsApp do Entregador</Text>
                  </TouchableOpacity>
                )}
                </View>
              {courierPhone && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.shipmentAddress, { color: colors.textSecondary }]}>Numero do entregador: {courierPhone}</Text>
                </View>
              )}
              </View>
            )}
            
            {token ? (
              <>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={`DELIVERY_TOKEN:${token}`}
                    size={200}
                    backgroundColor={'#ffffff'}
                    color={'#000000'}
                  />
                </View>
                
                <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>Token de Confirmação</Text>
                <Text style={[styles.token, { color: colors.text, backgroundColor: colors.backgroundLight }]}>
                  {token}
                </Text>
                
                <View style={styles.buttonRow}>
                  <Button 
                    onPress={handleShareToken} 
                    variant="secondary" 
                    style={styles.button}
                  >
                    <MaterialIcons name="share" size={16} color={colors.text} />
                    <Text style={[styles.buttonText, { color: colors.text }]}>Compartilhar</Text>
                  </Button>
                  
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                  Gere um código único para confirmar a entrega
                </Text>
                
                <Button 
                  onPress={handleGenerateToken}
                  style={styles.generateButton}
                >
                  <MaterialIcons name="qr-code-2" size={20} color="white" />
                  <Text style={styles.buttonText}>Gerar Código</Text>
                </Button>
              </>
            )}
          </Card>
        )}

        {!paymentCompleted && (
          <Card style={[styles.card, { backgroundColor: colors.card }]}>
            <Button 
              onPress={() => router.push('/payment')} 
              style={styles.paymentButton}
            >
              <MaterialIcons name="payment" size={20} color="white" />
              <Text style={styles.buttonText}>Finalizar Pagamento</Text>
            </Button>
          </Card>
        )}
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  icon: {
    alignSelf: 'center',
  },
  qrCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
  },
  shipmentInfo: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  shipmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  shipmentAddress: {
    fontSize: 12,
    lineHeight: 16,
  },
  contactButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  tokenLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  token: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
});