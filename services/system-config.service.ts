import { firestore } from '@/config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Interface para as configurações do sistema
export interface SystemConfig {
  pricing: {
    minDistanceKm: number;
    minPrice: number;
    pricePerKm: number;
    weightThreshold: number;
    weightMultiplier: number;
    fragileMultiplier: number;
  };
  notifications: {
    maxNotificationCount: number;
    notificationCooldownMinutes: number;
  };
  shipments: {
    maxRejectionCount: number;
    offerExpirationHours: number;
  };
}

// Valores padrão para as configurações do sistema
const DEFAULT_CONFIG: SystemConfig = {
  pricing: {
    minDistanceKm: 0.5,
    minPrice: 5.0,
    pricePerKm: 3.5,
    weightThreshold: 5,
    weightMultiplier: 1.2,
    fragileMultiplier: 1.15,
  },
  notifications: {
    maxNotificationCount: 3,
    notificationCooldownMinutes: 5,
  },
  shipments: {
    maxRejectionCount: 3,
    offerExpirationHours: 24,
  }
};

class SystemConfigService {
  private static instance: SystemConfigService;
  private config: SystemConfig | null = null;

  private constructor() {}

  public static getInstance(): SystemConfigService {
    if (!SystemConfigService.instance) {
      SystemConfigService.instance = new SystemConfigService();
    }
    return SystemConfigService.instance;
  }

  // Carrega as configurações do sistema do Firestore
  public async loadConfig(): Promise<SystemConfig> {
    try {
      const configDoc = await getDoc(doc(firestore, 'systemConfig', 'main'));
      
      if (configDoc.exists()) {
        this.config = configDoc.data() as SystemConfig;
      } else {
        // Se não existir, cria com os valores padrão
        this.config = DEFAULT_CONFIG;
        await this.saveConfig(this.config);
      }
      
      return this.config;
    } catch (error) {
      console.error('Error loading system config:', error);
      // Retorna configuração padrão em caso de erro
      return DEFAULT_CONFIG;
    }
  }

  // Salva as configurações do sistema no Firestore
  public async saveConfig(config: SystemConfig): Promise<void> {
    try {
      await setDoc(doc(firestore, 'systemConfig', 'main'), config);
      this.config = config;
    } catch (error) {
      console.error('Error saving system config:', error);
      throw new Error('Falha ao salvar configurações do sistema');
    }
  }

  // Atualiza parcialmente as configurações do sistema
  public async updateConfig(updates: Partial<SystemConfig>): Promise<void> {
    try {
      const configDoc = doc(firestore, 'systemConfig', 'main');
      
      // Se o documento não existir, cria com os valores padrão + updates
      if (!this.config) {
        await this.loadConfig();
      }
      
      const updatedConfig = { ...this.config, ...updates } as SystemConfig;
      await updateDoc(configDoc, updates);
      this.config = updatedConfig;
    } catch (error) {
      console.error('Error updating system config:', error);
      throw new Error('Falha ao atualizar configurações do sistema');
    }
  }

  // Retorna as configurações atuais
  public getConfig(): SystemConfig | null {
    return this.config;
  }

  // Retorna as configurações de preço
  public getPricingConfig() {
    return this.config?.pricing || DEFAULT_CONFIG.pricing;
  }

  // Retorna as configurações de notificações
  public getNotificationConfig() {
    return this.config?.notifications || DEFAULT_CONFIG.notifications;
  }

  // Retorna as configurações de envios
  public getShipmentConfig() {
    return this.config?.shipments || DEFAULT_CONFIG.shipments;
  }
}

export const systemConfigService = SystemConfigService.getInstance();