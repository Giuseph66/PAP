import { firestore } from '@/config/firebase';
import { PayoutFeeConfig } from '@/types';
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';

const CONFIG_COLLECTION = 'adminConfig';
const PAYOUT_FEE_CONFIG_ID = 'payoutFeeConfig';

/**
 * Serviço para gerenciar configurações do admin (taxas, etc)
 */
export const adminConfigService = {
  /**
   * Busca configuração de taxas de saque
   */
  async getPayoutFeeConfig(): Promise<PayoutFeeConfig> {
    try {
      const docRef = doc(firestore, CONFIG_COLLECTION, PAYOUT_FEE_CONFIG_ID);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Retornar valores padrão se não existir
        return {
          id: PAYOUT_FEE_CONFIG_ID,
          feeImmediate: 10,
          feeDelayed: 5,
          updatedAt: new Date(),
        };
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        feeImmediate: data.feeImmediate || 10,
        feeDelayed: data.feeDelayed || 5,
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching payout fee config:', error);
      // Retornar valores padrão em caso de erro
      return {
        id: PAYOUT_FEE_CONFIG_ID,
        feeImmediate: 10,
        feeDelayed: 5,
        updatedAt: new Date(),
      };
    }
  },

  /**
   * Atualiza configuração de taxas de saque (apenas admin)
   */
  async updatePayoutFeeConfig(feeImmediate: number, feeDelayed: number): Promise<void> {
    try {
      if (feeImmediate < 0 || feeDelayed < 0) {
        throw new Error('Taxas não podem ser negativas');
      }

      const docRef = doc(firestore, CONFIG_COLLECTION, PAYOUT_FEE_CONFIG_ID);

      const configData = {
        feeImmediate,
        feeDelayed,
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, configData, { merge: true });
    } catch (error) {
      console.error('Error updating payout fee config:', error);
      throw error;
    }
  },
};
