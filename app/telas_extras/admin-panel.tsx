import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
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

// Tela de administração para testar diferentes funcionalidades do sistema

interface AdminUser {
  id: string;
  nome: string;
  email: string;
  role: 'cliente' | 'courier';
  createdAt: Date;
  telefone?: string;
  isAdmin?: boolean;
}

export default function AdminPanelScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newUserRole, setNewUserRole] = useState<'cliente' | 'courier'>('cliente');

  // Load current user and users list
  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      // Get current user
      const userData = await authService.getCurrentUserData();
      setCurrentUser(userData);
      
      // Load real users from database
      const realUsers = await authService.getAllUsers();
      const adminUsers: AdminUser[] = realUsers.map(user => {
        let createdAt: Date;
        try {
          if (user.createdAt instanceof Date) {
            createdAt = user.createdAt;
          } else if (user.createdAt && typeof user.createdAt === 'object' && 'seconds' in user.createdAt) {
            // Firebase Timestamp
            createdAt = new Date((user.createdAt as any).seconds * 1000);
          } else {
            createdAt = new Date(user.createdAt || Date.now());
          }
        } catch (error) {
          console.error('Error parsing date:', error);
          createdAt = new Date();
        }

        return {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role as 'cliente' | 'courier',
          createdAt,
          telefone: user.telefone,
          isAdmin: user.isAdmin,
        };
      });
      
      setUsers(adminUsers);
      setFilteredUsers(adminUsers);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do administrador');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        user =>
          user.nome.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const handleSwitchUserRole = async (userId: string, newRole: 'cliente' | 'courier') => {
    Alert.alert(
      'Confirmar Alteração',
      `Deseja realmente alterar o papel deste usuário para ${newRole === 'cliente' ? 'Empresa' : 'Entregador'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              await authService.updateUserRole(userId, newRole);
              
              // Update local state
              setUsers(prevUsers => 
                prevUsers.map(user => 
                  user.id === userId ? { ...user, role: newRole } : user
                )
              );
              
              setFilteredUsers(prevUsers => 
                prevUsers.map(user => 
                  user.id === userId ? { ...user, role: newRole } : user
                )
              );
              
              Alert.alert('Sucesso', 'Papel do usuário atualizado no banco de dados');
            } catch (error) {
              console.error('Error updating user role:', error);
              Alert.alert('Erro', 'Falha ao atualizar papel do usuário');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTestAsRole = async (role: 'cliente' | 'courier') => {
    Alert.alert(
      'Modo Teste',
      `Testando como ${role === 'cliente' ? 'Empresa' : 'Entregador'}. Seu papel será alterado temporariamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              await authService.updateCurrentUserRole(role);
              
              Alert.alert(
                'Sucesso', 
                `Agora você está testando como ${role === 'cliente' ? 'Empresa' : 'Entregador'}. Recarregue a tela para ver as mudanças.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reload the screen to reflect changes
                      loadAdminData();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error updating current user role:', error);
              Alert.alert('Erro', 'Falha ao alterar seu papel');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewAnalytics = () => {
    Alert.alert(
      'Analytics',
      'Painel de analytics do sistema.',
      [{ text: 'OK' }]
    );
  };

  const handleManageSettings = () => {
    Alert.alert(
      'Configurações',
      'Gerenciamento de configurações do sistema.',
      [{ text: 'OK' }]
    );
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

  // Check if current user is admin
  const isAdmin = currentUser.isAdmin;
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Acesso Negado
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.tabIconDefault }]}>
            Você não tem permissão para acessar o painel administrativo.
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: 'white' }]}>
            Painel Administrativo
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
            Gerencie usuários e configurações
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Ações Rápidas
        </Text>
        <View style={styles.quickActions}>
          <Button
            title="Testar como Empresa"
            onPress={() => handleTestAsRole('cliente')}
            variant="secondary"
            style={styles.quickActionButton}
            icon={<MaterialIcons name="business" size={16} color={colors.tint} />}
          />
          <Button
            title="Testar como Entregador"
            onPress={() => handleTestAsRole('courier')}
            variant="secondary"
            style={styles.quickActionButton}
            icon={<MaterialIcons name="motorcycle" size={16} color={colors.tint} />}
          />
        </View>
      </View>

      {/* System Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Estatísticas do Sistema
        </Text>
        <View style={styles.statsContainer}>
          <Card style={StyleSheet.flatten([styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
            <MaterialIcons name="people" size={24} color={colors.tint} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {users.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
              Usuários
            </Text>
          </Card>
          <Card style={StyleSheet.flatten([styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
            <MaterialIcons name="business" size={24} color="#3b82f6" />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {users.filter(u => u.role === 'cliente').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
              Empresas
            </Text>
          </Card>
          <Card style={StyleSheet.flatten([styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
            <MaterialIcons name="motorcycle" size={24} color="#10b981" />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {users.filter(u => u.role === 'courier').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
              Entregadores
            </Text>
          </Card>
        </View>
      </View>

      {/* User Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Gerenciamento de Usuários
        </Text>
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Buscar usuários..."
            value={searchQuery}
            onChangeText={handleSearch}
            leftIcon={<MaterialIcons name="search" size={20} color={colors.tabIconDefault} />}
          />
        </View>
        
        {/* Users List */}
        <View style={styles.usersList}>
          {filteredUsers.map(user => (
            <Card key={user.id} style={StyleSheet.flatten([styles.userCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <MaterialIcons 
                    name={user.role === 'cliente' ? 'business' : 'motorcycle'} 
                    size={24} 
                    color={user.role === 'cliente' ? '#3b82f6' : '#10b981'} 
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {user.nome}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.tabIconDefault }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                  {user.telefone && (
                    <Text style={[styles.userPhone, { color: colors.tabIconDefault }]} numberOfLines={1}>
                      {user.telefone}
                    </Text>
                  )}
                  <Text style={[styles.userDate, { color: colors.tabIconDefault }]}>
                    Criado em {formatDate(user.createdAt)}
                  </Text>
                </View>
              </View>
              
                <View style={styles.userActions}>
                <View style={styles.roleBadge}>
                  <Text style={[
                    styles.roleText,
                    { 
                      color: user.role === 'cliente' ? '#3b82f6' : '#10b981',
                      backgroundColor: user.role === 'cliente' ? '#3b82f620' : '#10b98120'
                    }
                  ]}>
                    {user.role === 'cliente' ? 'Empresa' : 'Entregador'}
                  </Text>
                  {user.isAdmin && (
                    <Text style={[
                      styles.roleText,
                      { 
                        color: '#ef4444',
                        backgroundColor: '#ef444420',
                        marginLeft: 8
                      }
                    ]}>
                      Admin
                    </Text>
                  )}
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={StyleSheet.flatten([styles.actionButton, { backgroundColor: `${colors.tint}20` }])}
                    onPress={() => handleSwitchUserRole(user.id, user.role === 'cliente' ? 'courier' : 'cliente')}
                  >
                    <MaterialIcons 
                      name="swap-horiz" 
                      size={20} 
                      color={colors.tint} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
          
          {filteredUsers.length === 0 && (
            <Card style={StyleSheet.flatten([styles.emptyCard, { backgroundColor: colors.background }])}>
              <MaterialIcons name="people-outline" size={48} color={colors.tabIconDefault} />
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                Nenhum usuário encontrado
              </Text>
            </Card>
          )}
        </View>
      </View>

      {/* System Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Gerenciamento do Sistema
        </Text>
        <Card style={StyleSheet.flatten([styles.menuCard, { backgroundColor: colors.background }])}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleViewAnalytics}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: `${colors.tint}20` }]}>
                <MaterialIcons name="bar-chart" size={20} color={colors.tint} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  Analytics
                </Text>
                <Text style={[styles.menuSubtitle, { color: colors.tabIconDefault }]}>
                  Visualizar estatísticas do sistema
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>
          
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleManageSettings}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: `${colors.tint}20` }]}>
                <MaterialIcons name="settings" size={20} color={colors.tint} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  Configurações
                </Text>
                <Text style={[styles.menuSubtitle, { color: colors.tabIconDefault }]}>
                  Gerenciar configurações do sistema
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>
        </Card>
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
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
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    padding: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  menuCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
  footerSpacer: {
    height: 32,
  },
});