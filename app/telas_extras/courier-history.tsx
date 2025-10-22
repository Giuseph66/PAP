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
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

interface FilterOption {
  label: string;
  value: string;
}

const statusFilters: FilterOption[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Concluídas', value: 'DELIVERED' },
  { label: 'Em Andamento', value: 'PICKED_UP' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

const periodFilters: FilterOption[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Esta Semana', value: 'week' },
  { label: 'Este Mês', value: 'month' },
  { label: 'Todos', value: 'all' },
];

export default function CourierHistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('week');
  const [user, setUser] = useState<any>(null);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUserData();
      if (userData) {
        setUser(userData);
        return userData.id;
      }
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  };

  const loadShipments = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const userId = await loadUserData();
      if (!userId) {
        setError('Usuário não autenticado');
        return;
      }

      // Busca entregas do entregador
      const courierShipments = await shipmentFirestoreService.getShipmentsByCourier(userId, 100);
      
      // Converte para o formato Shipment esperado
      const formattedShipments: Shipment[] = courierShipments.map(doc => ({
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
        offers: doc.offers,
        currentOffer: doc.currentOffer,
        notificationCount: doc.notificationCount,
        lastNotificationAt: doc.lastNotificationAt,
        city: doc.city,
        rejectionCount: doc.rejectionCount,
        paymentPaid: doc.paymentPaid,
        deliveryToken: doc.deliveryToken,
        deliveryTokenGeneratedAt: doc.deliveryTokenGeneratedAt,
      }));

      setShipments(formattedShipments);
    } catch (error) {
      console.error('Error loading shipments:', error);
      setError('Falha ao carregar histórico de entregas');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...shipments];

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(shipment => shipment.state === selectedStatus);
    }

    // Filtro por período
    const now = new Date();
    if (selectedPeriod !== 'all') {
      filtered = filtered.filter(shipment => {
        const shipmentDate = new Date(shipment.createdAt);
        
        switch (selectedPeriod) {
          case 'today':
            return shipmentDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return shipmentDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return shipmentDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Ordena por data de criação (mais recente primeiro)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setFilteredShipments(filtered);
  };

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [shipments, selectedStatus, selectedPeriod]);

  const onRefresh = () => {
    loadShipments(true);
  };

  const handleShipmentPress = (shipment: Shipment) => {
    router.push({
      pathname: '/shipment/details',
      params: { id: shipment.id }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '#10b981';
      case 'PICKED_UP':
        return '#0A66C2';
      case 'CANCELLED':
        return '#ef4444';
      case 'PAID':
        return '#8b5cf6';
      default:
        return colors.tabIconDefault;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'Entregue';
      case 'PICKED_UP':
        return 'Coletado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'PAID':
        return 'Pago';
      case 'CREATED':
        return 'Criado';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <Loading text="Carregando histórico de entregas..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Histórico de Entregas</Text>
        </View>
        
        <Card style={styles.errorCard}>
          <View style={styles.errorContent}>
            <MaterialIcons name="error" size={48} color="#f44336" />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Erro ao carregar histórico
            </Text>
            <Text style={[styles.errorMessage, { color: colors.tabIconDefault }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.background }]}
              onPress={() => loadShipments()}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Histórico de Entregas</Text>
      </View>

      {/* Seção de Resumo */}
      {shipments.length > 0 && (
        <View style={styles.statsSection}>
          <View style={[styles.statCard, { backgroundColor: '#10b98120' }]}>
            <MaterialIcons name="check-circle" size={20} color="#10b981" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Entregues</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                {shipments.filter(s => s.state === 'DELIVERED').length}
              </Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#0A66C220' }]}>
            <MaterialIcons name="local-shipping" size={20} color="#0A66C2" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Em Andamento</Text>
              <Text style={[styles.statValue, { color: '#0A66C2' }]}>
                {shipments.filter(s => s.state === 'PICKED_UP').length}
              </Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#8b5cf620' }]}>
            <MaterialIcons name="trending-up" size={20} color="#8b5cf6" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Ganho</Text>
              <Text style={[styles.statValue, { color: '#8b5cf6' }]}>
                {formatCurrency(
                  shipments
                    .filter(s => s.state === 'DELIVERED')
                    .reduce((acc, s) => acc + s.quote.preco, 0)
                )}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedStatus === filter.value ? colors.tint : 'transparent',
                  borderColor: selectedStatus === filter.value ? colors.tint : colors.tabIconDefault,
                }
              ]}
              onPress={() => setSelectedStatus(filter.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: selectedStatus === filter.value ? 'white' : colors.text,
                  }
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.filterLabel, { color: colors.text, marginTop: 12 }]}>Período</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {periodFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedPeriod === filter.value ? colors.tint : 'transparent',
                  borderColor: selectedPeriod === filter.value ? colors.tint : colors.tabIconDefault,
                }
              ]}
              onPress={() => setSelectedPeriod(filter.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: selectedPeriod === filter.value ? 'white' : colors.text,
                  }
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de entregas */}
      {filteredShipments.length > 0 ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredShipments.map((shipment) => (
            <TouchableOpacity
              key={shipment.id}
              style={styles.shipmentCard}
              onPress={() => handleShipmentPress(shipment)}
              activeOpacity={0.7}
            >
              <Card style={[styles.card, { backgroundColor: colors.background }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
                      {shipment.clienteName}
                    </Text>
                    <Text style={[styles.customerPhone, { color: colors.tabIconDefault }]}>
                      {shipment.clientePhone}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(shipment.state) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(shipment.state) }
                    ]}>
                      {getStatusText(shipment.state)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.addressInfo}>
                    <View style={styles.addressRow}>
                      <MaterialIcons name="my-location" size={16} color="#10b981" />
                      <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                        {shipment.pickup.endereco}
                      </Text>
                    </View>
                    <View style={styles.addressRow}>
                      <MaterialIcons name="place" size={16} color="#ef4444" />
                      <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                        {shipment.dropoff.endereco}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.dateTimeInfo}>
                      <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>
                        {formatDate(shipment.createdAt)}
                      </Text>
                      <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
                        {formatTime(shipment.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.priceText, { color: colors.text }]}>
                      {formatCurrency(shipment.quote.preco)}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialIcons name="history" size={64} color={colors.tabIconDefault} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma entrega encontrada
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
                {selectedStatus === 'all' && selectedPeriod === 'all'
                  ? 'Você ainda não realizou nenhuma entrega.'
                  : 'Nenhuma entrega corresponde aos filtros selecionados.'}
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
  header: {
    padding: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filtersScroll: {
    marginBottom: 4,
  },
  filtersContent: {
    paddingHorizontal: 4,
    paddingRight: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1.5,
    minHeight: 36,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statInfo: {
    marginLeft: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 0,
  },
  shipmentCard: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  customerPhone: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardBody: {
    marginBottom: 10,
  },
  addressInfo: {
    marginBottom: 12,
    gap: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  addressText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  errorCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContent: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
