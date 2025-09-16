import { ShipmentCard } from '@/components/business/shipment-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Busca envios do cliente no Firestore
      const clientShipments = await shipmentFirestoreService.getShipmentsByClient(session.userId, 50);
      // Converte para o formato Shipment esperado
      const formattedShipments: Shipment[] = clientShipments.map(doc => ({
        id: doc.id,
        clienteUid: doc.clienteUid,
        clienteName: doc.clienteName, // Valor padrão
        clientePhone: doc.clientePhone, // Valor padrão
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
      setError('Falha ao carregar envios');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  // Escuta mudanças na sessão do usuário para recarregar envios
  useEffect(() => {
    const unsubscribe = authService.onSessionChanged((session) => {
      if (session) {
        loadShipments();
      } else {
        setShipments([]);
        setError('Usuário não autenticado');
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const onRefresh = () => {
    loadShipments(true);
  };

  const handleShipmentPress = (shipment: Shipment) => {
    router.push(`/shipment/details?id=${shipment.id}`);
  };


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const activeShipments = shipments.filter(s => 
    ['CREATED', 'PAID', 'DISPATCHING', 'ASSIGNED', 'ARRIVED_PICKUP', 'PICKED_UP', 'EN_ROUTE', 'ARRIVED_DROPOFF', 'OFFERED', 'COUNTER_OFFER', 'ACCEPTED_OFFER'].includes(s.state)
  );

  const recentShipments = shipments.filter(s => 
    ['DELIVERED', 'CANCELLED', 'COURIER_ABANDONED'].includes(s.state)
  ).slice(0, 3);

  if (isLoading) {
    return <Loading text="Carregando seus envios..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.tabIconDefault }]}>{getGreeting()}!</Text>
            <Text style={[styles.userName, { color: colors.text }]}>P A P — Ponto a Ponto</Text>
          </View>
        </View>
        
        <Card style={styles.errorCard}>
          <View style={styles.errorContent}>
            <MaterialIcons name="error" size={48} color="#f44336" />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Erro ao carregar envios
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
            <Button
              title="Login"
              onPress={() => router.replace('/auth/login')}
              style={styles.retryButton}
              variant="primary"
            />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.tabIconDefault }]}>{getGreeting()}!</Text>
          <Text style={[styles.userName, { color: colors.text }]}>P A P — Ponto a Ponto</Text>
        </View>
        
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/telas_extras/profile')}>
          <MaterialIcons name="person" size={32} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {activeShipments.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Envios Ativos
          </Text>
          {activeShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onPress={() => handleShipmentPress(shipment)}
              showCourier
            />
          ))}
        </View>
      )}

      {recentShipments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Envios Recentes
            </Text>
            <TouchableOpacity onPress={() => router.push('/telas_extras/shipments')}>
              <Text style={[styles.seeAllText, { color: colors.tint }]}>
                Ver todos
              </Text>
            </TouchableOpacity>
          </View>
          
          {recentShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onPress={() => handleShipmentPress(shipment)}
            />
          ))}
        </View>
      )}

      {shipments.length === 0 && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <MaterialIcons name="local-shipping" size={64} color={colors.tabIconDefault} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhum envio ainda
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
              Crie seu primeiro envio para começar a usar o app
            </Text>
          </View>
        </Card>
      )}

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ações Rápidas
        </Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <MaterialIcons name="location-on" size={24} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Endereços
              </Text>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <MaterialIcons name="credit-card" size={24} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Pagamentos
              </Text>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <MaterialIcons name="headphones" size={24} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Suporte
              </Text>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <MaterialIcons name="star" size={24} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Avaliar
              </Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  profileButton: {
    padding: 4,
  },
  createButton: {
    marginHorizontal: 20,
    marginBottom: 24,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    marginHorizontal: 20,
    padding: 40,
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
  quickActions: {
    paddingHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionItem: {
    flex: 1,
    minWidth: '45%',
  },
  actionCard: {
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 8,
  },
});