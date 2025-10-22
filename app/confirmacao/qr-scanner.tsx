import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { paymentService } from '@/services/payment.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { walletService } from '@/services/wallet.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraType, CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QrScannerScreen() {
  const params = useLocalSearchParams<{ shipmentId?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [loadedShipment, setLoadedShipment] = useState<import('@/types').Shipment | null>(null);
  const [clientePhone, setClientePhone] = useState<string | null>(null);
  const [courierPhone, setCourierPhone] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Animation values for the scanning effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Recarrega dados do envio e estado de pagamento
  const refreshPaymentStatus = async () => {
    try {
      setIsCheckingPayment(true);
      const sid = params.shipmentId ? String(params.shipmentId) : '';
      if (!sid) {
        setIsPaid(false);
        return;
      }
      const shipment = await shipmentFirestoreService.getShipmentById(sid);
      const paid = !!shipment && shipment.paymentPaid === true;
      setIsPaid(paid);
      setLoadedShipment(shipment);
    } catch {
      setIsPaid(false);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Check payment status before enabling scanner
  useEffect(() => {
    let mounted = true;
    refreshPaymentStatus();
    // carrega telefones (cliente/courier)
    (async () => {
      try {
        const sid = params.shipmentId ? String(params.shipmentId) : '';
        if (!sid) return;
        const shipment = await shipmentFirestoreService.getShipmentById(sid);
        if (!shipment) return;
        // clientePhone já vem no shipment
        setClientePhone((shipment as any).clientePhone || null);
        // se tiver courierUid, busca telefone do courier
        if (shipment.courierUid) {
          const courier = await authService.getUserById(shipment.courierUid);
          setCourierPhone(courier?.telefone || null);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [params.shipmentId]);

  useEffect(() => {
    // Pulsing effect for the scan area
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Scanning line animation
    const scanLineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    scanLineAnimation.start();

    // Cleanup function to properly stop animations
    return () => {
      pulseAnimation.stop();
      scanLineAnimation.stop();

      // Reset animation values to initial state
      pulseAnim.setValue(1);
      scanLineAnim.setValue(0);
    };
  }, [pulseAnim, scanLineAnim]);

  if (!permission) {
    // Camera permissions not yet loaded
    return <Loading />;
  }

  if (!permission.granted) {
    // Camera permissions not granted
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={64} color={colors.text} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Acesso à Câmera Necessário
          </Text>
          <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
            Esta funcionalidade requer acesso à câmera para escanear códigos QR
          </Text>
          <Button
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={[styles.submitButtonText, { fontSize: 16 }]}>Conceder Permissão</Text>
          </Button>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    setScanned(true);
    // Process the scanned data (should be in format DELIVERY_TOKEN:ABC123XYZ)
    if (data.startsWith('DELIVERY_TOKEN:')) {
      const token = data.substring('DELIVERY_TOKEN:'.length).trim();
      validateToken(token);
    } else {
      Alert.alert(
        'Código Inválido', 
        'O código escaneado não é um token de confirmação válido.',
        [
          { text: 'OK', onPress: () => setScanned(false) }
        ]
      );
    }
  };

  const validateToken = async (token: string) => {
    setIsLoading(true);
    try {
      const sid = params.shipmentId ? String(params.shipmentId) : '';
      if (!sid) {
        Alert.alert('Erro', 'ID do envio não encontrado.');
        setScanned(false);
        return;
      }

      // Busca envio e valida pagamento/token
      const shipment = await shipmentFirestoreService.getShipmentById(sid);
      if (!shipment) {
        Alert.alert('Erro', 'Envio não encontrado.');
        setScanned(false);
        return;
      }

      if (shipment.paymentPaid !== true) {
        Alert.alert('Pagamento Pendente', 'O pagamento ainda não foi confirmado. Verifique novamente.');
        setScanned(false);
        return;
      }

      const dbToken = (shipment as any).deliveryToken as string | undefined;
      if (!dbToken || dbToken.trim() !== token.trim()) {
        Alert.alert('Código Inválido', 'O token escaneado não confere com o código gerado para este envio.');
        setScanned(false);
        return;
      }

      // Débito do saldo somente na confirmação de recebimento (QR lido)
      const amount = shipment.currentOffer && (shipment.state === 'COUNTER_OFFER' || shipment.state === 'OFFERED' || shipment.state === 'ACCEPTED_OFFER')
        ? shipment.currentOffer.offeredPrice
        : shipment.quote.preco;
      try {
        await walletService.debitSaldoIfSufficient(Math.round(Number(amount) * 100), { shipmentId: String(shipment.id), reason: 'Entrega confirmada' });
      } catch {}

      // Atualiza estado do envio para DELIVERED + evento timeline
      try {
        await shipmentFirestoreService.updateShipmentState(shipment.id, 'DELIVERED');
        await shipmentFirestoreService.addTimelineEvent(shipment.id, {
          tipo: 'DELIVERED',
          descricao: 'Entrega confirmada via QR Code',
          payload: { by: 'qr', at: new Date().toISOString() }
        });
      } catch {}

      // Marca pagamento como APROVADO (quando necessário) e, em seguida, como ENTREGUE
      try {
        await paymentService.markApprovedSmart({
          shipmentId: shipment.id,
          mpPaymentId: shipment.paymentIntent?.mpPaymentId,
          paidByUserId: shipment.clienteUid,
          acceptedByCourierId: shipment.courierUid,
        });
        await paymentService.markDelivered({ shipmentId: shipment.id, acceptedByCourierId: shipment.courierUid });
      } catch (error) {
        console.error('Erro ao marcar pagamento como entregue:', error);
        Alert.alert('Erro', 'Erro ao marcar pagamento como entregue');
      }

      router.replace({
        pathname: '/confirmacao/confirmation-success',
        params: {
          shipmentId: sid,
          token
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualToken.trim()) {
      Alert.alert('Erro', 'Por favor, insira um token válido');
      return;
    }
    
    // Validate manual token
    validateToken(manualToken.trim());
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // While checking payment
  if (isCheckingPayment) {
    return <Loading />;
  }

  // Loading enquanto valida/confirmar o código (escaneado ou manual)
  if (isLoading) {
    return <Loading text="Confirmando..." />;
  }

  if (!isPaid) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Confirmação de Entrega</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.content}>
          <Card style={[styles.manualCard, { backgroundColor: colors.card }]}> 
            <View style={styles.manualHeader}>
              <MaterialIcons name="payment" size={24} color={colors.tint} />
              <Text style={[styles.manualTitle, { color: colors.text }]}>Pagamento Pendente</Text>
            </View>
            <Text style={[styles.manualDescription, { color: colors.textSecondary }]}> 
              Verifique com quem receberá a entrega se o pagamento já foi realizado. Não deve-se entregar nenhuma encomenda antes do pagamento ser realizado.
            </Text>
          {/* Contato do cliente (WhatsApp) */}
          {clientePhone && (
            <TouchableOpacity
              onPress={() => {
                const phone = clientePhone.replace(/\D/g, '');
                const url = `https://wa.me/${phone}`;
                // Linking.openURL exige import; usamos router as a fallback
                router.push({ pathname: '/', params: {} } as any);
              }}
              style={[styles.submitButton, { backgroundColor: '#25D366', marginBottom: 8 }]}
            >
              <MaterialIcons name="phone" size={20} color="white" />
              <Text style={styles.submitButtonText}>WhatsApp do Cliente</Text>
            </TouchableOpacity>
          )}
            <TouchableOpacity
              onPress={refreshPaymentStatus}
              style={[styles.submitButton, { backgroundColor: colors.tint }]}
            >
              <MaterialIcons name="refresh" size={20} color="white" />
              <Text style={styles.submitButtonText}>Verificar Pagamento</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Scanner QR</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* QR Code Scanner */}
        <View style={[styles.scannerCard, { backgroundColor: colors.card }]}>
          <View style={styles.scannerContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'] as const,
              }}
            />

            <View style={styles.overlay}>
              {/* Camera toggle button overlay */}
              <View style={styles.cameraToggleOverlay}>
                <TouchableOpacity
                  onPress={toggleCameraFacing}
                  style={[styles.cameraToggleButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                >
                  <MaterialIcons name="flip-camera-android" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {/* Top overlay */}
              <View style={styles.topOverlay}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
              </View>

              {/* Middle section with scan area */}
              <View style={styles.middleOverlay}>
                <Animated.View
                  style={[
                    styles.scanArea,
                    {
                      borderColor: colors.tint,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  {/* Animated scanning line */}
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-100, 200],
                            }),
                          },
                        ],
                      },
                    ]}
                  />

                  {/* Corner indicators */}
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                </Animated.View>

                <Text style={[styles.scanInstruction, { color: colors.text }]}>
                  Aponte a câmera para o QR Code
                </Text>
              </View>

              {/* Bottom overlay */}
              <View style={styles.bottomOverlay}>
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
              </View>
            </View>
          </View>

           
        </View>

        {/* Manual Input - Redesigned */}
        <Card style={[styles.manualCard, { backgroundColor: colors.card }]}>
          {/* Informações de contato quando disponível */}
          {(clientePhone || courierPhone) && (
            <View style={{ marginBottom: 12, gap: 8 }}>
              {clientePhone && (
                <TouchableOpacity
                  onPress={() => {
                    const phone = clientePhone.replace(/\D/g, '');
                    const url = `https://wa.me/+55${phone}`;
                    WebBrowser.openBrowserAsync(url)
                      .catch(err => console.error('Error opening WhatsApp:', err));
                  }}
                  style={[styles.submitButton, { backgroundColor: '#25D366' }]}
                >
                  <MaterialIcons name="phone" size={20} color="white" />
                  <Text style={styles.submitButtonText}>WhatsApp do Cliente</Text>
                </TouchableOpacity>
              )}
              {courierPhone && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.helpText, { color: colors.textSecondary }]}>Numero do cliente: {clientePhone}</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.manualHeader}>
            <MaterialIcons name="keyboard" size={24} color={colors.tint} />
            <Text style={[styles.manualTitle, { color: colors.text }]}>Inserir Código</Text>
          </View>

          <Text style={[styles.manualDescription, { color: colors.textSecondary }]}>
            Não consegue escanear? Digite o código manualmente
          </Text>

          <View style={[styles.tokenInputContainer, { backgroundColor: colors.backgroundLight }]}>
            <Input
              value={manualToken}
              onChangeText={setManualToken}
              placeholder="ABC123XYZ789"
              placeholderTextColor={colors.textSecondary}
              style={[styles.tokenInput, { color: colors.text }]}
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            onPress={handleManualSubmit}
            disabled={!manualToken.trim()}
            style={[
              styles.submitButton,
              { backgroundColor: manualToken.trim() ? colors.tint : colors.textSecondary }
            ]}
          >
            <MaterialIcons name="check-circle" size={20} color="white" />
            <Text style={styles.submitButtonText}>Confirmar Código</Text>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            Código com 10-12 caracteres alfanuméricos
          </Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scannerCard: {
    borderRadius: 16,
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  scannerContainer: {
    height: 400,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraToggleOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  cameraToggleButton: {
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 30,
  },
  bottomOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 30,
  },
  middleOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 220,
    height: 220,
    borderRadius: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#22c55e',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#22c55e',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#22c55e',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#22c55e',
  },
  scanInstruction: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scannerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 80,
  },
  controlButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  manualCard: {
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  manualDescription: {
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  tokenInputContainer: {
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tokenInput: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  helpText: {
    textAlign: 'center',
    fontSize: 13,
    fontStyle: 'italic',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
});