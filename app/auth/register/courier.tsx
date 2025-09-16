import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { enhancedAuthService } from '@/services/enhanced-auth.service';
import { VehicleType } from '@/types';
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

// Tela de registro para entregadores (couriers)
// Permite que entregadores se registrem com informações específicas como tipo de veículo e capacidade

interface CourierData {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  vehicleType: VehicleType | null;
  vehicleCapacity: string;
  isAdmin: boolean;
}

export default function CourierRegistrationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CourierData>({
    fullName: '',
    cpf: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleType: null,
    isAdmin: false,
    vehicleCapacity: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<CourierData>>({});
  const [loading, setLoading] = useState(false);

  const vehicleOptions: { type: VehicleType; label: string; icon: string; description: string }[] = [
    { type: 'moto', label: 'Motocicleta', icon: 'motorcycle', description: 'Entregas rápidas na cidade' },
    { type: 'carro', label: 'Carro', icon: 'directions-car', description: 'Para cargas maiores' },
    { type: 'bike', label: 'Bicicleta', icon: 'pedal-bike', description: 'Entregas ecológicas' },
  ];

  const formatCPF = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    let formatted = numbers;
    
    if (numbers.length >= 3) {
      formatted = `${numbers.substring(0, 3)}`;
      if (numbers.length > 3) {
        formatted += `.${numbers.substring(3, 6)}`;
        if (numbers.length > 6) {
          formatted += `.${numbers.substring(6, 9)}`;
          if (numbers.length > 9) {
            formatted += `-${numbers.substring(9, 11)}`;
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

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    
    // Simple validation - in a real app, you would implement full CPF validation
    return !cleaned.startsWith('00000000000');
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
    const newErrors: Partial<CourierData> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    }
    
    if (!formData.cpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<CourierData> = {};
    
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
    const newErrors: Partial<CourierData> = {};
    
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

  const validateStep4 = (): boolean => {
    const newErrors: Partial<CourierData> = {};
    
    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Tipo de veículo é obrigatório' as VehicleType;
    }
    
    if (!formData.vehicleCapacity) {
      newErrors.vehicleCapacity = 'Capacidade do veículo é obrigatória';
    } else if (isNaN(Number(formData.vehicleCapacity)) || Number(formData.vehicleCapacity) <= 0) {
      newErrors.vehicleCapacity = 'Capacidade inválida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
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
    if (!validateStep4()) return;
    
    setLoading(true);
    try {
      // Register courier user with enhanced service
      const result = await enhancedAuthService.registerCourier({
        fullName: formData.fullName,
        cpf: formData.cpf.replace(/\D/g, ''),
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        vehicleType: formData.vehicleType!,
        vehicleCapacity: Number(formData.vehicleCapacity),
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
      {[1, 2, 3, 4].map((stepNumber) => (
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
          {stepNumber < 4 && (
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
        label="Nome Completo *"
        placeholder="Digite seu nome completo"
        value={formData.fullName}
        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
        error={errors.fullName}
        required
        leftIcon={<MaterialIcons name="person" size={20} color={colors.tabIconDefault} />}
      />
      
      <Input
        label="CPF *"
        placeholder="000.000.000-00"
        value={formData.cpf}
        onChangeText={(text) => setFormData({ ...formData, cpf: formatCPF(text) })}
        error={errors.cpf}
        keyboardType="numeric"
        maxLength={14}
        required
        leftIcon={<MaterialIcons name="badge" size={20} color={colors.tabIconDefault} />}
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
        <Text style={[styles.requirementTitle, { color: colors.textSecondary }]}>
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

  const renderStep4 = () => (
    <>
      <View style={styles.vehicleSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Tipo de Veículo *
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.tabIconDefault }]}>
          Selecione o tipo de veículo que você utiliza para entregas
        </Text>
        
        <View style={styles.vehicleOptions}>
          {vehicleOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.vehicleOption,
                formData.vehicleType === option.type && styles.selectedVehicleOption,
                { borderColor: colors.border, backgroundColor: colors.background }
              ]}
              onPress={() => setFormData({ ...formData, vehicleType: option.type })}
            >
              <MaterialIcons 
                name={option.icon as any} 
                size={24} 
                color={formData.vehicleType === option.type ? colors.tint : colors.tabIconDefault} 
              />
              <Text style={[
                styles.vehicleLabel, 
                { 
                  color: formData.vehicleType === option.type ? colors.tint : colors.text,
                  fontWeight: formData.vehicleType === option.type ? '600' : 'normal'
                }
              ]}>
                {option.label}
              </Text>
              <Text style={[styles.vehicleDescription, { color: colors.tabIconDefault }]}>
                {option.description}
              </Text>
              {formData.vehicleType === option.type && (
                <MaterialIcons 
                  name="check-circle" 
                  size={20} 
                  color={colors.tint} 
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
        {errors.vehicleType && (
          <Text style={[styles.errorText, { color: '#ef4444' }]}>
            {errors.vehicleType}
          </Text>
        )}
      </View>
      
      <Input
        label="Capacidade do Veículo (kg) *"
        placeholder="Ex: 20"
        value={formData.vehicleCapacity}
        onChangeText={(text) => setFormData({ ...formData, vehicleCapacity: text.replace(/[^0-9]/g, '') })}
        error={errors.vehicleCapacity}
        keyboardType="numeric"
        required
        leftIcon={<MaterialIcons name="scale" size={20} color={colors.tabIconDefault} />}
      />
      
      <View style={styles.termsContainer}>
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Ao criar uma conta, você concorda com nossos Termos de Uso e Política de Privacidade, 
          incluindo a coleta e uso de suas informações para fins de verificação e segurança.
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
            Cadastro de Entregador
          </Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            Preencha suas informações pessoais e profissionais
          </Text>
          
          {renderStepIndicator()}
        </View>

        <Card style={styles.formCard}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          
          <View style={styles.buttonContainer}>
            <Button
              title={step === 1 ? "Cancelar" : "Voltar"}
              variant="outline"
              onPress={handleBack}
              style={styles.button}
            />
            <Button
              title={step === 4 ? "Criar Conta" : "Próximo"}
              onPress={step === 4 ? handleRegister : handleNext}
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
    width: 30,
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
  vehicleSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  vehicleOptions: {
    gap: 12,
    marginVertical: 10,
  },
  vehicleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedVehicleOption: {
    borderWidth: 2,
  },
  vehicleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  vehicleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  termsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 20,
    marginBottom: 30,
  },
});