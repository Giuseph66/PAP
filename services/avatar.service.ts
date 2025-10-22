import { firestore } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { authService } from './auth.service';

const DATA_URL_PREFIX = 'data:image/jpeg;base64,';
const FIRESTORE_FIELD_BYTE_LIMIT = 1048487; // ~1MB

class AvatarService {
  private static instance: AvatarService;

  private constructor() {}

  public static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  /**
   * Salvar avatar do usuário no Firestore (valida tamanho máximo)
   */
  public async saveAvatar(base64Image: string): Promise<void> {
    try {
      if (this.isOverLimit(base64Image)) {
        throw new Error('Imagem acima do limite permitido (1MB). Selecione uma imagem menor.');
      }

      const session = await authService.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const userRef = doc(firestore, 'authUsers', session.userId);
      await updateDoc(userRef, {
        avatar: base64Image,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Erro ao salvar avatar:', error);
      throw new Error('Falha ao salvar avatar');
    }
  }

  /**
   * Remover avatar do usuário
   */
  public async removeAvatar(): Promise<void> {
    try {
      const session = await authService.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const userRef = doc(firestore, 'authUsers', session.userId);
      await updateDoc(userRef, { avatar: null, updatedAt: new Date() });
    } catch (error) {
      console.error('Erro ao remover avatar:', error);
      throw new Error('Falha ao remover avatar');
    }
  }

  /**
   * Verifica se o data URL base64 excede limite do Firestore (~1MB)
   */
  public isOverLimit(dataUrl: string): boolean {
    const base64 = dataUrl.startsWith(DATA_URL_PREFIX) ? dataUrl.slice(DATA_URL_PREFIX.length) : dataUrl;
    const estimatedBytes = Math.floor((base64.length * 3) / 4);
    return estimatedBytes > FIRESTORE_FIELD_BYTE_LIMIT;
  }

  public getLimits() {
    return {
      maxSizeBytes: FIRESTORE_FIELD_BYTE_LIMIT,
      dataUrlPrefix: DATA_URL_PREFIX,
    };
  }
}

export const avatarService = AvatarService.getInstance();
