import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { avatarService } from '@/services/avatar.service';
import { companyStatsService } from '@/services/company-stats.service';
import { localNotificationService } from '@/services/local-notification.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { supportService, SupportType } from '@/services/support.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
}

const ICON_MAP: Record<string, ComponentProps<typeof MaterialIcons>['name']> = {
  // SF Symbols / generic -> MaterialIcons
  'person.circle': 'person',
  'creditcard': 'credit-card',
  'bell': 'notifications',
  'location': 'location-on',
  'questionmark.circle': 'help-outline',
  'envelope': 'mail',
  'doc.text': 'description',
  'lock.shield': 'admin-panel-settings',
  'edit': 'edit',
  'security': 'security',
  'history': 'history',
  'star': 'star',
  'settings': 'settings',
  'logout': 'logout',
  'delete': 'delete',
  'verified': 'verified',
  'camera': 'camera-alt',
  'phone': 'phone',
  'email': 'email',
};

const { width } = Dimensions.get('window');

const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, rightElement }: MenuItemProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const materialIconName = ICON_MAP[icon] || (icon as ComponentProps<typeof MaterialIcons>['name']) || 'help-outline';

  return (
    <TouchableOpacity 
      style={[styles.menuItem, { backgroundColor: colors.background }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: `${colors.tint}15` }]}>
          <MaterialIcons name={materialIconName} size={22} color={colors.tint} />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.menuSubtitle, { color: colors.tabIconDefault }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {rightElement}
        {showArrow && (
          <MaterialIcons 
            name="chevron-right" 
            size={20} 
            color={colors.tabIconDefault} 
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: 'cliente' | 'courier';
  perfilCompleto: boolean;
  docsVerificados: boolean;
  createdAt: Date;
  avatar?: string;
  rating?: number;
  totalDeliveries?: number;
  totalEarnings?: number;
  // Company specific fields
  cnpj?: string;
  responsavel?: string;
  // Courier specific fields
  cpf?: string;
  veiculo?: string;
  capacidadeKg?: number;
  // Admin field
  isAdmin?: boolean;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  // Empresa: métricas reais
  const [companyShipmentsCount, setCompanyShipmentsCount] = useState<number>(0);
  const [companyTotalSpent, setCompanyTotalSpent] = useState<number>(0);
  
  // Modais novos
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [supportType, setSupportType] = useState<SupportType>('sugestao');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUserData();
      if (userData) {
        setUser({
          id: userData.id,
          nome: userData.nome || 'Usuário',
          email: userData.email,
          avatar: userData.avatar,
          telefone: userData.telefone || '',
          role: userData.role as 'cliente' | 'courier',
          perfilCompleto: userData.perfilCompleto ?? false,
          docsVerificados: true, // Mock for now
          createdAt: userData.createdAt,
          // Company specific fields
          cnpj: userData.cnpj,
          responsavel: userData.responsavel,
          // Courier specific fields
          cpf: userData.cpf,
          veiculo: userData.veiculo,
          capacidadeKg: userData.capacidadeKg,
          // Admin field
          isAdmin: userData.isAdmin,
        });

        // Se empresa, carregar métricas reais
        if (userData.role === 'cliente' && userData.id) {
          const [shipments, fin] = await Promise.all([
            shipmentFirestoreService.getShipmentsByClient(String(userData.id), 200),
            companyStatsService.getFinancialStats(String(userData.id)),
          ]);
          setCompanyShipmentsCount(shipments.length);
          setCompanyTotalSpent(fin.totalSpent || 0);
        }

        // Se entregador, carregar métricas reais
        if (userData.role === 'courier' && userData.id) {
          const courierShipments = await shipmentFirestoreService.getShipmentsByCourier(String(userData.id), 200);
          const delivered = courierShipments.filter((s) => s.state === 'DELIVERED');
          const totalDeliveries = delivered.length;
          const totalEarnings = delivered.reduce((sum, s) => sum + (s.quote?.preco ?? 0), 0);

          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  totalDeliveries,
                  totalEarnings,
                }
              : prev
          );
        }
      } else {
        // Redirect to login screen if not authenticated
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Redirect to login screen on error
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    if (!user) return;
    setFormNome(user.nome || '');
    setFormTelefone(user.telefone || '');
    setIsEditing(true);
  };

  // Notificações - apenas toggle
  const handleNotifications = () => {
    // Switch já manipula o estado localmente
    // Aqui você pode integrar com FCM se necessário
  };

  // Suporte - Modal de reclame/sugestão
  const handleSupport = () => {
    setSupportType('sugestao');
    setSupportSubject('');
    setSupportDescription('');
    setShowSupportModal(true);
  };

  // Enviar ticket de suporte
  const handleSubmitSupport = async () => {
    if (!supportSubject.trim() || !supportDescription.trim()) {
      Alert.alert('Validação', 'Preenchaa todos os campos');
      return;
    }

    try {
      setSupportSubmitting(true);
      const ticketId = await supportService.createTicket(
        supportType,
        supportSubject,
        supportDescription,
        'media'
      );

      Alert.alert(
        'Sucesso',
        `Seu ticket #${ticketId.substring(0, 8)} foi registrado. Nossa equipe analisará em breve.`
      );
      setShowSupportModal(false);
      setSupportSubject('');
      setSupportDescription('');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar ticket de suporte');
    } finally {
      setSupportSubmitting(false);
    }
  };

  // Privacidade - Modal com política
  const handlePrivacy = () => {
    setShowPrivacyModal(true);
  };

  // Termos - Modal com termos
  const handleTerms = () => {
    setShowTermsModal(true);
  };

  // Segurança - Modal com informações
  const handleSecurity = () => {
    setShowSecurityModal(true);
  };

  const handleHistory = () => {
    if (user?.role === 'cliente') {
      router.push('/telas_extras/shipments');
    } else {
      router.push('/telas_extras/courier-history');
    }
  };

  // const handleSettings = () => {
  //   Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  // };

  const handleSwitchRole = () => {
    if (!user) return;
    
    const newRole = user.role === 'cliente' ? 'courier' : 'cliente';
    const roleLabel = newRole === 'cliente' ? 'Empresa' : 'Entregador';
    
    Alert.alert(
      'Alternar Papel',
      `Deseja realmente mudar para o papel de ${roleLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setSaving(true);
              await authService.updateCurrentUserRole(newRole);
              
              // Update local state
              setUser(prev => prev ? { ...prev, role: newRole } : prev);
              Alert.alert('Sucesso', `Papel alterado para ${roleLabel} no banco de dados`);
              if (newRole === 'cliente') {
                router.replace('/(tabs)/cliente/business-home');
              } else {
                router.replace('/(tabs)/courier/courier-home');
              }
            } catch (error) {
              console.error('Error switching role:', error);
              Alert.alert('Erro', 'Falha ao alterar o papel');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleTestMode = () => {
    router.push('/telas_extras/admin-panel');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              setUser(null);
              router.replace('/telas_extras/profile');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Erro', 'Não foi possível sair da conta');
            }
          },
        },
      ]
    );
  };

  // Avatar - Camera/Galeria
  const handleChangeAvatar = async () => {
    Alert.alert(
      'Alterar Foto',
      'Escolha uma opção',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Câmera',
          onPress: () => pickImageFromCamera()
        },
        { 
          text: 'Galeria', 
          onPress: () => pickImageFromGallery()
        },
      ]
    );
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        await uploadAvatarDirect(asset.base64, asset.uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao acessar câmera');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        await uploadAvatarDirect(asset.base64, asset.uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao acessar galeria');
    }
  };

  const uploadAvatarDirect = async (rawBase64?: string | null, imageUri?: string) => {
    try {
      setAvatarLoading(true);
      if (!rawBase64) {
        throw new Error('Não foi possível ler a imagem. Tente novamente.');
      }
      const dataUrl = `data:image/jpeg;base64,${rawBase64}`;

      if (avatarService.isOverLimit(dataUrl)) {
        Alert.alert('Imagem grande', 'A imagem selecionada excede 1MB mesmo com compressão. Escolha uma imagem menor.');
        return;
      }

      await avatarService.saveAvatar(dataUrl);
      setUser(prev => prev ? { ...prev, avatar: dataUrl } : prev);
      Alert.alert('Sucesso', 'Foto de perfil atualizada');
    } catch (error) {
      console.error('Erro ao fazer upload de avatar:', error);
      Alert.alert('Erro', (error as Error)?.message || 'Falha ao atualizar foto de perfil');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formNome.trim()) {
      Alert.alert('Validação', 'Informe seu nome');
      return;
    }
    try {
      setSaving(true);
      await authService.updateUserProfile({ nome: formNome.trim(), telefone: formTelefone.trim() });
      // Atualiza estado local rapidamente
      setUser((prev) => prev ? { ...prev, nome: formNome.trim(), telefone: formTelefone.trim(), perfilCompleto: !!formNome.trim() && !!formTelefone.trim() } : prev);
      setIsEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado');
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setSaving(false);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  
    const formatDate = (date: Date | string) => {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) {
          return 'Data inválida';
        }
        return new Intl.DateTimeFormat('pt-BR').format(dateObj);
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'Data inválida';
      }
    };
  if (loading) {
    return <Loading />;
  }

  // This should never happen since we redirect to login, but just in case
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Redirecionando para login...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with gradient */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: 'white' }]}>
            {user.isAdmin ? 'Admin' : user.role === 'cliente' ? 'Perfil da Empresa' : 'Perfil do Entregador'}
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            {user.isAdmin ? 'Modo Administrador' : 'Gerencie suas informações'}
          </Text>
        </View>
      </View>

      {/* User Info Card */}
      <Card style={StyleSheet.flatten([styles.userCard, { marginTop: -20 }])}>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={40} color={colors.tint} />
              )}
            </View>
            <View style={[styles.cameraIcon, { backgroundColor: colors.tint }]}>
              <MaterialIcons name="photo-camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user.role === 'cliente' ? user.nome : user.nome}
            </Text>
            <Text style={[styles.userEmail, { color: colors.tabIconDefault }]}>
              {user.email}
            </Text>
            <View style={styles.userBadge}>
              {user.docsVerificados && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={14} color="#10b981" />
                  <Text style={styles.verifiedText}>Verificado</Text>
                </View>
              )}
              <Text style={[styles.memberSince, { color: colors.tabIconDefault }]}>
                Membro desde {formatDate(user.createdAt)}
              </Text>
            </View>
            {user.role === 'courier' && user.rating && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#fbbf24" />
                <Text style={[styles.ratingText, { color: colors.text }]}>
                  {user.rating.toFixed(1)}
                </Text>
                <Text style={[styles.ratingLabel, { color: colors.tabIconDefault }]}>
                  ({user.totalDeliveries} entregas)
                </Text>
              </View>
            )}
          </View>
        </View>
        <Button
          title="Editar Perfil"
          variant="outline"
          size="sm"
          onPress={handleEditProfile}
          icon={<MaterialIcons name="edit" size={16} color={colors.tint} />}
        />
      </Card>

      {/* Seção de Teste de Notificações (Local) */}
      {user.isAdmin && (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Teste de Notificações</Text>
        <Card style={styles.menuCard}>
          <View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>
            <Button
              title="Teste imediato"
              onPress={async () => {
                try {
                  await localNotificationService.register();
                  await localNotificationService.sendNow('Teste Imediato', 'Notificação enviada agora');
                } catch (e) {
                  Alert.alert('Notificações', 'Falha ao enviar: ' + String((e as Error)?.message || e));
                }
              }}
            />
            <Button
              title="Teste em 10s"
              onPress={async () => {
                try {
                  await localNotificationService.register();
                  await localNotificationService.scheduleIn(10, 'Teste em 10s', 'Você deve receber essa notificação em 10 segundos');
                  Alert.alert('Notificações', 'Agendada para 10s. Você pode fechar o app.');
                } catch (e) {
                  Alert.alert('Notificações', 'Falha ao agendar: ' + String((e as Error)?.message || e));
                }
              }}
            />
            </View>

      {/* Botão de Versionamento e Manutenção */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <Button
        title="📦 Versão & Manutenção"
        onPress={() => router.push('/telas_extras/version-management')}
        variant="secondary"
        icon={<MaterialIcons name="settings-backup-restore" size={16} color={colors.text} />}
      />
    </View>
          </Card>
        </View>

      )}

      {/* Company Information Section */}
      {user.role === 'cliente' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Informações da Empresa
          </Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="business"
              title="Razão Social"
              subtitle={user.nome}
              onPress={() => {}}
              showArrow={false}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="domain"
              title="CNPJ"
              subtitle={user.cnpj || 'Não informado'}
              onPress={() => {}}
              showArrow={false}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="person"
              title="Responsável"
              subtitle={user.responsavel || 'Não informado'}
              onPress={() => {}}
              showArrow={false}
            />
          </Card>
        </View>
      )}
      {/* Teste de telas extras 
      <View style={styles.teste_telas_extras} >
        <Text>Teste de telas extras</Text>
        <Button
          title="QR Scanner"
          onPress={() => {router.push('/confirmacao/qr-scanner')}}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="arrow-right" size={16} color={colors.tint} />}
        />
        <Button
          title="QR Display"
          onPress={() => {router.push('/confirmacao/qr-display')}}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="arrow-right" size={16} color={colors.tint} />}
        />
        <Button
          title="Confirmation Success"
          onPress={() => {router.push('/confirmacao/confirmation-success')}}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="arrow-right" size={16} color={colors.tint} />}
        />
      </View>
        */}
      {/* Courier Information Section */}
      {user.role === 'courier' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Informações do Entregador
          </Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="badge"
              title="CPF"
              subtitle={user.cpf || 'Não informado'}
              onPress={() => {}}
              showArrow={false}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="directions-car"
              title="Veículo"
              subtitle={user.veiculo ? user.veiculo.charAt(0).toUpperCase() + user.veiculo.slice(1) : 'Não informado'}
              onPress={() => {}}
              showArrow={false}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="scale"
              title="Capacidade"
              subtitle={user.capacidadeKg ? `${user.capacidadeKg} kg` : 'Não informado'}
              onPress={() => {}}
              showArrow={false}
            />
          </Card>
        </View>
      )}

      {/* Stats for Courier */}
      {user.role === 'courier' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Estatísticas
          </Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="local-shipping" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {user.totalDeliveries || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Entregas
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="attach-money" size={24} color="#10b981" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                R$ {(user.totalEarnings || 0).toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Ganhos
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="star" size={24} color="#fbbf24" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {user.rating?.toFixed(1) || '0.0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Avaliação
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Stats for Company */}
      {user.role === 'cliente' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Estatísticas
          </Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="local-shipping" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {companyShipmentsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Envios
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="attach-money" size={24} color="#10b981" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatCurrency(companyTotalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Gastos
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="star" size={24} color="#fbbf24" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                4.9
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Avaliação
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Conta
        </Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="person.circle"
            title="Informações Pessoais"
            subtitle="Nome, telefone, documentos"
            onPress={handleEditProfile}
          />
          <View style={styles.separator} />
          <MenuItem
            icon="security"
            title="Segurança"
            subtitle="Senha e autenticação"
            onPress={handleSecurity}
          />
          <View style={styles.separator} />
          <MenuItem
            icon="history"
            title="Histórico"
            subtitle="Entregas e pedidos"
            onPress={handleHistory}
          />
        </Card>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Preferências
        </Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="bell"
            title="Notificações"
            subtitle={notificationsEnabled ? 'Ativadas' : 'Desativadas'}
            onPress={handleNotifications}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.tint + '40' }}
                thumbColor={notificationsEnabled ? colors.tint : colors.tabIconDefault}
              />
            }
            showArrow={false}
          />
          <View style={styles.separator} />
          <MenuItem
            icon="location"
            title="Localização"
            subtitle={locationEnabled ? 'Permitida' : 'Negada'}
            onPress={() => {}}
            rightElement={
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: colors.border, true: colors.tint + '40' }}
                thumbColor={locationEnabled ? colors.tint : colors.tabIconDefault}
              />
            }
            showArrow={false}
          />
          {/* 
          <View style={styles.separator} />
          <MenuItem
            icon="settings"
            title="Configurações"
            subtitle="Personalizar experiência"
            onPress={() => handleSettings()}
          />
          */}
        </Card>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Suporte
        </Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="questionmark.circle"
            title="Central de Ajuda"
            subtitle="FAQ e tutoriais"
            onPress={handleSupport}
          />
          <View style={styles.separator} />
          <MenuItem
            icon="envelope"
            title="Fale Conosco"
            subtitle="Envie sua dúvida ou sugestão"
            onPress={handleSupport}
          />
        </Card>
      </View>

      {/* Admin Section */}
      {user?.isAdmin && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Administração
          </Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="swap-horizontal-circle"
              title="Alternar Papel"
              subtitle={`Atual: ${user.role === 'cliente' ? 'Empresa' : 'Entregador'}`}
              onPress={handleSwitchRole}
            />
            <View style={styles.separator} />
            <MenuItem
              icon="admin-panel-settings"
              title="Painel Administrativo"
              subtitle="Gerenciar usuários e configurações"
              onPress={() => router.push('/telas_extras/admin-panel')}
            />
          </Card>
        </View>
      )}

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Legal
        </Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="doc.text"
            title="Termos de Uso"
            onPress={handleTerms}
          />
          <View style={styles.separator} />
          <MenuItem
            icon="lock.shield"
            title="Política de Privacidade"
            onPress={handlePrivacy}
          />
        </Card>
      </View>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <Button
          title="Sair da Conta"
          variant="outline"
          onPress={handleLogout}
          fullWidth
          icon={<MaterialIcons name="logout" size={16} color={colors.tint} />}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: colors.tabIconDefault }]}>
          P A P (Ponto a Ponto) v{Constants.expoConfig?.version}
        </Text>
        <Text style={[styles.copyright, { color: colors.tabIconDefault }]}>
          © 2025 Todos os direitos reservados
        </Text>
      </View>

      {/* MODAL: Suporte */}
      <Modal
        visible={showSupportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Enviar Mensagem</Text>
              <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.tabIconDefault} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Tipo de Mensagem</Text>
              <View style={styles.typePicker}>
                {(['reclamacao', 'sugestao', 'duvida', 'bug'] as SupportType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSupportType(type)}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: supportType === type ? colors.tint : colors.background,
                        borderColor: supportType === type ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: supportType === type ? '#fff' : colors.text },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.text, marginTop: 16 }]}>Assunto</Text>
              <Input
                placeholder="Título ou resumo"
                value={supportSubject}
                onChangeText={setSupportSubject}
                editable={!supportSubmitting}
              />

              <Text style={[styles.modalLabel, { color: colors.text, marginTop: 12 }]}>Descrição</Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Descreva seu problema ou sugestão"
                placeholderTextColor={colors.tabIconDefault}
                multiline
                numberOfLines={6}
                value={supportDescription}
                onChangeText={setSupportDescription}
                editable={!supportSubmitting}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowSupportModal(false)}
                disabled={supportSubmitting}
              />
              <Button
                title={supportSubmitting ? 'Enviando...' : 'Enviar'}
                onPress={handleSubmitSupport}
                disabled={supportSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Segurança */}
      <Modal
        visible={showSecurityModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSecurityModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Informações de Segurança</Text>
              <TouchableOpacity onPress={() => setShowSecurityModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.tabIconDefault} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.securitySection}>
                <MaterialIcons name="lock" size={24} color={colors.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.securityTitle, { color: colors.text }]}>Senha Segura</Text>
                  <Text style={[styles.securityText, { color: colors.tabIconDefault }]}>
                    Sua senha é salva usando algoritmos SHA-256 com salt único para cada usuário. É impossível para qualquer pessoa visualizar sua senha original.
                  </Text>
                </View>
              </View>

              <View style={styles.securitySection}>
                <MaterialIcons name="location-on" size={24} color={colors.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.securityTitle, { color: colors.text }]}>Localização Privada</Text>
                  <Text style={[styles.securityText, { color: colors.tabIconDefault }]}>
                    Sua localização é usada exclusivamente para rastreamento durante entregas. Nunca é compartilhada, vendida ou exposta publicamente. Os dados são criptografados em trânsito.
                  </Text>
                </View>
              </View>

              <View style={styles.securitySection}>
                <MaterialIcons name="security" size={24} color={colors.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.securityTitle, { color: colors.text }]}>Encriptação de Dados</Text>
                  <Text style={[styles.securityText, { color: colors.tabIconDefault }]}>
                    Todos os seus dados pessoais, informações de contato e histórico são criptografados usando padrão industrial de ponta a ponta. Somente você e sistemas autorizados podem acessar.
                  </Text>
                </View>
              </View>

              <View style={styles.securitySection}>
                <MaterialIcons name="verified-user" size={24} color={colors.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.securityTitle, { color: colors.text }]}>Conformidade Legal</Text>
                  <Text style={[styles.securityText, { color: colors.tabIconDefault }]}>
                    Nossa plataforma está em conformidade com LGPD e normas de proteção de dados. Seus direitos são protegidos por lei.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Entendi"
                onPress={() => setShowSecurityModal(false)}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Privacidade */}
      <Modal
        visible={showPrivacyModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Política de Privacidade</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.tabIconDefault} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>1. Coleta de Dados</Text>
                {'\n\n'}Coletamos informações pessoais quando você se registra, como nome, email, telefone e endereço para processar suas solicitações de entrega. Para entregadores, também coletamos informações de documentos para verificação KYC.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>2. Uso de Dados</Text>
                {'\n\n'}Seus dados são usados para: fornecer serviços de entrega, processar pagamentos, comunicar atualizações, e melhorar nossos serviços. Nunca vendemos seus dados para terceiros.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>3. Segurança de Dados</Text>
                {'\n\n'}Implementamos criptografia de ponta a ponta, hashing seguro de senhas e armazenamento seguro em servidores certificados. Sua privacidade é nossa prioridade.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>4. Informações Específicas para Entregadores</Text>
                {'\n\n'}Sua localização durante entregas é rastreada para segurança e comprovação de entrega, não é exposta ao público. Dados de ganhos e pagamentos são protegidos com mesmo nível de segurança.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>5. Conformidade com Legislação</Text>
                {'\n\n'}Estamos em total conformidade com a Lei Geral de Proteção de Dados (LGPD). Você tem direito a acessar, corrigir ou solicitar exclusão de seus dados.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>6. Contato</Text>
                {'\n\n'}Para questões sobre privacidade, entre em contato através da seção de suporte deste aplicativo.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Concordo"
                onPress={() => setShowPrivacyModal(false)}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Termos de Uso */}
      <Modal
        visible={showTermsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Termos de Uso</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.tabIconDefault} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>1. Aceitação dos Termos</Text>
                {'\n\n'}Ao usar o aplicativo PAP (Ponto a Ponto), você concorda com estes termos. Se não concorda, não use a plataforma.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>2. Serviço de Entregas</Text>
                {'\n\n'}PAP conecta clientes e entregadores para serviços de entrega sob demanda. Não somos responsáveis por danos, perdas ou atrasos além do nosso controle.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>3. Pagamentos e Tarifas</Text>
                {'\n\n'}Os pagamentos são gerenciados integralmente pela plataforma PAP através de métodos seguros.
                {user?.role === 'courier' && (
                  <>
                    {'\n\n'}<Text style={{ fontWeight: 'bold' }}>Para Entregadores:</Text>
                    {'\n'}- Sua solicitação de pagamento é feita através da aba "Financeiro"
                    {'\n'}- Saque no mesmo dia: aplicamos taxa de <Text style={{ fontWeight: 'bold' }}>10%</Text> sobre o valor
                    {'\n'}- Saque em até 30 dias: taxa reduzida para <Text style={{ fontWeight: 'bold' }}>5%</Text> sobre o valor
                    {'\n'}- Após 30 dias: a taxa permanece em <Text style={{ fontWeight: 'bold' }}>5%</Text>
                    {'\n\n'}Exemplo: Se você ganhou R$ 100,00
                    {'\n'}• Saque imediato: recebe R$ 90,00 (R$ 10,00 de taxa)
                    {'\n'}• Saque em 30 dias: recebe R$ 95,00 (R$ 5,00 de taxa)
                  </>
                )}
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>4. Responsabilidades do Entregador</Text>
                {'\n\n'}Você concorda em entregar pacotes com segurança, respeitar as instruções do cliente, manter o veículo em bom estado e fornecer serviço profissional.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>5. Responsabilidades do Cliente</Text>
                {'\n\n'}Você concorda em fornecer informações precisas, pagar pelo serviço, e não enviar itens proibidos ou perigosos.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>6. Cancelamento de Contas</Text>
                {'\n\n'}Você pode solicitar cancelamento a qualquer momento. Saldos pendentes serão processados conforme a política de saque vigente.
              </Text>

              <Text style={[styles.policySection, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>7. Limitação de Responsabilidade</Text>
                {'\n\n'}PAP não é responsável por perdas indiretas, consequenciais ou punitivas. Responsabilidade limitada ao valor pago pelo serviço.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Concordo"
                onPress={() => setShowTermsModal(false)}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading ao salvar avatar */}
      <Modal visible={avatarLoading} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { alignItems: 'center', gap: 12 }]}> 
            <MaterialIcons name="hourglass-top" size={28} color={colors.tint} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Salvando foto...</Text>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <MaterialIcons name="close" size={22} color={colors.tabIconDefault} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Input
                label="Nome"
                placeholder="Seu nome"
                value={formNome}
                onChangeText={setFormNome}
                leftIcon={<MaterialIcons name="person" size={18} color={colors.tabIconDefault} />}
              />
              <View style={{ height: 12 }} />
              <Input
                label="Telefone"
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                value={formTelefone}
                onChangeText={setFormTelefone}
                leftIcon={<MaterialIcons name="phone" size={18} color={colors.tabIconDefault} />}
              />
              {user?.role === 'cliente' && (
                <>
                  <View style={{ height: 12 }} />
                  <Input
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    keyboardType="numeric"
                    value={user.cnpj || ''}
                    onChangeText={() => {}} // Read-only for now
                    leftIcon={<MaterialIcons name="domain" size={18} color={colors.tabIconDefault} />}
                    editable={false}
                  />
                  <View style={{ height: 12 }} />
                  <Input
                    label="Responsável"
                    placeholder="Nome do responsável"
                    value={user.responsavel || ''}
                    onChangeText={() => {}} // Read-only for now
                    leftIcon={<MaterialIcons name="person" size={18} color={colors.tabIconDefault} />}
                    editable={false}
                  />
                </>
              )}
              {user?.role === 'courier' && (
                <>
                  <View style={{ height: 12 }} />
                  <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                    value={user.cpf || ''}
                    onChangeText={() => {}} // Read-only for now
                    leftIcon={<MaterialIcons name="badge" size={18} color={colors.tabIconDefault} />}
                    editable={false}
                  />
                  <View style={{ height: 12 }} />
                  <Input
                    label="Veículo"
                    placeholder="Tipo de veículo"
                    value={user.veiculo ? user.veiculo.charAt(0).toUpperCase() + user.veiculo.slice(1) : ''}
                    onChangeText={() => {}} // Read-only for now
                    leftIcon={<MaterialIcons name="directions-car" size={18} color={colors.tabIconDefault} />}
                    editable={false}
                  />
                  <View style={{ height: 12 }} />
                  <Input
                    label="Capacidade (kg)"
                    placeholder="Capacidade do veículo"
                    keyboardType="numeric"
                    value={user.capacidadeKg ? user.capacidadeKg.toString() : ''}
                    onChangeText={() => {}} // Read-only for now
                    leftIcon={<MaterialIcons name="scale" size={18} color={colors.tabIconDefault} />}
                    editable={false}
                  />
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setIsEditing(false)}
              />
              <Button
                title={saving ? 'Salvando...' : 'Salvar'}
                onPress={handleSaveProfile}
                disabled={saving}
                icon={<MaterialIcons name="check" size={16} color="#fff" />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight,
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    marginVertical: 16,
    textAlign: 'center',
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  userCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
    minWidth: 0, // Permite que o flex funcione corretamente
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    marginBottom: 8,
    flex: 1,
    textAlignVertical: 'center',
    flexWrap: 'nowrap',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  memberSince: {
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingLabel: {
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  menuCard: {
    marginHorizontal: 20,
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    marginLeft: 72,
  },
  actionsSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  deleteButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    marginBottom:60,
    paddingTop: 20,
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingVertical: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  teste_telas_extras: {
    padding: 20,
    backgroundColor: 'red',
    borderRadius: 10,
    margin: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  typePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 14,
  },
  policySection: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
});
