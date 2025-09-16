import { CallMessageModal } from '@/components/ui/modal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { getDrivingRoute, LatLng } from '@/services/directions.service';
import { locationService } from '@/services/location.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { CourierOffer, Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import OfferModal from './offer-modal';

interface RideRequest {
  id: string;
  passenger: {
    name: string;
    rating: number;
    phone?: string;
  };
  pickup: {
    address: string;
    neighborhood: string;
    coordinates: LatLng;
  };
  destination: {
    address: string;
    neighborhood?: string;
    coordinates: LatLng;
    isHidden?: boolean; // Para destinos ocultos
  };
  payment: {
    method: 'card' | 'cash' | 'voucher';
    category: 'X' | 'Moto' | 'Entrega' | 'Premium';
  };
  pricing: {
    base: number;
    distance: number;
    duration: number;
    surge?: number; // Multiplicador de boost/surge
    total: number;
  };
  metrics: {
    distanceToPickup: number; // metros
    timeToPickup: number; // minutos
    estimatedDuration: number; // minutos
  };
  safety: {
    isRestrictedZone?: boolean;
    isBlockedArea?: boolean;
    isSensitiveTime?: boolean;
  };
  isLongPickup?: boolean; // Para retiradas distantes
}

export default function AcceptRideScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  
  console.log('📋 Parâmetros recebidos:', params);
  
  // Estados principais
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState(30); // 30 segundos para decidir
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
  
  // Estados do sistema de ofertas
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [shipmentData, setShipmentData] = useState<Shipment | null>(null);
  const [rejectionCount, setRejectionCount] = useState(0);
  
  // Estados do modal de chamada
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  
  // Estados do mapa
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Estados para rota até a retirada
  const [pickupRouteCoords, setPickupRouteCoords] = useState<LatLng[]>([]);
  const [realDistanceToPickup, setRealDistanceToPickup] = useState<number | null>(null);
  const [realTimeToPickup, setRealTimeToPickup] = useState<number | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
  // Animações
  
  
  // Animações
  const timerAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  const mapRef = useRef<MapView | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Obtém localização real do usuário
  useEffect(() => {
    const getRealLocation = async () => {
      try {
        console.log('📍 Obtendo localização atual...');
        const location = await locationService.getCurrentLocation();
        const realLocation: LatLng = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        console.log('✅ Localização obtida:', realLocation);
        setCurrentLocation(realLocation);
        setLocationError(null);
      } catch (error) {
        console.error('❌ Erro ao obter localização:', error);
        setLocationError('Não foi possível obter sua localização');
        // Fallback para localização mockada
        const fallbackLocation = {
          latitude: -23.5515,
          longitude: -46.6343
        };
        console.log('🔄 Usando localização fallback:', fallbackLocation);
        setCurrentLocation(fallbackLocation);
      }
    };

    getRealLocation();
  }, []);

  // Processa parâmetros recebidos ou usa dados mockados
  useEffect(() => {
    let rideData: RideRequest;
    // Se está em modo de teste, usa os parâmetros recebidos
      rideData = {
        id: params.shipmentId as string || params.id as string || 'ride_123',
        passenger: {
          name: params.passengerName as string || 'Maria Silva',
          rating: parseFloat(params.passengerRating as string) || 4.92,
          phone: params.passengerPhone as string || '+5511999999999'
        },
        pickup: {
          address: params.pickupAddress as string || 'Rua das Flores, 123',
          neighborhood: params.pickupNeighborhood as string || 'Centro',
          coordinates: {
            latitude: parseFloat(params.pickupLat as string) || -23.5505,
            longitude: parseFloat(params.pickupLng as string) || -46.6333
          }
        },
        destination: {
          address: params.destinationAddress as string || 'Shopping Iguatemi',
          neighborhood: params.destinationNeighborhood as string || 'Vila Olímpia',
          coordinates: {
            latitude: parseFloat(params.destinationLat as string) || -23.5925,
            longitude: parseFloat(params.destinationLng as string) || -46.6875
          },
          isHidden: params.destinationIsHidden === 'true'
        },
        payment: {
          method: (params.paymentMethod as 'card' | 'cash' | 'voucher') || 'card',
          category: (params.paymentCategory as 'X' | 'Moto' | 'Entrega' | 'Premium') || 'X'
        },
        pricing: {
          base: parseFloat(params.pricingBase as string) || 8.50,
          distance: parseFloat(params.pricingDistance as string) || 12.30,
          duration: parseFloat(params.pricingDuration as string) || 4.20,
          surge: parseFloat(params.pricingSurge as string) || 1.2,
          total: parseFloat(params.pricingTotal as string) || 18.50
        },
        metrics: {
          distanceToPickup: parseFloat(params.metricsDistanceToPickup as string) || 650,
          timeToPickup: parseFloat(params.metricsTimeToPickup as string) || 2,
          estimatedDuration: parseFloat(params.metricsEstimatedDuration as string) || 12
        },
        safety: {
          isRestrictedZone: params.safetyIsRestrictedZone === 'true',
          isBlockedArea: params.safetyIsBlockedArea === 'true',
          isSensitiveTime: params.safetyIsSensitiveTime === 'true'
        },
        isLongPickup: params.isLongPickup === 'true'
      };
    

    setRideRequest(rideData);
    
    // Toca alerta sonoro e vibração
    Vibration.vibrate([0, 500, 200, 500]);
    
    // Inicia animação de entrada
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []); // Removido [params] para evitar loop infinito

  // Timer countdown
  useEffect(() => {
    if (!rideRequest || isAccepted || isRejected) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as ReturnType<typeof setInterval>;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [rideRequest, isAccepted, isRejected]);

  // Animação do timer
  useEffect(() => {
    if (timeLeft <= 5) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [timeLeft]);

// Calcula rota quando o mapa estiver pronto
useEffect(() => {
  if (!mapReady || !rideRequest || !currentLocation) return;

  const calculateRoutes = async () => {
    try {
      setIsCalculatingRoute(true);
      console.log('🗺️ Calculando rotas...', {
        currentLocation,
        pickup: rideRequest.pickup.coordinates,
        destination: rideRequest.destination.coordinates
      });

      // Calcula rota da corrida (pickup -> destination) - AZUL
      const rideRoute = await getDrivingRoute(
        rideRequest.pickup.coordinates,
        rideRequest.destination.coordinates
      );
      if (rideRoute) {
        console.log('✅ Rota da corrida calculada:', {
          distance: rideRoute.distanceKm,
          duration: rideRoute.durationMin
        });
        setRouteCoords(rideRoute.coordinates);
        setRouteDistance(rideRoute.distanceKm);
        setRouteDuration(rideRoute.durationMin);
      } else {
        console.warn('⚠️ Falha ao calcular rota da corrida');
      }

      // Calcula rota até a retirada (currentLocation -> pickup) - AMARELA
      try {
        const pickupRoute = await getDrivingRoute(
          currentLocation,
          rideRequest.pickup.coordinates
        );
        if (pickupRoute) {
          console.log('✅ Rota até pickup calculada:', {
            distance: pickupRoute.distanceKm,
            duration: pickupRoute.durationMin,
            coordinatesCount: pickupRoute.coordinates.length
          });
          setPickupRouteCoords(pickupRoute.coordinates);
          setRealDistanceToPickup(pickupRoute.distanceKm * 1000); // Converte para metros
          setRealTimeToPickup(pickupRoute.durationMin);
          console.log('📍 Coordenadas da rota até pickup definidas:', pickupRoute.coordinates.length, 'pontos');
        } else {
          console.warn('⚠️ Falha ao calcular rota até pickup - resposta vazia');
          // Fallback: usar distância calculada localmente
          const fallbackDistance = locationService.calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            rideRequest.pickup.coordinates.latitude,
            rideRequest.pickup.coordinates.longitude
          );
          setRealDistanceToPickup(fallbackDistance * 1000);
          setRealTimeToPickup(Math.round(fallbackDistance * 3)); // Estimativa: 3 min por km
        }
      } catch (pickupError) {
        console.error('❌ Erro específico ao calcular rota até pickup:', pickupError);
        // Fallback: usar distância calculada localmente
        const fallbackDistance = locationService.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          rideRequest.pickup.coordinates.latitude,
          rideRequest.pickup.coordinates.longitude
        );
        setRealDistanceToPickup(fallbackDistance * 1000);
        setRealTimeToPickup(Math.round(fallbackDistance * 3)); // Estimativa: 3 min por km
      }
      
      // Ajusta o mapa para mostrar todos os pontos
      fitToMarkers([currentLocation, rideRequest.pickup.coordinates, rideRequest.destination.coordinates]);
    } catch (error) {
      console.error('❌ Erro ao calcular rotas:', error);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  calculateRoutes();
}, [mapReady, rideRequest, currentLocation]);

  const fitToMarkers = (points: LatLng[]) => {
    if (!mapRef.current || points.length === 0) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 30, bottom: 150, left: 30 }, // Reduced padding to show more map
      animated: true,
    });
  };

  const handleAccept = async () => {
    if (isAccepted || isRejected) return;
    
    setIsLoading(true);
    Vibration.vibrate([0, 100, 50, 100]); // Feedback háptico
    
    try {
      // Obtém sessão atual para pegar o courierUid
      const session = await authService.getSession();
      if (!session || !session.userId) {
        throw new Error('Usuário não autenticado');
      }

      // Atualiza o shipment no Firestore com o courierUid e estado EN_ROUTE
      await shipmentFirestoreService.updateShipmentState(
        rideRequest!.id,
        'EN_ROUTE',
        {
          courierUid: session.userId
        }
      );

      // Adiciona evento na timeline
      await shipmentFirestoreService.addTimelineEvent(rideRequest!.id, {
        tipo: 'ACCEPTED',
        descricao: 'Corrida aceita pelo entregador',
        payload: {
          courierUid: session.userId,
          courierName: 'Entregador'
        }
      });
      
      setIsAccepted(true);
      
      // Navega para tela de navegação
      router.replace({
        pathname: '/aceitar/navegacao-corrida',
        params: {
          shipmentId: rideRequest?.id,
          rideId: rideRequest?.id,
          passengerName: rideRequest?.passenger.name,
          passengerPhone: rideRequest?.passenger.phone,
          // Pickup data
          pickupAddress: rideRequest?.pickup.address,
          pickupLat: rideRequest?.pickup.coordinates.latitude.toString(),
          pickupLng: rideRequest?.pickup.coordinates.longitude.toString(),
          // Destination data
          destinationAddress: rideRequest?.destination.address,
          destinationLat: rideRequest?.destination.coordinates.latitude.toString(),
          destinationLng: rideRequest?.destination.coordinates.longitude.toString(),
          // ETA data
          etaToPickup: rideRequest?.metrics.timeToPickup.toString(),
          etaToDestination: rideRequest?.metrics.estimatedDuration.toString(),
        }
      });
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Erro', 'Falha ao aceitar corrida. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (isAccepted || isRejected) return;
    
    Vibration.vibrate([0, 200]);
    setIsRejected(true);
    
    try {
      // Busca dados atuais do envio para obter rejectionCount do banco
      let currentRejectionCount = 0;
      if (params.shipmentId) {
        const shipment = await shipmentFirestoreService.getShipmentById(params.shipmentId as string);
        if (shipment) {
          currentRejectionCount = shipment.rejectionCount || 0;
        }
      }
      
      const newRejectionCount = currentRejectionCount + 1;
      setRejectionCount(newRejectionCount);
      
      console.log('🔄 Rejeição:', { 
        currentCount: currentRejectionCount, 
        newCount: newRejectionCount,
        shipmentId: params.shipmentId 
      });
      
      // Se rejeitou 3 vezes, mostra modal de oferta
      if (newRejectionCount >= 3) {
        console.log('🎯 Mostrando modal de oferta - 3 rejeições atingidas');
        // Busca dados do envio se disponível
        if (params.shipmentId) {
          const shipment = await shipmentFirestoreService.getShipmentById(params.shipmentId as string);
          console.log('📦 Dados do envio:', shipment);
          if (shipment) {
            setShipmentData(shipment);
            setShowOfferModal(true);
            console.log('✅ Modal de oferta ativado');
            return;
          }
        }
      }
      
      // Adiciona evento à timeline e atualiza contador de rejeições
      if (params.shipmentId) {
        await shipmentFirestoreService.addTimelineEvent(params.shipmentId as string, {
          tipo: 'REJECTED_BY_COURIER',
          descricao: `Entregador recusou pela ${newRejectionCount}ª vez`,
          payload: {
            rejectionCount: newRejectionCount,
            timestamp: new Date().toISOString()
          }
        });
        
        // Atualiza o contador de rejeições no documento principal
        await shipmentFirestoreService.updateShipmentRejectionCount(params.shipmentId as string, newRejectionCount);
      }
      
    } catch (error) {
      console.error('Error handling rejection:', error);
    }
    
    // Volta para tela anterior ou home
    setTimeout(async () => {
      // Verifica se pode voltar
      if (router.canGoBack()) {
        router.back();
      } else {
        // Se não pode voltar, vai para home
        const session = await authService.getSession();
        if (session?.role === 'courier') {
          router.replace('/(tabs)/courier/courier-home');
        } else {
          router.replace('/(tabs)/cliente/business-home');
        }
      }
    }, 500);
  };

  const handleContactPassenger = () => {
    setIsCallModalVisible(true);
  };

  const handleMakeCall = () => {
    if (!rideRequest?.passenger.phone) return;
    
    const phoneNumber = rideRequest.passenger.phone.replace(/\D/g, '');
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível realizar a chamada telefônica');
    });
    setIsCallModalVisible(false);
  };

  const handleSendMessage = () => {
    if (!rideRequest?.passenger.phone) return;
    
    const phoneNumber = rideRequest.passenger.phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=+55${phoneNumber}`).catch(() => {
      // Fallback to web version if app is not installed
      Linking.openURL(`https://wa.me/55${phoneNumber}`).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
      });
    });
    setIsCallModalVisible(false);
  };

  const handleOfferSubmitted = (offer: CourierOffer) => {
    setShowOfferModal(false);
    Alert.alert(
      'Oferta Enviada!',
      'Sua oferta foi enviada para o cliente. Aguarde a resposta.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleCloseOfferModal = () => {
    setShowOfferModal(false);
    router.back();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${Math.round(meters / 1000)} km`;
  };

  const formatRouteDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${Math.round(km)} km`;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card': return 'credit-card';
      case 'cash': return 'money';
      case 'voucher': return 'local-offer';
      default: return 'payment';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'X': return '#4CAF50';
      case 'Moto': return '#FF9800';
      case 'Entrega': return '#2196F3';
      case 'Premium': return '#9C27B0';
      default: return colors.tint;
    }
  };

  if (!rideRequest) {
    return null;
  }

  // Debug: verificar estado das rotas
  console.log('🗺️ Estado das rotas no render:', {
    routeCoords: routeCoords.length,
    pickupRouteCoords: pickupRouteCoords.length,
    currentLocation: !!currentLocation,
    mapReady
  });
  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Mapa de fundo */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            onMapReady={() => setMapReady(true)}
            initialRegion={{
              latitude: currentLocation?.latitude || rideRequest.pickup.coordinates.latitude,
              longitude: currentLocation?.longitude || rideRequest.pickup.coordinates.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {/* Localização atual do usuário */}
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                title="Sua localização"
              >
                <View style={styles.currentLocationMarker}>
                  <View style={styles.currentLocationDot} />
                </View>
              </Marker>
            )}

            {/* Pin de retirada (verde) */}
            <Marker
              coordinate={rideRequest.pickup.coordinates}
              title="Ponto de Retirada"
            >
              <View style={styles.pickupMarker}>
                <MaterialIcons name="my-location" size={24} color="#fff" />
              </View>
            </Marker>

            {/* Pin de destino (azul) */}
            <Marker
              coordinate={rideRequest.destination.coordinates}
              title="Destino"
            >
              <View style={styles.destinationMarker}>
                <MaterialIcons name="place" size={24} color="#fff" />
              </View>
            </Marker>

            {/* Rota da corrida (azul) */}
            {routeCoords.length > 0 && (
              <Polyline 
                coordinates={routeCoords} 
                strokeColor="#3B82F6" 
                strokeWidth={3} 
              />
            )}

            {/* Rota até o pickup (laranja) */}
            {pickupRouteCoords.length > 0 && (
              <Polyline 
                coordinates={pickupRouteCoords} 
                strokeColor="#FF6B35" 
                strokeWidth={5} 
                onPress={() => console.log('📍 Rota até pickup clicada')}
              />
            )}
          </MapView>
        </View>

        {/* Cabeçalho com timer */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Nova Corrida
            </Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[styles.collapseButton, { backgroundColor: colors.tint }]}
                onPress={() => setIsInfoCollapsed(!isInfoCollapsed)}
              >
                <MaterialIcons 
                  name={isInfoCollapsed ? 'expand-more' : 'expand-less'} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <Animated.View 
                style={[
                  styles.timerContainer,
                  { 
                    transform: [{ scale: pulseAnimation }],
                    opacity: timeLeft <= 5 ? 0.8 : 1
                  }
                ]}
              >
                <View style={[styles.timerRing, { borderColor: timeLeft <= 5 ? '#f44336' : colors.tint }]}>
                  <Text style={[styles.timerText, { color: timeLeft <= 5 ? '#f44336' : colors.tint }]}>
                    {timeLeft}
                  </Text>
                </View>
              </Animated.View>
            </View>
          </View>
          
          {/* Indicador de erro de localização */}
          {locationError && (
            <View style={styles.locationErrorContainer}>
              <MaterialIcons name="location-off" size={16} color="#f44336" />
              <Text style={[styles.locationErrorText, { color: '#f44336' }]}>
                {locationError}
              </Text>
            </View>
          )}
        </View>

        {/* Card de informações */}
        <Animated.View 
          style={[
            styles.infoCard,
            { 
              backgroundColor: isInfoCollapsed ? colors.background : `${colors.background}dd`, // Semi-transparent when expanded
              transform: [{ translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0]
              })}],
              paddingBottom: isInfoCollapsed ? 16 : 24,
            }
          ]}
        >
          <ScrollView 
            style={[
              styles.infoScrollView,
              { maxHeight: isInfoCollapsed ? 60 : Dimensions.get('window').height * 0.35 } // Reduced heights
            ]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.infoScrollContent,
              { paddingBottom: isInfoCollapsed ? 0 : 16 } // Reduced padding
            ]}
          >
            {/* Informações do passageiro */}
            <View style={[
              styles.passengerSection,
              { marginBottom: isInfoCollapsed ? 4 : 12 } // Reduced margins
            ]}>
              <View style={styles.passengerInfo}>
                <View style={styles.passengerAvatar}>
                  <Text style={styles.passengerInitial}>
                    {rideRequest.passenger.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.passengerDetails}>
                  <Text style={[styles.passengerName, { color: colors.text }]}>
                    {rideRequest.passenger.name}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#FFD700" />
                    <Text style={[styles.ratingText, { color: colors.tabIconDefault }]}>
                      {rideRequest.passenger.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {rideRequest.passenger.phone && !isInfoCollapsed && (
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={handleContactPassenger}
                >
                  <MaterialIcons name="phone" size={20} color={colors.tint} />
                </TouchableOpacity>
              )}
            </View>

            {/* Informações resumidas quando colapsado */}
            {isInfoCollapsed && (
              <View style={[styles.collapsedInfo, { marginTop: 0, padding: 6 }]}> // Reduced padding
                <View style={styles.collapsedRow}>
                  <Text style={[styles.collapsedLabel, { color: colors.tabIconDefault }]}>
                    Preço:
                  </Text>
                  <Text style={[styles.collapsedValue, { color: colors.tint, fontWeight: 'bold' }]}>
                    {formatPrice(rideRequest.pricing.total)}
                  </Text>
                </View>
                <View style={styles.collapsedRow}>
                  <Text style={[styles.collapsedLabel, { color: colors.tabIconDefault }]}>
                    Até pickup:
                  </Text>
                  <Text style={[styles.collapsedValue, { color: colors.text }]}>
                    {isCalculatingRoute ? (
                      'Calculando...'
                    ) : (
                      <>
                        {formatDistance(realDistanceToPickup || rideRequest.metrics.distanceToPickup)} • {Math.round(realTimeToPickup || rideRequest.metrics.timeToPickup)} min
                        {realDistanceToPickup && (
                          <Text style={[styles.collapsedValue, { color: colors.tint, fontSize: 12 }]}>
                            {' '}(real)
                          </Text>
                        )}
                      </>
                    )}
                  </Text>
                </View>
                {routeDistance && (
                  <View style={styles.collapsedRow}>
                    <Text style={[styles.collapsedLabel, { color: colors.tabIconDefault }]}>
                      Distância da corrida:
                    </Text>
                    <Text style={[styles.collapsedValue, { color: colors.text }]}>
                      {formatRouteDistance(routeDistance)}
                      {routeDuration && ` • ${Math.round(routeDuration)} min`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Conteúdo completo quando expandido */}
            {!isInfoCollapsed && (
              <>
                {/* Endereços */}
                <View style={styles.addressesSection}>
            <View style={styles.addressItem}>
              <View style={[styles.addressIcon, { backgroundColor: '#4CAF50' }]}>
                <MaterialIcons name="my-location" size={16} color="#fff" />
              </View>
              <View style={styles.addressText}>
                <Text style={[styles.addressTitle, { color: colors.text }]}>
                  Retirada
                </Text>
                <Text style={[styles.addressContent, { color: colors.tabIconDefault }]} numberOfLines={1}> 
                  {rideRequest.pickup.address}
                </Text>
                <Text style={[styles.addressNeighborhood, { color: colors.tabIconDefault }]} numberOfLines={1}> 
                  {rideRequest.pickup.neighborhood}
                </Text>
              </View>
            </View>

            <View style={styles.addressItem}>
              <View style={[styles.addressIcon, { backgroundColor: '#2196F3' }]}>
                <MaterialIcons name="place" size={16} color="#fff" />
              </View>
              <View style={styles.addressText}>
                <Text style={[styles.addressTitle, { color: colors.text }]}>
                  Destino
                </Text>
                <Text style={[styles.addressContent, { color: colors.tabIconDefault }]} numberOfLines={1}> 
                  {rideRequest.destination.isHidden 
                    ? 'Destino oculto' 
                    : rideRequest.destination.address
                  }
                </Text>
                {rideRequest.destination.neighborhood && !rideRequest.destination.isHidden && (
                  <Text style={[styles.addressNeighborhood, { color: colors.tabIconDefault }]} numberOfLines={1}> 
                    {rideRequest.destination.neighborhood}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Métricas */}
          <View style={[styles.metricsSection, { marginBottom: 12 }]}>
            <View style={styles.metricItem}>
              <MaterialIcons name="directions" size={20} color={colors.tint} />
              <Text style={[styles.metricLabel, { color: colors.tabIconDefault }]}>
                Até retirada:
              </Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {isCalculatingRoute ? (
                  'Calculando...'
                ) : (
                  <>
                    {formatDistance(realDistanceToPickup || rideRequest.metrics.distanceToPickup)} • {Math.round(realTimeToPickup || rideRequest.metrics.timeToPickup)} min
                    {realDistanceToPickup && (
                      <Text style={[styles.metricValue, { color: colors.tint, fontSize: 12 }]}>
                        {' '}(real)
                      </Text>
                    )}
                  </>
                )}
              </Text>
            </View>

            {routeDistance && (
              <View style={styles.metricItem}>
                <MaterialIcons name="straighten" size={20} color={colors.tint} />
                <Text style={[styles.metricLabel, { color: colors.tabIconDefault }]}>
                  Distância da corrida:
                </Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {formatRouteDistance(routeDistance)}
                  {routeDuration && ` • ${Math.round(routeDuration)} min`}
                </Text>
              </View>
            )}

            <View style={styles.metricItem}>
              <MaterialIcons name="access-time" size={20} color={colors.tint} />
              <Text style={[styles.metricLabel, { color: colors.tabIconDefault }]}>
                Duração estimada:
              </Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(rideRequest.metrics.estimatedDuration)} min
              </Text>
            </View>
          </View>

          {/* Pagamento e categoria */}
          <View style={[styles.paymentSection, { marginBottom: 12 }]}>
            <View style={styles.paymentInfo}>
              <MaterialIcons 
                name={getPaymentIcon(rideRequest.payment.method)} 
                size={20} 
                color={colors.tint} 
              />
              <Text style={[styles.paymentMethod, { color: colors.tabIconDefault }]}>
                {rideRequest.payment.method === 'card' ? 'Cartão' : 
                 rideRequest.payment.method === 'cash' ? 'Dinheiro' : 'Vale'}
              </Text>
            </View>
            
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(rideRequest.payment.category) }]}>
              <Text style={styles.categoryText}>
                {rideRequest.payment.category}
              </Text>
            </View>
          </View>

          {/* Preço com breakdown */}
          <View style={[styles.pricingSection, { marginBottom: 12 }]}>
            <View style={styles.pricingHeader}>
              <Text style={[styles.pricingTitle, { color: colors.text }]}>
                Ganho Estimado
              </Text>
              {rideRequest.pricing.surge && rideRequest.pricing.surge > 1 && (
                <View style={styles.surgeBadge}>
                  <MaterialIcons name="flash-on" size={16} color="#fff" />
                  <Text style={styles.surgeText}>
                    Impulso {rideRequest.pricing.surge}x
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.pricingBreakdown}>
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, { color: colors.tabIconDefault }]}>
                  Taxa base:
                </Text>
                <Text style={[styles.pricingValue, { color: colors.text }]}>
                  {formatPrice(rideRequest.pricing.base)}
                </Text>
              </View>
              
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, { color: colors.tabIconDefault }]}>
                  Distância:
                </Text>
                <Text style={[styles.pricingValue, { color: colors.text }]}>
                  {formatPrice(rideRequest.pricing.distance)}
                </Text>
              </View>
              
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, { color: colors.tabIconDefault }]}>
                  Tempo:
                </Text>
                <Text style={[styles.pricingValue, { color: colors.text }]}>
                  {formatPrice(rideRequest.pricing.duration)}
                </Text>
              </View>
              
              {rideRequest.pricing.surge && rideRequest.pricing.surge > 1 && (
                <View style={styles.pricingRow}>
                  <Text style={[styles.pricingLabel, { color: colors.tabIconDefault }]}>
                    Impulso ({rideRequest.pricing.surge}x):
                  </Text>
                  <Text style={[styles.pricingValue, { color: '#FF9800' }]}>
                    +{formatPrice((rideRequest.pricing.base + rideRequest.pricing.distance + rideRequest.pricing.duration) * (rideRequest.pricing.surge - 1))}
                  </Text>
                </View>
              )}
              
              <View style={[styles.pricingDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingTotalLabel, { color: colors.text }]}>
                  Total:
                </Text>
                <Text style={[styles.pricingTotalValue, { color: colors.tint }]}>
                  {formatPrice(rideRequest.pricing.total)}
                </Text>
              </View>
            </View>
          </View>

          {/* Alertas de segurança */}
          {(rideRequest.safety.isRestrictedZone || rideRequest.safety.isBlockedArea || rideRequest.safety.isSensitiveTime) && (
            <View style={[styles.safetyAlerts, { marginBottom: 8 }]}>
              {rideRequest.safety.isRestrictedZone && (
                <View style={[styles.safetyBadge, { backgroundColor: '#f44336' }]}>
                  <MaterialIcons name="warning" size={16} color="#fff" />
                  <Text style={styles.safetyText}>Zona restrita</Text>
                </View>
              )}
              {rideRequest.safety.isBlockedArea && (
                <View style={[styles.safetyBadge, { backgroundColor: '#ff9800' }]}>
                  <MaterialIcons name="block" size={16} color="#fff" />
                  <Text style={styles.safetyText}>Área bloqueada</Text>
                </View>
              )}
              {rideRequest.safety.isSensitiveTime && (
                <View style={[styles.safetyBadge, { backgroundColor: '#9c27b0' }]}>
                  <MaterialIcons name="schedule" size={16} color="#fff" />
                  <Text style={styles.safetyText}>Horário sensível</Text>
                </View>
              )}
            </View>
          )}

          {/* Long pickup warning */}
          {rideRequest.isLongPickup && (
            <View style={[styles.longPickupWarning, { marginBottom: 8 }]}>
              <MaterialIcons name="info" size={20} color="#ff9800" />
              <Text style={[styles.longPickupText, { color: '#ff9800' }]}>
                Retirada distante - {formatDistance(realDistanceToPickup || rideRequest.metrics.distanceToPickup)} • {Math.round(realTimeToPickup || rideRequest.metrics.timeToPickup)} min
              </Text>
            </View>
          )}

              </>
            )}

            {/* Botões de ação */}
            <View style={[
              styles.actionButtons,
              { marginTop: isInfoCollapsed ? 4 : 8 } // Reduced margins
            ]}>
            <TouchableOpacity
              style={[styles.rejectButton, { 
                borderColor: '#f44336',
                paddingVertical: 12, // Reduced padding
                borderRadius: 10, // Slightly reduced border radius
              }]}
              onPress={handleReject}
              disabled={isAccepted || isRejected || isLoading}
            >
              <MaterialIcons name="close" size={24} color="#f44336" />
              <Text style={[styles.rejectButtonText, { color: '#f44336' }]}>
                Recusar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton, 
                { 
                  backgroundColor: isAccepted ? '#4CAF50' : colors.tint,
                  opacity: (isAccepted || isRejected || isLoading) ? 0.6 : 1,
                  paddingVertical: 12, // Reduced padding
                  borderRadius: 10, // Slightly reduced border radius
                }
              ]}
              onPress={handleAccept}
              disabled={isAccepted || isRejected || isLoading}
            >
              {isLoading ? (
                <MaterialIcons name="hourglass-empty" size={24} color="#fff" />
              ) : (
                <MaterialIcons name="check" size={24} color="#fff" />
              )}
              <Text style={styles.acceptButtonText}>
                {isLoading ? 'Aceitando...' : 'Aceitar'}
              </Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </Animated.View>


              
      </KeyboardAvoidingView>
      
      {/* Modal de chamada/mensagem */}
      <CallMessageModal
        visible={isCallModalVisible}
        onClose={() => setIsCallModalVisible(false)}
        phoneNumber={rideRequest?.passenger.phone || ''}
        onCallPress={handleMakeCall}
        onMessagePress={handleSendMessage}
      />
      
      {/* Modal de Oferta */}
      <OfferModal
        visible={showOfferModal}
        shipment={shipmentData}
        onClose={handleCloseOfferModal}
        onOfferSubmitted={handleOfferSubmitted}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 16, // Reduced padding
    paddingBottom: 12, // Reduced padding
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Reduced gap
  },
  collapseButton: {
    width: 32, // Reduced size
    height: 32, // Reduced size
    borderRadius: 16, // Adjusted for new size
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, // Reduced font size
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerRing: {
    width: 40, // Reduced size
    height: 40, // Reduced size
    borderRadius: 20, // Adjusted for new size
    borderWidth: 2, // Reduced border width
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 16, // Reduced font size
    fontWeight: 'bold',
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24, // Reduced padding
    maxHeight: Dimensions.get('window').height * 0.4, // Reduced max height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoScrollView: {
    flex: 1,
  },
  infoScrollContent: {
    paddingBottom: 20,
  },
  collapsedInfo: {
    padding: 6, // Reduced padding
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6, // Reduced border radius
  },
  collapsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2, // Reduced margin
  },
  collapsedLabel: {
    fontSize: 12, // Reduced font size
  },
  collapsedValue: {
    fontSize: 12, // Reduced font size
    fontWeight: '500',
  },
  passengerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passengerAvatar: {
    width: 40, // Reduced size
    height: 40, // Reduced size
    borderRadius: 20, // Adjusted for new size
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10, // Reduced margin
  },
  passengerInitial: {
    fontSize: 16, // Reduced font size
    fontWeight: 'bold',
    color: '#fff',
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16, // Reduced font size
    fontWeight: '600',
    marginBottom: 2, // Reduced margin
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  contactButton: {
    width: 40, // Reduced size
    height: 40, // Reduced size
    borderRadius: 20, // Adjusted for new size
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressesSection: {
    marginBottom: 15, // Reduced margin
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10, // Reduced margin
  },
  addressIcon: {
    width: 28, // Reduced size
    height: 28, // Reduced size
    borderRadius: 14, // Adjusted for new size
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10, // Reduced margin
    marginTop: 2,
  },
  addressText: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 13, // Reduced font size
    fontWeight: '600',
    marginBottom: 1, // Reduced margin
  },
  addressContent: {
    fontSize: 14, // Reduced font size
    lineHeight: 20, // Adjusted line height
  },
  addressNeighborhood: {
    fontSize: 12, // Reduced font size
    marginTop: 1, // Reduced margin
  },
  metricsSection: {
    marginBottom: 20,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Reduced margin
  },
  metricLabel: {
    fontSize: 13, // Reduced font size
    marginLeft: 6, // Reduced margin
    marginRight: 6, // Reduced margin
  },
  metricValue: {
    fontSize: 13, // Reduced font size
    fontWeight: '600',
  },
  paymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 14, // Reduced font size
    marginLeft: 6, // Reduced margin
  },
  categoryBadge: {
    paddingHorizontal: 10, // Reduced padding
    paddingVertical: 4, // Reduced padding
    borderRadius: 10, // Reduced border radius
  },
  categoryText: {
    color: '#fff',
    fontSize: 11, // Reduced font size
    fontWeight: '600',
  },
  pricingSection: {
    marginBottom: 12, // Reduced margin
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Reduced margin
  },
  pricingTitle: {
    fontSize: 15, // Reduced font size
    fontWeight: '600',
  },
  surgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 6, // Reduced padding
    paddingVertical: 3, // Reduced padding
    borderRadius: 6, // Reduced border radius
  },
  surgeText: {
    color: '#fff',
    fontSize: 11, // Reduced font size
    fontWeight: '600',
    marginLeft: 3, // Reduced margin
  },
  pricingBreakdown: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 8, // Reduced padding
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2, // Reduced margin
  },
  pricingLabel: {
    fontSize: 14,
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  pricingDivider: {
    height: 1,
    marginVertical: 4, // Reduced margin
  },
  pricingTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pricingTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  safetyAlerts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8, // Reduced margin
    gap: 6, // Reduced gap
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6, // Reduced padding
    paddingVertical: 3, // Reduced padding
    borderRadius: 10, // Reduced border radius
  },
  safetyText: {
    color: '#fff',
    fontSize: 11, // Reduced font size
    fontWeight: '600',
    marginLeft: 3, // Reduced margin
  },
  longPickupWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 8, // Reduced padding
    borderRadius: 6, // Reduced border radius
    marginBottom: 8,
  },
  longPickupText: {
    fontSize: 12, // Reduced font size
    fontWeight: '500',
    marginLeft: 6, // Reduced margin
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8, // Reduced gap
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Reduced padding
    borderRadius: 10, // Slightly reduced border radius
    borderWidth: 2,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Reduced padding
    borderRadius: 10, // Slightly reduced border radius
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactOptions: {
    gap: 12,
    marginBottom: 24,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  modalButton: {
    marginBottom: 0,
  },
  pickupMarker: {
    width: 36, // Reduced size
    height: 36, // Reduced size
    borderRadius: 18, // Adjusted for new size
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, // Reduced border width
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.2, // Reduced shadow
    shadowRadius: 2, // Reduced shadow
    elevation: 3,
  },
  destinationMarker: {
    width: 36, // Reduced size
    height: 36, // Reduced size
    borderRadius: 18, // Adjusted for new size
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, // Reduced border width
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.2, // Reduced shadow
    shadowRadius: 2, // Reduced shadow
    elevation: 3,
  },
  currentLocationMarker: {
    width: 18, // Reduced size
    height: 18, // Reduced size
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationDot: {
    width: 10, // Reduced size
    height: 10, // Reduced size
    borderRadius: 5, // Adjusted for new size
    backgroundColor: '#2196F3',
    borderWidth: 1, // Reduced border width
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.2, // Reduced shadow
    shadowRadius: 1, // Reduced shadow
    elevation: 2,
  },
  locationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6, // Reduced margin
    paddingHorizontal: 10, // Reduced padding
    paddingVertical: 4, // Reduced padding
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 6, // Reduced border radius
  },
  locationErrorText: {
    fontSize: 11, // Reduced font size
    marginLeft: 3, // Reduced margin
    fontWeight: '500',
  },
});
