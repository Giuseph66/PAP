import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { firestore } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { locationService } from '@/services/location.service';
import { notificationService } from '@/services/notification.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { Shipment } from '@/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Função para lidar com oferta aceita
const handleAcceptedOffer = async (shipment: Shipment) => {
  try {
    // Navega para a tela de navegação da corrida
    const { router } = await import('expo-router');
    router.replace({
      pathname: '/aceitar/navegacao-corrida',
      params: {
        shipmentId: shipment.id,
        rideId: shipment.id,
        passengerName: shipment.clienteName,
        passengerPhone: shipment.clientePhone, // Usar instruções como telefone temporariamente
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

// Componente para escutar mudanças em tempo real
function RealtimeListener() {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastProcessedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const setupRealtimeListener = async () => {
      try {
        const session = await authService.getSession();
        
        if (!session || session.role !== 'courier') {
          return;
        }

        // Obtém cidade atual do entregador
        const currentCity = await locationService.getCurrentCity();
        
        if (!currentCity) {
          Alert.alert('Erro', 'Não foi possível obter a cidade atual');
          return;
        }
        // Query para escutar novos envios e ofertas aceitas
        const q = query(
          collection(firestore, 'shipments'),
          where('state', 'in', ['CREATED', 'COUNTER_OFFER', 'ACCEPTED_OFFER', 'COURIER_ABANDONED'])
        );
        unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
          if (!isMounted) return;
          const newShipments: Shipment[] = [];
          
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = change.doc.data();
              const shipment: Shipment = {
                id: change.doc.id,
                clienteUid: data.clienteUid,
                clienteName: data.clienteName,
                clientePhone: data.clientePhone,
                pickup: data.pickup,
                dropoff: data.dropoff,
                pacote: data.pacote,
                quote: data.quote,
                state: data.state,
                courierUid: data.courierUid,
                etaMin: data.etaMin,
                timeline: data.timeline.map((event: any) => ({
                  ...event,
                  timestamp: event.timestamp.toDate()
                })),
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                offers: data.offers?.map((offer: any) => ({
                  ...offer,
                  createdAt: offer.createdAt.toDate(),
                  expiresAt: offer.expiresAt.toDate()
                })),
                currentOffer: data.currentOffer ? {
                  ...data.currentOffer,
                  createdAt: data.currentOffer.createdAt.toDate(),
                  expiresAt: data.currentOffer.expiresAt.toDate()
                } : undefined,
                notificationCount: data.notificationCount || 0,
                lastNotificationAt: data.lastNotificationAt?.toDate(),
                city: data.city,
              };
              // Verifica se deve notificar
              if (notificationService.shouldNotify(shipment, currentCity)) {
                newShipments.push(shipment);
              }
              // Verifica se oferta foi aceita (independente da notificação)
              if (shipment.state === 'ACCEPTED_OFFER') {
                // Verifica se a oferta aceita é para o entregador atual
                authService.getSession().then(async (session) => {
                  if (session && session.role === 'courier' && session.userId === shipment.courierUid) {
                    // Verifica se já processou esta oferta aceita
                    if (!lastProcessedRef.current.has(`accepted_${shipment.id}`)) {
                      lastProcessedRef.current.add(`accepted_${shipment.id}`);
                      // Navega automaticamente para a tela de navegação
                      await handleAcceptedOffer(shipment);
                    }
                  }
                }).catch(error => {
                  console.error('Error checking session for accepted offer:', error);
                });
              }
            }
          });
          // Filtra envios abandonados pelo próprio entregador
          const session = await authService.getSession();
          const filteredShipments = newShipments.filter(shipment => {
            if (shipment.state === 'COURIER_ABANDONED') {
              // Busca o courierUid do último evento de abandono
              const lastAbandonEvent = shipment.timeline
                ?.filter(event => event.tipo === 'COURIER_ABANDONED')
                ?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              
              // Se o último abandono foi pelo entregador atual, não mostra
              if (lastAbandonEvent?.payload?.courierUid === session?.userId) {
                return false;
              }
            }
            return true;
          });

          // Processa novos envios filtrados
          for (const shipment of filteredShipments) {
            if (!lastProcessedRef.current.has(shipment.id)) {
              lastProcessedRef.current.add(shipment.id);
              await notificationService.showShipmentNotification(shipment);
            }
          }
        });
      } catch (error) {
        console.error('Error setting up realtime listener:', error);
      }
    };

    // Escuta mudanças de sessão para reativar listener
    const unsubscribeSession = authService.onSessionChanged(async (session) => {
      if (session && session.role === 'courier') {
        // Limpa cache de notificações quando entregador faz login
        notificationService.clearNotificationQueue();
        lastProcessedRef.current.clear();
        
        // Verifica se há corridas ativas
        if (session.userId) {
          await checkActiveRides(session.userId);
        }
        
        // Reativa listener
        setupRealtimeListener();
      } else {
        // Limpa listener quando entregador faz logout
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      }
    });

    // Configura listener inicial
    setupRealtimeListener();
    // Cleanup
    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeSession();
    };
  }, []);
  return null; // Componente invisível
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
        <Stack.Screen name="telas_extras/courier-stats" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/company-stats" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/finance" options={{ headerShown: false }} />
        <Stack.Screen name="pedir/create-shipment" options={{ headerShown: false }} />
        <Stack.Screen name="courier/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="pedir/map-route" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/profile" options={{ headerShown: false }} />
        <Stack.Screen name="telas_extras/shipments" options={{ headerShown: false }} />
        <Stack.Screen name="aceitar/navegacao-corrida" options={{ headerShown: false }} />
        <Stack.Screen name="aceitar/aceitar-corrida" options={{ headerShown: false }} />
        <Stack.Screen name="shipment/details" options={{ headerShown: false }} />
        <Stack.Screen name="payment/confirm" options={{ headerShown: false }} />
        {/** map-route moved under (tabs) */}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
