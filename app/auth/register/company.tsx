import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { enhancedAuthService } from '@/services/enhanced-auth.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Tela de registro para empresas (companies)
// Permite que empresas se registrem com informações específicas como CNPJ e nome do responsável

interface CompanyData {
  companyName: string;
  cnpj: string;
  responsibleName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function CompanyRegistrationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CompanyData>({
    companyName: '',
    cnpj: '',
    responsibleName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<CompanyData>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formatCNPJ = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    let formatted = numbers;
    
    if (numbers.length >= 2) {
      formatted = `${numbers.substring(0, 2)}`;
      if (numbers.length > 2) {
        formatted += `.${numbers.substring(2, 5)}`;
        if (numbers.length > 5) {
          formatted += `.${numbers.substring(5, 8)}`;
          if (numbers.length > 8) {
            formatted += `/${numbers.substring(8, 12)}`;
            if (numbers.length > 12) {
              formatted += `-${numbers.substring(12, 14)}`;
            }
          }
        }
      }
    }
    
    return formatted;
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

  const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return false;
    
    // Simple validation - in a real app, you would implement full CNPJ validation
    return !cleaned.startsWith('00000000000000');
  };

  const validateEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<CompanyData> = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Nome da empresa é obrigatório';
    }
    
    if (!formData.cnpj) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }
    
    if (!formData.responsibleName.trim()) {
      newErrors.responsibleName = 'Nome do responsável é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<CompanyData> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Partial<CompanyData> = {};
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleRegister = async () => {
    if (!validateStep3()) return;
    
    setLoading(true);
    try {
      // Register company user with enhanced service
      const result = await enhancedAuthService.registerCompany({
        companyName: formData.companyName,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        responsibleName: formData.responsibleName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      
      Alert.alert(
        'Sucesso', 
        'Conta criada com sucesso! Bem-vindo ao PAP.', 
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Erro', 
        error.message || 'Falha ao criar conta. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((stepNumber) => (
        <View key={stepNumber} style={styles.stepIndicatorWrapper}>
          <View 
            style={[
              styles.stepIndicator,
              step === stepNumber && styles.activeStepIndicator,
              step > stepNumber && styles.completedStepIndicator,
              { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            {step > stepNumber ? (
              <MaterialIcons name="check" size={16} color="#10b981" />
            ) : (
              <Text 
                style={[
                  styles.stepNumber,
                  step === stepNumber && styles.activeStepNumber,
                  step > stepNumber && styles.completedStepNumber,
                  { color: step === stepNumber ? colors.tint : colors.tabIconDefault }
                ]}
              >
                {stepNumber}
              </Text>
            )}
          </View>
          {stepNumber < 3 && (
            <View 
              style={[
                styles.stepLine,
                step > stepNumber && styles.completedStepLine,
                { backgroundColor: colors.border }
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <>
      <Input
        label="Nome da Empresa *"
        placeholder="Digite o nome da sua empresa"
        value={formData.companyName}
        onChangeText={(text) => setFormData({ ...formData, companyName: text })}
        error={errors.companyName}
        required
        leftIcon={<MaterialIcons name="business" size={20} color={colors.tabIconDefault} />}
      />
      
      <Input
        label="CNPJ *"
        placeholder="00.000.000/0000-00"
        value={formData.cnpj}
        onChangeText={(text) => setFormData({ ...formData, cnpj: formatCNPJ(text) })}
        error={errors.cnpj}
        keyboardType="numeric"
        maxLength={18}
        required
        leftIcon={<MaterialIcons name="domain" size={20} color={colors.tabIconDefault} />}
      />
      
      <Input
        label="Nome do Responsável *"
        placeholder="Nome completo do responsável"
        value={formData.responsibleName}
        onChangeText={(text) => setFormData({ ...formData, responsibleName: text })}
        error={errors.responsibleName}
        required
        leftIcon={<MaterialIcons name="person" size={20} color={colors.tabIconDefault} />}
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <Input
        label="Email *"
        placeholder="seu@email.com"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        required
        leftIcon={<MaterialIcons name="email" size={20} color={colors.tabIconDefault} />}
      />
      
      <Input
        label="Telefone *"
        placeholder="(11) 99999-9999"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: formatPhone(text) })}
        error={errors.phone}
        keyboardType="phone-pad"
        maxLength={15}
        required
        leftIcon={<MaterialIcons name="phone" size={20} color={colors.tabIconDefault} />}
      />
    </>
  );

  const renderStep3 = () => (
    <>
      <Input
        label="Senha *"
        placeholder="Crie uma senha segura"
        value={formData.password}
        onChangeText={(text) => setFormData({ ...formData, password: text })}
        error={errors.password}
        secureTextEntry={!showPassword}
        required
        leftIcon={<MaterialIcons name="lock" size={20} color={colors.tabIconDefault} />}
        rightIcon={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons 
              name={showPassword ? "visibility-off" : "visibility"} 
              size={20} 
              color={colors.tabIconDefault} 
            />
          </TouchableOpacity>
        }
      />
      
      <Input
        label="Confirmar Senha *"
        placeholder="Digite a senha novamente"
        value={formData.confirmPassword}
        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
        error={errors.confirmPassword}
        secureTextEntry={!showConfirmPassword}
        required
        leftIcon={<MaterialIcons name="lock" size={20} color={colors.tabIconDefault} />}
        rightIcon={
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <MaterialIcons 
              name={showConfirmPassword ? "visibility-off" : "visibility"} 
              size={20} 
              color={colors.tabIconDefault} 
            />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.passwordRequirements}>
        <Text style={[styles.requirementTitle, { color: colors.text }]}>
          Requisitos de senha:
        </Text>
        <Text style={[styles.requirement, { color: colors.tabIconDefault }]}>
          • Pelo menos 6 caracteres
        </Text>
        <Text style={[styles.requirement, { color: colors.tabIconDefault }]}>
          • Combinação de letras e números
        </Text>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: colors.text }]}>
            Cadastro de Empresa
          </Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            Preencha as informações da sua empresa
          </Text>
          
          {renderStepIndicator()}
        </View>

        <Card style={styles.formCard}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          
          <View style={styles.buttonContainer}>
            <Button
              title={step === 1 ? "Cancelar" : "Voltar"}
              variant="outline"
              onPress={handleBack}
              style={styles.button}
              disabled={loading}
            />
            <Button
              title={step === 3 ? "Criar Conta" : "Próximo"}
              onPress={step === 3 ? handleRegister : handleNext}
              loading={loading}
              style={styles.button}
            />
          </View>
        </Card>
        
        <Text style={[styles.footer, { color: colors.tabIconDefault }]}>
          Ao criar uma conta, você concorda com nossos{'\n'}
          Termos de Uso e Política de Privacidade
        </Text>
      </ScrollView>
      
      <Loading visible={loading} overlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 20,
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepIndicator: {
    borderColor: '#0A66C2',
  },
  completedStepIndicator: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeStepNumber: {
    color: '#0A66C2',
  },
  completedStepNumber: {
    color: '#ffffff',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  completedStepLine: {
    backgroundColor: '#10b981',
  },
  formCard: {
    padding: 20,
    gap: 16,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
  },
  passwordRequirements: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  requirement: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 20,
    marginBottom: 30,
  },
});