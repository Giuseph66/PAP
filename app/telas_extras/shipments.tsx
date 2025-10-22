import { ShipmentCard } from '@/components/business/shipment-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface FilterOptions {
  status: string;
  minValue: string;
  maxValue: string;
  period: string;
  sortBy: string;
  searchQuery: string;
}

const STATUS_OPTIONS = [
  { label: 'Todas', value: 'all' },
  { label: 'Criados', value: 'CREATED' },
  { label: 'Pago', value: 'PAID' },
  { label: 'Entregues', value: 'DELIVERED' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

const PERIOD_OPTIONS = [
  { label: 'Hoje', value: 'today' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Todos', value: 'all' },
];

const SORT_OPTIONS = [
  { label: 'Mais Recente', value: 'recent' },
  { label: 'Mais Antigo', value: 'oldest' },
  { label: 'Maior Valor', value: 'highest' },
  { label: 'Menor Valor', value: 'lowest' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    minValue: '',
    maxValue: '',
    period: 'all',
    sortBy: 'recent',
    searchQuery: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadShipments = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const session = await authService.getSession();
      if (!session) {
        setError('Usuário não autenticado');
        return;
      }
      const clientShipments = await shipmentFirestoreService.getShipmentsByClient(session.userId, 200);
      const formattedShipments: Shipment[] = clientShipments.map(doc => ({
        id: doc.id,
        clienteUid: doc.clienteUid,
        clienteName: doc.clienteName,
        clientePhone: doc.clientePhone,
        pickup: doc.pickup,
        dropoff: doc.dropoff,
        pacote: doc.pacote,
        quote: doc.quote,
        state: doc.state,
        paymentPaid: (doc as unknown as { paymentPaid?: boolean }).paymentPaid,
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
      }));
      setShipments(formattedShipments);
      applyFilters(formattedShipments, filters);
    } catch (error) {
      console.error('Error loading shipments:', error);
      setError('Falha ao carregar envios');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (shipmentsToFilter: Shipment[], currentFilters: FilterOptions) => {
    let result = [...shipmentsToFilter];

    // Filtro por status
    if (currentFilters.status !== 'all') {
      result = result.filter(s => {
        if (currentFilters.status === 'PAID') {
          return s.paymentPaid === true;
        }
        return s.state === currentFilters.status;
      });
    }

    // Filtro por período
    const now = new Date();
    if (currentFilters.period !== 'all') {
      result = result.filter(s => {
        const shipmentDate = new Date(s.createdAt);
        switch (currentFilters.period) {
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

    // Filtro por valor
    const minVal = currentFilters.minValue ? parseFloat(currentFilters.minValue) : 0;
    const maxVal = currentFilters.maxValue ? parseFloat(currentFilters.maxValue) : Infinity;
    result = result.filter(s => {
      const shipmentValue = s.quote?.preco || 0;
      return shipmentValue >= minVal && shipmentValue <= maxVal;
    });

    // Busca genérica
    if (currentFilters.searchQuery.trim()) {
      const query = currentFilters.searchQuery.toLowerCase();
      result = result.filter(s => {
        const clientName = s.clienteName?.toLowerCase() || '';
        const courierName = s.courierUid?.toLowerCase() || '';
        const pickupAddr = s.pickup?.endereco?.toLowerCase() || '';
        const dropoffAddr = s.dropoff?.endereco?.toLowerCase() || '';
        const shipmentId = s.id?.toLowerCase() || '';
        const dateStr = new Date(s.createdAt).toLocaleDateString('pt-BR');

        return (
          clientName.includes(query) ||
          courierName.includes(query) ||
          pickupAddr.includes(query) ||
          dropoffAddr.includes(query) ||
          shipmentId.includes(query) ||
          dateStr.includes(query)
        );
      });
    }

    // Ordenação
    result.sort((a, b) => {
      switch (currentFilters.sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return (b.quote?.preco || 0) - (a.quote?.preco || 0);
        case 'lowest':
          return (a.quote?.preco || 0) - (b.quote?.preco || 0);
        default:
          return 0;
      }
    });

    setFilteredShipments(result);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(shipments, newFilters);
  };

  useEffect(() => {
    loadShipments();
  }, []);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Estatísticas
  const stats = {
    total: shipments.length,
    delivered: shipments.filter(s => s.state === 'DELIVERED').length,
    paid: shipments.filter(s => s.paymentPaid === true).length,
    totalSpent: shipments
      .filter(s => s.state === 'DELIVERED' && s.paymentPaid === true)
      .reduce((sum, s) => sum + (s.quote?.preco || 0), 0),
  };

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

      {/* Resumo Estatístico */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
        style={styles.statsScroll}
      >
        <Card style={[styles.statCard, { backgroundColor: colors.background }]}>
          <MaterialIcons name="local-shipping" size={20} color={colors.tint} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Total</Text>
        </Card>
        
        <Card style={[styles.statCard, { backgroundColor: colors.background }]}>
          <MaterialIcons name="check-circle" size={20} color="#10b981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.delivered}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Entregues</Text>
        </Card>
        
        <Card style={[styles.statCard, { backgroundColor: colors.background }]}>
          <MaterialIcons name="payment" size={20} color="#10b981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.paid}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Pagos</Text>
        </Card>
        
        <Card style={[styles.statCard, { backgroundColor: colors.background }]}>
          <MaterialIcons name="attach-money" size={20} color={colors.tint} />
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.totalSpent)}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Total Gasto</Text>
        </Card>
      </ScrollView>

      {/* Barra de Filtros Rápidos */}
      <View style={styles.quickFiltersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContent}
        >
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.quickFilter,
                filters.status === opt.value && { backgroundColor: colors.tint, borderColor: colors.tint }
              ]}
              onPress={() => handleFilterChange('status', opt.value)}
            >
              <Text style={[
                styles.quickFilterText,
                { color: filters.status === opt.value ? 'white' : colors.text }
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Botão Filtros Avançados */}
      <TouchableOpacity 
        style={[styles.advancedFilterButton, { backgroundColor: showFilters ? colors.tint : colors.background }]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <MaterialIcons name="tune" size={20} color={showFilters ? 'white' : colors.tint} />
        <Text style={[styles.advancedFilterText, { color: showFilters ? 'white' : colors.text }]}>
          {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
        </Text>
      </TouchableOpacity>

      {/* Filtros Avançados */}
      {showFilters && (
        <Card style={[styles.advancedFiltersCard, { backgroundColor: colors.background }]}>
          {/* Busca Genérica */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Buscar</Text>
            <Input
              placeholder="Nome, endereço, ID, data..."
              value={filters.searchQuery}
              onChangeText={(val) => handleFilterChange('searchQuery', val)}
              leftIcon={<MaterialIcons name="search" size={18} color={colors.tabIconDefault} />}
            />
          </View>

          {/* Período */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Período</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {PERIOD_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterOption,
                    filters.period === opt.value && { backgroundColor: colors.tint }
                  ]}
                  onPress={() => handleFilterChange('period', opt.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filters.period === opt.value ? 'white' : colors.text }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Valor Min/Max */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Intervalo de Valor</Text>
            <View style={styles.rangeContainer}>
              <Input
                placeholder="Min"
                value={filters.minValue}
                onChangeText={(val) => handleFilterChange('minValue', val)}
                keyboardType="decimal-pad"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Input
                placeholder="Max"
                value={filters.maxValue}
                onChangeText={(val) => handleFilterChange('maxValue', val)}
                keyboardType="decimal-pad"
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Ordenação */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Ordenar por</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterOption,
                    filters.sortBy === opt.value && { backgroundColor: colors.tint }
                  ]}
                  onPress={() => handleFilterChange('sortBy', opt.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filters.sortBy === opt.value ? 'white' : colors.text }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Card>
      )}

      {/* Resultados */}
      <View style={styles.resultsSection}>
        <Text style={[styles.resultsCount, { color: colors.tabIconDefault }]}>
          {filteredShipments.length} resultado{filteredShipments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {filteredShipments.length > 0 ? (
        filteredShipments.map((shipment) => (
          <ShipmentCard
            key={shipment.id}
            shipment={shipment}
            onPress={() => handleShipmentPress(shipment)}
            showCourier
          />
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <MaterialIcons name="search-off" size={64} color={colors.tabIconDefault} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhum resultado encontrado
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
              Tente ajustar os filtros ou fazer uma nova busca
            </Text>
          </View>
        </Card>
      )}
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
  statsScroll: {
    maxHeight: 110,
    marginBottom: 12,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    minWidth: 90,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderRadius: 12,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  quickFiltersContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  quickFiltersContent: {
    gap: 8,
  },
  quickFilter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  advancedFilterText: {
    fontWeight: '600',
  },
  advancedFiltersCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 13,
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