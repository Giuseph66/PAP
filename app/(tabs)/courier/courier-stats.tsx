import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Types for courier statistics
interface CourierStats {
  // Performance metrics
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number; // in minutes
  
  // Financial metrics
  totalEarnings: number;
  pendingPayments: number;
  avgEarningsPerDelivery: number;
  weeklyEarnings: number[];
  
  // Operational metrics
  hoursOnline: number;
  distanceTraveled: number; // in km
  peakHours: { hour: number; deliveries: number }[];
  popularAreas: { area: string; deliveries: number }[];
  
  // Quality metrics
  avgRating: number;
  totalRatings: number;
  customerFeedback: { rating: number; comment: string; date: Date }[];
  successRate: number;
  
  // Recent activity
  recentDeliveries: {
    id: string;
    customer: string;
    amount: number;
    status: 'completed' | 'cancelled' | 'in_progress';
    time: Date;
    rating?: number;
  }[];
}

// Mock data for demonstration
const mockCourierStats: CourierStats = {
  totalDeliveries: 156,
  completedDeliveries: 142,
  cancelledDeliveries: 5,
  onTimeRate: 94.2,
  avgDeliveryTime: 28,
  
  totalEarnings: 2845.50,
  pendingPayments: 320.00,
  avgEarningsPerDelivery: 18.20,
  weeklyEarnings: [420, 580, 610, 540, 695],
  
  hoursOnline: 126,
  distanceTraveled: 2150,
  peakHours: [
    { hour: 12, deliveries: 18 },
    { hour: 18, deliveries: 22 },
    { hour: 13, deliveries: 15 },
    { hour: 19, deliveries: 14 },
  ],
  popularAreas: [
    { area: 'Centro', deliveries: 42 },
    { area: 'Jardins', deliveries: 38 },
    { area: 'Vila Olímpia', deliveries: 31 },
    { area: 'Moema', deliveries: 25 },
  ],
  
  avgRating: 4.8,
  totalRatings: 138,
  successRate: 96.8,
  customerFeedback: [
    { rating: 5, comment: 'Entregador muito pontual e educado', date: new Date('2024-01-15') },
    { rating: 4, comment: 'Entrega rápida, produto bem cuidado', date: new Date('2024-01-14') },
    { rating: 5, comment: 'Excelente serviço, recomendo!', date: new Date('2024-01-14') },
    { rating: 5, comment: 'Muito profissional', date: new Date('2024-01-13') },
  ],
  
  recentDeliveries: [
    { id: 'DEL001', customer: 'Maria Silva', amount: 15.50, status: 'completed', time: new Date('2024-01-15T18:30:00'), rating: 5 },
    { id: 'DEL002', customer: 'João Santos', amount: 12.00, status: 'completed', time: new Date('2024-01-15T17:45:00'), rating: 4 },
    { id: 'DEL003', customer: 'Ana Costa', amount: 18.75, status: 'completed', time: new Date('2024-01-15T16:20:00'), rating: 5 },
    { id: 'DEL004', customer: 'Carlos Lima', amount: 14.25, status: 'completed', time: new Date('2024-01-15T15:10:00'), rating: 5 },
    { id: 'DEL005', customer: 'Fernanda Rocha', amount: 16.00, status: 'cancelled', time: new Date('2024-01-15T14:30:00') },
  ]
};

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon,
  color = '#0A66C2',
  trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
  trend?: 'up' | 'down';
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <Card style={[styles.statCard, { backgroundColor: colors.background }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <MaterialIcons name={icon as any} size={20} color={color} />
        </View>
        {trend && (
          <MaterialIcons 
            name={trend === 'up' ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={trend === 'up' ? '#10b981' : '#ef4444'} 
          />
        )}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.tabIconDefault }]}>{subtitle}</Text>
      )}
    </Card>
  );
};

const ProgressBar = ({ 
  value, 
  max, 
  color = '#0A66C2'
}: {
  value: number;
  max: number;
  color?: string;
}) => {
  const percentage = (value / max) * 100;
  
  return (
    <View style={styles.progressBarContainer}>
      <View 
        style={[
          styles.progressBar, 
          { 
            width: `${percentage}%`, 
            backgroundColor: color 
          }
        ]} 
      />
    </View>
  );
};

export default function CourierStatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stats, setStats] = useState<CourierStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const loadStats = async () => {
      setLoading(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setStats(mockCourierStats);
      setLoading(false);
    };

    loadStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  if (loading || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="sync" size={48} color={colors.tabIconDefault} />
          <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
            Carregando estatísticas...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={[styles.headerTitle, { color: 'white' }]}>
          Minhas Estatísticas
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
          Acompanhe seu desempenho e ganhos
        </Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Resumo
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Entregas"
            value={stats.totalDeliveries}
            subtitle={`${stats.completedDeliveries} concluídas`}
            icon="local-shipping"
            color="#0A66C2"
          />
          <StatCard
            title="Ganhos"
            value={formatCurrency(stats.totalEarnings)}
            subtitle={`${formatCurrency(stats.pendingPayments)} pendentes`}
            icon="attach-money"
            color="#10b981"
          />
          <StatCard
            title="Avaliação"
            value={stats.avgRating.toFixed(1)}
            subtitle={`${stats.totalRatings} avaliações`}
            icon="star"
            color="#fbbf24"
          />
          <StatCard
            title="Pontualidade"
            value={`${stats.onTimeRate.toFixed(1)}%`}
            subtitle="Entregas no prazo"
            icon="schedule"
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Earnings Chart */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ganhos Semanais
        </Text>
        <Card style={[styles.chartCard, { backgroundColor: colors.background }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Últimas 5 semanas
            </Text>
            <Text style={[styles.chartTotal, { color: colors.text }]}>
              {formatCurrency(stats.weeklyEarnings.reduce((a, b) => a + b, 0))}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            {stats.weeklyEarnings.map((earning, index) => {
              const maxEarning = Math.max(...stats.weeklyEarnings);
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={styles.chartBarLabel}>
                    <Text style={[styles.chartBarLabelText, { color: colors.tabIconDefault }]}>
                      Sem {index + 1}
                    </Text>
                  </View>
                  <View style={styles.chartBarWrapper}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          height: `${(earning / maxEarning) * 100}%`,
                          backgroundColor: colors.tint
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartBarValue, { color: colors.text }]}>
                    {formatCurrency(earning)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Desempenho
        </Text>
        <View style={styles.performanceGrid}>
          <Card style={[styles.performanceCard, { backgroundColor: colors.background }]}>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: colors.text }]}>
                Taxa de Sucesso
              </Text>
              <Text style={[styles.performanceValue, { color: colors.text }]}>
                {stats.successRate.toFixed(1)}%
              </Text>
            </View>
            <ProgressBar value={stats.successRate} max={100} color="#10b981" />
          </Card>
          
          <Card style={[styles.performanceCard, { backgroundColor: colors.background }]}>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: colors.text }]}>
                Pontualidade
              </Text>
              <Text style={[styles.performanceValue, { color: colors.text }]}>
                {stats.onTimeRate.toFixed(1)}%
              </Text>
            </View>
            <ProgressBar value={stats.onTimeRate} max={100} color="#0A66C2" />
          </Card>
          
          <Card style={[styles.performanceCard, { backgroundColor: colors.background }]}>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: colors.text }]}>
                Tempo Médio
              </Text>
              <Text style={[styles.performanceValue, { color: colors.text }]}>
                {stats.avgDeliveryTime} min
              </Text>
            </View>
            <ProgressBar value={stats.avgDeliveryTime} max={60} color="#8b5cf6" />
          </Card>
        </View>
      </View>

      {/* Popular Areas */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Áreas Populares
        </Text>
        <Card style={[styles.areasCard, { backgroundColor: colors.background }]}>
          {stats.popularAreas.map((area, index) => {
            const maxDeliveries = Math.max(...stats.popularAreas.map(a => a.deliveries));
            return (
              <View key={index} style={styles.areaItem}>
                <Text style={[styles.areaName, { color: colors.text }]}>{area.area}</Text>
                <View style={styles.areaProgress}>
                  <View 
                    style={[
                      styles.areaProgressBar, 
                      { 
                        width: `${(area.deliveries / maxDeliveries) * 100}%`,
                        backgroundColor: colors.tint
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.areaCount, { color: colors.tabIconDefault }]}>
                  {area.deliveries}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>

      {/* Recent Deliveries */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Entregas Recentes
        </Text>
        <View style={styles.deliveriesList}>
          {stats.recentDeliveries.map((delivery) => (
            <Card key={delivery.id} style={[styles.deliveryCard, { backgroundColor: colors.background }]}>
              <View style={styles.deliveryHeader}>
                <View>
                  <Text style={[styles.deliveryCustomer, { color: colors.text }]} numberOfLines={1}>
                    {delivery.customer}
                  </Text>
                  <Text style={[styles.deliveryTime, { color: colors.tabIconDefault }]}>
                    {formatTime(delivery.time)} • {formatDate(delivery.time)}
                  </Text>
                </View>
                <Text style={[styles.deliveryAmount, { color: colors.text }]}>
                  {formatCurrency(delivery.amount)}
                </Text>
              </View>
              
              <View style={styles.deliveryFooter}>
                <View style={[
                  styles.statusBadge, 
                  { 
                    backgroundColor: delivery.status === 'completed' ? '#10b98120' : 
                                   delivery.status === 'cancelled' ? '#ef444420' : 
                                   '#0A66C220'
                  }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { 
                      color: delivery.status === 'completed' ? '#10b981' : 
                             delivery.status === 'cancelled' ? '#ef4444' : 
                             '#0A66C2'
                    }
                  ]}>
                    {delivery.status === 'completed' ? 'Concluída' : 
                     delivery.status === 'cancelled' ? 'Cancelada' : 'Em andamento'}
                  </Text>
                </View>
                
                {delivery.rating && (
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#fbbf24" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {delivery.rating}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarLabel: {
    marginBottom: 8,
  },
  chartBarLabelText: {
    fontSize: 10,
  },
  chartBarWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBar: {
    width: 24,
    borderRadius: 4,
  },
  chartBarValue: {
    fontSize: 10,
  },
  performanceGrid: {
    gap: 12,
  },
  performanceCard: {
    padding: 16,
    borderRadius: 12,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  areasCard: {
    padding: 16,
    borderRadius: 12,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  areaName: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
  },
  areaProgress: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  areaProgressBar: {
    height: '100%',
  },
  areaCount: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  deliveriesList: {
    gap: 12,
  },
  deliveryCard: {
    padding: 16,
    borderRadius: 12,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryCustomer: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    flex: 1,
    marginRight: 8,
  },
  deliveryTime: {
    fontSize: 12,
  },
  deliveryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerSpacer: {
    height: 32,
  },
});