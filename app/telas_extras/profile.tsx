import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import React, { useEffect, useState } from 'react';
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
  TouchableOpacity,
  View,
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
  memberSince: string;
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
          telefone: userData.telefone || '',
          role: userData.role as 'cliente' | 'courier',
          perfilCompleto: userData.perfilCompleto ?? false,
          docsVerificados: true, // Mock for now
          memberSince: new Date(userData.createdAt).getFullYear().toString(),
          rating: userData.role === 'courier' ? 4.8 : undefined,
          totalDeliveries: userData.role === 'courier' ? 127 : undefined,
          totalEarnings: userData.role === 'courier' ? 2450.50 : undefined,
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

  const handlePaymentMethods = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

  const handleNotifications = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

  const handleSupport = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

  const handlePrivacy = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

  const handleTerms = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

  const handleSecurity = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

  const handleHistory = () => {
    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
  };

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Funcionalidade em desenvolvimento');
          },
        },
      ]
    );
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Alterar Foto',
      'Escolha uma opção',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Câmera', onPress: () => Alert.alert('Info', 'Funcionalidade em desenvolvimento') },
        { text: 'Galeria', onPress: () => Alert.alert('Info', 'Funcionalidade em desenvolvimento') },
      ]
    );
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
                Membro desde {user.memberSince}
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
                42
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Envios
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="attach-money" size={24} color="#10b981" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                R$ 1.240,50
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
            icon="creditcard"
            title="Formas de Pagamento"
            subtitle="Cartões e PIX"
            onPress={handlePaymentMethods}
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
          <View style={styles.separator} />
          <MenuItem
            icon="settings"
            title="Configurações"
            subtitle="Personalizar experiência"
            onPress={() => Alert.alert('Info', 'Funcionalidade em desenvolvimento')}
          />
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
              icon="bug-report"
              title="Modo Teste"
              subtitle="Testar diferentes funcionalidades"
              onPress={handleTestMode}
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
        
        <Button
          title="Excluir Conta"
          variant="danger"
          onPress={handleDeleteAccount}
          fullWidth
          style={styles.deleteButton}
          icon={<MaterialIcons name="delete" size={16} color="#ffffff" />}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: colors.tabIconDefault }]}>
          P A P (Ponto a Ponto) v1.0.5
        </Text>
        <Text style={[styles.copyright, { color: colors.tabIconDefault }]}>
          © 2025 Todos os direitos reservados
        </Text>
      </View>

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
});
