import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { systemConfigService } from '@/services/system-config.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Tipos para configurações do sistema
interface SystemConfigType {
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

// Tela de configuração para administradores do sistema
export default function AdminConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [config, setConfig] = useState<SystemConfigType>({
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
  });
  
  const [testDistance, setTestDistance] = useState('3.5');
  const [testWeight, setTestWeight] = useState('2.5');
  const [testFragile, setTestFragile] = useState(false);
  const [priceResult, setPriceResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  
  // Estados locais para inputs
  const [localInputs, setLocalInputs] = useState({
    minDistanceKm: '0.5',
    minPrice: '5.0',
    pricePerKm: '3.5',
    weightThreshold: '5',
    weightMultiplier: '1.2',
    fragileMultiplier: '1.15',
    maxNotificationCount: '3',
    notificationCooldownMinutes: '5',
    maxRejectionCount: '3',
    offerExpirationHours: '24'
  });

  // Carregar dados do usuário e configurações
  useEffect(() => {
    loadAdminData();
  }, []);

  // Função para atualizar input local e config
  const updateInput = (key: string, value: string, isDecimal: boolean = true) => {
    setLocalInputs(prev => ({ ...prev, [key]: value }));
    
    const numericValue = isDecimal ? parseFloat(value.replace(',', '.')) : parseInt(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setConfig(prev => {
        const newConfig = { ...prev };
        if (key === 'minDistanceKm' || key === 'minPrice' || key === 'pricePerKm' || 
            key === 'weightThreshold' || key === 'weightMultiplier' || key === 'fragileMultiplier') {
          newConfig.pricing = { ...prev.pricing, [key]: numericValue };
        } else if (key === 'maxNotificationCount' || key === 'notificationCooldownMinutes') {
          newConfig.notifications = { ...prev.notifications, [key]: numericValue };
        } else if (key === 'maxRejectionCount' || key === 'offerExpirationHours') {
          newConfig.shipments = { ...prev.shipments, [key]: numericValue };
        }
        return newConfig;
      });
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      // Obter dados do usuário atual
      const userData = await authService.getCurrentUserData();
      setCurrentUser(userData);
      
      // Carregar configurações do sistema
      const systemConfig = await systemConfigService.loadConfig();
      setConfig(systemConfig);
      
      // Sincronizar estados locais
      setLocalInputs({
        minDistanceKm: systemConfig.pricing.minDistanceKm.toString(),
        minPrice: systemConfig.pricing.minPrice.toString(),
        pricePerKm: systemConfig.pricing.pricePerKm.toString(),
        weightThreshold: systemConfig.pricing.weightThreshold.toString(),
        weightMultiplier: systemConfig.pricing.weightMultiplier.toString(),
        fragileMultiplier: systemConfig.pricing.fragileMultiplier.toString(),
        maxNotificationCount: systemConfig.notifications.maxNotificationCount.toString(),
        notificationCooldownMinutes: systemConfig.notifications.notificationCooldownMinutes.toString(),
        maxRejectionCount: systemConfig.shipments.maxRejectionCount.toString(),
        offerExpirationHours: systemConfig.shipments.offerExpirationHours.toString()
      });
    } catch (error) {
      console.error('Erro ao carregar dados do administrador:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do administrador');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    Alert.alert(
      'Confirmar Alterações',
      'Deseja realmente salvar as configurações do sistema?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setSaving(true);
              // Save to Firestore using the systemConfigService
              await systemConfigService.saveConfig(config);
              Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
            } catch (error) {
              console.error('Erro ao salvar configurações:', error);
              Alert.alert('Erro', 'Falha ao salvar configurações');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleTestPricing = async () => {
    try {
      setCalculating(true);
      
      const distance = parseFloat(testDistance);
      const weight = parseFloat(testWeight);
      
      if (isNaN(distance) || distance < 0) {
        Alert.alert('Erro', 'Distância inválida');
        return;
      }
      
      if (isNaN(weight) || weight < 0) {
        Alert.alert('Erro', 'Peso inválido');
        return;
      }
      
      // Simular delay para mostrar loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Usar as configurações atuais da tela (não as do sistema)
      const currentConfig = config.pricing;
      
      // Calcular preço manualmente usando as configurações da tela
      const MIN_DISTANCE_KM = currentConfig.minDistanceKm;
      const MIN_PRICE = currentConfig.minPrice;
      const PRICE_PER_KM = currentConfig.pricePerKm;
      const WEIGHT_THRESHOLD = currentConfig.weightThreshold;
      const WEIGHT_MULTIPLIER = currentConfig.weightMultiplier;
      const FRAGILE_MULTIPLIER = currentConfig.fragileMultiplier;

      let basePrice = MIN_PRICE;
      let variablePrice = 0;

      if (distance > MIN_DISTANCE_KM) {
        const extraKm = distance - MIN_DISTANCE_KM;
        variablePrice = Math.round(extraKm * PRICE_PER_KM * 100) / 100;
      }

      let total = basePrice + variablePrice;

      // Aplicar multiplicador por peso (apenas sobre o peso excedente)
      if (weight > WEIGHT_THRESHOLD) {
        const excessWeight = weight - WEIGHT_THRESHOLD;
        const weightExtra = Math.round(excessWeight * (WEIGHT_MULTIPLIER - 1) * PRICE_PER_KM * 100) / 100;
        total += weightExtra;
      }
      
      // Aplicar multiplicador por frágil (sobre o total)
      if (testFragile) {
        total = Math.round(total * FRAGILE_MULTIPLIER * 100) / 100;
      }

      // Preço mínimo final
      total = Math.max(MIN_PRICE, total);

      const result = { basePrice, variablePrice, total };
      
      // Calcular detalhes adicionais para exibição
      const extraKm = Math.max(0, distance - MIN_DISTANCE_KM);
      const excessWeight = Math.max(0, weight - WEIGHT_THRESHOLD);
      const weightExtra = weight > WEIGHT_THRESHOLD ? 
        Math.round(excessWeight * (WEIGHT_MULTIPLIER - 1) * PRICE_PER_KM * 100) / 100 : 0;
      const fragileExtra = testFragile ? 
        Math.round((result.basePrice + result.variablePrice + weightExtra) * (FRAGILE_MULTIPLIER - 1) * 100) / 100 : 0;
      
      const detailedResult = {
        ...result,
        // Detalhes do cálculo
        input: {
          distance: distance,
          weight: weight,
          fragile: testFragile
        },
        config: {
          minDistance: MIN_DISTANCE_KM,
          minPrice: MIN_PRICE,
          pricePerKm: PRICE_PER_KM,
          weightThreshold: WEIGHT_THRESHOLD,
          weightMultiplier: WEIGHT_MULTIPLIER,
          fragileMultiplier: FRAGILE_MULTIPLIER
        },
        calculation: {
          extraKm: extraKm,
          extraKmPrice: extraKm * PRICE_PER_KM,
          excessWeight: excessWeight,
          weightExtra: weightExtra,
          fragileExtra: fragileExtra,
          beforeWeight: result.basePrice + result.variablePrice,
          beforeFragile: result.basePrice + result.variablePrice + weightExtra
        }
      };
      
      setPriceResult(detailedResult);
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      Alert.alert('Erro', 'Falha ao calcular preço');
    } finally {
      setCalculating(false);
    }
  };

  const handleResetConfig = () => {
    Alert.alert(
      'Redefinir Configurações',
      'Deseja realmente redefinir todas as configurações para os valores padrão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            // Get default configuration from systemConfigService
            const defaultConfig = {
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
            
            setConfig(defaultConfig);
            Alert.alert('Sucesso', 'Configurações redefinidas para valores padrão');
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading />;
  }

  // Verificar se o usuário é administrador
  const isAdmin = currentUser?.isAdmin;
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Acesso Negado
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.tabIconDefault }]}>
            Você não tem permissão para acessar as configurações administrativas.
          </Text>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            style={styles.errorButton}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabeçalho */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: 'white' }]}>
            Configurações do Sistema
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            Gerencie parâmetros e configurações gerais
          </Text>
        </View>
      </View>

      {/* Seção de Preços */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Configuração de Preços
        </Text>
        <Card style={StyleSheet.flatten([styles.configCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Distância Mínima (km)
            </Text>
            <Input
              value={localInputs.minDistanceKm.replace('.', ',')}
              onChangeText={(text) => updateInput('minDistanceKm', text, true)}
              keyboardType="decimal-pad"
              placeholder="0,5"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Preço Mínimo (R$)
            </Text>
            <Input
              value={localInputs.minPrice.replace('.', ',')}
              onChangeText={(text) => updateInput('minPrice', text, true)}
              keyboardType="decimal-pad"
              placeholder="5,00"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Preço por Km Adicional (R$)
            </Text>
            <Input
              value={localInputs.pricePerKm.replace('.', ',')}
              onChangeText={(text) => updateInput('pricePerKm', text, true)}
              keyboardType="decimal-pad"
              placeholder="3,50"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Limite de Peso (kg)
            </Text>
            <Input
              value={localInputs.weightThreshold.replace('.', ',')}
              onChangeText={(text) => updateInput('weightThreshold', text, true)}
              keyboardType="decimal-pad"
              placeholder="5"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Multiplicador por Peso
            </Text>
            <Input
              value={localInputs.weightMultiplier.replace('.', ',')}
              onChangeText={(text) => updateInput('weightMultiplier', text, true)}
              keyboardType="decimal-pad"
              placeholder="1,2"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Multiplicador para Frágil
            </Text>
            <Input
              value={localInputs.fragileMultiplier.replace('.', ',')}
              onChangeText={(text) => updateInput('fragileMultiplier', text, true)}
              keyboardType="decimal-pad"
              placeholder="1,15"
            />
          </View>
        </Card>
      </View>

      {/* Seção de Notificações */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Configuração de Notificações
        </Text>
        <Card style={StyleSheet.flatten([styles.configCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Máximo de Notificações
            </Text>
            <Input
              value={localInputs.maxNotificationCount}
              onChangeText={(text) => updateInput('maxNotificationCount', text, false)}
              keyboardType="numeric"
              placeholder="3"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Tempo de Espera (minutos)
            </Text>
            <Input
              value={localInputs.notificationCooldownMinutes}
              onChangeText={(text) => updateInput('notificationCooldownMinutes', text, false)}
              keyboardType="numeric"
              placeholder="5"
            />
          </View>
        </Card>
      </View>

      {/* Seção de Envios */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Configuração de Envios
        </Text>
        <Card style={StyleSheet.flatten([styles.configCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Máximo de Rejeições
            </Text>
            <Input
              value={localInputs.maxRejectionCount}
              onChangeText={(text) => updateInput('maxRejectionCount', text, false)}
              keyboardType="numeric"
              placeholder="3"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Expiração de Ofertas (horas)
            </Text>
            <Input
              value={localInputs.offerExpirationHours}
              onChangeText={(text) => updateInput('offerExpirationHours', text, false)}
              keyboardType="numeric"
              placeholder="24"
            />
          </View>
        </Card>
      </View>

      {/* Teste de Preços */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Teste de Cálculo de Preços
        </Text>
        <Card style={StyleSheet.flatten([styles.configCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Distância (km)
            </Text>
            <Input
              value={testDistance}
              onChangeText={setTestDistance}
              keyboardType="decimal-pad"
              placeholder="3,5"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Peso (kg)
            </Text>
            <Input
              value={testWeight}
              onChangeText={setTestWeight}
              keyboardType="decimal-pad"
              placeholder="2,5"
            />
          </View>
          
          <View style={styles.checkboxGroup}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setTestFragile(!testFragile)}
            >
              <MaterialIcons 
                name={testFragile ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color={colors.tint} 
              />
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Frágil
              </Text>
            </TouchableOpacity>
          </View>
          
          <Button
            title={calculating ? "Calculando..." : "Calcular Preço"}
            onPress={handleTestPricing}
            variant="secondary"
            style={styles.testButton}
            disabled={calculating}
            icon={calculating ? <Loading size="small" /> : <MaterialIcons name="calculate" size={16} color={colors.text} />}
          />
          
          {calculating && (
            <View style={styles.loadingContainer}>
              <Loading />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Calculando preço com as configurações atuais...
              </Text>
            </View>
          )}
          
          {priceResult && !calculating && (
            <View style={styles.resultContainer}>
              {/* Resumo dos Dados de Entrada */}
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, { color: colors.text }]}>
                  📋 Dados de Entrada
                </Text>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Distância:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.input.distance} km
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Peso:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.input.weight} kg
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Frágil:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.input.fragile ? 'Sim' : 'Não'}
                  </Text>
                </View>
              </View>

              {/* Configurações Aplicadas */}
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, { color: colors.text }]}>
                  ⚙️ Configurações Aplicadas
                </Text>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Distância Mínima:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.config.minDistance} km
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Preço Mínimo:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    R$ {priceResult.config.minPrice.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Preço por Km:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    R$ {priceResult.config.pricePerKm.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Limite de Peso:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.config.weightThreshold} kg
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Multiplicador Peso:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.config.weightMultiplier}x
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Multiplicador Frágil:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.config.fragileMultiplier}x
                  </Text>
                </View>
              </View>

              {/* Detalhes do Cálculo */}
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, { color: colors.text }]}>
                  🧮 Detalhes do Cálculo
                </Text>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Km Extras:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {priceResult.calculation.extraKm} km
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Preço Km Extras:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    R$ {priceResult.calculation.extraKmPrice.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Subtotal (antes extras):
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    R$ {priceResult.calculation.beforeWeight.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                
                {priceResult.calculation.excessWeight > 0 && (
                  <>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text }]}>
                        Peso Excedente:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {priceResult.calculation.excessWeight} kg
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text }]}>
                        Extra por Peso Excedente:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.tint }]}>
                        +R$ {priceResult.calculation.weightExtra.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </>
                )}
                
                {priceResult.calculation.fragileExtra > 0 && (
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.text }]}>
                      Extra por Frágil ({priceResult.config.fragileMultiplier}x):
                    </Text>
                    <Text style={[styles.resultValue, { color: colors.tint }]}>
                      +R$ {priceResult.calculation.fragileExtra.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Resultado Final */}
              <View style={[styles.resultSection, styles.finalResultSection]}>
                <Text style={[styles.resultSectionTitle, { color: colors.text }]}>
                  💰 Resultado Final
                </Text>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Preço Base:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    R$ {priceResult.basePrice.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>
                    Preço Variável:
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    R$ {priceResult.variablePrice.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={[styles.resultRow, styles.totalRow]}>
                  <Text style={[styles.resultLabel, styles.totalLabel, { color: colors.text }]}>
                    TOTAL:
                  </Text>
                  <Text style={[styles.resultValue, styles.totalValue, { color: colors.tint }]}>
                    R$ {priceResult.total.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>
      </View>

      {/* Botões de Ação */}
      <View style={styles.actionButtons}>
        <Button
          title="Redefinir"
          onPress={handleResetConfig}
          variant="secondary"
          style={styles.actionButton}
          icon={<MaterialIcons name="refresh" size={16} color={colors.text} />}
        />
        <Button
          title={saving ? "Salvando..." : "Salvar Configurações"}
          onPress={handleSaveConfig}
          disabled={saving}
          style={styles.actionButton}
          icon={<MaterialIcons name="save" size={16} color="white" />}
        />
      </View>


      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    width: '100%',
    maxWidth: 200,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  configCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkboxGroup: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  testButton: {
    marginTop: 8,
  },
  loadingContainer: {
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resultSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  finalResultSection: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  resultLabel: {
    fontSize: 16,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  footerSpacer: {
    height: 32,
  },
});