import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserRole } from '@/types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const roleOptions: RoleOption[] = [
  {
    role: 'cliente',
    title: 'Sou Cliente',
    description: 'Quero enviar pacotes e produtos',
    icon: 'shippingbox.fill',
    color: '#3b82f6',
  },
  {
    role: 'courier',
    title: 'Sou Entregador',
    description: 'Quero fazer entregas e ganhar dinheiro',
    icon: 'bicycle',
    color: '#10b981',
  },
];

export default function RoleSelectionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Atenção', 'Selecione uma opção para continuar');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate role registration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate based on role
      if (selectedRole === 'courier') {
        router.push('/auth/courier-onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar perfil. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Como você vai usar o app?
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Escolha uma opção para personalizar sua experiência
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {roleOptions.map((option) => (
          <TouchableOpacity
            key={option.role}
            onPress={() => handleRoleSelect(option.role)}
            style={styles.optionWrapper}
          >
            <Card
              style={[
                styles.optionCard,
                selectedRole === option.role && {
                  borderColor: option.color,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${option.color}20` },
                  ]}
                >
                  <IconSymbol
                    name={option.icon}
                    size={32}
                    color={option.color}
                  />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.tabIconDefault }]}>
                    {option.description}
                  </Text>
                </View>

                {selectedRole === option.role && (
                  <View style={styles.selectedIndicator}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color={option.color}
                    />
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continuar"
          onPress={handleContinue}
          disabled={!selectedRole}
          loading={isLoading}
          fullWidth
          size="lg"
        />
        
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: colors.tabIconDefault }]}>
            Não tem uma conta?{' '}
            <Text 
              style={[styles.registerLink, { color: colors.tint }]}
              onPress={() => router.push('/auth/register')}
            >
              Criar conta
            </Text>
          </Text>
        </View>
        
        <Text style={[styles.note, { color: colors.tabIconDefault }]}>
          Você pode alterar essa configuração depois nas configurações do app
        </Text>
      </View>

      <Loading visible={isLoading} overlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    flex: 1,
    gap: 16,
  },
  optionWrapper: {
    width: '100%',
  },
  optionCard: {
    padding: 20,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  footer: {
    paddingTop: 20,
    gap: 16,
  },
  registerContainer: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
