import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { locationService } from '@/services/location.service';
import { estimatePrice } from '@/services/pricing.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { AddressRef, CreateShipmentForm, LocationPoint, Package, Quote, ShipmentState, TimelineEvent } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Componente Modal para Dimensões Personalizadas
interface CustomDimensionsModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (dimensions: { c: number; l: number; a: number }) => void;
  currentDimensions: { c: number; l: number; a: number };
  colors: any;
}

function CustomDimensionsModal({ visible, onClose, onApply, currentDimensions, colors }: CustomDimensionsModalProps) {
  const [customDims, setCustomDims] = useState(currentDimensions);
  const [cInput, setCInput] = useState(currentDimensions.c.toString().replace('.', ','));
  const [lInput, setLInput] = useState(currentDimensions.l.toString().replace('.', ','));
  const [aInput, setAInput] = useState(currentDimensions.a.toString().replace('.', ','));

  const handleApply = () => {
    onApply(customDims);
  };

  const updateDimension = (field: 'c' | 'l' | 'a', value: number) => {
    const newDims = { ...customDims, [field]: value };
    setCustomDims(newDims);
  };

  const handleCChange = (text: string) => {
    setCInput(text);
    const cleanText = text.replace(',', '.');
    const value = cleanText === '' ? 0 : parseFloat(cleanText);
    updateDimension('c', isNaN(value) ? 0 : value);
  };

  const handleLChange = (text: string) => {
    setLInput(text);
    const cleanText = text.replace(',', '.');
    const value = cleanText === '' ? 0 : parseFloat(cleanText);
    updateDimension('l', isNaN(value) ? 0 : value);
  };

  const handleAChange = (text: string) => {
    setAInput(text);
    const cleanText = text.replace(',', '.');
    const value = cleanText === '' ? 0 : parseFloat(cleanText);
    updateDimension('a', isNaN(value) ? 0 : value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Dimensões Personalizadas
          </Text>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.modalDescription, { color: colors.tabIconDefault }]}>
            Defina as dimensões específicas do seu pacote em centímetros
          </Text>

          <View style={styles.customDimensionsGrid}>
            <View style={styles.customDimensionCard}>
              <View style={styles.customDimensionHeader}>
                <MaterialIcons name="straighten" size={20} color={colors.tint} />
                <Text style={[styles.customDimensionLabel, { color: colors.text }]}>Comprimento</Text>
              </View>
              <View style={[styles.customDimensionInputWrapper, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.customDimensionButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const newValue = Math.max(0, customDims.c - 1);
                    updateDimension('c', newValue);
                    setCInput(newValue === 0 ? '' : newValue.toString().replace('.', ','));
                  }}
                >
                  <MaterialIcons name="remove" size={20} color={colors.tint} />
                </TouchableOpacity>
                <Input
                  value={cInput}
                  onChangeText={handleCChange}
                  keyboardType="decimal-pad"
                  containerStyle={styles.customDimensionTextInput}
                  placeholder="0"
                  style={{ textAlign: 'center' }}
                />
                <TouchableOpacity
                  style={[styles.customDimensionButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const newValue = customDims.c + 1;
                    updateDimension('c', newValue);
                    setCInput(newValue.toString().replace('.', ','));
                  }}
                >
                  <MaterialIcons name="add" size={20} color={colors.tint} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.customDimensionSuffix, { color: colors.tabIconDefault }]}>cm</Text>
            </View>

            <View style={styles.customDimensionCard}>
              <View style={styles.customDimensionHeader}>
                <MaterialIcons name="width-full" size={20} color={colors.tint} />
                <Text style={[styles.customDimensionLabel, { color: colors.text }]}>Largura</Text>
              </View>
              <View style={[styles.customDimensionInputWrapper, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.customDimensionButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const newValue = Math.max(0, customDims.l - 1);
                    updateDimension('l', newValue);
                    setLInput(newValue === 0 ? '' : newValue.toString().replace('.', ','));
                  }}
                >
                  <MaterialIcons name="remove" size={20} color={colors.tint} />
                </TouchableOpacity>
                <Input
                  value={lInput}
                  onChangeText={handleLChange}
                  keyboardType="decimal-pad"
                  containerStyle={styles.customDimensionTextInput}
                  placeholder="0"
                  style={{ textAlign: 'center' }}
                />
                <TouchableOpacity
                  style={[styles.customDimensionButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const newValue = customDims.l + 1;
                    updateDimension('l', newValue);
                    setLInput(newValue.toString().replace('.', ','));
                  }}
                >
                  <MaterialIcons name="add" size={20} color={colors.tint} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.customDimensionSuffix, { color: colors.tabIconDefault }]}>cm</Text>
            </View>

            <View style={styles.customDimensionCard}>
              <View style={styles.customDimensionHeader}>
                <MaterialIcons name="height" size={20} color={colors.tint} />
                <Text style={[styles.customDimensionLabel, { color: colors.text }]}>Altura</Text>
              </View>
              <View style={[styles.customDimensionInputWrapper, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.customDimensionButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const newValue = Math.max(0, customDims.a - 1);
                    updateDimension('a', newValue);
                    setAInput(newValue === 0 ? '' : newValue.toString().replace('.', ','));
                  }}
                >
                  <MaterialIcons name="remove" size={20} color={colors.tint} />
                </TouchableOpacity>
                <Input
                  value={aInput}
                  onChangeText={handleAChange}
                  keyboardType="decimal-pad"
                  containerStyle={styles.customDimensionTextInput}
                  placeholder="0"
                  style={{ textAlign: 'center' }}
                />
                <TouchableOpacity
                  style={[styles.customDimensionButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const newValue = customDims.a + 1;
                    updateDimension('a', newValue);
                    setAInput(newValue.toString().replace('.', ','));
                  }}
                >
                  <MaterialIcons name="add" size={20} color={colors.tint} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.customDimensionSuffix, { color: colors.tabIconDefault }]}>cm</Text>
            </View>
          </View>

          {/* Resumo das dimensões personalizadas */}
          {(customDims.c > 0 || customDims.l > 0 || customDims.a > 0) && (
            <View style={[styles.customDimensionSummary, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
              <MaterialIcons name="info" size={16} color={colors.tint} />
              <Text style={[styles.customDimensionSummaryText, { color: colors.text }]}>
                Dimensões: {customDims.c} × {customDims.l} × {customDims.a} cm
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={onClose}
            style={styles.modalButton}
          />
          <Button
            title="Aplicar"
            onPress={handleApply}
            style={styles.modalButton}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function CreateShipmentScreen() {
  const params = useLocalSearchParams<{ 
    fromMap?: string; 
    type?: 'pickup' | 'dropoff'; 
    lat?: string; lng?: string; label?: string;
    oLat?: string; oLng?: string; oLabel?: string;
    dLat?: string; dLng?: string; dLabel?: string;
    distKm?: string; price?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Estado persistente do formulário
  const [form, setForm] = useState<CreateShipmentForm>(() => {
    // Tenta recuperar dados salvos do AsyncStorage
    return {
      pickup: {
        endereco: '',
        address: '',
        contato: '',
        instrucoes: '',
      },
      dropoff: {
        endereco: '',
        address: '',
        contato: '',
        instrucoes: '',
      },
      pacote: {
        pesoKg: 0,
        dim: { c: 0, l: 0, a: 0 },
        fragil: false,
        valorDeclarado: 0,
      },
    };
  });
  
  const [pickupAddress, setPickupAddress] = useState<AddressRef | undefined>();
  const [dropoffAddress, setDropoffAddress] = useState<AddressRef | undefined>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distKm?: number; price?: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [step, setStep] = useState<'form' | 'quote' | 'payment'>('form');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [weightInputText, setWeightInputText] = useState('');
  const [dimCInputText, setDimCInputText] = useState('');
  const [dimLInputText, setDimLInputText] = useState('');
  const [dimAInputText, setDimAInputText] = useState('');
  const [valueInputText, setValueInputText] = useState('');
  const [showCustomDimensionsModal, setShowCustomDimensionsModal] = useState(false);
  const [selectedDimensionPreset, setSelectedDimensionPreset] = useState<string | null>(null);

  // Chaves para persistência
  const FORM_STORAGE_KEY = 'create_shipment_form';
  const ADDRESSES_STORAGE_KEY = 'create_shipment_addresses';

  // Presets de dimensões
  const dimensionPresets = [
    {
      id: 'nan',
      name: 'Nano',
      description: 'Componentes pequenos',
      dimensions: { c: 5, l: 5, a: 2},
      icon: 'compress'
    },
    {
      id: 'small',
      name: 'Pequeno',
      description: 'Documentos, livros',
      dimensions: { c: 20, l: 15, a: 5 },
      icon: 'description'
    },
    {
      id: 'medium',
      name: 'Médio',
      description: 'Roupas, eletrônicos',
      dimensions: { c: 40, l: 30, a: 15 },
      icon: 'inventory'
    },
    {
      id: 'large',
      name: 'Grande',
      description: 'Caixas, malas',
      dimensions: { c: 60, l: 40, a: 30 },
      icon: 'fullscreen'
    }
  ];

  // Timeouts para formatação com delay
  const [weightTimeout, setWeightTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dimCTimeout, setDimCTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dimLTimeout, setDimLTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dimATimeout, setDimATimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [valueTimeout, setValueTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<{
    basePrice: number;
    variablePrice: number;
    weightMultiplier: number;
    fragilityMultiplier: number;
    total: number;
  } | null>(null);

  // Cleanup dos timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (weightTimeout) clearTimeout(weightTimeout);
      if (dimCTimeout) clearTimeout(dimCTimeout);
      if (dimLTimeout) clearTimeout(dimLTimeout);
      if (dimATimeout) clearTimeout(dimATimeout);
      if (valueTimeout) clearTimeout(valueTimeout);
    };
  }, [weightTimeout, dimCTimeout, dimLTimeout, dimATimeout, valueTimeout]);

  // Carrega dados salvos na inicialização
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const [savedForm, savedAddresses] = await Promise.all([
          AsyncStorage.getItem(FORM_STORAGE_KEY),
          AsyncStorage.getItem(ADDRESSES_STORAGE_KEY),
        ]);

        if (savedForm) {
          const parsedForm = JSON.parse(savedForm);
          setForm(parsedForm);
          // Inicializa os textos dos inputs
          setWeightInputText(parsedForm.pacote.pesoKg === 0 ? '' : parsedForm.pacote.pesoKg.toString().replace('.', ','));
          setDimCInputText(parsedForm.pacote.dim.c === 0 ? '' : parsedForm.pacote.dim.c.toString().replace('.', ','));
          setDimLInputText(parsedForm.pacote.dim.l === 0 ? '' : parsedForm.pacote.dim.l.toString().replace('.', ','));
          setDimAInputText(parsedForm.pacote.dim.a === 0 ? '' : parsedForm.pacote.dim.a.toString().replace('.', ','));
          setValueInputText(parsedForm.pacote.valorDeclarado === 0 ? '' : parsedForm.pacote.valorDeclarado.toString().replace('.', ','));
        }

        if (savedAddresses) {
          const { pickup, dropoff } = JSON.parse(savedAddresses);
          if (pickup) setPickupAddress(pickup);
          if (dropoff) setDropoffAddress(dropoff);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    };

    loadSavedData();
  }, []);

  // Salva dados do formulário sempre que mudam
  useEffect(() => {
    const saveFormData = async () => {
      try {
        await AsyncStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    };

    saveFormData();
  }, [form]);

  // Salva endereços sempre que mudam
  useEffect(() => {
    const saveAddressData = async () => {
      try {
        const addresses = { pickup: pickupAddress, dropoff: dropoffAddress };
        await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
      } catch (error) {
        console.error('Error saving address data:', error);
      }
    };

    if (pickupAddress || dropoffAddress) {
      saveAddressData();
    }
  }, [pickupAddress, dropoffAddress]);

  // Aplica retorno direto via params (quando vindo do mapa em modo select)
  useEffect(() => {
    if (params?.fromMap === '1' && params.lat && params.lng && params.type) {
      const addr: AddressRef = {
        id: `${Date.now()}`,
        label: params.label || 'Ponto no mapa',
        lat: parseFloat(params.lat),
        lng: parseFloat(params.lng),
        endereco: params.label || 'Selecionado no mapa',
      };
      if (params.type === 'pickup') {
        setPickupAddress(addr);
        setForm((prev) => ({
          ...prev,
          pickup: { ...prev.pickup, endereco: addr.endereco, address: addr.endereco },
        }));
      } else {
        setDropoffAddress(addr);
        setForm((prev) => ({
          ...prev,
          dropoff: { ...prev.dropoff, endereco: addr.endereco, address: addr.endereco },
        }));
      }
    }
    // Retorno de confirmação (origem e destino juntos)
    if (params?.fromMap === '2' && params.oLat && params.oLng && params.dLat && params.dLng) {
      const pickup: AddressRef = {
        id: `${Date.now()}-o`,
        label: params.oLabel || 'Origem selecionada',
        lat: parseFloat(params.oLat),
        lng: parseFloat(params.oLng),
        endereco: params.oLabel || 'Origem selecionada',
      };
      const dropoff: AddressRef = {
        id: `${Date.now()}-d`,
        label: params.dLabel || 'Destino selecionado',
        lat: parseFloat(params.dLat),
        lng: parseFloat(params.dLng),
        endereco: params.dLabel || 'Destino selecionado',
      };
      setPickupAddress(pickup);
      setDropoffAddress(dropoff);
      setForm((prev) => ({
        ...prev,
        pickup: { ...prev.pickup, endereco: pickup.endereco, address: pickup.endereco },
        dropoff: { ...prev.dropoff, endereco: dropoff.endereco, address: dropoff.endereco },
      }));
    }
  }, [
    params?.fromMap, params?.lat, params?.lng, params?.type, params?.label,
    params?.oLat, params?.oLng, params?.oLabel, params?.dLat, params?.dLng, params?.dLabel,
  ]);

  // Aplica retorno de confirmação (rota completa + preço)
  useEffect(() => {
    if (params?.fromMap === '2') {
      const dist = params.distKm ? parseFloat(params.distKm) : undefined;
      const prc = params.price ? parseFloat(params.price) : undefined;
      setRouteInfo({ distKm: dist, price: prc });
      if (prc) setLivePrice(prc);
    }
    }, [params?.fromMap, params?.distKm, params?.price]);
    useEffect(() => {
      const getSession = async () => {
        const session = await authService.getSession();
      console.log('sessionnnnnnnnnnn', session);
        if (!session) {
          Alert.alert('Erro', 'Usuário não autenticado \nPor favor, faça login para continuar');
          router.replace('/auth/login');
        }
      };
      getSession();
    }, []);
  // Calcula preço automaticamente quando dados mudam
  useEffect(() => {
    if (!pickupAddress || !dropoffAddress) {
      setLivePrice(null);
      setPriceBreakdown(null);
      return;
    }

    // Se temos distância da rota calculada, usa ela; senão calcula aproximada
    const distKm = routeInfo.distKm || Math.sqrt(
      Math.pow(dropoffAddress.lat - pickupAddress.lat, 2) +
      Math.pow(dropoffAddress.lng - pickupAddress.lng, 2)
    ) * 111; // Conversão aproximada para km

    // Usa o serviço de pricing
    const pricing = estimatePrice({
      distanceKm: Math.max(0.5, distKm),
      weightKg: form.pacote.pesoKg,
      fragil: form.pacote.fragil,
    });

    setLivePrice(pricing.total);
    
    // Calcula breakdown detalhado
    const breakdown = calculatePriceBreakdown({
      distanceKm: Math.max(0.5, distKm),
      weightKg: form.pacote.pesoKg,
      fragil: form.pacote.fragil,
    });
    
    setPriceBreakdown(breakdown);
  }, [pickupAddress, dropoffAddress, form.pacote.pesoKg, form.pacote.fragil, routeInfo.distKm]);

  const validateForm = (): boolean => {
    const newErrors: any = {};

    // Pickup validation
    if (!pickupAddress) {
      newErrors.pickup = 'Endereço de coleta é obrigatório';
    }
    if (!form.pickup.contato.trim()) {
      newErrors.pickupContato = 'Nome do contato é obrigatório';
    }

    // Dropoff validation
    if (!dropoffAddress) {
      newErrors.dropoff = 'Endereço de entrega é obrigatório';
    }
    if (!form.dropoff.contato.trim()) {
      newErrors.dropoffContato = 'Nome do contato é obrigatório';
    }

    // Package validation
    if (!form.pacote.pesoKg || form.pacote.pesoKg <= 0) {
      newErrors.peso = 'Peso deve ser maior que zero';
    }
    if (!form.pacote.dim.c || form.pacote.dim.c <= 0) {
      newErrors.comprimento = 'Comprimento deve ser maior que zero';
    }
    if (!form.pacote.dim.l || form.pacote.dim.l <= 0) {
      newErrors.largura = 'Largura deve ser maior que zero';
    }
    if (!form.pacote.dim.a || form.pacote.dim.a <= 0) {
      newErrors.altura = 'Altura deve ser maior que zero';
    }
    if (!form.pacote.valorDeclarado || form.pacote.valorDeclarado <= 0) {
      newErrors.valor = 'Valor declarado deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateQuote = async (): Promise<Quote> => {
    // Simulate quote calculation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!pickupAddress || !dropoffAddress) {
      throw new Error('Endereços não definidos');
    }

    // Usa a mesma lógica de distância do livePrice
    const distKm = routeInfo.distKm || Math.sqrt(
      Math.pow(dropoffAddress.lat - pickupAddress.lat, 2) +
      Math.pow(dropoffAddress.lng - pickupAddress.lng, 2)
    ) * 111; // Rough conversion to km

    // Usa o serviço de pricing para consistência
    const pricing = estimatePrice({
      distanceKm: Math.max(0.5, distKm),
      weightKg: form.pacote.pesoKg,
      fragil: form.pacote.fragil,
    });

    const estimatedTime = Math.max(15, Math.round(distKm * 3)); // 3 min per km, min 15 min

    return {
      preco: pricing.total,
      distKm: Math.max(0.5, distKm),
      tempoMin: estimatedTime,
      moeda: 'BRL',
    };
  };

  const handleGetQuote = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const calculatedQuote = await calculateQuote();
      setQuote(calculatedQuote);
      setStep('quote');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao calcular cotação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler de retorno do mapa (via evento de params)
  React.useEffect(() => {
    const sub = () => {
      // @ts-ignore
      const payload = global.__MAP_ROUTE_SELECTED__;
      if (!payload) return;
      // @ts-ignore
      delete global.__MAP_ROUTE_SELECTED__;
      const { selected, type } = payload || {};
      if (!selected || !type) return;
      const addr: AddressRef = {
        id: `${Date.now()}`,
        label: selected.label || 'Ponto no mapa',
        lat: selected.latitude,
        lng: selected.longitude,
        endereco: selected.label || 'Selecionado no mapa',
      };
      if (type === 'pickup') {
        setPickupAddress(addr);
        setForm((prev) => ({
          ...prev,
          pickup: { ...prev.pickup, endereco: addr.endereco, address: addr.endereco },
        }));
      } else {
        setDropoffAddress(addr);
        setForm((prev) => ({
          ...prev,
          dropoff: { ...prev.dropoff, endereco: addr.endereco, address: addr.endereco },
        }));
      }
    };
    const interval = setInterval(sub, 400);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleConfirmQuote = () => {
    setStep('payment');
  };

  const handleCreateShipment = async () => {
    if (!quote || !pickupAddress || !dropoffAddress) {
      Alert.alert('Erro', 'Dados incompletos para criar o envio');
      return;
    }

    setIsLoading(true);
    try {
      // Busca o usuário atual
      const session = await authService.getSession();
      if (!session) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      // Cria os pontos de localização
      const pickupLocation: LocationPoint = {
        lat: pickupAddress.lat,
        lng: pickupAddress.lng,
        endereco: pickupAddress.endereco,
        contato: form.pickup.contato,
        instrucoes: form.pickup.instrucoes,
      };

      const dropoffLocation: LocationPoint = {
        lat: dropoffAddress.lat,
        lng: dropoffAddress.lng,
        endereco: dropoffAddress.endereco,
        contato: form.dropoff.contato,
        instrucoes: form.dropoff.instrucoes,
      };

      // Cria o pacote
      const packageData: Package = {
        pesoKg: form.pacote.pesoKg,
        dim: form.pacote.dim,
        fragil: form.pacote.fragil,
        valorDeclarado: form.pacote.valorDeclarado,
        fotos: [], // Por enquanto vazio, pode ser implementado depois
      };

      // Cria evento inicial da timeline
      const initialTimelineEvent: TimelineEvent = {
        tipo: 'CREATED',
        timestamp: new Date(),
        descricao: 'Envio criado pelo cliente',
        payload: {
          clienteUid: session.userId,
          pickupAddress: pickupAddress.endereco,
          dropoffAddress: dropoffAddress.endereco,
        }
      };
      const city = await locationService.getCurrentCity();
      // Dados do envio para salvar no Firestore
      const shipmentData = {
        clienteUid: session.userId,
        clienteName: session.nome,
        clientePhone: session.telefone,
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        pacote: packageData,
        quote: quote,
        state: 'CREATED' as ShipmentState,
        etaMin: quote.tempoMin,
        timeline: [initialTimelineEvent],
        createdAt: new Date(),
        updatedAt: new Date(),
        // Campos para sistema de ofertas
        offers: [],
        notificationCount: 0,
        city: city || undefined,
      };

      // Salva no Firestore
      const shipmentId = await shipmentFirestoreService.createShipment(shipmentData);
      
      // Limpa dados salvos após confirmação
      await clearSavedData();
      
      Alert.alert(
        'Envio Criado!',
        `Seu envio foi criado com sucesso!

ID: ${shipmentId}

Agora aguarde um entregador aceitar sua corrida.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/shipment/details?id=${shipmentId}`),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating shipment:', error);
      Alert.alert('Erro', 'Falha ao criar envio. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSavedData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(FORM_STORAGE_KEY),
        AsyncStorage.removeItem(ADDRESSES_STORAGE_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  };

  // Funções para lidar com entrada de texto com delay
  const handleWeightTextChange = (text: string) => {
    setWeightInputText(text);
    
    // Cancela timeout anterior
    if (weightTimeout) {
      clearTimeout(weightTimeout);
    }
    
    // Cria novo timeout para processar após 500ms
    const timeout = setTimeout(() => {
      const cleanText = text.replace(',', '.');
      const value = cleanText === '' ? 0 : parseFloat(cleanText);
      setForm({
        ...form,
        pacote: { ...form.pacote, pesoKg: isNaN(value) ? 0 : value }
      });
    }, 500);
    
    setWeightTimeout(timeout);
  };

  const handleDimCTextChange = (text: string) => {
    setDimCInputText(text);
    
    if (dimCTimeout) clearTimeout(dimCTimeout);
    
    const timeout = setTimeout(() => {
      const cleanText = text.replace(',', '.');
      const value = cleanText === '' ? 0 : parseFloat(cleanText);
      setForm({
        ...form,
        pacote: { 
          ...form.pacote, 
          dim: { ...form.pacote.dim, c: isNaN(value) ? 0 : value }
        }
      });
    }, 500);
    
    setDimCTimeout(timeout);
  };

  const handleDimLTextChange = (text: string) => {
    setDimLInputText(text);
    
    if (dimLTimeout) clearTimeout(dimLTimeout);
    
    const timeout = setTimeout(() => {
      const cleanText = text.replace(',', '.');
      const value = cleanText === '' ? 0 : parseFloat(cleanText);
      setForm({
        ...form,
        pacote: { 
          ...form.pacote, 
          dim: { ...form.pacote.dim, l: isNaN(value) ? 0 : value }
        }
      });
    }, 500);
    
    setDimLTimeout(timeout);
  };

  const handleDimATextChange = (text: string) => {
    setDimAInputText(text);
    
    if (dimATimeout) clearTimeout(dimATimeout);
    
    const timeout = setTimeout(() => {
      const cleanText = text.replace(',', '.');
      const value = cleanText === '' ? 0 : parseFloat(cleanText);
      setForm({
        ...form,
        pacote: { 
          ...form.pacote, 
          dim: { ...form.pacote.dim, a: isNaN(value) ? 0 : value }
        }
      });
    }, 500);
    
    setDimATimeout(timeout);
  };

  const handleValueTextChange = (text: string) => {
    setValueInputText(text);
    
    if (valueTimeout) clearTimeout(valueTimeout);
    
    const timeout = setTimeout(() => {
      const cleanText = text.replace(',', '.');
      const value = cleanText === '' ? 0 : parseFloat(cleanText);
      setForm({
        ...form,
        pacote: { ...form.pacote, valorDeclarado: isNaN(value) ? 0 : value }
      });
    }, 500);
    
    setValueTimeout(timeout);
  };

  // Função para selecionar preset de dimensões
  const handleDimensionPresetSelect = (presetId: string) => {
    const preset = dimensionPresets.find(p => p.id === presetId);
    if (preset) {
      setForm({
        ...form,
        pacote: { 
          ...form.pacote, 
          dim: preset.dimensions
        }
      });
      setSelectedDimensionPreset(presetId);
      setDimCInputText(preset.dimensions.c.toString().replace('.', ','));
      setDimLInputText(preset.dimensions.l.toString().replace('.', ','));
      setDimAInputText(preset.dimensions.a.toString().replace('.', ','));
    }
  };

  // Função para abrir modal de dimensões personalizadas
  const handleCustomDimensions = () => {
    setShowCustomDimensionsModal(true);
  };

  // Função para fechar modal
  const handleCloseCustomDimensionsModal = () => {
    setShowCustomDimensionsModal(false);
  };

  // Função para aplicar dimensões personalizadas
  const handleApplyCustomDimensions = (customDims: { c: number; l: number; a: number }) => {
    setForm({
      ...form,
      pacote: { 
        ...form.pacote, 
        dim: customDims
      }
    });
    setSelectedDimensionPreset('custom');
    setDimCInputText(customDims.c.toString().replace('.', ','));
    setDimLInputText(customDims.l.toString().replace('.', ','));
    setDimAInputText(customDims.a.toString().replace('.', ','));
    setShowCustomDimensionsModal(false);
  };

  const calculatePriceBreakdown = ({ distanceKm, weightKg, fragil }: { distanceKm: number; weightKg: number; fragil: boolean }) => {
    const MIN_DISTANCE_KM = 0.5;
    const MIN_PRICE = 5.0;
    const PRICE_PER_KM = 3.5;
    
    // Preço base
    let basePrice = MIN_PRICE;
    let variablePrice = 0;
    
    if (distanceKm > MIN_DISTANCE_KM) {
      const extraKm = distanceKm - MIN_DISTANCE_KM;
      variablePrice = Math.round(extraKm * PRICE_PER_KM * 100) / 100;
    }
    
    let subtotal = basePrice + variablePrice;
    
    // Multiplicadores
    const weightMultiplier = weightKg > 5 ? 0.2 : 0; // 20% para >5kg
    const fragilityMultiplier = fragil ? 0.15 : 0; // 15% para frágil
    
    const weightAdjustment = subtotal * weightMultiplier;
    const fragilityAdjustment = subtotal * fragilityMultiplier;
    
    const total = Math.max(MIN_PRICE, subtotal + weightAdjustment + fragilityAdjustment);
    
    return {
      basePrice,
      variablePrice,
      weightMultiplier: weightMultiplier * 100, // Em percentual
      fragilityMultiplier: fragilityMultiplier * 100, // Em percentual
      total: Math.round(total * 100) / 100,
    };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getButtonTitle = () => {
    if (step === 'form') {
      if (!pickupAddress || !dropoffAddress) {
        return 'Selecionar Endereços';
      }
      if (!form.pacote.pesoKg || !form.pacote.dim.c || !form.pacote.dim.l || !form.pacote.dim.a || !form.pacote.valorDeclarado) {
        return 'Preencher Pacote';
      }
      return 'Confirmar Pedido';
    }
    if (step === 'quote') {
      return 'Confirmar Pedido';
    }
    if (step === 'payment') {
      return 'Criar Envio';
    }
    return 'Continuar';
  };

  const getButtonAction = () => {
    if (step === 'form') {
      return handleGetQuote;
    }
    if (step === 'quote') {
      return handleConfirmQuote;
    }
    if (step === 'payment') {
      return handleCreateShipment;
    }
    return () => {};
  };

  const getButtonDisabled = () => {
    if (step === 'form') {
      return !pickupAddress || !dropoffAddress || livePrice == null;
    }
    if (step === 'quote') {
      return false;
    }
    if (step === 'payment') {
      return false;
    }
    return true;
  };

  return (
    <>
      <Stack.Screen
      />
      <KeyboardAvoidingView
        
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={async () => {
            // Limpa dados ao sair sem confirmar
            await clearSavedData();
            router.back();
          }} style={styles.headerBackButton}>  
          <MaterialIcons name="arrow-back" size={20} color={colors.tint} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Criar Envio</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {step === 'form' && (
            <>

<Card style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Informações do Pacote
                </Text>
                
                <View style={styles.weightSection}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Peso (kg)</Text>
                  <View style={styles.weightChips}>
                    {[0.5, 1, 2, 5].map((weight) => (
                      <TouchableOpacity
                        key={weight}
                        style={[
                          styles.weightChip,
                          { 
                            backgroundColor: form.pacote.pesoKg === weight ? colors.tint : 'transparent',
                            borderColor: colors.tint
                          }
                        ]}
                        onPress={() => {
                          setForm({
                            ...form,
                            pacote: { ...form.pacote, pesoKg: weight }
                          });
                          setWeightInputText(weight.toString().replace('.', ','));
                        }}
                      >
                        <Text style={[
                          styles.weightChipText,
                          { color: form.pacote.pesoKg === weight ? '#ffffff' : colors.tint }
                        ]}>
                          {weight} kg
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Input
                    placeholder="Outro valor (ex: 1,5 ou 2.5)"
                    value={weightInputText}
                    onChangeText={handleWeightTextChange}
                    error={errors.peso}
                    keyboardType="decimal-pad"
                    containerStyle={styles.weightInput}
                  />
                </View>
                
                <View style={styles.dimensionsSection}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Tamanho do Pacote</Text>
                  
                  {/* Grid 2x2 de presets de dimensões */}
                  <View style={styles.dimensionPresetsGrid}>
                    {dimensionPresets.map((preset) => (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.dimensionPresetButton,
                          { 
                            backgroundColor: selectedDimensionPreset === preset.id ? colors.tint : 'transparent',
                            borderColor: colors.tint
                          }
                        ]}
                        onPress={() => handleDimensionPresetSelect(preset.id)}
                      >
                        <MaterialIcons 
                          name={preset.icon as any} 
                          size={28} 
                          color={selectedDimensionPreset === preset.id ? '#ffffff' : colors.tint} 
                        />
                        <Text style={[
                          styles.dimensionPresetName,
                          { color: selectedDimensionPreset === preset.id ? '#ffffff' : colors.text }
                        ]}>
                          {preset.name}
                        </Text>
                        <Text style={[
                          styles.dimensionPresetDescription,
                          { color: selectedDimensionPreset === preset.id ? '#ffffff' : colors.tabIconDefault }
                        ]}>
                          {preset.description}
                        </Text>
                        <Text style={[
                          styles.dimensionPresetSize,
                          { color: selectedDimensionPreset === preset.id ? '#ffffff' : colors.tabIconDefault }
                        ]}>
                          {preset.dimensions.c}×{preset.dimensions.l}×{preset.dimensions.a} cm
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Botão de dimensões personalizadas - abaixo do grid */}
                  <TouchableOpacity
                    style={[
                      styles.customDimensionButton,
                      { 
                        backgroundColor: selectedDimensionPreset === 'custom' ? colors.tint : 'transparent',
                        borderColor: colors.tint
                      }
                    ]}
                    onPress={handleCustomDimensions}
                  >
                    <MaterialIcons 
                      name="tune" 
                      size={24} 
                      color={selectedDimensionPreset === 'custom' ? '#ffffff' : colors.tint} 
                    />
                    <Text style={[
                      styles.customDimensionButtonText,
                      { color: selectedDimensionPreset === 'custom' ? '#ffffff' : colors.text }
                    ]}>
                      Personalizado
                    </Text>
                    <Text style={[
                      styles.customDimensionButtonSubtext,
                      { color: selectedDimensionPreset === 'custom' ? '#ffffff' : colors.tabIconDefault }
                    ]}>
                      Definir tamanho específico
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Resumo das dimensões selecionadas */}
                  {(form.pacote.dim.c > 0 || form.pacote.dim.l > 0 || form.pacote.dim.a > 0) && (
                    <View style={[styles.dimensionSummary, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
                      <MaterialIcons name="info" size={16} color={colors.tint} />
                      <Text style={[styles.dimensionSummaryText, { color: colors.text }]}>
                        Dimensões selecionadas: {form.pacote.dim.c} × {form.pacote.dim.l} × {form.pacote.dim.a} cm
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.valueSection}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Valor Declarado</Text>
                  <View style={[styles.valueInputContainer, { borderColor: colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: colors.tabIconDefault }]}>R$</Text>
                    <Input
                      placeholder="0,00"
                      value={valueInputText}
                      onChangeText={handleValueTextChange}
                      error={errors.valor}
                      keyboardType="decimal-pad"
                      containerStyle={styles.valueInput}
                    />
                  </View>
                  <View style={styles.insuranceWarning}>
                    <MaterialIcons name="info" size={16} color={colors.tint} />
                    <Text style={[styles.insuranceText, { color: colors.tabIconDefault }]}>
                      Valor usado para seguro e indenização
                    </Text>
                  </View>
                </View>
                
                <View style={styles.fragilitySection}>
                  <TouchableOpacity
                    style={[
                      styles.fragilityToggle,
                      { 
                        backgroundColor: form.pacote.fragil ? colors.tint : 'transparent',
                        borderColor: colors.tint
                      }
                    ]}
                    onPress={() => setForm({
                      ...form,
                      pacote: { ...form.pacote, fragil: !form.pacote.fragil }
                    })}
                  >
                    <MaterialIcons 
                      name="warning" 
                      size={20} 
                      color={form.pacote.fragil ? "#ffffff" : colors.tint} 
                    />
                    <Text style={[
                      styles.fragilityText,
                      { color: form.pacote.fragil ? "#ffffff" : colors.tint }
                    ]}>
                      {form.pacote.fragil ? "Pacote Frágil" : "Marcar como Frágil"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.fragilityTooltip, { color: colors.tabIconDefault }]}>
                    Pode adicionar taxa de 15%
                  </Text>
                </View>
              </Card>
              <Card style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}> 
                  Endereços
                </Text>
                {routeInfo?.distKm != null && (
                  <Text style={[styles.paymentSummary, { color: colors.tabIconDefault }]}>Rota: {routeInfo.distKm.toFixed(2)} km</Text>
                )}
                {livePrice != null && (
                  <View style={styles.livePriceContainer}>
                    <Text style={[styles.livePriceLabel, { color: colors.tabIconDefault }]}>Preço Estimado:</Text>
                    <Text style={[styles.livePriceValue, { color: colors.tint }]}>
                      {formatPrice(livePrice)}
                    </Text>
                  </View>
                )}
                
                <Button
                  title="Buscar Endereço de Coleta no Mapa"
                  variant="outline"
                  onPress={() => router.push({ 
                    pathname: '/pedir/map-route', 
                    params: { 
                      mode: 'select', 
                      type: 'pickup',
                      weightKg: String(form.pacote.pesoKg || 0),
                      dimC: String(form.pacote.dim.c || 0),
                      dimL: String(form.pacote.dim.l || 0),
                      dimA: String(form.pacote.dim.a || 0),
                      fragil: String(!!form.pacote.fragil),
                    } 
                  })}
                  icon={<MaterialIcons name="map" size={16} color={colors.tint} />}
                  style={{ marginTop: 8 }}
                />
                {pickupAddress && (
                  <View style={styles.addressSummary}>
                    <Text style={[styles.addressLabel, { color: colors.text }]}>Coleta:</Text>
                    <Text style={[styles.addressText, { color: colors.text }]}>{pickupAddress.label}</Text>
                  </View>
                )}
                
                <Input
                  label="Nome do Contato (Coleta)"
                  placeholder="Quem vai entregar o pacote?"
                  value={form.pickup.contato}
                  onChangeText={(text) => setForm({
                    ...form,
                    pickup: { ...form.pickup, contato: text }
                  })}
                  error={errors.pickupContato}
                  required
                />
                
                <Input
                  label="Instruções de Coleta"
                  placeholder="Informações adicionais (opcional)"
                  value={form.pickup.instrucoes}
                  onChangeText={(text) => setForm({
                    ...form,
                    pickup: { ...form.pickup, instrucoes: text }
                  })}
                  multiline
                />
                
                <Button
                  title="Buscar Endereço de Entrega no Mapa"
                  variant="outline"
                  onPress={() => router.push({ 
                    pathname: '/pedir/map-route', 
                    params: { 
                      mode: 'select', 
                      type: 'dropoff',
                      weightKg: String(form.pacote.pesoKg || 0),
                      dimC: String(form.pacote.dim.c || 0),
                      dimL: String(form.pacote.dim.l || 0),
                      dimA: String(form.pacote.dim.a || 0),
                      fragil: String(!!form.pacote.fragil),
                    }
                  })}
                  icon={<MaterialIcons name="map" size={16} color={colors.tint} />}
                  style={{ marginTop: 8 }}
                />
                {dropoffAddress && (
                  <View style={styles.addressSummary}>
                    <Text style={[styles.addressLabel, { color: colors.text }]}>Entrega:</Text>
                    <Text style={[styles.addressText, { color: colors.text }]}>{dropoffAddress.label}</Text>
                  </View>
                )}
                
                <Input
                  label="Nome do Contato (Entrega)"
                  placeholder="Quem vai receber o pacote?"
                  value={form.dropoff.contato}
                  onChangeText={(text) => setForm({
                    ...form,
                    dropoff: { ...form.dropoff, contato: text }
                  })}
                  error={errors.dropoffContato}
                  required
                />
                
                <Input
                  label="Instruções de Entrega"
                  placeholder="Informações adicionais (opcional)"
                  value={form.dropoff.instrucoes}
                  onChangeText={(text) => setForm({
                    ...form,
                    dropoff: { ...form.dropoff, instrucoes: text }
                  })}
                  multiline
                />
              </Card>


            </>
          )}

          {step === 'quote' && quote && (
            <Card style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <MaterialIcons name="attach-money" size={48} color={colors.tint} />
                <Text style={[styles.quoteTitle, { color: colors.text }]}>
                  Cotação Calculada
                </Text>
              </View>
              
              <View style={styles.quoteDetails}>
                <View style={styles.quoteRow}>
                  <Text style={[styles.quoteLabel, { color: colors.tabIconDefault }]}>
                    Preço Total:
                  </Text>
                  <Text style={[styles.quotePrice, { color: colors.text }]}>
                    {formatPrice(quote.preco)}
                  </Text>
                </View>
                
                <View style={styles.quoteRow}>
                  <Text style={[styles.quoteLabel, { color: colors.tabIconDefault }]}>
                    Distância:
                  </Text>
                  <Text style={[styles.quoteValue, { color: colors.text }]}>
                    {quote.distKm.toFixed(1)} km
                  </Text>
                </View>
                
                <View style={styles.quoteRow}>
                  <Text style={[styles.quoteLabel, { color: colors.tabIconDefault }]}>
                    Tempo Estimado:
                  </Text>
                  <Text style={[styles.quoteValue, { color: colors.text }]}>
                    {quote.tempoMin} minutos
                  </Text>
                </View>
              </View>
              
            </Card>
          )}

          {step === 'payment' && quote && (
            <Card style={styles.paymentCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Finalizar Envio
              </Text>
              
              <Text style={[styles.paymentSummary, { color: colors.tabIconDefault }]}>
                Valor do envio: {formatPrice(quote.preco)}
              </Text>
              
              <View style={styles.infoContainer}>
                <MaterialIcons name="info" size={20} color={colors.tint} />
                <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
                  O envio será criado e ficará disponível para entregadores aceitarem
                </Text>
              </View>
              
            </Card>
          )}

          {/* Detalhamento do Preço */}
          {priceBreakdown && (
            <Card style={styles.priceBreakdownCard}>
              <View style={styles.priceBreakdownHeader}>
                <MaterialIcons name="receipt" size={24} color={colors.tint} />
                <Text style={[styles.priceBreakdownTitle, { color: colors.text }]}>
                  Detalhamento do Preço
                </Text>
              </View>
              
              <View style={styles.priceBreakdownContent}>
                <View style={styles.priceBreakdownRow}>
                  <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                    Taxa base (até 0,5km):
                  </Text>
                  <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                    {formatPrice(priceBreakdown.basePrice)}
                  </Text>
                </View>
                
                {priceBreakdown.variablePrice > 0 && (
                  <View style={styles.priceBreakdownRow}>
                    <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                      Taxa por km adicional:
                    </Text>
                    <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                      {formatPrice(priceBreakdown.variablePrice)}
                    </Text>
                  </View>
                )}
                
                {priceBreakdown.weightMultiplier > 0 && (
                  <View style={styles.priceBreakdownRow}>
                    <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                      Taxa por peso (+{priceBreakdown.weightMultiplier}%):
                    </Text>
                    <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                      {formatPrice((priceBreakdown.basePrice + priceBreakdown.variablePrice) * (priceBreakdown.weightMultiplier / 100))}
                    </Text>
                  </View>
                )}
                
                {priceBreakdown.fragilityMultiplier > 0 && (
                  <View style={styles.priceBreakdownRow}>
                    <Text style={[styles.priceBreakdownLabel, { color: colors.tabIconDefault }]}>
                      Taxa por fragilidade (+{priceBreakdown.fragilityMultiplier}%):
                    </Text>
                    <Text style={[styles.priceBreakdownValue, { color: colors.text }]}>
                      {formatPrice((priceBreakdown.basePrice + priceBreakdown.variablePrice) * (priceBreakdown.fragilityMultiplier / 100))}
                    </Text>
                  </View>
                )}
                
                <View style={[styles.priceBreakdownDivider, { backgroundColor: colors.border }]} />
                
                <View style={styles.priceBreakdownRow}>
                  <Text style={[styles.priceBreakdownTotalLabel, { color: colors.text }]}>
                    Total:
                  </Text>
                  <Text style={[styles.priceBreakdownTotalValue, { color: colors.tint }]}>
                    {formatPrice(priceBreakdown.total)}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>
        
        {/* Sticky Footer Button */}
        <View style={[styles.stickyFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button
            title={getButtonTitle()}
            onPress={getButtonAction()}
            loading={isLoading}
            size="lg"
            fullWidth
            disabled={getButtonDisabled()}
            style={styles.stickyButton}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Dimensões Personalizadas */}
      {showCustomDimensionsModal && (
        <CustomDimensionsModal
          visible={showCustomDimensionsModal}
          onClose={handleCloseCustomDimensionsModal}
          onApply={handleApplyCustomDimensions}
          currentDimensions={form.pacote.dim}
          colors={colors}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Espaço para o sticky footer
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  weightSection: {
    marginBottom: 20,
  },
  weightChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  weightChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  weightChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weightInput: {
    marginTop: 0,
  },
  dimensionsSection: {
    marginBottom: 20,
  },
  dimensionPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  dimensionPresetButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  customDimensionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    marginBottom: 16,
  },
  customDimensionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  customDimensionButtonSubtext: {
    fontSize: 12,
    opacity: 0.8,
  },
  dimensionPresetName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  dimensionPresetDescription: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    opacity: 0.8,
  },
  dimensionPresetSize: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.7,
  },
  dimensionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dimensionSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Estilos do Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  customDimensionsGrid: {
    gap: 16,
  },
  customDimensionCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  customDimensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  customDimensionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  customDimensionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 48,
    width: '100%',
  },
  customDimensionTextInput: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 36,
    paddingVertical: 8,
  },
  customDimensionSuffix: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  customDimensionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 26,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
  },
  customDimensionSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  valueSection: {
    marginBottom: 20,
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 48,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  valueInput: {
    flex: 1,
    marginTop: 0,
  },
  insuranceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  insuranceText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  fragilitySection: {
    marginBottom: 20,
  },
  fragilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  fragilityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fragilityTooltip: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dimensionInput: {
    flex: 1,
  },
  dimensionTextInput: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 36,
    paddingVertical: 8,
  },
  submitButton: {
    marginTop: 20,
  },
  quoteCard: {
    alignItems: 'center',
    padding: 24,
  },
  quoteHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  quoteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  quoteDetails: {
    width: '100%',
    marginBottom: 24,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  quoteLabel: {
    fontSize: 16,
  },
  quotePrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quoteValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  quoteButton: {
    flex: 1,
  },
  paymentCard: {
    padding: 24,
  },
  paymentSummary: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: StatusBar.currentHeight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    lineHeight: 22,
  },
  livePriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  livePriceLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  livePriceValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34, // Safe area bottom
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  stickyButton: {
    marginBottom: 0,
  },
  priceBreakdownCard: {
    marginBottom: 20,
    padding: 20,
  },
  priceBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  priceBreakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceBreakdownContent: {
    gap: 12,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceBreakdownLabel: {
    fontSize: 14,
    flex: 1,
  },
  priceBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  priceBreakdownDivider: {
    height: 1,
    marginVertical: 8,
  },
  priceBreakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  priceBreakdownTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
});
