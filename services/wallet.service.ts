import { firestore } from '@/config/firebase';
import { enhancedAuthService } from '@/services/enhanced-auth.service';
import { doc, getDoc, runTransaction, Timestamp } from 'firebase/firestore';

class WalletService {
  private collection = 'authUsers';

  async getCurrentUserId(): Promise<string> {
    const session = await enhancedAuthService.getSession();
    if (!session) throw new Error('Usuário não autenticado');
    return session.userId;
  }

  async getSaldoCentavos(userId?: string): Promise<number> {
    const uid = userId || (await this.getCurrentUserId());
    const ref = doc(firestore, this.collection, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Usuário não encontrado');
    const data = snap.data();
    return Number(data.saldoCentavos || 0);
  }

  async creditSaldo(amountCentavos: number, meta?: { reason?: string; shipmentId?: string }) {
    if (amountCentavos <= 0) return;
    const uid = await this.getCurrentUserId();
    const ref = doc(firestore, this.collection, uid);
    await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Usuário não encontrado');
      const current = Number(snap.data().saldoCentavos || 0);
      tx.update(ref, {
        saldoCentavos: current + amountCentavos,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    });
  }

  async canAfford(amountCentavos: number, userId?: string): Promise<boolean> {
    const saldo = await this.getSaldoCentavos(userId);
    return saldo >= amountCentavos;
  }

  async debitSaldoIfSufficient(amountCentavos: number, meta?: { reason?: string; shipmentId?: string }): Promise<boolean> {
    if (amountCentavos <= 0) return true;
    const uid = await this.getCurrentUserId();
    const ref = doc(firestore, this.collection, uid);
    try {
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Usuário não encontrado');
        const current = Number(snap.data().saldoCentavos || 0);
        if (current < amountCentavos) throw new Error('Saldo insuficiente');
        tx.update(ref, {
          saldoCentavos: current - amountCentavos,
          updatedAt: Timestamp.fromDate(new Date()),
        });
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const walletService = new WalletService();


