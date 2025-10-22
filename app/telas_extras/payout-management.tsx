import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminConfigService } from '@/services/admin-config.service';
import { authService } from '@/services/auth.service';
import { payoutService } from '@/services/payout.service';
import { Payout, PayoutAllocation, PayoutStatus } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PayoutManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Painel Entregador
  const [availableBalance, setAvailableBalance] = useState(0);
  const [payoutsList, setPayoutsList] = useState<Payout[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [nomeTitular, setNomeTitular] = useState('');
  const [taxaCalc, setTaxaCalc] = useState({
    percentualDesconto: 5,
    valorDesconto: 0,
    valorComDesconto: 0,
  });
  const [isImmediateWithdraw, setIsImmediateWithdraw] = useState(false);
  const [allocations, setAllocations] = useState<PayoutAllocation[]>([]);
  const [estTotals, setEstTotals] = useState({ requested: 0, allocated: 0, fee: 0, net: 0 });
  const [estPercent, setEstPercent] = useState(0);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocSelected, setAllocSelected] = useState<PayoutAllocation | null>(null);

  // Painel Admin
  const [allPayouts, setAllPayouts] = useState<Payout[]>([]);
  const [feeConfig, setFeeConfig] = useState({ feeImmediate: 10, feeDelayed: 5 });
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [newFeeImmediate, setNewFeeImmediate] = useState('10');
  const [newFeeDelayed, setNewFeeDelayed] = useState('5');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<PayoutStatus | 'all'>('all');

  // Inicializar dados
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const session = await authService.getCurrentUserData();
      if (session) {
        setUserId(session.id);
        setUserName(session.nome);
        
        if (session.role === 'courier') {
          setUserRole('courier');
          await loadCourierData(session.id);
        } else if (session.isAdmin === true) {
          setUserRole('admin');
          await loadAdminData();
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourierData = async (courierUid: string) => {
    try {
      const balance = await payoutService.getAvailableBalance(courierUid);
      setAvailableBalance(balance);

      const payouts = await payoutService.getPayoutsByCourier(courierUid);
      setPayoutsList(payouts);

      const config = await adminConfigService.getPayoutFeeConfig();
      setFeeConfig(config);
    } catch (error) {
      console.error('Error loading courier data:', error);
    }
  };

  const loadAdminData = async () => {
    try {
      const payouts = await payoutService.getPayoutsForAdmin();
      setAllPayouts(payouts);

      const config = await adminConfigService.getPayoutFeeConfig();
      setFeeConfig(config);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userRole === 'courier' && userId) {
      await loadCourierData(userId);
    } else if (userRole === 'admin' || userRole === 'courier') {
      await loadAdminData();
    }
    setRefreshing(false);
  };

  // ============ PAINEL ENTREGADOR ============

  const handleWithdrawAmountChange = async (value: string) => {
    setWithdrawAmount(value);
    const amount = parseFloat(value); // valor em REAIS
    if (!isNaN(amount) && amount > 0) {
      try {
        if (userId) {
          const estimate = await payoutService.estimatePayoutFees(userId, +amount.toFixed(2));
          setAllocations(estimate.allocations);
          setEstTotals(estimate.totals);
          const perc = estimate.totals.allocated > 0 ? (estimate.totals.fee / estimate.totals.allocated) * 100 : 0;
          setEstPercent(+perc.toFixed(2));
          setTaxaCalc({
            percentualDesconto: +perc.toFixed(2),
            valorDesconto: estimate.totals.fee,
            valorComDesconto: estimate.totals.net,
          });
        }
      } catch (e) {
        console.warn('Estimate fees error', e);
        setAllocations([]);
        setEstTotals({ requested: amount, allocated: 0, fee: 0, net: 0 });
        setEstPercent(0);
        setTaxaCalc({ percentualDesconto: isImmediateWithdraw ? 10 : 5, valorDesconto: 0, valorComDesconto: 0 });
      }
    } else {
      setTaxaCalc({ percentualDesconto: isImmediateWithdraw ? 10 : 5, valorDesconto: 0, valorComDesconto: 0 });
      setAllocations([]);
      setEstTotals({ requested: 0, allocated: 0, fee: 0, net: 0 });
      setEstPercent(0);
    }
  };

  const formatCurrency = (reais: number) => {
    return `R$ ${(+reais).toFixed(2).replace('.', ',')}`;
  };

  const handleRequestWithdraw = async () => {
    if (!userId) return;

    if (!withdrawAmount || !chavePix || !nomeTitular) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const amount = parseFloat(withdrawAmount); // valor em REAIS
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Valor inválido');
      return;
    }

    if (amount > availableBalance) {
      Alert.alert('Erro', 'Saldo insuficiente');
      return;
    }

    try {
      setIsSubmitting(true);
      await payoutService.createPayoutRequest(
        userId,
        +amount.toFixed(2),
        chavePix,
        nomeTitular,
        isImmediateWithdraw
      );

      Alert.alert('Sucesso', 'Solicitação de saque criada!');
      setWithdrawAmount('');
      setChavePix('');
      setNomeTitular('');
      setTaxaCalc({ percentualDesconto: 5, valorDesconto: 0, valorComDesconto: 0 });

      // Recarregar dados
      await loadCourierData(userId);
    } catch (error) {
      console.error('Error requesting withdraw:', error);
      Alert.alert('Erro', 'Falha ao solicitar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: PayoutStatus) => {
    switch (status) {
      case 'PENDING':
        return '#f59e0b';
      case 'PROCESSING':
        return '#3b82f6';
      case 'APPROVED':
        return '#10b981';
      case 'CANCELLED':
        return '#ef4444';
      case 'FAILED':
        return '#dc2626';
      default:
        return colors.text;
    }
  };

  const getStatusLabel = (status: PayoutStatus) => {
    const labels: Record<PayoutStatus, string> = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      APPROVED: 'Aprovado',
      CANCELLED: 'Cancelado',
      FAILED: 'Falhou',
    };
    return labels[status] || status;
  };

  const renderPayoutCard = (payout: Payout) => (
    <Card
      key={payout.id}
      style={{ marginBottom: 12, backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.payoutValue, { color: colors.text }]}>
              {formatCurrency(payout.valor)}
            </Text>
            <Text style={[styles.payoutLabel, { color: colors.textSecondary }]}>
              Taxa: {payout.percentualDesconto}% ({formatCurrency(payout.valorDesconto)})
            </Text>
            <Text style={[styles.payoutLabel, { color: colors.textSecondary }]}>
              Recebível: {formatCurrency(payout.valorComDesconto)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(payout.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
              {getStatusLabel(payout.status)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>
              Chave PIX: {payout.chavePix}
            </Text>
            <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>
              Titular: {payout.nomeTitular}
            </Text>
          </View>
          {payout.mensagemAdmin && (
            <View style={[styles.adminMessageBox, { backgroundColor: colors.background }]}>
              <MaterialIcons name="info" size={16} color="#f59e0b" />
              <Text style={[styles.adminMessage, { color: '#f59e0b' }]}>
                {payout.mensagemAdmin}
              </Text>
            </View>
          )}
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
            {new Date(payout.createdAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    </Card>
  );

  const courierPanel = () => (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        {/* Card de Saldo */}
        <Card style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.balanceContent}>
            <View>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                Saldo Disponível
              </Text>
              <Text style={[styles.balanceValue, { color: '#10b981' }]}>
                {formatCurrency(availableBalance)}
              </Text>
            </View>
            <MaterialIcons name="account-balance-wallet" size={40} color="#10b981" />
          </View>
        </Card>

        {/* Formulário de Saque */}
        <Card style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.formContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Solicitar Saque
            </Text>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Valor (R$)</Text>
              <Input
                value={withdrawAmount}
                onChangeText={handleWithdrawAmountChange}
                placeholder="0,00"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Visualização de Taxa */}
            {parseFloat(withdrawAmount) > 0 && (
              <View style={[styles.taxCalculation, { backgroundColor: colors.background }]}>
                <View style={styles.taxRow}>
                  <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                    Valor Original:
                  </Text>
                  <Text style={[styles.taxValue, { color: colors.text }]}>
                    {formatCurrency(parseFloat(withdrawAmount) || 0)}
                  </Text>
                </View>
                <View style={styles.taxRow}>
                  <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                    Taxa aplicada ({estPercent}%):
                  </Text>
                  <Text style={[styles.taxValue, { color: '#ef4444' }]}>
                    -{formatCurrency(taxaCalc.valorDesconto)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.taxRow,
                    styles.taxRowTotal,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.taxLabel, { color: colors.text, fontWeight: 'bold' }]}>
                    Você Receberá:
                  </Text>
                  <Text style={[styles.taxValue, { color: '#10b981', fontWeight: 'bold' }]}>
                    {formatCurrency(taxaCalc.valorComDesconto)}
                  </Text>
                </View>
              </View>
            )}

            {/* Breakdown das Alocações */}
            {allocations.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Detalhamento do Cálculo</Text>
                <Card style={[{ marginTop: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={{ padding: 12, gap: 8 }}>
                    {allocations.map((a, idx) => (
                      <TouchableOpacity
                        key={`${a.paymentId}-${idx}`}
                        activeOpacity={0.7}
                        onPress={() => { setAllocSelected(a); setShowAllocModal(true); }}
                        style={{ borderBottomWidth: idx < allocations.length - 1 ? 1 : 0, borderBottomColor: colors.border, paddingBottom: 8 }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={[styles.taxLabel, { color: colors.text }]}>Alocado</Text>
                          <Text style={[styles.taxValue, { color: colors.text }]}>{formatCurrency(a.allocated)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Idade (dias)</Text>
                          <Text style={[styles.taxValue, { color: colors.textSecondary }]}>{a.ageDays}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Taxa (%)</Text>
                          <Text style={[styles.taxValue, { color: colors.textSecondary }]}>{a.feePercent}%</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={[styles.taxLabel, { color: '#ef4444' }]}>Taxa (R$)</Text>
                          <Text style={[styles.taxValue, { color: '#ef4444' }]}>{formatCurrency(a.feeAmount)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={[styles.taxLabel, { color: '#10b981' }]}>Líquido</Text>
                          <Text style={[styles.taxValue, { color: '#10b981' }]}>{formatCurrency(a.netAmount)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    <View style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.taxLabel, { color: colors.text, fontWeight: 'bold' }]}>Valor Pedido</Text>
                        <Text style={[styles.taxValue, { color: colors.text, fontWeight: 'bold' }]}>{formatCurrency(estTotals.requested)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.taxLabel, { color: colors.text, fontWeight: 'bold' }]}>Total Alocado</Text>
                        <Text style={[styles.taxValue, { color: colors.text, fontWeight: 'bold' }]}>{formatCurrency(estTotals.allocated)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.taxLabel, { color: '#ef4444', fontWeight: 'bold' }]}>Total Taxa</Text>
                        <Text style={[styles.taxValue, { color: '#ef4444', fontWeight: 'bold' }]}>{formatCurrency(estTotals.fee)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.taxLabel, { color: '#10b981', fontWeight: 'bold' }]}>Total Líquido</Text>
                        <Text style={[styles.taxValue, { color: '#10b981', fontWeight: 'bold' }]}>{formatCurrency(estTotals.net)}</Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </View>
            )}

            {/* Toggle de Saque Imediato */}
            <TouchableOpacity
              onPress={() => {
                setIsImmediateWithdraw(!isImmediateWithdraw);
                handleWithdrawAmountChange(withdrawAmount);
              }}
              style={[
                styles.immediateToggle,
                {
                  backgroundColor: isImmediateWithdraw ? '#dbeafe' : colors.background,
                  borderColor: isImmediateWithdraw ? '#3b82f6' : colors.border,
                },
              ]}
            >
              <MaterialIcons
                name={isImmediateWithdraw ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={isImmediateWithdraw ? '#3b82f6' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.immediateToggleText,
                  { color: isImmediateWithdraw ? '#3b82f6' : colors.text },
                ]}
              >
                A taxa é calculada pela idade dos recebíveis (≤1d 10% → 30d 5%)
              </Text>
            </TouchableOpacity>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Chave PIX *</Text>
              <Input
                value={chavePix}
                onChangeText={setChavePix}
                placeholder="CPF, Email, Telefone ou Aleatória"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Nome Titular da Conta *
              </Text>
              <Input
                value={nomeTitular}
                onChangeText={setNomeTitular}
                placeholder="Seu nome completo"
              />
            </View>

            <Button
              title={isSubmitting ? 'Processando...' : 'Solicitar Saque'}
              onPress={handleRequestWithdraw}
              disabled={isSubmitting || !withdrawAmount || !chavePix || !nomeTitular}
              variant="primary"
              style={{ marginTop: 20 }}
            />
          </View>
        </Card>

        {/* Histórico de Saques */}
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            Histórico de Saques
          </Text>
          {payoutsList.length === 0 ? (
            <Card style={[{ backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Nenhum saque ainda
              </Text>
            </Card>
          ) : (
            payoutsList.map(renderPayoutCard)
          )}
        </View>
      </View>
    </ScrollView>
  );

  // ============ PAINEL ADMIN ============

  const handleUpdatePayoutStatus = async (newStatus: PayoutStatus) => {
    if (!selectedPayout) return;

    try {
      setIsSubmitting(true);
      await payoutService.updatePayoutStatus(
        selectedPayout.id,
        newStatus,
        adminMessage || undefined
      );

      Alert.alert('Sucesso', `Saque atualizado para ${getStatusLabel(newStatus)}`);
      setShowStatusModal(false);
      setAdminMessage('');
      setSelectedPayout(null);
      await loadAdminData();
    } catch (error) {
      console.error('Error updating payout status:', error);
      Alert.alert('Erro', 'Falha ao atualizar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFees = async () => {
    try {
      setIsSubmitting(true);
      const immediateFee = parseInt(newFeeImmediate);
      const delayedFee = parseInt(newFeeDelayed);

      if (isNaN(immediateFee) || isNaN(delayedFee)) {
        Alert.alert('Erro', 'Valores inválidos');
        return;
      }

      await adminConfigService.updatePayoutFeeConfig(immediateFee, delayedFee);
      Alert.alert('Sucesso', 'Taxas atualizadas com sucesso');
      setShowFeeModal(false);
      setFeeConfig({ feeImmediate: immediateFee, feeDelayed: delayedFee });
    } catch (error) {
      console.error('Error updating fee config:', error);
      Alert.alert('Erro', 'Falha ao atualizar taxas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdminPayouts = allPayouts.filter(
    p => filterStatus === 'all' || p.status === filterStatus
  );

  const adminStats = {
    total: allPayouts.length,
    pending: allPayouts.filter(p => p.status === 'PENDING').length,
    processing: allPayouts.filter(p => p.status === 'PROCESSING').length,
    approved: allPayouts.filter(p => p.status === 'APPROVED').length,
    totalPending: allPayouts
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.valor, 0),
    totalApproved: allPayouts
      .filter(p => p.status === 'APPROVED')
      .reduce((sum, p) => sum + p.valor, 0),
  };

  const renderAdminPayoutCard = (payout: Payout) => (
    <TouchableOpacity
      key={payout.id}
      onPress={() => {
        setSelectedPayout(payout);
        setShowStatusModal(true);
      }}
      activeOpacity={0.7}
    >
      <Card
        style={{
          marginBottom: 12,
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.courierName, { color: colors.text }]}>
                {payout.courierUid}
              </Text>
              <Text style={[styles.payoutValue, { color: colors.text }]}>
                {formatCurrency(payout.valor)}
              </Text>
              <Text style={[styles.payoutLabel, { color: colors.textSecondary }]}>
                Chave: {payout.chavePix} • {payout.nomeTitular}
              </Text>
              <Text style={[styles.payoutLabel, { color: colors.textSecondary }]}>
                Taxa: {payout.percentualDesconto}% → {formatCurrency(payout.valorComDesconto)}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(payout.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
                {getStatusLabel(payout.status)}
              </Text>
            </View>
          </View>
          {payout.mensagemAdmin && (
            <View style={[styles.adminMessageBox, { backgroundColor: colors.background, marginTop: 12 }]}>
              <MaterialIcons name="info" size={16} color="#f59e0b" />
              <Text style={[styles.adminMessage, { color: '#f59e0b' }]}>
                {payout.mensagemAdmin}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const adminPanel = () => (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        {/* Card de Configuração de Taxas */}
        <Card style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.configContent}>
            <View>
              <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
                Taxas de Saque
              </Text>
              <Text style={[styles.configValue, { color: colors.text }]}>
                Imediato: {feeConfig.feeImmediate}% | Após 30 dias: {feeConfig.feeDelayed}%
              </Text>
            </View>
            <Button
              title="Editar"
              onPress={() => {
                setNewFeeImmediate(String(feeConfig.feeImmediate));
                setNewFeeDelayed(String(feeConfig.feeDelayed));
                setShowFeeModal(true);
              }}
              variant="secondary"
              size="sm"
            />
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.statNumber, { color: '#b45309' }]}>
                {adminStats.pending}
              </Text>
              <Text style={[styles.statLabel, { color: '#b45309' }]}>
                Pendentes
              </Text>
              <Text style={[styles.statValue, { color: '#b45309' }]}>
                {formatCurrency(adminStats.totalPending)}
              </Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.statNumber, { color: '#166534' }]}>
                {adminStats.approved}
              </Text>
              <Text style={[styles.statLabel, { color: '#166534' }]}>
                Aprovados
              </Text>
              <Text style={[styles.statValue, { color: '#166534' }]}>
                {formatCurrency(adminStats.totalApproved)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Filtro de Status */}
        <View style={styles.filterContainer}>
          {(['all', 'PENDING', 'PROCESSING', 'APPROVED', 'CANCELLED', 'FAILED'] as const).map(status => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status as PayoutStatus | 'all')}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterStatus === status ? '#3b82f6' : colors.card,
                  borderColor: filterStatus === status ? '#3b82f6' : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: filterStatus === status ? '#ffffff' : colors.text },
                ]}
              >
                {status === 'all' ? 'Todos' : getStatusLabel(status as PayoutStatus)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista de Saques */}
        {filteredAdminPayouts.length === 0 ? (
          <Card style={[{ backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Nenhum saque com este status
            </Text>
          </Card>
        ) : (
          <View>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              Saques ({filteredAdminPayouts.length})
            </Text>
            <FlatList
              data={filteredAdminPayouts}
              renderItem={({ item }) => renderAdminPayoutCard(item)}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!userRole) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Usuário não autenticado
        </Text>
      </View>
    );
  }

  if (userRole === 'courier') {
    return (
      <>
        {courierPanel()}

        {/* Modal de Status (Admin) - não será exibido para courier */}
        <Modal visible={showAllocModal} transparent animationType="fade" onRequestClose={() => setShowAllocModal(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}> 
              <Text style={[styles.modalTitle, { color: colors.text }]}>Detalhes da Alocação</Text>
              {allocSelected && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.payoutDetail, { color: colors.textSecondary }]}>Data base: {allocSelected.deliveredAt ? new Date(allocSelected.deliveredAt).toLocaleDateString('pt-BR') : '-'}</Text>
                  <Text style={[styles.payoutDetail, { color: colors.textSecondary }]}>Shipment: {allocSelected.shipmentId || '-'}</Text>
                  <Text style={[styles.payoutDetail, { color: colors.textSecondary }]}>Payment: oculto</Text>
                  <Text style={[styles.payoutDetail, { color: colors.text }]}>Alocado: {formatCurrency(allocSelected.allocated)}</Text>
                  <Text style={[styles.payoutDetail, { color: colors.text }]}>Idade (dias): {allocSelected.ageDays}</Text>
                  <Text style={[styles.payoutDetail, { color: colors.text }]}>Taxa: {allocSelected.feePercent}%</Text>
                  <Text style={[styles.payoutDetail, { color: '#ef4444' }]}>Taxa (R$): {formatCurrency(allocSelected.feeAmount)}</Text>
                  <Text style={[styles.payoutDetail, { color: '#10b981' }]}>Líquido: {formatCurrency(allocSelected.netAmount)}</Text>
                </View>
              )}
              <View style={styles.modalButtons}>
                <Button title="Fechar" onPress={() => setShowAllocModal(false)} variant="secondary" fullWidth />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (userRole === 'admin') {
    return (
      <>
        {adminPanel()}

        {/* Modal de Edição de Taxas */}
        <Modal visible={showFeeModal} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Editar Taxas de Saque
              </Text>

              <View style={{ marginTop: 16 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Taxa Imediato (%)
                </Text>
                <Input
                  value={newFeeImmediate}
                  onChangeText={setNewFeeImmediate}
                  keyboardType="number-pad"
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Taxa Aṕos 30 dias (%)
                </Text>
                <Input
                  value={newFeeDelayed}
                  onChangeText={setNewFeeDelayed}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancelar"
                  onPress={() => setShowFeeModal(false)}
                  variant="secondary"
                />
                <Button
                  title={isSubmitting ? 'Salvando...' : 'Salvar'}
                  onPress={handleUpdateFees}
                  disabled={isSubmitting}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Atualização de Status */}
        <Modal visible={showStatusModal} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Gerenciar Saque
              </Text>

              {selectedPayout && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.payoutDetail, { color: colors.text }]}>
                    Entregador: {selectedPayout.courierUid}
                  </Text>
                  <Text style={[styles.payoutDetail, { color: colors.text }]}>
                    Valor: {formatCurrency(selectedPayout.valor)}
                  </Text>
                  <Text style={[styles.payoutDetail, { color: colors.text }]}>
                    Status: {getStatusLabel(selectedPayout.status)}
                  </Text>
                </View>
              )}

              <View style={{ marginTop: 16 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Mensagem para Entregador
                </Text>
                <TextInput
                  value={adminMessage}
                  onChangeText={setAdminMessage}
                  placeholder="Ex: Chave PIX inválida"
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textAreaInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                />
              </View>

              <View style={styles.statusButtonsContainer}>
                {(['PENDING', 'PROCESSING', 'APPROVED', 'CANCELLED', 'FAILED'] as const).map(
                  status => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => handleUpdatePayoutStatus(status)}
                      disabled={isSubmitting || selectedPayout?.status === status}
                      style={[
                        styles.statusActionButton,
                        {
                          backgroundColor:
                            selectedPayout?.status === status
                              ? colors.border
                              : getStatusColor(status) + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusActionText,
                          {
                            color:
                              selectedPayout?.status === status
                                ? colors.textSecondary
                                : getStatusColor(status),
                          },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Fechar"
                  onPress={() => {
                    setShowStatusModal(false);
                    setSelectedPayout(null);
                    setAdminMessage('');
                  }}
                  variant="secondary"
                  fullWidth
                />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorText, { color: colors.text }]}>
        Acesso não permitido para este usuário
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: StatusBar.currentHeight ?? StatusBar.currentHeight ? 20 : 0,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  balanceCard: {
    marginBottom: 20,
    borderWidth: 1,
  },
  balanceContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  formCard: {
    marginBottom: 24,
    borderWidth: 1,
  },
  formContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  taxCalculation: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxRowTotal: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 0,
  },
  taxLabel: {
    fontSize: 14,
  },
  taxValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  immediateToggle: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  immediateToggleText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  payoutValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  payoutLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 6,
  },
  adminMessage: {
    fontSize: 11,
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyMessage: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  configCard: {
    marginBottom: 20,
    borderWidth: 1,
  },
  configContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  configValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  courierName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  payoutDetail: {
    fontSize: 13,
    marginBottom: 8,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  statusActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
