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

// Tipos para estatísticas de empresa
interface CompanyStats {
  // Métricas de envio
  totalShipments: number;
  completedShipments: number;
  pendingShipments: number;
  cancelledShipments: number;
  avgDeliveryTime: number; // em minutos
  onTimeRate: number;
  
  // Informações financeiras
  totalSpent: number;
  avgCostPerShipment: number;
  monthlySpending: number[];
  spendingByCategory: { category: string; amount: number; percentage: number }[];
  
  // Dados operacionais
  peakHours: { hour: number; shipments: number }[];
  popularAreas: { area: string; shipments: number }[];
  packageTypes: { type: string; count: number; percentage: number }[];
  usageFrequency: 'daily' | 'weekly' | 'monthly' | 'occasionally';
  
  // Métricas de qualidade
  avgCourierRating: number;
  totalRatings: number;
  complaintRate: number;
  customerSatisfaction: number;
  
  // Atividade recente
  recentShipments: {
    id: string;
    description: string;
    amount: number;
    status: 'completed' | 'pending' | 'cancelled' | 'in_transit';
    date: Date;
    courier?: string;
    rating?: number;
  }[];
}

// Dados mock para demonstração
const mockCompanyStats: CompanyStats = {
  totalShipments: 247,
  completedShipments: 215,
  pendingShipments: 18,
  cancelledShipments: 14,
  avgDeliveryTime: 35,
  onTimeRate: 89.5,
  
  totalSpent: 4287.50,
  avgCostPerShipment: 17.35,
  monthlySpending: [320, 480, 510, 440, 695, 720, 580, 432.50],
  spendingByCategory: [
    { category: 'Documentos', amount: 1845.20, percentage: 43 },
    { category: 'Produtos', amount: 1520.80, percentage: 35.5 },
    { category: 'Alimentos', amount: 680.50, percentage: 15.9 },
    { category: 'Outros', amount: 241.00, percentage: 5.6 },
  ],
  
  peakHours: [
    { hour: 10, shipments: 28 },
    { hour: 15, shipments: 32 },
    { hour: 11, shipments: 25 },
    { hour: 14, shipments: 22 },
  ],
  popularAreas: [
    { area: 'Centro', shipments: 67 },
    { area: 'Jardins', shipments: 54 },
    { area: 'Vila Olímpia', shipments: 48 },
    { area: 'Moema', shipments: 39 },
  ],
  packageTypes: [
    { type: 'Documento', count: 106, percentage: 43 },
    { type: 'Pequeno', count: 82, percentage: 33 },
    { type: 'Médio', count: 45, percentage: 18 },
    { type: 'Grande', count: 14, percentage: 6 },
  ],
  usageFrequency: 'weekly',
  
  avgCourierRating: 4.7,
  totalRatings: 198,
  complaintRate: 2.3,
  customerSatisfaction: 92.4,
  
  recentShipments: [
    { id: 'ENV001', description: 'Contrato jurídico para cliente', amount: 18.50, status: 'completed', date: new Date('2024-01-15T14:30:00'), courier: 'Carlos Silva', rating: 5 },
    { id: 'ENV002', description: 'Amostra de produto para fornecedor', amount: 15.00, status: 'completed', date: new Date('2024-01-15T11:45:00'), courier: 'Ana Costa', rating: 4 },
    { id: 'ENV003', description: 'Documentos fiscais', amount: 12.75, status: 'in_transit', date: new Date('2024-01-15T09:20:00'), courier: 'João Santos' },
    { id: 'ENV004', description: 'Protótipo de produto', amount: 22.25, status: 'pending', date: new Date('2024-01-15T08:10:00') },
    { id: 'ENV005', description: 'Material de escritório', amount: 14.00, status: 'completed', date: new Date('2024-01-14T16:30:00'), courier: 'Maria Oliveira', rating: 5 },
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

export default function CompanyStatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados
    const loadStats = async () => {
      setLoading(true);
      // Simular atraso de chamada API
      await new Promise(resolve => setTimeout(resolve, 800));
      setStats(mockCompanyStats);
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
      {/* Cabeçalho */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={[styles.headerTitle, { color: 'white' }]}>
          Estatísticas da Empresa
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
          Acompanhe seu histórico de envios e gastos
        </Text>
      </View>

      {/* Estatísticas Resumo */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Resumo
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Envios"
            value={stats.totalShipments}
            subtitle={`${stats.completedShipments} concluídos`}
            icon="local-shipping"
            color="#0A66C2"
          />
          <StatCard
            title="Gastos"
            value={formatCurrency(stats.totalSpent)}
            subtitle={`Média ${formatCurrency(stats.avgCostPerShipment)}/envio`}
            icon="attach-money"
            color="#10b981"
          />
          <StatCard
            title="Pontualidade"
            value={`${stats.onTimeRate.toFixed(1)}%`}
            subtitle="Entregas no prazo"
            icon="schedule"
            color="#8b5cf6"
          />
          <StatCard
            title="Avaliação"
            value={stats.avgCourierRating.toFixed(1)}
            subtitle={`${stats.totalRatings} avaliações`}
            icon="star"
            color="#fbbf24"
          />
        </View>
      </View>

      {/* Gráfico de Gastos Mensais */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Evolução de Gastos
        </Text>
        <Card style={[styles.chartCard, { backgroundColor: colors.background }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Últimos 8 meses
            </Text>
            <Text style={[styles.chartTotal, { color: colors.text }]}>
              {formatCurrency(stats.monthlySpending.reduce((a, b) => a + b, 0))}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            {stats.monthlySpending.map((spending, index) => {
              const maxSpending = Math.max(...stats.monthlySpending);
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={styles.chartBarLabel}>
                    <Text style={[styles.chartBarLabelText, { color: colors.tabIconDefault }]}>
                      Mês {index + 1}
                    </Text>
                  </View>
                  <View style={styles.chartBarWrapper}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          height: `${(spending / maxSpending) * 100}%`,
                          backgroundColor: colors.tint
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartBarValue, { color: colors.text }]}>
                    {formatCurrency(spending)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Métricas de Desempenho */}
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
                {((stats.completedShipments / stats.totalShipments) * 100).toFixed(1)}%
              </Text>
            </View>
            <ProgressBar value={stats.completedShipments} max={stats.totalShipments} color="#10b981" />
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
                Satisfação
              </Text>
              <Text style={[styles.performanceValue, { color: colors.text }]}>
                {stats.customerSatisfaction.toFixed(1)}%
              </Text>
            </View>
            <ProgressBar value={stats.customerSatisfaction} max={100} color="#8b5cf6" />
          </Card>
        </View>
      </View>

      {/* Gastos por Categoria */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Gastos por Categoria
        </Text>
        <Card style={[styles.categoriesCard, { backgroundColor: colors.background }]}>
          {stats.spendingByCategory.map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
                <Text style={[styles.categoryAmount, { color: colors.tabIconDefault }]}>
                  {formatCurrency(category.amount)}
                </Text>
              </View>
              <View style={styles.categoryProgress}>
                <View 
                  style={[
                    styles.categoryProgressBar, 
                    { 
                      width: `${category.percentage}%`,
                      backgroundColor: colors.tint
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.categoryPercentage, { color: colors.text }]}>
                {category.percentage}%
              </Text>
            </View>
          ))}
        </Card>
      </View>

      {/* Áreas Populares */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Áreas com Mais Envios
        </Text>
        <Card style={[styles.areasCard, { backgroundColor: colors.background }]}>
          {stats.popularAreas.map((area, index) => {
            const maxShipments = Math.max(...stats.popularAreas.map(a => a.shipments));
            return (
              <View key={index} style={styles.areaItem}>
                <Text style={[styles.areaName, { color: colors.text }]}>{area.area}</Text>
                <View style={styles.areaProgress}>
                  <View 
                    style={[
                      styles.areaProgressBar, 
                      { 
                        width: `${(area.shipments / maxShipments) * 100}%`,
                        backgroundColor: colors.tint
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.areaCount, { color: colors.tabIconDefault }]}>
                  {area.shipments}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>

      {/* Envios Recentes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Envios Recentes
        </Text>
        <View style={styles.shipmentsList}>
          {stats.recentShipments.map((shipment) => (
            <Card key={shipment.id} style={[styles.shipmentCard, { backgroundColor: colors.background }]}>
              <View style={styles.shipmentHeader}>
                <View>
                  <Text style={[styles.shipmentDescription, { color: colors.text }]} numberOfLines={1}>
                    {shipment.description}
                  </Text>
                  <Text style={[styles.shipmentTime, { color: colors.tabIconDefault }]}>
                    {formatTime(shipment.date)} • {formatDate(shipment.date)}
                  </Text>
                </View>
                <Text style={[styles.shipmentAmount, { color: colors.text }]}>
                  {formatCurrency(shipment.amount)}
                </Text>
              </View>
              
              <View style={styles.shipmentFooter}>
                <View style={[
                  styles.statusBadge, 
                  { 
                    backgroundColor: shipment.status === 'completed' ? '#10b98120' : 
                                   shipment.status === 'cancelled' ? '#ef444420' : 
                                   shipment.status === 'pending' ? '#f59e0b20' : 
                                   '#0A66C220'
                  }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { 
                      color: shipment.status === 'completed' ? '#10b981' : 
                             shipment.status === 'cancelled' ? '#ef4444' : 
                             shipment.status === 'pending' ? '#f59e0b' : 
                             '#0A66C2'
                    }
                  ]}>
                    {shipment.status === 'completed' ? 'Concluído' : 
                     shipment.status === 'cancelled' ? 'Cancelado' : 
                     shipment.status === 'pending' ? 'Pendente' : 
                     'Em trânsito'}
                  </Text>
                </View>
                
                {shipment.courier && (
                  <Text style={[styles.courierText, { color: colors.tabIconDefault }]}>
                    {shipment.courier}
                  </Text>
                )}
                
                {shipment.rating && (
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#fbbf24" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {shipment.rating}
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
  categoriesCard: {
    padding: 16,
    borderRadius: 12,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryProgress: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryProgressBar: {
    height: '100%',
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
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
  shipmentsList: {
    gap: 12,
  },
  shipmentCard: {
    padding: 16,
    borderRadius: 12,
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipmentDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    flex: 1,
    marginRight: 8,
  },
  shipmentTime: {
    fontSize: 12,
  },
  shipmentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shipmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
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
  courierText: {
    fontSize: 12,
    flex: 1,
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