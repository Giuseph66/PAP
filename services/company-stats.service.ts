import { firestore } from '@/config/firebase';
import { Payment, Shipment, ShipmentState } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Interfaces para estatísticas e transações de empresa
export interface CompanyTransaction {
  id: string;
  type: 'expense' | 'subscription' | 'refund';
  amount: number;
  description: string;
  category: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  date: Date;
  referenceId?: string;
  paymentMethod?: string;
  notes?: string;
  invoiceNumber?: string;
}

export interface CompanyFinancialStats {
  totalSpent: number;
  pendingExpenses: number;
  avgCostPerShipment: number;
  budgetUsed: number;
  budgetLimit: number;
  monthlyTrend: number;
  transactionsCount: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  monthlySpending: { month: string; amount: number }[];
}

export interface CompanyStats {
  // Métricas de envio
  totalShipments: number;
  completedShipments: number;
  pendingShipments: number;
  cancelledShipments: number;
  avgDeliveryTime: number;
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

class CompanyStatsService {
  private shipmentsCollection = 'shipments';
  private paymentsCollection = 'payments';
  private usersCollection = 'authUsers';

  /**
   * Busca transações financeiras de uma empresa (baseado em envios pagos)
   */
  async getCompanyTransactions(clienteUid: string): Promise<CompanyTransaction[]> {
    try {
      if (!clienteUid || String(clienteUid).trim() === '') {
        return [];
      }
      // Busca todos os envios do cliente
      const shipmentsQuery = query(
        collection(firestore, this.shipmentsCollection),
        where('clienteUid', '==', clienteUid)
      );
      const shipmentsSnap = await getDocs(shipmentsQuery);

      // Busca pagamentos relacionados
      const paymentsQuery = query(
        collection(firestore, this.paymentsCollection),
        where('paidByUserId', '==', clienteUid)
      );
      const paymentsSnap = await getDocs(paymentsQuery);

      const transactions: CompanyTransaction[] = [];

      // Converte pagamentos em transações
      paymentsSnap.forEach((payDoc) => {
        const payment = payDoc.data() as Payment;
        const shipmentDoc = shipmentsSnap.docs.find(s => s.id === payment.shipmentId);
        const shipment = shipmentDoc?.data();

        const isCompleted =
          payment.status === 'CAPTURED' ||
          (payment as any).deliveryConfirmed === true ||
          (shipment as any)?.paymentPaid === true;

        let status: CompanyTransaction['status'] = isCompleted ? 'completed' : 'pending';
        if (payment.status === 'CONFIRMED' && !isCompleted) status = 'processing';
        if (payment.status === 'REFUNDED') status = 'failed';

        const createdAt = this.toDate((payment as any).createdAt);

        transactions.push({
          id: payDoc.id,
          type: payment.status === 'REFUNDED' ? 'refund' : 'expense',
          amount: payment.status === 'REFUNDED' ? payment.valor : -payment.valor,
          description: shipment 
            ? `Envio: ${(shipment as any).pickup?.endereco?.split(',')[0] || 'Endereço'} → ${(shipment as any).dropoff?.endereco?.split(',')[0] || 'Destino'}`
            : `Pagamento #${payDoc.id.substring(0, 8)}`,
          category: this.categorizeShipment(shipment as any),
          status,
          date: createdAt,
          referenceId: payment.shipmentId,
          paymentMethod: payment.metodo,
          invoiceNumber: status === 'completed' ? `INV-${payDoc.id.substring(0, 8).toUpperCase()}` : undefined,
        });
      });

      // Ordena por data (mais recente primeiro)
      return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Error getting company transactions:', error);
      throw new Error('Falha ao buscar transações financeiras');
    }
  }

  /**
   * Calcula estatísticas financeiras de uma empresa
   */
  async getFinancialStats(clienteUid: string, userBudgetLimitCentavos: number = 0): Promise<CompanyFinancialStats> {
    try {
      const transactions = await this.getCompanyTransactions(clienteUid);
      
      // Total gasto (valores negativos = gastos)
      const totalSpent = Math.abs(
        transactions
          .filter(t => t.amount < 0 && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0)
      );

      // Gastos pendentes
      const pendingExpenses = Math.abs(
        transactions
          .filter(t => t.amount < 0 && t.status === 'pending')
          .reduce((sum, t) => sum + t.amount, 0)
      );

      // Contagem de envios completados
      const completedShipments = transactions.filter(
        t => t.type === 'expense' && t.status === 'completed'
      ).length;

      const avgCostPerShipment = completedShipments > 0 
        ? totalSpent / completedShipments 
        : 0;

      // Gastos por categoria
      const categoryMap = new Map<string, number>();
      transactions
        .filter(t => t.status === 'completed')
        .forEach(t => {
          const current = categoryMap.get(t.category) || 0;
          categoryMap.set(t.category, current + Math.abs(t.amount));
        });

      const topCategories = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Gastos mensais (últimos 6 meses)
      const monthlySpending = this.calculateMonthlySpending(transactions, 6);

      // Tendência mensal (comparando último mês com anterior)
      const monthlyTrend = this.calculateMonthlyTrend(monthlySpending);

      return {
        totalSpent,
        pendingExpenses,
        avgCostPerShipment,
        budgetUsed: totalSpent,
        budgetLimit: (userBudgetLimitCentavos || 0) / 100,
        monthlyTrend,
        transactionsCount: transactions.length,
        topCategories,
        monthlySpending,
      };
    } catch (error) {
      console.error('Error getting financial stats:', error);
      throw new Error('Falha ao calcular estatísticas financeiras');
    }
  }

  /**
   * Calcula estatísticas completas de uma empresa
   */
  async getCompanyStats(clienteUid: string): Promise<CompanyStats> {
    try {
      // Busca todos os envios do cliente
      const shipmentsQuery = query(
        collection(firestore, this.shipmentsCollection),
        where('clienteUid', '==', clienteUid)
      );
      const shipmentsSnap = await getDocs(shipmentsQuery);

      const shipments = shipmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: this.toDate((doc.data() as any).createdAt),
        updatedAt: this.toDate((doc.data() as any).updatedAt),
      })) as Array<Shipment & { id: string }>;

      // Métricas de envio
      const totalShipments = shipments.length;
      const completedShipments = shipments.filter(s => s.state === 'DELIVERED').length;
      const pendingShipments = shipments.filter(s => 
        ['CREATED', 'PRICED', 'PAYMENT_PENDING', 'DISPATCHING', 'ASSIGNED'].includes(s.state)
      ).length;
      const cancelledShipments = shipments.filter(s => s.state === 'CANCELLED').length;

      // Tempo médio de entrega (em minutos)
      const deliveredShipments = shipments.filter(s => s.state === 'DELIVERED');
      const avgDeliveryTime = deliveredShipments.length > 0
        ? deliveredShipments.reduce((sum, s) => {
            const created = s.createdAt.getTime();
            const delivered = s.updatedAt.getTime();
            return sum + ((delivered - created) / 60000); // Converte ms para minutos
          }, 0) / deliveredShipments.length
        : 0;

      // Taxa de pontualidade (assumindo 90% se não houver dados de ETA)
      const onTimeRate = deliveredShipments.length > 0 ? 90.0 : 0;

      // Dados financeiros (não filtra por status, faremos a classificação no cliente)
      const paymentsQuery = query(
        collection(firestore, this.paymentsCollection),
        where('paidByUserId', '==', clienteUid)
      );
      const paymentsSnap = await getDocs(paymentsQuery);

      const totalSpent = paymentsSnap.docs.reduce((sum, docRef) => {
        const pay = docRef.data() as any;
        const ship = shipments.find(s => s.id === pay.shipmentId) as any;
        const isCompleted = pay.status === 'CAPTURED' || pay.deliveryConfirmed === true || ship?.paymentPaid === true;
        return isCompleted ? sum + (pay.valor || 0) : sum;
      }, 0);

      const avgCostPerShipment = completedShipments > 0 
        ? totalSpent / completedShipments 
        : 0;

      // Gastos mensais (últimos 8 meses)
      const monthlySpending = this.calculateMonthlySpendingArray(
        paymentsSnap.docs
          .map(docRef => {
            const pay = docRef.data() as any;
            const ship = shipments.find(s => s.id === pay.shipmentId) as any;
            const isCompleted = pay.status === 'CAPTURED' || pay.deliveryConfirmed === true || ship?.paymentPaid === true;
            return isCompleted
              ? { valor: pay.valor || 0, createdAt: this.toDate(pay.createdAt) }
              : null;
          })
          .filter((p): p is { valor: number; createdAt: Date } => p !== null),
        8
      );

      // Gastos por categoria
      const spendingByCategory = this.calculateSpendingByCategory(shipments, paymentsSnap.docs);

      // Horários de pico
      const peakHours = this.calculatePeakHours(shipments);

      // Áreas populares
      const popularAreas = this.calculatePopularAreas(shipments);

      // Tipos de pacote
      const packageTypes = this.calculatePackageTypes(shipments);

      // Frequência de uso
      const usageFrequency = this.calculateUsageFrequency(shipments);

      // Métricas de qualidade (valores mock por enquanto)
      const avgCourierRating = 4.5;
      const totalRatings = completedShipments;
      const complaintRate = 2.0;
      const customerSatisfaction = 92.0;

      // Envios recentes (últimos 5)
      const recentShipments = shipments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(s => {
          const payment = paymentsSnap.docs.find(p => p.data().shipmentId === s.id);
          return {
            id: s.id,
            description: `${s.pickup.endereco.split(',')[0]} → ${s.dropoff.endereco.split(',')[0]}`,
            amount: payment?.data().valor || 0,
            status: this.mapShipmentStatus(s.state),
            date: s.createdAt,
            courier: s.courierUid ? 'Entregador' : undefined,
            rating: s.state === 'DELIVERED' ? 5 : undefined,
          };
        });

      return {
        totalShipments,
        completedShipments,
        pendingShipments,
        cancelledShipments,
        avgDeliveryTime,
        onTimeRate,
        totalSpent,
        avgCostPerShipment,
        monthlySpending,
        spendingByCategory,
        peakHours,
        popularAreas,
        packageTypes,
        usageFrequency,
        avgCourierRating,
        totalRatings,
        complaintRate,
        customerSatisfaction,
        recentShipments,
      };
    } catch (error) {
      console.error('Error getting company stats:', error);
      throw new Error('Falha ao calcular estatísticas da empresa');
    }
  }

  // ========== Métodos auxiliares ==========

  private categorizeShipment(shipment: any): string {
    if (!shipment || !shipment.pacote) return 'Outros';
    
    const peso = shipment.pacote.pesoKg || 0;
    const dimensoes = shipment.pacote.dim;
    const volume = dimensoes ? dimensoes.c * dimensoes.l * dimensoes.a : 0;

    if (peso < 1 && volume < 100) return 'Documentos';
    if (peso < 5) return 'Produtos';
    if (peso < 20) return 'Alimentos';
    return 'Outros';
  }

  private calculateMonthlySpending(
    transactions: CompanyTransaction[],
    months: number
  ): { month: string; amount: number }[] {
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const monthlyData: { month: string; amount: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthNames[targetDate.getMonth()];
      
      const monthSpending = transactions
        .filter(t => {
          const tDate = t.date;
          return (
            t.status === 'completed' &&
            t.amount < 0 &&
            tDate.getMonth() === targetDate.getMonth() &&
            tDate.getFullYear() === targetDate.getFullYear()
          );
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      monthlyData.push({ month: monthName, amount: monthSpending });
    }

    return monthlyData;
  }

  private calculateMonthlyTrend(monthlySpending: { month: string; amount: number }[]): number {
    if (monthlySpending.length < 2) return 0;
    
    const lastMonth = monthlySpending[monthlySpending.length - 1].amount;
    const previousMonth = monthlySpending[monthlySpending.length - 2].amount;

    if (previousMonth === 0) return 0;
    return ((lastMonth - previousMonth) / previousMonth) * 100;
  }

  private calculateMonthlySpendingArray(
    payments: Array<{ valor: number; createdAt: Date }>,
    months: number
  ): number[] {
    const now = new Date();
    const monthlyData: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      const monthSpending = payments
        .filter(p => {
          const pDate = p.createdAt;
          return (
            pDate.getMonth() === targetDate.getMonth() &&
            pDate.getFullYear() === targetDate.getFullYear()
          );
        })
        .reduce((sum, p) => sum + p.valor, 0);

      monthlyData.push(monthSpending);
    }

    return monthlyData;
  }

  private calculateSpendingByCategory(
    shipments: Array<Shipment & { id: string }>,
    payments: any[]
  ): { category: string; amount: number; percentage: number }[] {
    const categoryMap = new Map<string, number>();

    payments.forEach(payDoc => {
      const payment = payDoc.data();
      const shipment = shipments.find(s => s.id === payment.shipmentId) as any;
      const isCompleted = payment.status === 'CAPTURED' || payment.deliveryConfirmed === true || shipment?.paymentPaid === true;
      if (!isCompleted) return;
      const category = this.categorizeShipment(shipment);
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + payment.valor);
    });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculatePeakHours(shipments: Array<Shipment & { id: string }>): { hour: number; shipments: number }[] {
    const hourMap = new Map<number, number>();

    shipments.forEach(s => {
      const hour = s.createdAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, shipments: count }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 4);
  }

  private calculatePopularAreas(shipments: Array<Shipment & { id: string }>): { area: string; shipments: number }[] {
    const areaMap = new Map<string, number>();

    shipments.forEach(s => {
      // Extrai a primeira parte do endereço (bairro/área)
      const area = s.dropoff.endereco.split(',')[0].trim() || 'Área Desconhecida';
      areaMap.set(area, (areaMap.get(area) || 0) + 1);
    });

    return Array.from(areaMap.entries())
      .map(([area, count]) => ({ area, shipments: count }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 4);
  }

  private calculatePackageTypes(shipments: Array<Shipment & { id: string }>): { type: string; count: number; percentage: number }[] {
    const typeMap = new Map<string, number>();

    shipments.forEach(s => {
      const peso = s.pacote?.pesoKg || 0;
      let type = 'Outro';
      
      if (peso < 1) type = 'Documento';
      else if (peso < 5) type = 'Pequeno';
      else if (peso < 10) type = 'Médio';
      else type = 'Grande';

      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const total = shipments.length;

    return Array.from(typeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateUsageFrequency(shipments: Array<Shipment & { id: string }>): 'daily' | 'weekly' | 'monthly' | 'occasionally' {
    if (shipments.length === 0) return 'occasionally';

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentShipments = {
      day: shipments.filter(s => s.createdAt >= dayAgo).length,
      week: shipments.filter(s => s.createdAt >= weekAgo).length,
      month: shipments.filter(s => s.createdAt >= monthAgo).length,
    };

    if (recentShipments.day >= 1) return 'daily';
    if (recentShipments.week >= 3) return 'weekly';
    if (recentShipments.month >= 5) return 'monthly';
    return 'occasionally';
  }

  private mapShipmentStatus(state: ShipmentState): 'completed' | 'pending' | 'cancelled' | 'in_transit' {
    switch (state) {
      case 'DELIVERED':
        return 'completed';
      case 'CANCELLED':
      case 'COURIER_ABANDONED':
        return 'cancelled';
      case 'CREATED':
      case 'PRICED':
      case 'PAYMENT_PENDING':
      case 'DISPATCHING':
        return 'pending';
      default:
        return 'in_transit';
    }
  }

  /** Converte Timestamp | Date | any em Date robustamente */
  private toDate(value: any): Date {
    if (!value) return new Date(0);
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') {
      const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
      return new Date(ms);
    }
    return new Date(value);
  }
}

export const companyStatsService = new CompanyStatsService();

