import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Usando Material Icons no lugar de IconSymbol
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { LoginForm } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [form, setForm] = useState<LoginForm>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');
  const [errors, setErrors] = useState<Partial<LoginForm>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginForm> = {};

    if (loginMethod === 'phone') {
      if (!form.telefone) {
        newErrors.telefone = 'Telefone é obrigatório';
      } else if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(form.telefone)) {
        newErrors.telefone = 'Formato inválido. Use: (11) 99999-9999';
      }
      
      if (!form.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (form.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
    } else {
      if (!form.email) {
        newErrors.email = 'Email é obrigatório';
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        newErrors.email = 'Email inválido';
      }
      
      if (!form.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (form.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (loginMethod === 'phone') {
        const session = await authService.loginWithPhone(form.telefone!, form.password!);
        const outrasessao = await authService.getSession();
        console.log('outrasessao', outrasessao);
        if (session.role === 'courier') {
          router.replace('/(tabs)/courier/courier-home');
        } else {
          router.replace('/(tabs)/cliente/business-home');
        }
        setIsLoading(false);
        return;
      }
      
      // Apenas faz login, não cadastra automaticamente
      const session = await authService.loginWithEmail(form.email!, form.password!);
      const outrasessao = await authService.getSession();
      console.log('outrasessao', outrasessao);
      if (session.role === 'courier') {
        router.replace('/(tabs)/courier/courier-home');
      } else {
        router.replace('/(tabs)/cliente/business-home');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha no login. Verifique suas credenciais ou crie uma conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    let formatted = numbers;
    
    if (numbers.length >= 2) {
      formatted = `(${numbers.substring(0, 2)})`;
      if (numbers.length > 2) {
        formatted += ` ${numbers.substring(2, numbers.length <= 10 ? 6 : 7)}`;
        if (numbers.length > (numbers.length <= 10 ? 6 : 7)) {
          formatted += `-${numbers.substring(numbers.length <= 10 ? 6 : 7, 11)}`;
        }
      }
    }
    
    return formatted;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>P A P</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>Ponto a Ponto</Text>
          
        </View>

        <Card style={styles.formCard}>
          <View style={styles.methodSelector}>
            <Button
              title="Telefone"
              variant={loginMethod === 'phone' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => setLoginMethod('phone')}
              style={styles.methodButton}
            />
            <Button
              title="Email"
              variant={loginMethod === 'email' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => setLoginMethod('email')}
              style={styles.methodButton}
            />
          </View>

          {loginMethod === 'phone' ? (
            <>
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChangeText={(text) => setForm({ ...form, telefone: formatPhone(text) })}
                error={errors.telefone}
                keyboardType="phone-pad"
                maxLength={15}
                required
                leftIcon={<MaterialIcons name="phone" size={20} color={colors.tabIconDefault} />}
              />
              <Input
                label="Senha"
                placeholder="Sua senha"
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                error={errors.password}
                secureTextEntry
                required
                leftIcon={<MaterialIcons name="lock" size={20} color={colors.tabIconDefault} />}
              />
            </>
          ) : (
            <>
              <Input
                label="Email"
                placeholder="seu@email.com"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                required
                leftIcon={<MaterialIcons name="email" size={20} color={colors.tabIconDefault} />}
              />
              <Input
                label="Senha"
                placeholder="Sua senha"
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                error={errors.password}
                secureTextEntry
                required
                leftIcon={<MaterialIcons name="lock" size={20} color={colors.tabIconDefault} />}
              />
            </>
          )}

          <Button
            title="Entrar"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footerContainer}>
          <Text style={[styles.footer, { color: colors.tabIconDefault }]}>
            Ao continuar, você concorda com nossos{'\n'}
            Termos de Uso e Política de Privacidade
          </Text>
          
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
        </View>
      </ScrollView>

      <Loading visible={isLoading} overlay />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 30,
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  methodButton: {
    flex: 1,
  },
  submitButton: {
    marginTop: 10,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerContainer: {
    alignItems: 'center',
    gap: 20,
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
});
