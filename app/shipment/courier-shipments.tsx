import { ShipmentCard } from '@/components/business/shipment-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { firestore } from '@/config/firebase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { locationService } from '@/services/location.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function CourierShipmentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline'>('offline');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastProcessedRef = useRef<Set<string>>(new Set());

  // Load available shipments
  const loadShipments = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      // Verifica se o usuário está autenticado
      const session = await authService.getSession();
      if (!session) {
        setError('Usuário não autenticado');
        return;
      }
      
      // Busca envios disponíveis no Firestore
      const availableShipments = await shipmentFirestoreService.getAvailableShipments(50);
      
      // Converte para o formato Shipment esperado
      const formattedShipments: Shipment[] = availableShipments.map(doc => ({
        id: doc.id,
        clienteUid: doc.clienteUid,
        clienteName: doc.clienteName,
        clientePhone: doc.clientePhone,
        pickup: doc.pickup,
        dropoff: doc.dropoff,
        pacote: doc.pacote,
        quote: doc.quote,
        state: doc.state,
        courierUid: doc.courierUid,
        etaMin: doc.etaMin,
        timeline: doc.timeline,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        // Sistema de ofertas
        offers: doc.offers,
        currentOffer: doc.currentOffer,
        notificationCount: doc.notificationCount,
        lastNotificationAt: doc.lastNotificationAt,
        city: doc.city,
        rejectionCount: doc.rejectionCount,
      }));

      setShipments(formattedShipments);
    } catch (error) {
      console.error('Error loading shipments:', error);
      setError('Falha ao carregar envios disponíveis');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Setup real-time listener for available shipments
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
      
      // Query para escutar envios disponíveis
      const q = query(
        collection(firestore, 'shipments'),
        where('state', '==', 'CREATED')
        // Removido orderBy para evitar necessidade de índice composto
      );
      
      unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
        const addedOrModifiedShipments: Shipment[] = [];
        const removedShipmentIds: string[] = [];
        
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
              rejectionCount: data.rejectionCount || 0
            };
            addedOrModifiedShipments.push(shipment);
          } else if (change.type === 'removed') {
            removedShipmentIds.push(change.doc.id);
          }
        });
        
        // Handle removed shipments
        if (removedShipmentIds.length > 0) {
          setShipments(prev => prev.filter(s => !removedShipmentIds.includes(s.id)));
        }
        
        // Handle added/modified shipments
        if (addedOrModifiedShipments.length > 0) {
          // Filtra envios abandonados pelo próprio entregador
          const session = await authService.getSession();
          const filteredShipments = addedOrModifiedShipments.filter(shipment => {
            // Verifica se há eventos de abandono na timeline
            const abandonEvents = shipment.timeline
              ?.filter(event => event.tipo === 'COURIER_ABANDONED');
            
            if (abandonEvents && abandonEvents.length > 0) {
              // Verifica se o entregador atual abandonou este envio em QUALQUER momento
              const hasAbandonedByCurrentCourier = abandonEvents.some(event => 
                event.payload?.courierUid === session?.userId
              );
              
              // Se o entregador atual abandonou este envio em qualquer momento, não mostra
              if (hasAbandonedByCurrentCourier) {
                return false;
              }
            }
            return true;
          });

          // Atualiza o estado com os novos envios
          setShipments(prevShipments => {
            // Remove shipments that were modified (to replace them with new data)
            const withoutModified = prevShipments.filter(prevShipment => 
              !filteredShipments.some(newShipment => newShipment.id === prevShipment.id)
            );
            
            // Combine existing shipments with new ones
            const combined = [...withoutModified, ...filteredShipments];
            
            // Sort by creation date (oldest first) - ordenação no cliente
            return combined.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          });
        }
      });
    } catch (error) {
      console.error('Error setting up realtime listener:', error);
      setError('Falha ao conectar ao servidor em tempo real');
    }
  };

  useEffect(() => {
    loadShipments();
    setupRealtimeListener();
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Listen for state changes of shipments already in the list
  useEffect(() => {
    if (shipments.length === 0) return;
    
    // Create a query for all shipments in the list
    const shipmentIds = shipments.map(s => s.id);
    const q = query(
      collection(firestore, 'shipments'),
      where('__name__', 'in', shipmentIds)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Check if any shipments have changed state
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          // If the shipment is no longer in CREATED state, remove it from the list
          if (data.state !== 'CREATED') {
            setShipments(prev => prev.filter(s => s.id !== change.doc.id));
          }
        } else if (change.type === 'removed') {
          // If the document no longer exists, remove it from the list
          setShipments(prev => prev.filter(s => s.id !== change.doc.id));
        }
      });
    });
    
    // Cleanup listener on unmount or when shipments change
    return () => unsubscribe();
  }, [shipments]);

  const onRefresh = () => {
    loadShipments(true);
  };

  const handleAcceptShipment = async (shipment: Shipment) => {
    try {
      // Verifica se o usuário está autenticado
      const session = await authService.getSession();
      if (!session) {
        Alert.alert('Erro', 'Você precisa estar logado para visualizar uma entrega');
        return;
      }
      
      // Navega para a tela de aceitar corrida com parâmetro para ocultar rejeitar
      router.push({
        pathname: '/aceitar/aceitar-corrida',
        params: {
          shipmentId: shipment.id,
          passengerName: shipment.clienteName,
          passengerPhone: shipment.clientePhone,
          pickupAddress: shipment.pickup.endereco,
          pickupLat: shipment.pickup.lat.toString(),
          pickupLng: shipment.pickup.lng.toString(),
          destinationAddress: shipment.dropoff.endereco,
          destinationLat: shipment.dropoff.lat.toString(),
          destinationLng: shipment.dropoff.lng.toString(),
          etaMin: shipment.etaMin?.toString() || '15',
          packageValue: shipment.pacote.valorDeclarado.toString(),
          packageName: `Pacote (${shipment.pacote.pesoKg}kg)`,
          originalPrice: shipment.quote.preco.toString(),
          hideReject: 'true' // Parâmetro para ocultar botão de rejeitar
        }
      });
      
    } catch (error) {
      console.error('Error accepting shipment:', error);
      Alert.alert('Erro', 'Falha ao aceitar a entrega. Tente novamente.');
    }
  };


  const toggleOnlineStatus = () => {
    setOnlineStatus(prev => prev === 'online' ? 'offline' : 'online');
    // TODO: Implement actual online status update in backend
  };

  if (isLoading) {
    return <Loading text="Carregando entregas disponíveis..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.tabIconDefault }]}>Olá, entregador!</Text>
            <Text style={[styles.userName, { color: colors.text }]}>Entregas Disponíveis</Text>
          </View>
        </View>
        
        <Card style={styles.errorCard}>
          <View style={styles.errorContent}>
            <MaterialIcons name="error" size={48} color="#f44336" />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Erro ao carregar entregas
            </Text>
            <Text style={[styles.errorMessage, { color: colors.tabIconDefault }]}>
              {error}
            </Text>
            <Button
              title="Tentar novamente"
              onPress={() => loadShipments()}
              style={styles.retryButton}
              variant="secondary"
            />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.tabIconDefault }]}>Olá, entregador!</Text>
          <Text style={[styles.userName, { color: colors.text }]}>Entregas Disponíveis</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.onlineButton, { 
            backgroundColor: onlineStatus === 'online' ? '#10b981' : '#ef4444' 
          }]}
          onPress={toggleOnlineStatus}
        >
          <View style={[styles.onlineIndicator, { 
            backgroundColor: onlineStatus === 'online' ? '#047857' : '#b91c1c' 
          }]} />
          <Text style={styles.onlineText}>
            {onlineStatus === 'online' ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {shipments.length > 0 ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {shipments.map((shipment) => (
            <TouchableOpacity 
              key={shipment.id} 
              style={styles.shipmentItem}
              onPress={() => handleAcceptShipment(shipment)}
              activeOpacity={0.7}
            >
              <ShipmentCard
                shipment={shipment}
                showCourier={false}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialIcons name="local-shipping" size={64} color={colors.tabIconDefault} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma entrega disponível
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
                {onlineStatus === 'online' 
                  ? 'Não há entregas disponíveis no momento. Verifique novamente em breve.' 
                  : 'Você está offline. Fique online para receber notificações de novas entregas.'}
              </Text>
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 20,
  },
  greeting: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  onlineText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  shipmentItem: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCard: {
    padding: 40,
    width: '100%',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorCard: {
    margin: 20,
    padding: 24,
  },
  errorContent: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 8,
  },
});