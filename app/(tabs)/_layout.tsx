import { HapticTab } from '@/components/haptic-tab';
import { firestore } from '@/config/firebase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { versionManagementService } from '@/services/version-management.service';
import { Session } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs, router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

// Lê a sessão do SecureStore via authService
const getUserRole = async (): Promise<'cliente' | 'courier'> => {
  const session = await authService.getSession();
  if (!session) return 'cliente';
  return session.role === 'courier' ? 'courier' : 'cliente';
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userRole, setUserRole] = useState<'cliente' | 'courier'>('cliente');
  const [startupStatus, setStartupStatus] = useState<'ok' | 'blocked' | 'maintenance' | 'outdated'>('ok');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const role = await getUserRole();
      setUserRole(role);
      console.log('userRoleaaaaaaaaa', role);
      // Sem sessão: mantém acesso como cliente (sem redirecionar)
      try {
        const state = await versionManagementService.checkAppStartupState();
        if (state.maintenanceStatus === 'maintenance') {
          setStartupStatus('maintenance');
          router.replace('/telas_extras/version-management');
          return;
        }
        if (state.versionStatus === 'blocked') {
          setStartupStatus('blocked');
          router.replace('/telas_extras/version-management');
          return;
        }
        setStartupStatus(state.versionStatus || 'ok');
      } catch (e) {
        setStartupStatus('ok');
      } finally {
        setChecking(false);
      }
    })();

    const unsubscribe = authService.onSessionChanged((session: Session | null) => {
      const role = session?.role === 'courier' ? 'courier' : 'cliente';
      setUserRole(role);
      // Sem redirecionar para login aqui; fluxo aberto como cliente
    });

    // Realtime de versão/manutenção
    const versionRef = doc(firestore, 'system-config', 'app-version');
    const maintRef = doc(firestore, 'system-config', 'maintenance');
    const resub = () => {
      (async () => {
        try {
          const state = await versionManagementService.checkAppStartupState();
          if (state.maintenanceStatus === 'maintenance') {
            setStartupStatus('maintenance');
            router.replace('/telas_extras/version-management');
            return;
          }
          if (state.versionStatus === 'blocked') {
            setStartupStatus('blocked');
            router.replace('/telas_extras/version-management');
            return;
          }
          setStartupStatus(state.versionStatus || 'ok');
        } catch {
          setStartupStatus('ok');
        }
      })();
    };
    const un1 = onSnapshot(versionRef, resub);
    const un2 = onSnapshot(maintRef, resub);

    return () => {
      unsubscribe?.();
      un1();
      un2();
    };
  }, []);

  // Intercepta back apenas quando o Tabs está focado
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert('Sair', 'Deseja fechar o aplicativo?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  // Bloqueado/manutenção: evita renderizar Tabs aqui
  if (startupStatus === 'blocked' || startupStatus === 'maintenance') {
    return null;
  }

  // Renderiza mesmo durante verificação; gate de manutenção já impede Tabs

  const initialRouteName = userRole === 'courier' ? 'courier/courier-home' : 'cliente/business-home';

  return (
    <Tabs
      initialRouteName={initialRouteName}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}>
      {/* Client Tabs - Only visible when userRole is 'cliente' */}
      <Tabs.Screen
        name="cliente/company-stats"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="bar-chart" size={focused ? 26 : 24} color={color} />
          ),
          href: userRole === 'cliente' ? '/cliente/company-stats' : null,
        }}
      />
      <Tabs.Screen
        name="cliente/business-home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="home" size={focused ? 26 : 24} color={color} />
          ),
          href: userRole === 'cliente' ? '/cliente/business-home' : null,
        }}
      />
      <Tabs.Screen
        name="cliente/company-finance"
        options={{
          title: 'Gastos',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="attach-money" size={focused ? 26 : 24} color={color} />
          ),
          href: userRole === 'cliente' ? '/cliente/company-finance' : null,
        }}
      />

      {/* Courier Tabs - Only visible when userRole is 'courier' */}
      <Tabs.Screen
        name="courier/courier-stats"
        options={{
          title: 'Estatísticas',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="bar-chart" size={focused ? 26 : 24} color={color} />
          ),
          href: userRole === 'courier' ? '/courier/courier-stats' : null,
        }}
      />
      <Tabs.Screen
        name="courier/courier-home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="home" size={focused ? 26 : 24} color={color} />
          ),
          href: userRole === 'courier' ? '/courier/courier-home' : null,
        }}
      />
      <Tabs.Screen
        name="courier/courier-finance"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="account-balance-wallet" size={focused ? 26 : 24} color={color} />
          ),
          href: userRole === 'courier' ? '/courier/courier-finance' : null,
        }}
      />
    </Tabs>
  );
}
