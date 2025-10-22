import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { courierStatsService } from '@/services/courier-stats.service';
import { payoutService } from '@/services/payout.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Tipos para transações financeiras de entregador
interface CourierTransaction {
  id: string;
  type: 'income' | 'payout' | 'bonus' | 'adjustment';
  amount: number;
  description: string;
  category: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  date: Date;
  referenceId?: string; // ID da entrega relacionada
  paymentMethod?: string; // PIX, Cartão, etc.
  notes?: string;
  rating?: number; // Avaliação do cliente (para ganhos)
}

// Tipos para estatísticas financeiras de entregador
interface CourierFinancialStats {
  totalEarnings: number;
  pendingPayments: number;
  totalPayouts: number;
  availableBalance: number;
  avgEarningsPerDelivery: number;
  monthlyTrend: number; // Porcentagem de mudança em relação ao mês anterior
  transactionsCount: number;
  topEarningHours: { hour: string; earnings: number }[];
  weeklyEarnings: { week: string; earnings: number }[];
  payoutHistory: { date: Date; amount: number; status: string }[];
}

// Dados reais: preenchidos via courierStatsService

const periodFilters = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Ano' },
  { key: 'all', label: 'Tudo' },
];

const categoryFilters = [
  { key: 'all', label: 'Todas' },
  { key: 'delivery', label: 'Entregas' },
  { key: 'payout', label: 'Saques' },
  { key: 'bonus', label: 'Bônus' },
  { key: 'adjustment', label: 'Ajustes' },
];

const statusFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'processing', label: 'Processando' },
  { key: 'failed', label: 'Falhou' },
];

export default function CourierFinanceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [transactions, setTransactions] = useState<CourierTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CourierTransaction[]>([]);
  const [stats, setStats] = useState<CourierFinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [activePeriod, setActivePeriod] = useState('month');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para saque
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const session = await authService.getSession();
      if (!session?.userId) throw new Error('Usuário não autenticado');

      const [txnsDTO, finDTO, availableBalanceReais, payouts] = await Promise.all([
        courierStatsService.getCourierTransactions(session.userId),
        courierStatsService.getCourierFinancialStats(session.userId),
        payoutService.getAvailableBalance(session.userId),
        payoutService.getPayoutsByCourier(session.userId),
      ]);

      // Mapear transações de entregas
      const realTransactions: CourierTransaction[] = txnsDTO.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: 'Entrega',
        status: t.status,
        date: t.date,
        referenceId: t.referenceId,
        paymentMethod: t.paymentMethod,
      }));

      // Mapear saques retornados pelo payoutService
      const mapPayoutStatus = (s: string): 'completed' | 'pending' | 'processing' | 'failed' => {
        switch (s) {
          case 'APPROVED': return 'completed';
          case 'PENDING': return 'pending';
          case 'PROCESSING': return 'processing';
          case 'FAILED':
          case 'CANCELLED':
            return 'failed';
          default: return 'pending';
        }
      };

      const payoutTransactions: CourierTransaction[] = (payouts || []).map((p) => ({
        id: p.id,
        type: 'payout',
        amount: p.valor || 0,
        description: 'Saque solicitado via PIX',
        category: 'Saque',
        status: mapPayoutStatus(p.status as string),
        date: p.createdAt || new Date(),
        referenceId: p.id,
        paymentMethod: 'PIX',
        notes: p.nomeTitular ? `Titular: ${p.nomeTitular}` : undefined,
      }));

      // Mesclar transações, evitando duplicatas por id
      const txnById = new Map<string, CourierTransaction>();
      [...realTransactions, ...payoutTransactions].forEach((tx) => {
        if (!txnById.has(tx.id)) txnById.set(tx.id, tx);
      });
      const mergedTransactions = Array.from(txnById.values());

      // Calcular total de saques (aprovados)
      const totalPayouts = (payouts || [])
        .filter((p) => p.status === 'APPROVED')
        .reduce((sum, p) => sum + ((p.valor as number) || 0), 0);

      const payoutHistory = (payouts || []).map((p) => ({
        date: p.createdAt || new Date(),
        amount: p.valor || 0,
        status: mapPayoutStatus(p.status as string),
      }));

      const realStats: CourierFinancialStats = {
        totalEarnings: finDTO.totalEarnings,
        pendingPayments: finDTO.pendingPayments,
        totalPayouts: +totalPayouts.toFixed(2),
        availableBalance: +availableBalanceReais.toFixed(2),
        avgEarningsPerDelivery: finDTO.avgEarningsPerDelivery,
        monthlyTrend: finDTO.monthlyTrend,
        transactionsCount: finDTO.transactionsCount,
        topEarningHours: finDTO.topEarningHours,
        weeklyEarnings: finDTO.weeklyEarnings,
        payoutHistory,
      };

      setTransactions(mergedTransactions);
      setStats(realStats);

      // Aplicar filtros iniciais
      applyFilters(mergedTransactions, 'month', 'all', 'all', '');
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados financeiros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (
    transactionsList: CourierTransaction[],
    period: string,
    category: string,
    status: string,
    search: string
  ) => {
    let filtered = [...transactionsList];
    
    // Filtro por período
    const now = new Date();
    switch (period) {
      case 'today':
        filtered = filtered.filter(t => 
          t.date.toDateString() === now.toDateString()
        );
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(t => t.date >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(t => t.date >= monthAgo);
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        filtered = filtered.filter(t => t.date >= quarterAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear(), 0, 1);
        filtered = filtered.filter(t => t.date >= yearAgo);
        break;
      // 'all' não filtra nada
    }
    
    // Filtro por categoria
    if (category !== 'all') {
      filtered = filtered.filter(t => 
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // Filtro por status
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }
    
    // Filtro por busca
    if (search) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.referenceId?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (filterType: 'period' | 'category' | 'status', value: string) => {
    switch (filterType) {
      case 'period':
        setActivePeriod(value);
        applyFilters(transactions, value, activeCategory, activeStatus, searchQuery);
        break;
      case 'category':
        setActiveCategory(value);
        applyFilters(transactions, activePeriod, value, activeStatus, searchQuery);
        break;
      case 'status':
        setActiveStatus(value);
        applyFilters(transactions, activePeriod, activeCategory, value, searchQuery);
        break;
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(transactions, activePeriod, activeCategory, activeStatus, query);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'processing': return colors.tint;
      case 'failed': return '#ef4444';
      default: return colors.tabIconDefault;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'pending': return 'Pendente';
      case 'processing': return 'Processando';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return 'trending-up';
      case 'payout': return 'account-balance-wallet';
      case 'bonus': return 'star';
      case 'adjustment': return 'sync';
      default: return 'receipt';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return '#10b981';
      case 'payout': return '#8b5cf6';
      case 'bonus': return '#f59e0b';
      case 'adjustment': return '#0A66C2';
      default: return colors.text;
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Validação', 'Informe um valor válido para saque');
      return;
    }
    if (!withdrawPixKey) {
      Alert.alert('Validação', 'Informe sua chave PIX');
      return;
    }
    if (amount > (stats?.availableBalance || 0)) {
      Alert.alert('Validação', 'Valor de saque superior ao saldo disponível');
      return;
    }

    setWithdrawLoading(true);
    try {
      const session = await authService.getSession();
      if (!session?.userId) throw new Error('Usuário não autenticado');

      const user = await authService.getUserById(session.userId);
      const nomeTitular = user?.nome || '—';

      // Cria o pedido de saque (valores em REAIS)
      const payout = await payoutService.createPayoutRequest(
        session.userId,
        +amount.toFixed(2),
        withdrawPixKey,
        nomeTitular,
        false
      );

      // Atualiza saldo disponível localmente (otimista)
      setStats((prev) =>
        prev
          ? {
              ...prev,
              availableBalance: Math.max(0, +(prev.availableBalance - amount).toFixed(2)),
              payoutHistory: [
                { date: new Date(), amount: amount, status: 'PENDING' },
                ...prev.payoutHistory,
              ],
            }
          : prev
      );

      // Insere transação de retirada
      const newTxn: CourierTransaction = {
        id: payout.id || Math.random().toString(36).slice(2),
        type: 'payout',
        amount: amount,
        description: 'Saque solicitado via PIX',
        category: 'Saque',
        status: 'pending',
        date: new Date(),
        referenceId: payout.id,
        paymentMethod: 'PIX',
        notes: `Chave PIX: ${withdrawPixKey}`,
      };
      setTransactions((prev) => [newTxn, ...prev]);
      applyFilters([newTxn, ...transactions], activePeriod, activeCategory, activeStatus, searchQuery);

      Alert.alert(
        'Saque Solicitado',
        `Saque de ${formatCurrency(amount)} solicitado com sucesso!\nSerá processado após aprovação do administrador.`,
        [{ text: 'OK', onPress: () => setShowWithdrawModal(false) }]
      );

      // Resetar formulário
      setWithdrawAmount('');
      setWithdrawPixKey('');
    } catch (error) {
      console.error('Error requesting withdraw:', error);
      Alert.alert('Erro', 'Falha ao solicitar saque. Tente novamente.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleExportReport = () => {
    Alert.alert(
      'Exportar Relatório',
      'Selecione o formato para exportação:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'PDF', onPress: () => Alert.alert('Info', 'Exportação em PDF solicitada') },
        { text: 'Excel', onPress: () => Alert.alert('Info', 'Exportação em Excel solicitada') },
        { text: 'CSV', onPress: () => Alert.alert('Info', 'Exportação em CSV solicitada') },
      ]
    );
  };

  if (loading) {
    return <Loading text="Carregando dados financeiros..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com gradiente */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: 'white' }]}>
            Financeiro - Entregador
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            Acompanhe seus ganhos e saques
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >

      {/* Cards de Resumo */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryCardsContainer}
        style={styles.summaryCardsScrollView}
      >
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.summaryCardHeader}>
            <MaterialIcons name="account-balance-wallet" size={24} color={colors.tint} />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Saldo Disponível
            </Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: colors.text }]}>
            {formatCurrency(stats?.availableBalance || 0)}
          </Text>
          <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
            {stats?.pendingPayments ? `+${formatCurrency(stats.pendingPayments)} pendentes` : 'Sem pendências'}
          </Text>
        </Card>
        
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.summaryCardHeader}>
            <MaterialIcons name="trending-up" size={24} color="#10b981" />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Total Ganho
            </Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: colors.text }]}>
            {formatCurrency(stats?.totalEarnings || 0)}
          </Text>
          <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
            Média: {formatCurrency(stats?.avgEarningsPerDelivery || 0)}/entrega
          </Text>
        </Card>
        
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.summaryCardHeader}>
            <MaterialIcons name="account-balance" size={24} color="#8b5cf6" />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Saques
            </Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: colors.text }]}>
            {formatCurrency(stats?.totalPayouts || 0)}
          </Text>
          <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
            Total sacado
          </Text>
        </Card>
        
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.summaryCardHeader}>
            <MaterialIcons name="trending-flat" size={24} color="#0A66C2" />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Tendência
            </Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: colors.text }]}>
            +{stats?.monthlyTrend.toFixed(1)}%
          </Text>
          <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
            Este mês
          </Text>
        </Card>
      </ScrollView>

      {/* Gráfico de Ganhos Semanais */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ganhos Semanais
        </Text>
        <Card style={StyleSheet.flatten([styles.chartCard, { backgroundColor: colors.background }])}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Últimas 5 semanas
            </Text>
            <Text style={[styles.chartTotal, { color: colors.text }]}>
              {formatCurrency(stats?.weeklyEarnings.reduce((sum, item) => sum + item.earnings, 0) || 0)}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            {stats?.weeklyEarnings.map((item, index) => {
              const maxValue = Math.max(...(stats?.weeklyEarnings.map(i => i.earnings) || [1]));
              return (
                <View key={index} style={styles.chartBarItem}>
                  <Text style={[styles.chartBarLabel, { color: colors.tabIconDefault }]}>
                    {item.week}
                  </Text>
                  <View style={styles.chartBarWrapper}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          height: `${(item.earnings / maxValue) * 100}%`,
                          backgroundColor: colors.tint
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartBarValue, { color: colors.text }]}>
                    {formatCurrency(item.earnings)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Horários de Maior Renda */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Melhores Horários
        </Text>
        <Card style={StyleSheet.flatten([styles.hoursCard, { backgroundColor: colors.background }])}>
          {stats?.topEarningHours.map((hour, index) => (
            <View key={index} style={styles.hourItem}>
              <Text style={[styles.hourLabel, { color: colors.text }]}>{hour.hour}</Text>
              <View style={styles.hourProgress}>
                <View 
                  style={[
                    styles.hourProgressBar, 
                    { 
                      width: `${(hour.earnings / 100) * 100}%`,
                      backgroundColor: colors.tint
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.hourValue, { color: colors.text }]}>
                {formatCurrency(hour.earnings)}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      {/* Ações Rápidas */}
      <View style={styles.quickActions}>
        <Button
          title="Solicitar Saque"
          onPress={() => router.push('/telas_extras/payout-management')}
          variant="primary"
          icon={<MaterialIcons name="account-balance" size={16} color="#ffffff" />}
          fullWidth
        />
      </View>

      {/* Filtros */}
      <View style={styles.filtersSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScrollView}
        >
          {/* Grupo de Filtros - Período */}
          <View style={styles.filterGroupContainer}>
            <Text style={[styles.filterGroupTitle, { color: colors.tabIconDefault }]}>
              Período
            </Text>
            <View style={styles.filterButtonsRow}>
              {periodFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    activePeriod === filter.key && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                    { 
                      backgroundColor: activePeriod === filter.key ? colors.tint : colors.background,
                      borderColor: activePeriod === filter.key ? colors.tint : colors.border,
                    }
                  ]}
                  onPress={() => handleFilterChange('period', filter.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { 
                        color: activePeriod === filter.key ? '#ffffff' : colors.text,
                      }
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Grupo de Filtros - Categoria */}
          <View style={styles.filterGroupContainer}>
            <Text style={[styles.filterGroupTitle, { color: colors.tabIconDefault }]}>
              Categoria
            </Text>
            <View style={styles.filterButtonsRow}>
              {categoryFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    activeCategory === filter.key && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                    { 
                      backgroundColor: activeCategory === filter.key ? colors.tint : colors.background,
                      borderColor: activeCategory === filter.key ? colors.tint : colors.border,
                    }
                  ]}
                  onPress={() => handleFilterChange('category', filter.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { 
                        color: activeCategory === filter.key ? '#ffffff' : colors.text,
                      }
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Grupo de Filtros - Status */}
          <View style={styles.filterGroupContainer}>
            <Text style={[styles.filterGroupTitle, { color: colors.tabIconDefault }]}>
              Status
            </Text>
            <View style={styles.filterButtonsRow}>
              {statusFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    activeStatus === filter.key && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                    { 
                      backgroundColor: activeStatus === filter.key ? colors.tint : colors.background,
                      borderColor: activeStatus === filter.key ? colors.tint : colors.border,
                    }
                  ]}
                  onPress={() => handleFilterChange('status', filter.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { 
                        color: activeStatus === filter.key ? '#ffffff' : colors.text,
                      }
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.searchContainer}>
          <Input
            placeholder="Buscar transações..."
            value={searchQuery}
            onChangeText={handleSearch}
            leftIcon={<MaterialIcons name="search" size={20} color={colors.tabIconDefault} />}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Lista de Transações */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Transações ({filteredTransactions.length})
          </Text>
          <TouchableOpacity onPress={handleExportReport}>
            <MaterialIcons name="file-download" size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.transactionsContent}>
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <Card 
                key={transaction.id} 
                style={StyleSheet.flatten([styles.transactionCard, { backgroundColor: colors.background, borderColor: colors.border }])}
              >
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionIconContainer}>
                    <MaterialIcons 
                      name={getTypeIcon(transaction.type)} 
                      size={20} 
                      color={getTypeColor(transaction.type)} 
                    />
                  </View>
                  
                  <View style={styles.transactionInfo}>
                    <Text 
                      style={[styles.transactionDescription, { color: colors.text }]} 
                      numberOfLines={1}
                    >
                      {transaction.description}
                    </Text>
                    <View style={styles.transactionMeta}>
                      <Text style={[styles.transactionReference, { color: colors.tabIconDefault }]}>
                        {transaction.referenceId || 'N/A'}
                      </Text>
                      <Text style={[styles.transactionDate, { color: colors.tabIconDefault }]}>
                        {formatDate(transaction.date)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.transactionAmountContainer}>
                    <Text 
                      style={[
                        styles.transactionAmount, 
                        { 
                          color: transaction.type === 'income' || transaction.type === 'bonus' 
                            ? '#10b981' 
                            : transaction.type === 'payout' 
                              ? '#8b5cf6' 
                              : transaction.type === 'adjustment'
                                ? '#0A66C2'
                                : '#ef4444'
                        }
                      ]}
                    >
                      {transaction.type === 'payout' || transaction.type === 'adjustment' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </View> 
                
                <View style={styles.transactionFooter}>
                  <View style={styles.transactionCategory}>
                    <MaterialIcons name="category" size={16} color={colors.tabIconDefault} />
                    <Text style={[styles.transactionCategoryText, { color: colors.tabIconDefault }]}>
                      {transaction.category}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionStatus}>
                    <View 
                      style={[
                        styles.statusIndicator, 
                        { backgroundColor: `${getStatusColor(transaction.status)}20` }
                      ]}
                    />
                    <Text 
                      style={[
                        styles.transactionStatusText, 
                        { color: getStatusColor(transaction.status) }
                      ]}
                    >
                      {getStatusText(transaction.status)}
                    </Text>
                  </View>
                  
                  {transaction.rating && (
                    <View style={styles.ratingContainer}>
                      <MaterialIcons name="star" size={16} color="#fbbf24" />
                      <Text style={[styles.ratingText, { color: colors.text }]}>
                        {transaction.rating}
                      </Text>
                    </View>
                  )}
                </View>
                
                {transaction.notes && (
                  <View style={styles.transactionNotes}>
                    <MaterialIcons name="notes" size={16} color={colors.tabIconDefault} />
                    <Text style={[styles.transactionNotesText, { color: colors.tabIconDefault }]}>
                      {transaction.notes}
                    </Text>
                  </View>
                )}
              </Card>
            ))
          ) : (
            <Card style={StyleSheet.flatten([styles.emptyCard, { backgroundColor: colors.background }])}>
              <MaterialIcons name="receipt" size={48} color={colors.tabIconDefault} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma transação encontrada
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
                Não há transações que correspondam aos filtros selecionados
              </Text>
            </Card>
          )}
        </View>
      </View>

      </ScrollView>

      {/* Modal de Saque */}
      <View style={[styles.modalBackdrop, showWithdrawModal && styles.modalVisible]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Solicitar Saque
            </Text>
            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.tabIconDefault} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.withdrawInfo}>
              <Text style={[styles.withdrawLabel, { color: colors.tabIconDefault }]}>
                Saldo Disponível
              </Text>
              <Text style={[styles.withdrawBalance, { color: colors.text }]}>
                {formatCurrency(stats?.availableBalance || 0)}
              </Text>
            </View>
            
            <Input
              label="Valor do Saque *"
              placeholder="0,00"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              leftIcon={<MaterialIcons name="attach-money" size={20} color={colors.tabIconDefault} />}
            />
            
            <Input
              label="Chave PIX *"
              placeholder="Informe sua chave PIX"
              value={withdrawPixKey}
              onChangeText={setWithdrawPixKey}
              leftIcon={<MaterialIcons name="qr-code" size={20} color={colors.tabIconDefault} />}
            />
            
            <View style={styles.withdrawNote}>
              <MaterialIcons name="info" size={16} color="#0A66C2" />
              <Text style={[styles.withdrawNoteText, { color: colors.tabIconDefault }]}>
                O saque será processado em até 1 dia útil. Taxa de saque: R$ 0,00
              </Text>
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => setShowWithdrawModal(false)}
              style={styles.modalButton}
            />
            <Button
              title="Solicitar Saque"
              onPress={handleWithdraw}
              loading={withdrawLoading}
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  summaryCardsScrollView: {
    maxHeight: 120,
    marginBottom: 16,
  },
  summaryCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    padding: 16,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryCardSubtitle: {
    fontSize: 12,
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
  chartBarItem: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarLabel: {
    fontSize: 10,
    marginBottom: 8,
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
  hoursCard: {
    padding: 16,
    borderRadius: 12,
  },
  hourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hourLabel: {
    width: 60,
    fontSize: 14,
    fontWeight: '600',
  },
  hourProgress: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  hourProgressBar: {
    height: '100%',
  },
  hourValue: {
    width: 70,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  filtersSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  filtersScrollView: {
    maxHeight: 200,
  },
  filtersContainer: {
    gap: 20,
    paddingHorizontal: 20,
  },
  filterGroupContainer: {
    width: 280,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 20,
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsContent: {
    gap: 12,
  },
  transactionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  transactionReference: {
    fontSize: 12,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmountContainer: {
    marginLeft: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  transactionCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionCategoryText: {
    fontSize: 12,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  transactionStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  transactionNotesText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
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
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    pointerEvents: 'none',
  },
  modalVisible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    gap: 16,
    marginBottom: 20,
  },
  withdrawInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  withdrawLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawBalance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  withdrawNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  withdrawNoteText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});