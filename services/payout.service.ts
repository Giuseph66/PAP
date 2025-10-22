import { firestore } from '@/config/firebase';
import { Payout, PayoutAllocation, PayoutStatus } from '@/types';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { shipmentFirestoreService } from './shipment-firestore.service';

const PAYOUTS_COLLECTION = 'payouts';

/**
 * Serviço para gerenciar saques (payouts) de entregadores
 */
export const payoutService = {
  /**
   * Calcula taxa e valores do saque (valores em REAIS)
   * @param valorReais Valor em reais
   * @param isImmediate Se é saque imediato (true = 10%), se não (false = 5%)
   * @returns { percentualDesconto, valorDesconto, valorComDesconto }
   */
  calculatePayoutTax(valorReais: number, isImmediate: boolean = false) {
    const percentualDesconto = isImmediate ? 10 : 5;
    const valorDesconto = +(valorReais * (percentualDesconto / 100)).toFixed(2);
    const valorComDesconto = +(valorReais - valorDesconto).toFixed(2);

    return {
      percentualDesconto,
      valorDesconto,
      valorComDesconto,
    };
  },

  /**
   * Calcula saldo disponível do entregador (pagamentos aprovados - saques aprovados)
   */
  async getAvailableBalance(courierUid: string): Promise<number> {
    try {
      if (!courierUid) return 0;

      // Buscar pagamentos aprovados do entregador
      const paymentsQuery = query(
        collection(firestore, 'payments'),
        where('acceptedByCourierId', '==', courierUid),
        where('status', '==', 'CAPTURED')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      // payments.valor está em REAIS
      const totalPaymentsReais = paymentsSnapshot.docs.reduce((sum, doc) => {
        const valorReais = (doc.data().valor as number) || 0;
        return sum + valorReais;
      }, 0);

      // Buscar saques aprovados do entregador
      const payoutsQuery = query(
        collection(firestore, PAYOUTS_COLLECTION),
        where('courierUid', '==', courierUid),
        where('status', '==', 'APPROVED')
      );
      const payoutsSnapshot = await getDocs(payoutsQuery);
      // payouts.valor em REAIS
      const totalPayoutsReais = payoutsSnapshot.docs.reduce((sum, doc) => {
        return sum + ((doc.data().valor as number) || 0);
      }, 0);

      const availableBalanceReais = +(totalPaymentsReais - totalPayoutsReais).toFixed(2);
      return Math.max(0, availableBalanceReais);
    } catch (error) {
      console.error('Error calculating available balance:', error);
      return 0;
    }
  },

  /**
   * Estima alocação de taxa/juros por idade dos pagamentos (FIFO)
   * - Usa deliveredAt como base; fallback em updatedAt, depois createdAt
   * - Taxa: ≤1 dia => 10%; 1-30 dias interpolação linear 10%->5%; >30 dias => 5%
   * - Valores em REAIS
   */
  async estimatePayoutFees(
    courierUid: string,
    requestedAmountReais: number,
    feeImmediatePercent: number = 10,
    feeDelayedPercent: number = 5
  ): Promise<{
    allocations: PayoutAllocation[];
    totals: { requested: number; allocated: number; fee: number; net: number };
  }> {
    if (!courierUid || requestedAmountReais <= 0) {
      return { allocations: [], totals: { requested: requestedAmountReais, allocated: 0, fee: 0, net: 0 } };
    }

    // Buscar pagamentos CAPTURED do courier
    const paymentsQ = query(
      collection(firestore, 'payments'),
      where('acceptedByCourierId', '==', courierUid),
      where('status', '==', 'CAPTURED')
    );
    const paymentsSnap = await getDocs(paymentsQ);

    // Mapear e ordenar por data base (mais antigos primeiro - FIFO)
    const payments = paymentsSnap.docs
      .map((d) => {
        const data = d.data() as any;
        const deliveredAt: Date | undefined = data.deliveredAt?.toDate?.() || data.deliveredAt || data.updatedAt?.toDate?.() || data.createdAt?.toDate?.();
        const createdAt: Date | undefined = data.createdAt?.toDate?.() || data.createdAt;
        const updatedAt: Date | undefined = data.updatedAt?.toDate?.() || data.updatedAt;
        const baseDate: Date = (deliveredAt as Date) || (updatedAt as Date) || (createdAt as Date) || new Date();
        const withdrawnAmount: number = data.withdrawnAmount || 0;
        const valor: number = data.valor || 0; // reais
        const available: number = Math.max(0, +(valor - withdrawnAmount).toFixed(2));
        return {
          id: d.id,
          shipmentId: data.shipmentId,
          valor,
          withdrawnAmount,
          available,
          baseDate,
        };
      })
      .filter((p) => p.available > 0)
      .sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());

    let remaining = +requestedAmountReais.toFixed(2);
    const allocations: PayoutAllocation[] = [];
    let totalAllocated = 0;
    let totalFee = 0;
    let totalNet = 0;

    const now = new Date();

    const interpolateFee = (days: number): number => {
      if (days <= 1) return feeImmediatePercent;
      if (days >= 30) return feeDelayedPercent;
      const ratio = (days - 1) / (30 - 1); // 0..1
      const fee = feeImmediatePercent + (feeDelayedPercent - feeImmediatePercent) * ratio;
      return +fee.toFixed(4);
    };

    for (const p of payments) {
      if (remaining <= 0) break;
      const alloc = Math.min(p.available, remaining);
      const ageMs = Math.max(0, now.getTime() - p.baseDate.getTime());
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      const feePercent = interpolateFee(ageDays);
      const feeAmount = +((alloc * feePercent) / 100).toFixed(2);
      const netAmount = +(alloc - feeAmount).toFixed(2);

      allocations.push({
        paymentId: p.id,
        shipmentId: p.shipmentId,
        originalPaymentValue: p.valor,
        availableBefore: p.available,
        allocated: alloc,
        ageDays,
        feePercent,
        feeAmount,
        netAmount,
        deliveredAt: p.baseDate,
      });

      remaining = +(remaining - alloc).toFixed(2);
      totalAllocated = +(totalAllocated + alloc).toFixed(2);
      totalFee = +(totalFee + feeAmount).toFixed(2);
      totalNet = +(totalNet + netAmount).toFixed(2);
    }

    return {
      allocations,
      totals: { requested: requestedAmountReais, allocated: totalAllocated, fee: totalFee, net: totalNet },
    };
  },

  /**
   * Cria novo pedido de saque
   */
  async createPayoutRequest(
    courierUid: string,
    valorReais: number,
    chavePix: string,
    nomeTitular: string,
    isImmediate: boolean = false
  ): Promise<Payout> {
    try {
      if (!courierUid || valorReais <= 0) {
        throw new Error('Dados inválidos para criar saque');
      }

      // Estimar alocações por idade (FIFO) para o valor solicitado
      const feeConfigQ = query(collection(firestore, 'adminConfig'));
      // Nota: se houver várias configs, usamos defaults; a tela admin já altera com service dedicado
      const { allocations, totals } = await this.estimatePayoutFees(courierUid, valorReais);

      // Buscar entregas do entregador para associar
      const shipments = await shipmentFirestoreService.getShipmentsByCourier(courierUid);
      const deliveryIds = shipments.map(s => s.id);
      const deliveryDates = shipments.map(s => (s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt)));

      // Criar documento de saque
      const payoutData = {
        courierUid,
        valor: +valorReais.toFixed(2), // solicitado
        valorComDesconto: +totals.net.toFixed(2), // líquido
        percentualDesconto: allocations.length > 0 ? allocations[0].feePercent : (isImmediate ? 10 : 5), // referência
        valorDesconto: +totals.fee.toFixed(2),
        chavePix,
        nomeTitular,
        status: 'PENDING' as PayoutStatus,
        deliveryIds,
        deliveryDates,
        allocations,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, PAYOUTS_COLLECTION), payoutData);

      // Aplicar baixa nos payments alocados (withdrawals / withdrawnAmount)
      for (const alloc of allocations) {
        const paymentRef = doc(firestore, 'payments', alloc.paymentId);
        const paymentSnap = await getDoc(paymentRef);
        if (paymentSnap.exists()) {
          const data = paymentSnap.data() as any;
          const prevWithdrawn = data.withdrawnAmount || 0;
          const nextWithdrawn = +(prevWithdrawn + alloc.allocated).toFixed(2);
          const prevWithdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
          const nextWithdrawals = [
            ...prevWithdrawals,
            { amount: alloc.allocated, payoutId: docRef.id, at: new Date() },
          ];
          await updateDoc(paymentRef, {
            withdrawnAmount: nextWithdrawn,
            withdrawals: nextWithdrawals,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Retornar documento criado
      const newDoc = await getDoc(docRef);
      const data = newDoc.data();

      return {
        id: newDoc.id,
        courierUid: data?.courierUid,
        valor: data?.valor,
        valorComDesconto: data?.valorComDesconto,
        percentualDesconto: data?.percentualDesconto,
        valorDesconto: data?.valorDesconto,
        chavePix: data?.chavePix,
        nomeTitular: data?.nomeTitular,
        status: data?.status,
        mensagemAdmin: data?.mensagemAdmin,
        deliveryIds: data?.deliveryIds || [],
        deliveryDates: (data?.deliveryDates || []).map((d: any) => (d?.toDate ? d.toDate() : d)),
        allocations: (data?.allocations as any[]) || [],
        createdAt: data?.createdAt?.toDate?.() || new Date(),
        updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      } as Payout;
    } catch (error) {
      console.error('Error creating payout request:', error);
      throw error;
    }
  },

  /**
   * Lista saques do entregador
   */
  async getPayoutsByCourier(courierUid: string): Promise<Payout[]> {
    try {
      if (!courierUid) return [];

      const q = query(
        collection(firestore, PAYOUTS_COLLECTION),
        where('courierUid', '==', courierUid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          courierUid: data.courierUid,
          valor: data.valor,
          valorComDesconto: data.valorComDesconto,
          percentualDesconto: data.percentualDesconto,
          valorDesconto: data.valorDesconto,
          chavePix: data.chavePix,
          nomeTitular: data.nomeTitular,
          status: data.status,
          mensagemAdmin: data.mensagemAdmin,
          deliveryIds: data.deliveryIds || [],
          deliveryDates: (data.deliveryDates || []).map((d: any) => (d?.toDate ? d.toDate() : d)),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          approvedAt: data.approvedAt?.toDate?.(),
          processedAt: data.processedAt?.toDate?.(),
        } as Payout;
      });
    } catch (error) {
      console.error('Error fetching payouts by courier:', error);
      return [];
    }
  },

  /**
   * Lista todos os saques para admin (com filtros opcionais)
   */
  async getPayoutsForAdmin(filters?: {
    status?: PayoutStatus;
    courierUid?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Payout[]> {
    try {
      let q = query(collection(firestore, PAYOUTS_COLLECTION), orderBy('createdAt', 'desc'));

      // Aplicar filtros se fornecidos
      if (filters?.status) {
        q = query(
          collection(firestore, PAYOUTS_COLLECTION),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      }

      if (filters?.courierUid) {
        q = query(
          collection(firestore, PAYOUTS_COLLECTION),
          where('courierUid', '==', filters.courierUid),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          courierUid: data.courierUid,
          valor: data.valor,
          valorComDesconto: data.valorComDesconto,
          percentualDesconto: data.percentualDesconto,
          valorDesconto: data.valorDesconto,
          chavePix: data.chavePix,
          nomeTitular: data.nomeTitular,
          status: data.status,
          mensagemAdmin: data.mensagemAdmin,
          deliveryIds: data.deliveryIds || [],
          deliveryDates: (data.deliveryDates || []).map((d: any) => (d?.toDate ? d.toDate() : d)),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          approvedAt: data.approvedAt?.toDate?.(),
          processedAt: data.processedAt?.toDate?.(),
        } as Payout;
      });

      // Filtrar por data se fornecida
      if (filters?.startDate || filters?.endDate) {
        results = results.filter(payout => {
          const payoutDate = payout.createdAt;
          if (filters.startDate && payoutDate < filters.startDate) return false;
          if (filters.endDate && payoutDate > filters.endDate) return false;
          return true;
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching payouts for admin:', error);
      return [];
    }
  },

  /**
   * Atualiza status do saque
   */
  async updatePayoutStatus(
    payoutId: string,
    status: PayoutStatus,
    mensagemAdmin?: string
  ): Promise<void> {
    try {
      const payoutRef = doc(firestore, PAYOUTS_COLLECTION, payoutId);

      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (mensagemAdmin) {
        updateData.mensagemAdmin = mensagemAdmin;
      }

      if (status === 'APPROVED') {
        updateData.approvedAt = serverTimestamp();
      }

      if (status === 'PROCESSING' || status === 'APPROVED') {
        updateData.processedAt = serverTimestamp();
      }

      await updateDoc(payoutRef, updateData);
    } catch (error) {
      console.error('Error updating payout status:', error);
      throw error;
    }
  },

  /**
   * Busca um saque específico
   */
  async getPayoutById(payoutId: string): Promise<Payout | null> {
    try {
      const docRef = doc(firestore, PAYOUTS_COLLECTION, payoutId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        courierUid: data.courierUid,
        valor: data.valor,
        valorComDesconto: data.valorComDesconto,
        percentualDesconto: data.percentualDesconto,
        valorDesconto: data.valorDesconto,
        chavePix: data.chavePix,
        nomeTitular: data.nomeTitular,
        status: data.status,
        mensagemAdmin: data.mensagemAdmin,
        deliveryIds: data.deliveryIds || [],
        deliveryDates: (data.deliveryDates || []).map((d: any) => (d?.toDate ? d.toDate() : d)),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        approvedAt: data.approvedAt?.toDate?.(),
        processedAt: data.processedAt?.toDate?.(),
      } as Payout;
    } catch (error) {
      console.error('Error fetching payout:', error);
      return null;
    }
  },
};
