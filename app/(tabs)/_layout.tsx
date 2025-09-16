import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { Session } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

// Lê a sessão do SecureStore via authService
const getUserRole = async (): Promise<'cliente' | 'courier' | null> => {
  const session = await authService.getSession();
  if (!session) return null;
  return session.role === 'courier' ? 'courier' : 'cliente';
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userRole, setUserRole] = useState<'cliente' | 'courier' | null>(null);

  useEffect(() => {
    (async () => {
      const role = await getUserRole();
      setUserRole(role ?? 'cliente');
      console.log('userRoleaaaaaaaaa', role);
      setTimeout(() => {
      if (role === 'courier') {
        router.replace('/(tabs)/courier/courier-home');
        } else {
          router.replace('/(tabs)/cliente/business-home');
        } 
      }, 5000);
    })();

    const unsubscribe = authService.onSessionChanged((session: Session | null) => {
      setUserRole(session?.role === 'courier' ? 'courier' : 'cliente');
    });

    return () => {
      unsubscribe?.();
    };
  }, []);


  return (
    <Tabs
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
          title: 'Ganhos',
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

      {/* Botão de atalho para visualizar todas as telas - Always visible */}
      <Tabs.Screen
        name="all-screens"
        options={{
          title: 'Todas',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="apps" size={focused ? 26 : 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
