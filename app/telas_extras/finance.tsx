import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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

// Tipos para transações financeiras
interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'payout' | 'deposit';
  amount: number;
  description: string;
  category: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  date: Date;
  referenceId?: string; // ID da entrega ou envio relacionado
  paymentMethod?: string; // PIX, Cartão, etc.
  notes?: string;
}

// Tipos para estatísticas financeiras
interface FinancialStats {
  // Para entregadores
  totalEarnings?: number;
  pendingPayments?: number;
  totalPayouts?: number;
  availableBalance?: number;
  avgEarningsPerDelivery?: number;
  
  // Para empresas
  totalSpent?: number;
  pendingExpenses?: number;
  avgCostPerShipment?: number;
  budgetUsed?: number;
  budgetLimit?: number;
  
  // Comum
  monthlyTrend: number; // Porcentagem de mudança em relação ao mês anterior
  transactionsCount: number;
}

// Props para a tela
interface FinanceScreenProps {
  userType: 'courier' | 'company';
}

// Dados mock para demonstração
const mockTransactionsCourier: Transaction[] = [
  {
    id: 'txn_001',
    type: 'income',
    amount: 15.50,
    description: 'Entrega - Rua Augusta → Av. Paulista',
    category: 'Entrega',
    status: 'completed',
    date: new Date('2024-01-15T18:30:00'),
    referenceId: 'del_123',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_002',
    type: 'income',
    amount: 12.00,
    description: 'Entrega - Centro → Consolação',
    category: 'Entrega',
    status: 'completed',
    date: new Date('2024-01-15T17:45:00'),
    referenceId: 'del_124',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_003',
    type: 'payout',
    amount: -200.00,
    description: 'Saque PIX - Conta corrente',
    category: 'Saque',
    status: 'completed',
    date: new Date('2024-01-14T10:00:00'),
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_004',
    type: 'income',
    amount: 18.75,
    description: 'Entrega - Vila Olímpia → Jardins',
    category: 'Entrega',
    status: 'pending',
    date: new Date('2024-01-15T16:20:00'),
    referenceId: 'del_125',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_005',
    type: 'income',
    amount: 14.25,
    description: 'Entrega - Moema → Brooklin',
    category: 'Entrega',
    status: 'completed',
    date: new Date('2024-01-15T15:10:00'),
    referenceId: 'del_126',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_006',
    type: 'payout',
    amount: -150.00,
    description: 'Saque PIX - Conta poupança',
    category: 'Saque',
    status: 'processing',
    date: new Date('2024-01-10T09:30:00'),
    paymentMethod: 'PIX',
  },
];

const mockTransactionsCompany: Transaction[] = [
  {
    id: 'txn_101',
    type: 'expense',
    amount: -18.50,
    description: 'Envio de documentos - Contrato jurídico',
    category: 'Documentos',
    status: 'completed',
    date: new Date('2024-01-15T14:30:00'),
    referenceId: 'ship_456',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_102',
    type: 'expense',
    amount: -15.00,
    description: 'Envio de amostra de produto',
    category: 'Produtos',
    status: 'completed',
    date: new Date('2024-01-15T11:45:00'),
    referenceId: 'ship_457',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_103',
    type: 'expense',
    amount: -22.25,
    description: 'Envio de protótipo',
    category: 'Produtos',
    status: 'pending',
    date: new Date('2024-01-15T09:20:00'),
    referenceId: 'ship_458',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_104',
    type: 'expense',
    amount: -12.75,
    description: 'Envio de documentos fiscais',
    category: 'Documentos',
    status: 'completed',
    date: new Date('2024-01-15T08:10:00'),
    referenceId: 'ship_459',
    paymentMethod: 'PIX',
  },
  {
    id: 'txn_105',
    type: 'expense',
    amount: -14.00,
    description: 'Envio de material de escritório',
    category: 'Outros',
    status: 'completed',
    date: new Date('2024-01-14T16:30:00'),
    referenceId: 'ship_460',
    paymentMethod: 'PIX',
  },
];

const mockStatsCourier: FinancialStats = {
  totalEarnings: 1250.50,
  pendingPayments: 45.50,
  totalPayouts: 320.50,
  availableBalance: 450.30,
  avgEarningsPerDelivery: 18.20,
  monthlyTrend: 12.5,
  transactionsCount: 23,
};

const mockStatsCompany: FinancialStats = {
  totalSpent: 875.25,
  pendingExpenses: 35.00,
  avgCostPerShipment: 17.85,
  budgetUsed: 875.25,
  budgetLimit: 2000.00,
  monthlyTrend: -5.2,
  transactionsCount: 49,
};

const periodFilters = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
  { key: 'all', label: 'Tudo' },
];

const categoryFilters = [
  { key: 'all', label: 'Todas' },
  { key: 'delivery', label: 'Entregas' },
  { key: 'payout', label: 'Saques' },
  { key: 'documents', label: 'Documentos' },
  { key: 'products', label: 'Produtos' },
];

const statusFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'processing', label: 'Processando' },
];

export default function FinanceScreen({ userType }: FinanceScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [activePeriod, setActivePeriod] = useState('month');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para saque (apenas para entregadores)
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
      // Simular chamada API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mock baseados no tipo de usuário
      if (userType === 'courier') {
        setTransactions(mockTransactionsCourier);
        setStats(mockStatsCourier);
      } else {
        setTransactions(mockTransactionsCompany);
        setStats(mockStatsCompany);
      }
      
      // Aplicar filtros iniciais
      applyFilters(
        userType === 'courier' ? mockTransactionsCourier : mockTransactionsCompany,
        'month',
        'all',
        'all',
        ''
      );
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados financeiros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (
    transactionsList: Transaction[],
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
      case 'expense': return 'trending-down';
      case 'payout': return 'account-balance-wallet';
      case 'deposit': return 'add-circle';
      default: return 'receipt';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return '#10b981';
      case 'expense': return '#ef4444';
      case 'payout': return '#8b5cf6';
      case 'deposit': return '#0A66C2';
      default: return colors.text;
    }
  };

  const handleWithdraw = async () => {
    if (userType !== 'courier') return;
    
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Validação', 'Informe um valor válido para saque');
      return;
    }
    
    if (!withdrawPixKey) {
      Alert.alert('Validação', 'Informe sua chave PIX');
      return;
    }
    
    if (parseFloat(withdrawAmount) > (stats?.availableBalance || 0)) {
      Alert.alert('Validação', 'Valor de saque superior ao saldo disponível');
      return;
    }
    
    setWithdrawLoading(true);
    try {
      // Simular requisição de saque
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(
        'Saque Solicitado', 
        `Saque de ${formatCurrency(parseFloat(withdrawAmount))} solicitado com sucesso!
Será processado em até 1 dia útil.`,
        [{ text: 'OK', onPress: () => setShowWithdrawModal(false) }]
      );
      
      // Resetar formulário
      setWithdrawAmount('');
      setWithdrawPixKey('');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao solicitar saque. Tente novamente.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleExportReport = () => {
    Alert.alert(
      'Exportar Relatório',
      'Esta função exportará um relatório detalhado das transações no formato selecionado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'PDF', onPress: () => Alert.alert('Info', 'Exportação em PDF solicitada') },
        { text: 'Excel', onPress: () => Alert.alert('Info', 'Exportação em Excel solicitada') },
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
            {userType === 'courier' ? 'Financeiro - Entregador' : 'Financeiro - Empresa'}
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            Acompanhe suas finanças
          </Text>
        </View>
      </View>

      {/* Cards de Resumo */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryCardsContainer}
        style={styles.summaryCardsScrollView}
      >
        {userType === 'courier' ? (
          <>
            <Card style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
            
            <Card style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
            
            <Card style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
          </>
        ) : (
          <>
            <Card style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.summaryCardHeader}>
                <MaterialIcons name="shopping-cart" size={24} color={colors.tint} />
                <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
                  Total Gasto
                </Text>
              </View>
              <Text style={[styles.summaryCardValue, { color: colors.text }]}>
                {formatCurrency(stats?.totalSpent || 0)}
              </Text>
              <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
                Média: {formatCurrency(stats?.avgCostPerShipment || 0)}/envio
              </Text>
            </Card>
            
            <Card style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.summaryCardHeader}>
                <MaterialIcons name="hourglass-empty" size={24} color="#f59e0b" />
                <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
                </Text>
              </View>
              <Text style={[styles.summaryCardValue, { color: colors.text }]}>
                {formatCurrency(stats?.pendingExpenses || 0)}
              </Text>
              <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
                Despesas pendentes
              </Text>
            </Card>
            
            <Card style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.summaryCardHeader}>
                <MaterialIcons name="pie-chart" size={24} color="#0A66C2" />
                <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
                  Orçamento
                </Text>
              </View>
              <Text style={[styles.summaryCardValue, { color: colors.text }]}>
                {((stats?.budgetUsed || 0) / (stats?.budgetLimit || 1) * 100).toFixed(1)}%
              </Text>
              <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
                {formatCurrency(stats?.budgetUsed || 0)} de {formatCurrency(stats?.budgetLimit || 0)}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Ações Rápidas (apenas para entregadores) */}
      {userType === 'courier' && (
        <View style={styles.quickActions}>
          <Button
            title="Solicitar Saque"
            onPress={() => setShowWithdrawModal(true)}
            variant="primary"
            fullWidth
            icon={<MaterialIcons name="account-balance" size={16} color="#ffffff" />}
          />
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filtersSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScrollView}
        >
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.tabIconDefault }]}>
              Período:
            </Text>
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
          
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.tabIconDefault }]}>
              Status:
            </Text>
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
        
        <ScrollView
          style={styles.transactionsList}
          contentContainerStyle={styles.transactionsContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <Card 
                key={transaction.id} 
                style={[styles.transactionCard, { backgroundColor: colors.background, borderColor: colors.border }]}
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
                          color: transaction.type === 'income' || transaction.type === 'deposit' 
                            ? '#10b981' 
                            : transaction.type === 'payout' 
                              ? '#8b5cf6' 
                              : '#ef4444'
                        }
                      ]}
                    >
                      {transaction.type === 'expense' || transaction.type === 'payout' ? '-' : '+'}
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
                </View>
              </Card>
            ))
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: colors.background }]}>
              <MaterialIcons name="receipt" size={48} color={colors.tabIconDefault} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma transação encontrada
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
                Não há transações que correspondam aos filtros selecionados
              </Text>
            </Card>
          )}
        </ScrollView>
      </View>

      {/* Modal de Saque (apenas para entregadores) */}
      {userType === 'courier' && (
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
      )}
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
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  filtersScrollView: {
    maxHeight: 80,
  },
  filtersContainer: {
    gap: 12,
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
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsContent: {
    gap: 12,
    paddingBottom: 20,
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