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

// Tipos para transações financeiras de empresa
interface CompanyTransaction {
  id: string;
  type: 'expense' | 'subscription' | 'refund';
  amount: number;
  description: string;
  category: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  date: Date;
  referenceId?: string; // ID do envio relacionado
  paymentMethod?: string; // PIX, Cartão, Boleto, etc.
  notes?: string;
  invoiceNumber?: string; // Número da nota fiscal
}

// Tipos para estatísticas financeiras de empresa
interface CompanyFinancialStats {
  totalSpent: number;
  pendingExpenses: number;
  avgCostPerShipment: number;
  budgetUsed: number;
  budgetLimit: number;
  monthlyTrend: number; // Porcentagem de mudança em relação ao mês anterior
  transactionsCount: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  monthlySpending: { month: string; amount: number }[];
}

// Dados mock para demonstração
const mockTransactions: CompanyTransaction[] = [
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
    invoiceNumber: 'INV-2024-001',
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
    invoiceNumber: 'INV-2024-002',
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
    invoiceNumber: 'INV-2024-003',
  },
  {
    id: 'txn_105',
    type: 'subscription',
    amount: -99.90,
    description: 'Plano mensal Premium',
    category: 'Assinatura',
    status: 'completed',
    date: new Date('2024-01-01T00:00:00'),
    paymentMethod: 'Cartão',
    invoiceNumber: 'INV-SUB-001',
  },
  {
    id: 'txn_106',
    type: 'expense',
    amount: -14.00,
    description: 'Envio de material de escritório',
    category: 'Outros',
    status: 'completed',
    date: new Date('2024-01-14T16:30:00'),
    referenceId: 'ship_460',
    paymentMethod: 'PIX',
    invoiceNumber: 'INV-2024-004',
  },
  {
    id: 'txn_107',
    type: 'expense',
    amount: -25.50,
    description: 'Envio de equipamentos eletrônicos',
    category: 'Produtos',
    status: 'processing',
    date: new Date('2024-01-13T14:20:00'),
    referenceId: 'ship_461',
    paymentMethod: 'Boleto',
  },
  {
    id: 'txn_108',
    type: 'refund',
    amount: 5.00,
    description: 'Reembolso por problema na entrega',
    category: 'Reembolso',
    status: 'completed',
    date: new Date('2024-01-12T11:15:00'),
    referenceId: 'ship_455',
    paymentMethod: 'PIX',
    invoiceNumber: 'INV-REF-001',
  },
];

const mockStats: CompanyFinancialStats = {
  totalSpent: 1875.25,
  pendingExpenses: 35.00,
  avgCostPerShipment: 17.85,
  budgetUsed: 1875.25,
  budgetLimit: 2000.00,
  monthlyTrend: -5.2,
  transactionsCount: 49,
  topCategories: [
    { category: 'Documentos', amount: 645.20, percentage: 34.4 },
    { category: 'Produtos', amount: 820.80, percentage: 43.8 },
    { category: 'Assinatura', amount: 99.90, percentage: 5.3 },
    { category: 'Outros', amount: 241.00, percentage: 12.9 },
    { category: 'Reembolso', amount: -5.00, percentage: -0.3 },
  ],
  monthlySpending: [
    { month: 'Jan', amount: 1875.25 },
    { month: 'Fev', amount: 1620.50 },
    { month: 'Mar', amount: 1980.75 },
    { month: 'Abr', amount: 1750.00 },
    { month: 'Mai', amount: 2100.25 },
    { month: 'Jun', amount: 1950.80 },
  ],
};

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
  { key: 'documents', label: 'Documentos' },
  { key: 'products', label: 'Produtos' },
  { key: 'subscription', label: 'Assinatura' },
  { key: 'others', label: 'Outros' },
  { key: 'refund', label: 'Reembolso' },
];

const statusFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'processing', label: 'Processando' },
  { key: 'failed', label: 'Falhou' },
];

export default function CompanyFinanceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [transactions, setTransactions] = useState<CompanyTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CompanyTransaction[]>([]);
  const [stats, setStats] = useState<CompanyFinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [activePeriod, setActivePeriod] = useState('month');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para orçamento
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);

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
      
      setTransactions(mockTransactions);
      setStats(mockStats);
      
      // Aplicar filtros iniciais
      applyFilters(mockTransactions, 'month', 'all', 'all', '');
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados financeiros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (
    transactionsList: CompanyTransaction[],
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
        t.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
        t.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
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
      case 'expense': return 'trending-down';
      case 'subscription': return 'receipt-long';
      case 'refund': return 'undo';
      default: return 'receipt';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expense': return '#ef4444';
      case 'subscription': return '#0A66C2';
      case 'refund': return '#10b981';
      default: return colors.text;
    }
  };

  const handleUpdateBudget = async () => {
    if (!newBudgetLimit || parseFloat(newBudgetLimit) <= 0) {
      Alert.alert('Validação', 'Informe um valor válido para o orçamento');
      return;
    }
    
    setBudgetLoading(true);
    try {
      // Simular atualização de orçamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(
        'Orçamento Atualizado', 
        `Orçamento mensal atualizado para ${formatCurrency(parseFloat(newBudgetLimit))}`,
        [{ text: 'OK', onPress: () => setShowBudgetModal(false) }]
      );
      
      // Resetar formulário
      setNewBudgetLimit('');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar orçamento. Tente novamente.');
    } finally {
      setBudgetLoading(false);
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

  const handleViewInvoice = (invoiceNumber: string) => {
    Alert.alert('Nota Fiscal', `Visualizando nota fiscal: ${invoiceNumber}`, [{ text: 'OK' }]);
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
            Financeiro - Empresa
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            Controle de gastos e orçamento
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
        
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.summaryCardHeader}>
            <MaterialIcons name="hourglass-empty" size={24} color="#f59e0b" />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Pendente
            </Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: colors.text }]}>
            {formatCurrency(stats?.pendingExpenses || 0)}
          </Text>
          <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
            Despesas aguardando pagamento
          </Text>
        </Card>
        
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
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
        
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.summaryCardHeader}>
            <MaterialIcons name="trending-down" size={24} color="#ef4444" />
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Tendência
            </Text>
          </View>
          <Text style={[styles.summaryCardValue, { color: colors.text }]}>
            {stats?.monthlyTrend.toFixed(1)}%
          </Text>
          <Text style={[styles.summaryCardSubtitle, { color: colors.tabIconDefault }]}>
            em relação ao mês anterior
          </Text>
        </Card>
      </ScrollView>

      {/* Gráfico de Gastos Mensais */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Evolução de Gastos
        </Text>
        <Card style={StyleSheet.flatten([styles.chartCard, { backgroundColor: colors.background }])}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Últimos 6 meses
            </Text>
            <Text style={[styles.chartTotal, { color: colors.text }]}>
              {formatCurrency(stats?.monthlySpending.reduce((sum, item) => sum + item.amount, 0) || 0)}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            {stats?.monthlySpending.map((item, index) => {
              const maxValue = Math.max(...(stats?.monthlySpending.map(i => i.amount) || [1]));
              return (
                <View key={index} style={styles.chartBarItem}>
                  <Text style={[styles.chartBarLabel, { color: colors.tabIconDefault }]}>
                    {item.month}
                  </Text>
                  <View style={styles.chartBarWrapper}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          height: `${(item.amount / maxValue) * 100}%`,
                          backgroundColor: colors.tint
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartBarValue, { color: colors.text }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Gastos por Categoria */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Gastos por Categoria
        </Text>
        <Card style={StyleSheet.flatten([styles.categoriesCard, { backgroundColor: colors.background }])}>
          {stats?.topCategories.map((category, index) => (
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

      {/* Ações Rápidas */}
      <View style={styles.quickActions}>
        <Button
          title="Atualizar Orçamento"
          onPress={() => setShowBudgetModal(true)}
          variant="secondary"
          icon={<MaterialIcons name="edit" size={16} color={colors.tint} />}
          style={styles.quickActionButton}
        />
        <Button
          title="Novo Envio"
          onPress={() => Alert.alert('Info', 'Funcionalidade em desenvolvimento')}
          variant="primary"
          icon={<MaterialIcons name="add" size={16} color="#ffffff" />}
          style={styles.quickActionButton}
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
                          color: transaction.type === 'refund' 
                            ? '#10b981' 
                            : '#ef4444'
                        }
                      ]}
                    >
                      {transaction.type === 'refund' ? '+' : '-'}
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
                  
                  {transaction.invoiceNumber && (
                    <TouchableOpacity 
                      style={styles.invoiceButton}
                      onPress={() => handleViewInvoice(transaction.invoiceNumber!)}
                    >
                      <MaterialIcons name="receipt" size={16} color={colors.tint} />
                      <Text style={[styles.invoiceButtonText, { color: colors.tint }]}>
                        NF
                      </Text>
                    </TouchableOpacity>
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

      {/* Modal de Orçamento */}
      <View style={[styles.modalBackdrop, showBudgetModal && styles.modalVisible]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Atualizar Orçamento Mensal
            </Text>
            <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.tabIconDefault} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.budgetInfo}>
              <Text style={[styles.budgetLabel, { color: colors.tabIconDefault }]}>
                Orçamento Atual
              </Text>
              <Text style={[styles.budgetValue, { color: colors.text }]}>
                {formatCurrency(stats?.budgetLimit || 0)}
              </Text>
            </View>
            
            <View style={styles.budgetInfo}>
              <Text style={[styles.budgetLabel, { color: colors.tabIconDefault }]}>
                Utilizado
              </Text>
              <Text style={[styles.budgetValue, { color: colors.text }]}>
                {formatCurrency(stats?.budgetUsed || 0)}
              </Text>
            </View>
            
            <View style={styles.budgetInfo}>
              <Text style={[styles.budgetLabel, { color: colors.tabIconDefault }]}>
                Disponível
              </Text>
              <Text style={[styles.budgetValue, { color: colors.text }]}>
                {formatCurrency((stats?.budgetLimit || 0) - (stats?.budgetUsed || 0))}
              </Text>
            </View>
            
            <Input
              label="Novo Valor do Orçamento *"
              placeholder="0,00"
              value={newBudgetLimit}
              onChangeText={setNewBudgetLimit}
              keyboardType="decimal-pad"
              leftIcon={<MaterialIcons name="attach-money" size={20} color={colors.tabIconDefault} />}
            />
            
            <View style={styles.budgetNote}>
              <MaterialIcons name="info" size={16} color="#0A66C2" />
              <Text style={[styles.budgetNoteText, { color: colors.tabIconDefault }]}>
                O orçamento será resetado no início de cada mês. Configure um valor que represente 
                seu limite ideal de gastos mensais.
              </Text>
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => setShowBudgetModal(false)}
              style={styles.modalButton}
            />
            <Button
              title="Atualizar"
              onPress={handleUpdateBudget}
              loading={budgetLoading}
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
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
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  invoiceButtonText: {
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
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  budgetNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  budgetNoteText: {
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