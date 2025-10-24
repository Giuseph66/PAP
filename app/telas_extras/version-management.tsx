import { firestore } from '@/config/firebase';
import { authService } from '@/services/auth.service';
import { versionManagementService } from '@/services/version-management.service';
import {
  AppVersionConfig,
  MaintenanceConfig,
} from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  primary: '#4a90e2',
  danger: '#e74c3c',
  success: '#27ae60',
  warning: '#f39c12',
  background: '#1a1a2e',
  surface: '#16213e',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  border: '#2a2a4e',
};

export default function VersionManagementScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [versionConfig, setVersionConfig] = useState<AppVersionConfig | null>(null);
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para formulários
  const [currentVersion, setCurrentVersion] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [updateType, setUpdateType] = useState<'optional' | 'required'>('optional');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [forceUpdateUrl, setForceUpdateUrl] = useState('');

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMinutes, setMaintenanceMinutes] = useState('30');
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Aplicativo em manutenção. Por favor, tente novamente em breve.'
  );
  const [maintenanceStartDelay, setMaintenanceStartDelay] = useState('0'); // minutos

  const appVersion = versionManagementService.getAppVersion();

  // Checagem de admin (assíncrona)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await authService.getSession();
        if (!mounted) return;
        if (session?.role === 'admin') {
          setIsAdmin(true);
          return;
        }
        const user = await authService.getCurrentUserData();
        if (!mounted) return;
        setIsAdmin(!!user?.isAdmin);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Carregar configurações
  const loadConfigs = useCallback(async () => {
    try {
      const vConfig = await versionManagementService.getVersionConfig();
      const mConfig = await versionManagementService.getMaintenanceConfig();

      setVersionConfig(vConfig);
      setMaintenanceConfig(mConfig);

      if (vConfig) {
        setCurrentVersion(vConfig.currentVersion);
        setMinimumVersion(vConfig.minimumVersion);
        setUpdateType(vConfig.updateType);
        setReleaseNotes(vConfig.releaseNotes || '');
        setForceUpdateUrl(vConfig.forceUpdateUrl || '');
      }

      if (mConfig) {
        setMaintenanceEnabled(mConfig.isEnabled);
        setMaintenanceMinutes(mConfig.durationMinutes.toString());
        setMaintenanceMessage(mConfig.message);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConfigs();
      // Realtime para app-version e maintenance
      const vRef = doc(firestore, 'system-config', 'app-version');
      const mRef = doc(firestore, 'system-config', 'maintenance');
      const unsubV = onSnapshot(vRef, () => loadConfigs());
      const unsubM = onSnapshot(mRef, () => loadConfigs());
      return () => {
        unsubV();
        unsubM();
      };
    }, [loadConfigs])
  );

  const handleUpdateVersion = async () => {
    if (!currentVersion || !minimumVersion) {
      Alert.alert('Erro', 'Preencha versão atual e mínima');
      return;
    }

    setLoading(true);
    try {
      await versionManagementService.updateVersionConfig(
        currentVersion,
        minimumVersion,
        updateType,
        releaseNotes || undefined,
        forceUpdateUrl || undefined
      );
      Alert.alert('Sucesso', 'Configuração de versão atualizada');
      await loadConfigs();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar versão');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetMaintenance = async () => {
    const durationMinutes = parseInt(maintenanceMinutes, 10);
    const startDelayMinutes = parseInt(maintenanceStartDelay, 10);

    // Só valida duração quando for ATIVAR manutenção
    if (maintenanceEnabled) {
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        Alert.alert('Erro', 'Duração deve ser > 0 minutos');
        return;
      }
    }

    setLoading(true);
    try {
      let startTime = new Date();
      if (startDelayMinutes > 0) {
        startTime = new Date(startTime.getTime() + startDelayMinutes * 60000);
      }

      await versionManagementService.setMaintenance(
        maintenanceEnabled,
        startTime,
        durationMinutes,
        maintenanceMessage
      );
      Alert.alert(
        'Sucesso',
        maintenanceEnabled
          ? `Manutenção agendada para ${startTime.toLocaleString()}`
          : 'Manutenção desativada'
      );
      await loadConfigs();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar manutenção');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

    const handleToggleMaintenance = async () => {
    const newEnabled = !maintenanceEnabled;
    setMaintenanceEnabled(newEnabled);
    setLoading(true);
    try {
      const duration = parseInt(maintenanceMinutes, 10);
      const durationToUse = isNaN(duration) || duration <= 0 ? 30 : duration;
      const startTime = newEnabled ? new Date() : new Date();
      await versionManagementService.setMaintenance(
        newEnabled,
        startTime,
        durationToUse,
        maintenanceMessage
      );
      Alert.alert('Sucesso', newEnabled ? 'Manutenção ativada' : 'Manutenção desativada');
      await loadConfigs();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar status da manutenção');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    // Painel para usuário comum
    return <UserVersionStatusPanel appVersion={appVersion} />;
  }

  // Painel para admin
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/telas_extras/profile')}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Gerenciar Versão & Manutenção</Text>
          </View>
          <Text style={styles.subtitle}>
            Versão Atual do App: {appVersion}
          </Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusPill,
              maintenanceEnabled ? styles.statusPillActive : styles.statusPillInactive
            ]}>
              <Text style={styles.statusPillText}>
                {maintenanceEnabled ? '🔧 Manutenção ATIVA' : '🟢 Manutenção INATIVA'}
              </Text>
            </View>
          </View>
        </View>

        {/* SEÇÃO: VERSIONAMENTO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Versionamento</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Versão Atual no Banco</Text>
            <TextInput
              style={[styles.input, styles.inputField]}
              value={currentVersion}
              onChangeText={setCurrentVersion}
              placeholder="ex: 1.0.1"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Versão Mínima Obrigatória</Text>
            <TextInput
              style={[styles.input, styles.inputField]}
              value={minimumVersion}
              onChangeText={setMinimumVersion}
              placeholder="ex: 1.0.0"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Tipo de Atualização</Text>
            <View style={styles.buttonGroup}>
              {(['optional', 'required'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.buttonGroupItem,
                    updateType === type && styles.buttonGroupItemActive,
                  ]}
                  onPress={() => setUpdateType(type)}
                >
                  <Text
                    style={[
                      styles.buttonGroupText,
                      updateType === type && styles.buttonGroupTextActive,
                    ]}
                  >
                    {type === 'optional' ? 'Opcional' : 'Obrigatória'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Release Notes</Text>
            <TextInput
              style={[styles.input, styles.inputField, { height: 90, textAlignVertical: 'top' }]}
              value={releaseNotes}
              onChangeText={setReleaseNotes}
              placeholder="Notas desta versão"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="sentences"
              multiline
            />

            <Text style={styles.label}>Link de Atualização (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputField]}
              value={forceUpdateUrl}
              onChangeText={setForceUpdateUrl}
              placeholder={Platform.OS === 'ios' ? 'URL da App Store' : 'URL da Play Store'}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleUpdateVersion}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Atualizando...' : 'Salvar Configuração de Versão'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEÇÃO: MANUTENÇÃO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Manutenção</Text>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Text style={styles.label}>Status</Text>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  maintenanceEnabled && styles.toggleActive,
                ]}
                onPress={handleToggleMaintenance}
              >
                <Text style={styles.toggleText}>
                  {maintenanceEnabled ? 'Desativar' : 'Ativar'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Iniciar em (minutos)</Text>
            <TextInput
              style={[styles.input, styles.inputField]}
              value={maintenanceStartDelay}
              onChangeText={setMaintenanceStartDelay}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Duração (minutos)</Text>
            <TextInput
              style={[styles.input, styles.inputField]}
              value={maintenanceMinutes}
              onChangeText={setMaintenanceMinutes}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Mensagem para Usuário</Text>
            <TextInput
              style={[styles.input, styles.inputField, { height: 80, textAlignVertical: 'top' }]}
              value={maintenanceMessage}
              onChangeText={setMaintenanceMessage}
              placeholder="Aplicativo em manutenção. Por favor, tente novamente em breve."
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            {maintenanceConfig && (
              <View style={styles.info}>
                <Text style={styles.infoText}>
                  ℹ️ Atualmente: {maintenanceConfig.isEnabled ? 'ATIVA' : 'inativa'}
                </Text>
                <Text style={styles.infoText}>
                  {(() => {
                    try {
                      const enabled = maintenanceEnabled;
                      const endDate = enabled
                        ? new Date(Date.now() + (parseInt(maintenanceMinutes, 10) || 30) * 60000)
                        : (maintenanceConfig?.startAt
                           ? new Date(maintenanceConfig.startAt.getTime() + maintenanceConfig.durationMinutes * 60000)
                           : null);
                      return endDate ? `Fim previsto: ${endDate.toLocaleString()}` : 'Sem agendamento atual';
                    } catch {
                      return 'Sem agendamento atual';
                    }
                  })()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                maintenanceEnabled ? styles.buttonDanger : styles.buttonSuccess,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleToggleMaintenance}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
              {maintenanceEnabled ? 'Desativar Manutenção' : 'Ativar Manutenção'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Painel para usuário comum (cliente/entregador)
 * Mostra bloqueio de atualização obrigatória ou aviso de manutenção
 */
function UserVersionStatusPanel({ appVersion }: { appVersion: string }) {
  const [startupState, setStartupState] = useState<any>(null);
  const [maintenanceTimeLeft, setMaintenanceTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const state = await versionManagementService.checkAppStartupState();
        setStartupState(state);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    checkStatus();

    // Realtime: sair da tela quando voltar ao normal (não bloqueado/sem manutenção)
    const vRef = doc(firestore, 'system-config', 'app-version');
    const mRef = doc(firestore, 'system-config', 'maintenance');
    const handleResync = async () => {
      try {
        const state = await versionManagementService.checkAppStartupState();
        setStartupState(state);
        if (state.maintenanceStatus !== 'maintenance' && state.versionStatus !== 'blocked') {
          router.replace('/');
        }
      } catch {}
    };
    const unsubV = onSnapshot(vRef, handleResync);
    const unsubM = onSnapshot(mRef, handleResync);

    return () => {
      unsubV();
      unsubM();
    };
  }, []);

  useEffect(() => {
    if (startupState?.maintenanceData && startupState.maintenanceStatus === 'maintenance') {
      const interval = setInterval(() => {
        const endTime = new Date(
          startupState.maintenanceData.startAt.getTime() +
            startupState.maintenanceData.durationMinutes * 60000
        );
        const timeLeft = versionManagementService.formatTimeRemaining(endTime);
        setMaintenanceTimeLeft(timeLeft);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startupState]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.text}>Verificando status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // BLOQUEADO: Atualização obrigatória
  if (startupState?.versionStatus === 'blocked') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.blockedTitle}>🚫 Atualização Obrigatória</Text>
          <Text style={styles.blockedText}>
            Uma nova versão do app é obrigatória para continuar usando o serviço.
          </Text>
          <Text style={styles.blockedText}>
            Versão atual: {appVersion}
          </Text>
          <Text style={styles.blockedText}>
            Versão mínima: {startupState.versionData?.minimumVersion}
          </Text>
          {startupState.versionData?.releaseNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Novidades:</Text>
              <Text style={styles.notesText}>{startupState.versionData.releaseNotes}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => {
              const url = startupState.versionData?.forceUpdateUrl
                || (Platform.OS === 'ios'
                  ? 'https://apps.apple.com'
                  : 'https://play.google.com');
              Linking.openURL(url);
            }}
          >
            <Text style={styles.buttonText}>Atualizar Agora</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // EM MANUTENÇÃO: Bloqueia uso
  if (startupState?.maintenanceStatus === 'maintenance') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.maintenanceTitle}>🔧 Manutenção em Andamento</Text>
          <Text style={styles.maintenanceText}>
            {startupState.maintenanceData?.message || 'Aplicativo em manutenção.'}
          </Text>
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>Tempo Estimado de Retorno:</Text>
            <Text style={styles.timer}>{maintenanceTimeLeft || 'Calculando...'}</Text>
          </View>
          <Text style={styles.maintenanceHint}>
            Neste intervalo, salve seus dados e feche o aplicativo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // AVISO: Atualização opcional
  if (startupState?.versionStatus === 'outdated') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>📲 Atualização Disponível</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Uma nova versão do app está disponível!
              </Text>
            </View>

            <Text style={styles.label}>Versão Atual:</Text>
            <Text style={styles.value}>{appVersion}</Text>

            <Text style={[styles.label, { marginTop: 16 }]}>Versão Recomendada:</Text>
            <Text style={styles.value}>{startupState.versionData?.currentVersion}</Text>

            {startupState.versionData?.releaseNotes && (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>O que há de novo:</Text>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>
                    {startupState.versionData.releaseNotes}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => {
                const url = startupState.versionData?.forceUpdateUrl
                  || (Platform.OS === 'ios'
                    ? 'https://apps.apple.com'
                    : 'https://play.google.com');
                Linking.openURL(url);
              }}
            >
              <Text style={styles.buttonText}>Atualizar Agora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                // Usuário escolhe continuar com versão antiga
                console.log('Usuário ignorou atualização');
              }}
            >
              <Text style={styles.buttonTextSecondary}>Continuar Usando</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // TUDO OK: Mostrar informações normais
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>✅ Sistema Atualizado</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.okBox}>
            <Text style={styles.okIcon}>✓</Text>
            <Text style={styles.okText}>
              Você está usando a versão mais recente.
            </Text>
          </View>

          <Text style={styles.label}>Versão do App:</Text>
          <Text style={styles.value}>{appVersion}</Text>

          {startupState.versionData && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Versão Recomendada:</Text>
              <Text style={styles.value}>{startupState.versionData.currentVersion}</Text>
            </>
          )}
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  inputField: {
    color: colors.text,
    fontSize: 14,
  },
  inputValue: {
    color: colors.text,
    fontSize: 14,
  },
  value: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  buttonGroupItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  buttonGroupItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonGroupText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  buttonGroupTextActive: {
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggle: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    borderColor: colors.danger,
  },
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusPillActive: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(243, 156, 18, 0.12)'
  },
  statusPillInactive: {
    borderColor: colors.success,
    backgroundColor: 'rgba(39, 174, 96, 0.12)'
  },
  statusPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonSuccess: {
    backgroundColor: colors.success,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  text: {
    color: colors.text,
    fontSize: 16,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  maintenanceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 12,
    textAlign: 'center',
  },
  maintenanceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  maintenanceHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timerBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.warning,
    textAlign: 'center',
  },
  notesBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  okBox: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.success,
  },
  okIcon: {
    fontSize: 20,
    marginRight: 8,
    color: colors.success,
    fontWeight: 'bold',
  },
  okText: {
    flex: 1,
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  footer: {
    height: 32,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
});



