import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Tela de seleção de tipo de registro
// Permite ao usuário escolher entre registrar como empresa ou entregador

interface RegistrationType {
  type: 'company' | 'courier';
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

// O ícone 'shippingbox.fill' NÃO existe no MaterialIcons. Recomendo 'local-shipping' para empresa e 'pedal-bike' para entregador, ambos disponíveis no @expo/vector-icons/MaterialIcons.
// Justificativa: Mantém padrão visual consistente e evita erro de renderização.

const registrationTypes: RegistrationType[] = [
  {
    type: 'company',
    title: 'Sou uma Empresa',
    description: 'Quero enviar pacotes e produtos',
    icon: 'local-shipping', // MaterialIcons válido
    color: '#3b82f6',
    features: [
      'Crie envios ilimitados',
      'Rastreamento em tempo real',
      'Integração com sistemas',
      'Relatórios personalizados'
    ]
  },
  {
    type: 'courier',
    title: 'Sou Entregador',
    description: 'Quero fazer entregas e ganhar dinheiro',
    icon: 'pedal-bike', // MaterialIcons válido
    color: '#10b981',
    features: [
      'Receba ofertas próximas',
      'Ganhe por entrega realizada',
      'Saque rápido via PIX',
      'Avaliações e ranking'
    ]
  },
];

export default function RegistrationTypeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [selectedType, setSelectedType] = useState<'company' | 'courier' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert('Atenção', 'Selecione um tipo de conta para continuar');
      return;
    }

    setIsLoading(true);
    
    // Small delay for better UX
    setTimeout(() => {
      if (selectedType === 'company') {
        router.push('/auth/register/company');
      } else {
        router.push('/auth/register/courier');
      }
      setIsLoading(false);
    }, 300);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <MaterialIcons 
            name="arrow-back" 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.text }]}>
          Criar Conta
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Escolha o tipo de conta que deseja criar
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {registrationTypes.map((option) => (
          <TouchableOpacity
            key={option.type}
            onPress={() => setSelectedType(option.type)}
            style={styles.optionWrapper}
            activeOpacity={0.8}
          >
            <Card
              style={StyleSheet.flatten([
                styles.optionCard,
                selectedType === option.type && {
                  borderColor: option.color,
                  borderWidth: 2,
                  shadowColor: option.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                },
              ])}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${option.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={option.icon as any}
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

                {selectedType === option.type && (
                  <View style={styles.selectedIndicator}>
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={option.color}
                    />
                  </View>
                )}
              </View>
              
              {selectedType === option.type && (
                <View style={styles.featuresContainer}>
                  {option.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <MaterialIcons 
                        name="check-circle" 
                        size={16} 
                        color={option.color} 
                      />
                      <Text style={[styles.featureText, { color: colors.tabIconDefault }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continuar"
          onPress={handleContinue}
          disabled={!selectedType}
          loading={isLoading}
          fullWidth
          size="lg"
        />
        
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.tabIconDefault }]}>
            Já tem uma conta?{' '}
            <Text 
              style={[styles.loginLink, { color: colors.tint }]}
              onPress={() => router.push('/auth/login')}
            >
              Faça login
            </Text>
          </Text>
        </View>
      </View>
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
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
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
    gap: 20,
  },
  optionWrapper: {
    width: '100%',
  },
  optionCard: {
    padding: 20,
    borderRadius: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  featuresContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingTop: 20,
    gap: 16,
  },
  loginContainer: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontWeight: '600',
  },
});