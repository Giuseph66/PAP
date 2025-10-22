import { firestore } from '@/config/firebase';
import { Payment, PaymentMethod, PaymentStatus } from '@/types';
import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';

class PaymentService {
  private collectionName = 'payments';
  private shipmentCollection = 'shipments';

  async createPaymentRecord(data: {
    shipmentId: string;
    metodo: PaymentMethod;
    valor: number;
    mpPaymentId?: string | number;
    qrCode?: string;
    qrCodeBase64?: string;
    paidByUserId?: string;
    acceptedByCourierId?: string;
  }): Promise<string> {
    const ref = await addDoc(collection(firestore, this.collectionName), {
      shipmentId: data.shipmentId,
      metodo: data.metodo,
      status: 'INTENT' satisfies PaymentStatus,
      valor: data.valor,
      pspRefs: {
        mpPaymentId: data.mpPaymentId || null,
        qrCode: data.qrCode || null,
        qrCodeBase64: data.qrCodeBase64 || null,
      },
      paidByUserId: data.paidByUserId || null,
      acceptedByCourierId: data.acceptedByCourierId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // salvar referência básica também no shipment (intent), preservando campos existentes
    if (data.shipmentId) {
      await updateDoc(doc(firestore, this.shipmentCollection, data.shipmentId), {
        'paymentIntent.method': data.metodo,
        'paymentIntent.mpPaymentId': data.mpPaymentId ? String(data.mpPaymentId) : null,
        'paymentIntent.qrCode': data.qrCode || null,
        'paymentIntent.qrCodeBase64': data.qrCodeBase64 || null,
        'paymentIntent.status': 'pending',
        'paymentIntent.updatedAt': Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      } as any);
    }
    return ref.id;
  }

  async updatePaymentRecord(paymentId: string, updates: Partial<Payment> & { status?: PaymentStatus; pspRefs?: any }) {
    await updateDoc(doc(firestore, this.collectionName, paymentId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async markApproved(params: {
    shipmentId: string;
    paymentId: string;
    mpPaymentId: string | number;
    paidByUserId?: string;
    acceptedByCourierId?: string;
  }) {
    const ref = doc(firestore, this.collectionName, params.paymentId);
    // Atualiza somente o campo aninhado do mpPaymentId para não apagar outros campos do pspRefs
    await updateDoc(ref, {
      status: 'CAPTURED' satisfies PaymentStatus,
      'pspRefs.mpPaymentId': params.mpPaymentId,
      paidByUserId: params.paidByUserId || null,
      acceptedByCourierId: params.acceptedByCourierId || null,
      updatedAt: serverTimestamp(),
    } as any);
    await updateDoc(doc(firestore, this.shipmentCollection, params.shipmentId), {
      'paymentIntent.method': 'PIX',
      'paymentIntent.mpPaymentId': String(params.mpPaymentId),
      'paymentIntent.status': 'approved',
      'paymentIntent.updatedAt': Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    } as any);
  }

  /**
   * Marca como aprovado localizando o documento pelo mpPaymentId (pspRefs) ou pelo shipmentId (mais recente).
   * Útil quando não temos o ID do documento do Firestore no cliente.
   */
  async markApprovedSmart(params: {
    shipmentId: string;
    mpPaymentId?: string | number | null;
    paidByUserId?: string;
    acceptedByCourierId?: string;
  }) {
    const mpIdStr = params.mpPaymentId != null ? String(params.mpPaymentId) : null;

    // 1) tenta por mpPaymentId em pspRefs
    let targetDocId: string | null = null;
    if (mpIdStr) {
      const q1 = query(
        collection(firestore, this.collectionName),
        where('pspRefs.mpPaymentId', '==', mpIdStr),
        limit(1)
      );
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        targetDocId = snap1.docs[0].id;
      }
    }

    // 2) fallback: busca pelo shipmentId (pega o mais recente por updatedAt/createdAt)
    if (!targetDocId) {
      const q2 = query(
        collection(firestore, this.collectionName),
        where('shipmentId', '==', params.shipmentId),
        limit(5)
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const sorted = snap2.docs.sort((a, b) => {
          const aTs = (a.data() as any).updatedAt || (a.data() as any).createdAt;
          const bTs = (b.data() as any).updatedAt || (b.data() as any).createdAt;
          const aMs = aTs?.toMillis?.() ?? 0;
          const bMs = bTs?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
        targetDocId = sorted[0]?.id || null;
      }
    }

    if (!targetDocId) return; // nada a fazer

    await this.markApproved({
      shipmentId: params.shipmentId,
      paymentId: targetDocId,
      mpPaymentId: mpIdStr || 'unknown',
      paidByUserId: params.paidByUserId,
      acceptedByCourierId: params.acceptedByCourierId,
    });
  }

  /** Marca a entrega como finalizada no documento de pagamento relacionado ao shipment */
  async markDelivered(params: { shipmentId: string; acceptedByCourierId?: string }) {
    // Busca os pagamentos do shipment (máx 5) e escolhe o CAPTURED, se existir, senão o mais recente
    const q = query(
      collection(firestore, this.collectionName),
      where('shipmentId', '==', params.shipmentId),
      limit(5)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    // Seleciona pagamento capturado preferencialmente
    let target = snap.docs.find((d) => (d.data() as any).status === 'CAPTURED');
    if (!target) {
      // fallback: mais recente por createdAt/updatedAt
      target = snap.docs.sort((a, b) => {
        const aTs = (a.data() as any).updatedAt || (a.data() as any).createdAt;
        const bTs = (b.data() as any).updatedAt || (b.data() as any).createdAt;
        const aMs = aTs?.toMillis?.() ?? 0;
        const bMs = bTs?.toMillis?.() ?? 0;
        return bMs - aMs;
      })[0];
    }
    if (!target) return;

    const docRef = doc(firestore, this.collectionName, target.id);
    await updateDoc(docRef, {
      deliveryConfirmed: true,
      deliveredAt: serverTimestamp(),
      acceptedByCourierId: params.acceptedByCourierId || null,
      updatedAt: serverTimestamp(),
    });
  }
}

export const paymentService = new PaymentService();


