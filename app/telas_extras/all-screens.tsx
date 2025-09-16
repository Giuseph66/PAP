import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface ScreenItem {
  name: string;
  path: string;
  category: string;
  icon: string;
}

export default function AllScreensScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const screens: ScreenItem[] = [
    // Telas de Cliente
    { name: 'Financeiro da Empresa', path: '/cliente/company-finance', category: 'Cliente', icon: 'account-balance' },
    { name: 'Estatísticas da Empresa', path: '/cliente/company-stats', category: 'Cliente', icon: 'bar-chart' },
    
    // Telas de Courier
    { name: 'Financeiro do Entregador', path: '/courier/courier-finance', category: 'Entregador', icon: 'account-balance-wallet' },
    { name: 'Dashboard do Entregador', path: '/courier/courier-dashboard', category: 'Entregador', icon: 'dashboard' },
    
    // Telas Extras
    { name: 'Aceitar Corrida', path: '/telas_extras/aceitar-corrida', category: 'Telas Extras', icon: 'directions-car' },
    { name: 'Painel Administrativo', path: '/telas_extras/admin-panel', category: 'Telas Extras', icon: 'admin-panel-settings' },
    { name: 'Criar Envio', path: '/telas_extras/create-shipment', category: 'Telas Extras', icon: 'add-box' },
    { name: 'Finanças', path: '/telas_extras/finance', category: 'Telas Extras', icon: 'account-balance-wallet' },
    { name: 'Mapa e Rota', path: '/telas_extras/map-route', category: 'Telas Extras', icon: 'map' },
    { name: 'Navegação de Corrida', path: '/telas_extras/navegacao-corrida', category: 'Telas Extras', icon: 'navigation' },
    { name: 'Perfil', path: '/telas_extras/profile', category: 'Telas Extras', icon: 'person' },
    { name: 'Envios', path: '/telas_extras/shipments', category: 'Telas Extras', icon: 'local-shipping' },
    
    // Telas de Tabs
    { name: 'Início', path: '/(tabs)/home', category: 'Tabs', icon: 'home' },
    { name: 'Entregas', path: '/(tabs)/deliveries', category: 'Tabs', icon: 'local-shipping' },
    { name: 'Teste Corridas', path: '/(tabs)/test-rides', category: 'Tabs', icon: 'directions-car' },
    { name: 'Teste Auth', path: '/(tabs)/auth-test', category: 'Tabs', icon: 'security' },
    { name: 'Ganhos', path: '/(tabs)/earnings', category: 'Tabs', icon: 'attach-money' },
  ];

  const groupedScreens = screens.reduce((acc, screen) => {
    if (!acc[screen.category]) {
      acc[screen.category] = [];
    }
    acc[screen.category].push(screen);
    return acc;
  }, {} as Record<string, ScreenItem[]>);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Todas as Telas do App
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Clique em qualquer tela para visualizá-la
        </Text>
      </View>

      {Object.entries(groupedScreens).map(([category, screens]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>
            {category}
          </Text>
          <View style={styles.screensGrid}>
            {screens.map((screen) => (
              <Card key={screen.path} style={styles.screenCard}>
                <TouchableOpacity
                  style={styles.screenButton}
                  onPress={() => handleNavigate(screen.path)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${colors.tint}15` }]}>
                    <MaterialIcons 
                      name={screen.icon as any} 
                      size={24} 
                      color={colors.tint} 
                    />
                  </View>
                  <Text style={[styles.screenName, { color: colors.text }]} numberOfLines={2}>
                    {screen.name}
                  </Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  screensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  screenCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  screenButton: {
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});