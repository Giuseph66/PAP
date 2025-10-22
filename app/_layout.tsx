import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { firestore } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { localNotificationService } from '@/services/local-notification.service';
import { locationService } from '@/services/location.service';
import { notificationService } from '@/services/notification.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { systemConfigService } from '@/services/system-config.service';
import { Shipment } from '@/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Função para lidar com oferta aceita - otimizada para evitar múltiplas navegações
const handleAcceptedOffer = async (shipment: Shipment) => {
  try {
    // Import dinâmico para evitar dependência circular
    const { router } = await import('expo-router');

    // Navega para a tela de navegação da corrida
    router.replace({
      pathname: '/aceitar/navegacao-corrida',
      params: {
        shipmentId: shipment.id,
        rideId: shipment.id,
        passengerName: shipment.clienteName,
        passengerPhone: shipment.clientePhone,
        pickupAddress: shipment.pickup.endereco,
        pickupLat: shipment.pickup.lat.toString(),
        pickupLng: shipment.pickup.lng.toString(),
        destinationAddress: shipment.dropoff.endereco,
        destinationLat: shipment.dropoff.lat.toString(),
        destinationLng: shipment.dropoff.lng.toString(),
        etaToPickup: shipment.etaMin?.toString() || '5',
        etaToDestination: shipment.etaMin?.toString() || '15',
      }
    });
  } catch (error) {
    console.error('Error handling accepted offer:', error);
  }
};

// Função para verificar corridas ativas
const checkActiveRides = async (courierUid: string) => {
  try {
    // Verifica se courierUid é válido
    if (!courierUid || courierUid.trim() === '') {
      console.log('checkActiveRides: courierUid inválido ou vazio');
      return;
    }

    // Primeiro verifica se o entregador está online
    const onlineStatus = await SecureStore.getItemAsync('courier_online_status');
    if (onlineStatus !== 'online') {
      console.log('checkActiveRides: Entregador está offline, não verificando corridas ativas');
      return;
    }

    // Busca shipments ativos do entregador
    const activeShipments = await shipmentFirestoreService.getShipmentsByCourier(courierUid);

    // Filtra apenas shipments em andamento
    const activeRides = activeShipments.filter((shipment: any) =>
      ['EN_ROUTE', 'ARRIVED_PICKUP', 'PICKED_UP'].includes(shipment.state)
    );

    if (activeRides.length > 0) {
      const activeRide = activeRides[0]; // Pega a primeira corrida ativa

      // Navega para a tela de navegação
      const { router } = await import('expo-router');
      router.replace({
        pathname: '/aceitar/navegacao-corrida',
        params: {
          shipmentId: activeRide.id,
          rideId: activeRide.id,
          passengerName: activeRide.clienteName,
          passengerPhone: activeRide.clientePhone,
          pickupAddress: activeRide.pickup.endereco,
          pickupLat: activeRide.pickup.lat.toString(),
          pickupLng: activeRide.pickup.lng.toString(),
          destinationAddress: activeRide.dropoff.endereco,
          destinationLat: activeRide.dropoff.lat.toString(),
          destinationLng: activeRide.dropoff.lng.toString(),
          etaToPickup: activeRide.etaMin?.toString() || '5',
          etaToDestination: activeRide.etaMin?.toString() || '15',
        }
      });
    }
  } catch (error) {
    console.error('Error checking active rides:', error);
  }
};

// Componente otimizado para escutar mudanças em tempo real com filtros de performance
function RealtimeListener() {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastProcessedRef = useRef<Set<string>>(new Set());
  const currentCityRef = useRef<string | null>(null);
  const sessionRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const setupOptimizedListener = async () => {
      try {
        const session = await authService.getSession();

        if (!session || session.role !== 'courier') {
          return;
        }

        sessionRef.current = session;

        // Obtém cidade atual do entregador (com cache)
        if (!currentCityRef.current) {
          currentCityRef.current = await locationService.getCurrentCity();
        }

        if (!currentCityRef.current) {
          console.warn('Não foi possível obter a cidade atual - listener não iniciado');
          return;
        }

        // Query otimizada: filtra por cidade E limita resultados
        const q = query(
          collection(firestore, 'shipments'),
          where('city', '==', currentCityRef.current),
          where('state', 'in', ['CREATED', 'COUNTER_OFFER', 'ACCEPTED_OFFER', 'COURIER_ABANDONED','PAID'])
        );

        // Remove listener anterior antes de criar novo
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
          if (!isMounted || isProcessingRef.current) return;

          isProcessingRef.current = true;

          try {
            // Processa apenas mudanças (não todos os documentos)
            const changes = snapshot.docChanges();

            if (changes.length === 0) {
              isProcessingRef.current = false;
              return;
            }

            const newShipments: Shipment[] = [];

            // Processa apenas as mudanças (muito mais eficiente)
            for (const change of changes) {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();

                // Verifica se já processou este shipment recentemente
                if (lastProcessedRef.current.has(change.doc.id)) {
                  continue;
                }

                const shipment: Shipment = {
                  id: change.doc.id,
                  clienteUid: data.clienteUid,
                  clienteName: data.clienteName,
                  clientePhone: data.clientePhone,
                  paymentPaid: data.paymentPaid,
                  pickup: data.pickup,
                  dropoff: data.dropoff,
                  pacote: data.pacote,
                  quote: data.quote,
                  state: data.state,
                  courierUid: data.courierUid,
                  etaMin: data.etaMin,
                  timeline: data.timeline?.map((event: any) => ({
                    ...event,
                    timestamp: event.timestamp?.toDate() || new Date()
                  })) || [],
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                  offers: data.offers?.map((offer: any) => ({
                    ...offer,
                    createdAt: offer.createdAt?.toDate() || new Date(),
                    expiresAt: offer.expiresAt?.toDate() || new Date()
                  })),
                  currentOffer: data.currentOffer ? {
                    ...data.currentOffer,
                    createdAt: data.currentOffer.createdAt?.toDate() || new Date(),
                    expiresAt: data.currentOffer.expiresAt?.toDate() || new Date()
                  } : undefined,
                  notificationCount: data.notificationCount || 0,
                  lastNotificationAt: data.lastNotificationAt?.toDate(),
                  city: data.city,
                  rejectionCount: data.rejectionCount || 0,
                };

                // Filtros rápidos antes de processar
                if (shouldProcessShipment(shipment, session)) {
                  newShipments.push(shipment);
                }
              }
            }

            // Processa apenas shipments válidos
            for (const shipment of newShipments) {
              lastProcessedRef.current.add(shipment.id);

              // Verifica se deve notificar (com verificação de cidade)
              if (notificationService.shouldNotify(shipment, currentCityRef.current!)) {
                await notificationService.showShipmentNotification(shipment);
              }

              // Verifica se oferta foi aceita para o entregador atual
              if (shipment.state === 'ACCEPTED_OFFER' && shipment.courierUid === session.userId) {
                if (!lastProcessedRef.current.has(`accepted_${shipment.id}`)) {
                  lastProcessedRef.current.add(`accepted_${shipment.id}`);
                  await handleAcceptedOffer(shipment);
                }
              }
            }

            // Limita o tamanho do cache para evitar memory leak
            if (lastProcessedRef.current.size > 1000) {
              lastProcessedRef.current.clear();
            }

          } catch (error) {
            console.error('Error processing realtime changes:', error);
          } finally {
            isProcessingRef.current = false;
          }
        });

      } catch (error) {
        console.error('Error setting up optimized listener:', error);
      }
    };

    // Função auxiliar para filtrar shipments rapidamente
    const shouldProcessShipment = (shipment: Shipment, session: any): boolean => {
      // Não processa shipments abandonados pelo próprio entregador
      const abandonEvents = shipment.timeline?.filter(event => event.tipo === 'COURIER_ABANDONED');
      if (abandonEvents?.some(event => event.payload?.courierUid === session.userId)) {
        return false;
      }

      // Não processa shipments com muitas rejeições
      const config = systemConfigService.getShipmentConfig();
      if ((shipment.rejectionCount || 0) >= config.maxRejectionCount) {
        return false;
      }

      return true;
    };

    // Escuta mudanças de sessão
    const unsubscribeSession = authService.onSessionChanged(async (session) => {
      if (session && session.role === 'courier') {
        sessionRef.current = session;
        notificationService.clearNotificationQueue();
        lastProcessedRef.current.clear();

        if (session.userId) {
          await checkActiveRides(session.userId);
        }

        setupOptimizedListener();
      } else {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        sessionRef.current = null;
        currentCityRef.current = null;
      }
    });

    // Configura listener inicial
    setupOptimizedListener();

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeSession();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize system configuration
    const initSystemConfig = async () => {
      try {
        await systemConfigService.loadConfig();
      } catch (error) {
        console.error('Error initializing system config:', error);
      }
    };
    
    initSystemConfig();

    // Registrar notificações locais e listeners
    (async () => {
      try {
        await localNotificationService.register();
      } catch {}
    })();
    const removeNotif = localNotificationService.setupListeners();
    
    // Aguarda um pouco para garantir que o componente está montado
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      removeNotif();
    };
  }, []);

  if (!isReady) {
    return null; // ou um loading screen
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RealtimeListener />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/role-selection" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register/company" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register/courier" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/admin-panel" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/admin-config" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/finance" options={{ headerShown: false }} />
        <Stack.Screen name="pedir/create-shipment" options={{ headerShown: false }} />
        <Stack.Screen name="pedir/map-route" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/profile" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/shipments" options={{ headerShown: false }} />
        <Stack.Screen name="aceitar/navegacao-corrida" options={{ headerShown: false }} />
        <Stack.Screen name="aceitar/aceitar-corrida" options={{ headerShown: false }} />
        <Stack.Screen name="shipment/details" options={{ headerShown: false }} />
        <Stack.Screen name="shipment/courier-shipments" options={{ headerShown: false }} />
        <Stack.Screen name="payment/confirm" options={{ headerShown: false }} />
        <Stack.Screen name="confirmacao/qr-display" options={{ headerShown: false }} />
        <Stack.Screen name="confirmacao/qr-scanner" options={{ headerShown: false }} />
        <Stack.Screen name="confirmacao/confirmation-success" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/courier-history" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/payout-management" options={{ headerShown: false }} />
        {/** map-route moved under (tabs) */}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
