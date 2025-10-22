import { firestore } from '@/config/firebase';
import { Payment, ShipmentDocument } from '@/types';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

type SafeDate = Date | null;

function toDateSafe(ts: any): SafeDate {
  try {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts?.toDate === 'function') return ts.toDate();
    if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
    return new Date(ts);
  } catch {
    return null;
  }
}

export interface CourierTransactionDTO {
  id: string;
  type: 'income' | 'payout' | 'bonus' | 'adjustment';
  amount: number;
  description: string;
  category: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  date: Date;
  referenceId?: string;
  paymentMethod?: string;
  notes?: string;
  rating?: number;
}

export interface CourierFinancialStatsDTO {
  totalEarnings: number;
  pendingPayments: number;
  totalPayouts: number;
  availableBalance: number;
  avgEarningsPerDelivery: number;
  monthlyTrend: number;
  transactionsCount: number;
  topEarningHours: { hour: string; earnings: number }[];
  weeklyEarnings: { week: string; earnings: number }[];
  payoutHistory: { date: Date; amount: number; status: string }[];
}

export interface CourierStatsDTO {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  totalEarnings: number;
  pendingPayments: number;
  avgEarningsPerDelivery: number;
  weeklyEarnings: number[];
  hoursOnline: number;
  distanceTraveled: number;
  successRate: number;
  recentDeliveries: { id: string; customer: string; amount: number; status: 'completed' | 'cancelled' | 'in_progress'; time: Date; rating?: number }[];
}

class CourierStatsService {
  private paymentsCollection = 'payments';
  private shipmentsCollection = 'shipments';

  async getCourierPayments(courierUid: string) {
    if (!courierUid) return [] as Payment[];
    const q = query(
      collection(firestore, this.paymentsCollection),
      where('acceptedByCourierId', '==', courierUid),
      limit(200)
    );
    const snap = await getDocs(q);
    const items: Payment[] = [] as any;
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      items.push({
        id: docSnap.id,
        ...(data as any),
        createdAt: toDateSafe(data.createdAt) || new Date(0),
        updatedAt: toDateSafe(data.updatedAt) || new Date(0),
        deliveredAt: toDateSafe(data.deliveredAt) || undefined,
      } as Payment);
    });
    return items;
  }

  async getCourierShipments(courierUid: string) {
    if (!courierUid) return [] as ShipmentDocument[];
    const q = query(
      collection(firestore, this.shipmentsCollection),
      where('courierUid', '==', courierUid),
      limit(200)
    );
    const snap = await getDocs(q);
    const items: ShipmentDocument[] = [] as any;
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      items.push({
        id: docSnap.id,
        ...(data as any),
        createdAt: toDateSafe(data.createdAt) || new Date(0),
        updatedAt: toDateSafe(data.updatedAt) || new Date(0),
        timeline: (data.timeline || []).map((e: any) => ({ ...e, timestamp: toDateSafe(e.timestamp) || new Date(0) })),
      } as ShipmentDocument);
    });
    return items.sort((a, b) => (b.updatedAt as any).getTime() - (a.updatedAt as any).getTime());
  }

  async getCourierTransactions(courierUid: string): Promise<CourierTransactionDTO[]> {
    const payments = await this.getCourierPayments(courierUid);
    return payments.map((p) => ({
      id: p.id!,
      type: 'income',
      amount: p.valor || 0,
      description: `Entrega - pagamento ${p.pspRefs?.mpPaymentId || p.metodo || 'PIX'}`,
      category: 'Entrega',
      status: p.status === 'CAPTURED' ? 'completed' : p.status === 'INTENT' ? 'pending' : 'processing',
      date: (p.deliveredAt as any) || (p.updatedAt as any) || (p.createdAt as any) || new Date(0),
      referenceId: p.shipmentId,
      paymentMethod: p.metodo,
    }));
  }

  async getCourierFinancialStats(courierUid: string): Promise<CourierFinancialStatsDTO> {
    const payments = await this.getCourierPayments(courierUid);
    const completed = payments.filter((p) => p.status === 'CAPTURED');
    const pending = payments.filter((p) => p.status !== 'CAPTURED');

    const totalEarnings = completed.reduce((sum, p) => sum + (p.valor || 0), 0);
    const pendingPayments = pending.reduce((sum, p) => sum + (p.valor || 0), 0);

    // weekly earnings (últimas 5 semanas)
    const weeklyMap = new Map<string, number>();
    const now = new Date();
    const fmtWeek = (d: Date) => `Sem ${Math.ceil(d.getDate() / 7)}`;
    completed.forEach((p) => {
      const d = (p.deliveredAt as any) || (p.updatedAt as any) || (p.createdAt as any) || now;
      const key = fmtWeek(d);
      weeklyMap.set(key, (weeklyMap.get(key) || 0) + (p.valor || 0));
    });
    const weeklyEarnings = Array.from(weeklyMap.entries()).slice(-5).map(([week, earnings]) => ({ week, earnings }));

    return {
      totalEarnings,
      pendingPayments,
      totalPayouts: 0,
      availableBalance: totalEarnings - 0,
      avgEarningsPerDelivery: completed.length ? totalEarnings / completed.length : 0,
      monthlyTrend: 0,
      transactionsCount: payments.length,
      topEarningHours: [],
      weeklyEarnings,
      payoutHistory: [],
    };
  }

  async getCourierStats(courierUid: string): Promise<CourierStatsDTO> {
    const [shipments, fin] = await Promise.all([
      this.getCourierShipments(courierUid),
      this.getCourierFinancialStats(courierUid),
    ]);

    const completed = shipments.filter((s) => s.state === 'DELIVERED');
    const cancelled = shipments.filter((s) => s.state === 'CANCELLED');

    // weekly as numbers only for screen compatibility
    const weeklyNumbers = fin.weeklyEarnings.map((w) => w.earnings);

    // recent deliveries
    const recentDeliveries = completed.slice(0, 5).map((s) => ({
      id: s.id!,
      customer: s.clienteName || 'Cliente',
      amount: s.quote?.preco || 0,
      status: 'completed' as const,
      time: (s.updatedAt as any) || (s.createdAt as any) || new Date(),
      rating: undefined,
    }));

    return {
      totalDeliveries: shipments.length,
      completedDeliveries: completed.length,
      cancelledDeliveries: cancelled.length,
      onTimeRate: 0,
      avgDeliveryTime: 0,
      totalEarnings: fin.totalEarnings,
      pendingPayments: fin.pendingPayments,
      avgEarningsPerDelivery: fin.avgEarningsPerDelivery,
      weeklyEarnings: weeklyNumbers,
      hoursOnline: 0,
      distanceTraveled: 0,
      successRate: shipments.length ? (completed.length / shipments.length) * 100 : 0,
      recentDeliveries,
    };
  }
}

export const courierStatsService = new CourierStatsService();


