import { firestore } from '@/config/firebase';
import {
  AppStartupState,
  AppVersionConfig,
  MaintenanceConfig,
} from '@/types';
import Constants from 'expo-constants';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

const VERSION_COLLECTION = 'system-config';
const VERSION_DOC = 'app-version';
const MAINTENANCE_DOC = 'maintenance';

/**
 * Service para gerenciar versionamento e manutenção do app
 * Admin pode: criar/atualizar versão, ativar manutenção
 * Usuário verifica: se deve bloquear, avisar ou permitir uso
 */
class VersionManagementService {
  /**
   * Obter versão atual do app (de app.json)
   */
  getAppVersion(): string {
    return Constants?.expoConfig?.version ?? '0.0.0';
  }

  /**
   * Verificar status na inicialização
   * Retorna: bloqueado (atualização obrigatória) | manutenção | ok
   */
  async checkAppStartupState(): Promise<AppStartupState> {
    try {
      const currentAppVersion = this.getAppVersion();
      const versionDoc = await getDoc(
        doc(firestore, VERSION_COLLECTION, VERSION_DOC)
      );
      const maintenanceDoc = await getDoc(
        doc(firestore, VERSION_COLLECTION, MAINTENANCE_DOC)
      );

      const result: AppStartupState = {
        versionStatus: 'ok',
        maintenanceStatus: 'ok',
      };

      // Verificar manutenção PRIMEIRO (prioridade máxima)
      if (maintenanceDoc.exists()) {
        const raw = maintenanceDoc.data() as any;
        const maintenance: MaintenanceConfig = {
          ...raw,
          startAt: raw.startAt?.toDate ? raw.startAt.toDate() : new Date(raw.startAt || Date.now()),
          updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate() : new Date(raw.updatedAt || Date.now()),
        };
        if (maintenance.isEnabled) {
          // Nova regra: manutenção ativa sempre que isEnabled === true (horários apenas informativos)
          result.maintenanceStatus = 'maintenance';
          result.maintenanceData = {
            ...maintenance,
            startAt: new Date(maintenance.startAt),
          };
          return result; // Bloqueia tudo se manutenção está ativa
        }
      }

      // Verificar versão
      if (versionDoc.exists()) {
        const versionConfig = versionDoc.data() as AppVersionConfig;
        result.versionData = {
          ...versionConfig,
          updatedAt: new Date(versionConfig.updatedAt),
        };

        // Comparar versões: currentAppVersion >= minimumVersion ?
        if (!this.isVersionSufficient(currentAppVersion, versionConfig.minimumVersion)) {
          if (versionConfig.updateType === 'required') {
            result.versionStatus = 'blocked'; // Forçar atualização
          } else {
            result.versionStatus = 'outdated'; // Avisar, mas deixar usar
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error checking app startup state:', error);
      // Em caso de erro, permitir uso (fail-open)
      return {
        versionStatus: 'ok',
        maintenanceStatus: 'ok',
      };
    }
  }

  /**
   * Comparar versões (semver simples: major.minor.patch)
   * Retorna true se current >= minimum
   */
  private isVersionSufficient(current: string, minimum: string): boolean {
    const parse = (v: string) => {
      const parts = v.split('.');
      return [
        parseInt(parts[0] || '0', 10),
        parseInt(parts[1] || '0', 10),
        parseInt(parts[2] || '0', 10),
      ];
    };

    const [curMajor, curMinor, curPatch] = parse(current);
    const [minMajor, minMinor, minPatch] = parse(minimum);

    if (curMajor !== minMajor) return curMajor > minMajor;
    if (curMinor !== minMinor) return curMinor > minMinor;
    return curPatch >= minPatch;
  }

  /**
   * [ADMIN] Obter configuração atual de versão
   */
  async getVersionConfig(): Promise<AppVersionConfig | null> {
    try {
      const doc_ = await getDoc(
        doc(firestore, VERSION_COLLECTION, VERSION_DOC)
      );
      if (!doc_.exists()) return null;
      const data = doc_.data() as any;
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
      } as AppVersionConfig;
    } catch (error) {
      console.error('Error getting version config:', error);
      return null;
    }
  }

  /**
   * [ADMIN] Atualizar configuração de versão
   */
  async updateVersionConfig(
    currentVersion: string,
    minimumVersion: string,
    updateType: 'optional' | 'required',
    releaseNotes?: string,
    forceUpdateUrl?: string
  ): Promise<void> {
    try {
      const config: any = {
        id: VERSION_DOC,
        currentVersion,
        minimumVersion,
        updateType,
        updatedAt: new Date(),
      };
      if (typeof releaseNotes === 'string') {
        config.releaseNotes = releaseNotes;
      }
      if (typeof forceUpdateUrl === 'string' && forceUpdateUrl.trim() !== '') {
        config.forceUpdateUrl = forceUpdateUrl;
      }
      await setDoc(
        doc(firestore, VERSION_COLLECTION, VERSION_DOC),
        config,
        { merge: false }
      );
    } catch (error) {
      console.error('Error updating version config:', error);
      throw error;
    }
  }

  /**
   * [ADMIN] Obter configuração atual de manutenção
   */
  async getMaintenanceConfig(): Promise<MaintenanceConfig | null> {
    try {
      const doc_ = await getDoc(
        doc(firestore, VERSION_COLLECTION, MAINTENANCE_DOC)
      );
      if (!doc_.exists()) return null;
      const data = doc_.data() as any;
      return {
        ...data,
        startAt: data.startAt?.toDate ? data.startAt.toDate() : new Date(data.startAt || Date.now()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
      } as MaintenanceConfig;
    } catch (error) {
      console.error('Error getting maintenance config:', error);
      return null;
    }
  }

  /**
   * [ADMIN] Ativar/desativar manutenção
   * @param isEnabled Se deve ativar manutenção
   * @param startAt Data/hora de início (se null, começa imediatamente)
   * @param durationMinutes Duração em minutos
   * @param message Mensagem para usuário
   */
  async setMaintenance(
    isEnabled: boolean,
    startAt?: Date,
    durationMinutes: number = 30,
    message: string = 'Aplicativo em manutenção. Por favor, tente novamente em breve.'
  ): Promise<void> {
    try {
      const config: MaintenanceConfig = {
        id: MAINTENANCE_DOC,
        isEnabled,
        startAt: startAt || new Date(),
        durationMinutes,
        message,
        updatedAt: new Date(),
      };
      await setDoc(
        doc(firestore, VERSION_COLLECTION, MAINTENANCE_DOC),
        config,
        { merge: false }
      );
    } catch (error) {
      console.error('Error setting maintenance:', error);
      throw error;
    }
  }

  /**
   * Formatar tempo restante de manutenção (ex: "10 minutos")
   */
  formatTimeRemaining(endDate: Date): string {
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();

    if (diffMs <= 0) return 'Finalizando...';

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

export const versionManagementService = new VersionManagementService();



