import { Button } from '@/components/ui/button';
import { AbandonRideModal, CallMessageModal } from '@/components/ui/modal';
import { Colors } from '@/constants/theme';
import { Translations } from '@/constants/translations';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { getDrivingRoute, LatLng } from '@/services/directions.service';
import { locationService } from '@/services/location.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { deleteField } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface RideNavigation {
  id: string;
  passenger: {
    name: string;
    phone?: string;
  };
  pickup: {
    address: string;
    coordinates: LatLng;
  };
  destination: {
    address: string;
    coordinates: LatLng;
  };
  status: 'navigating_to_pickup' | 'arrived_at_pickup' | 'navigating_to_destination' | 'completed';
  eta: {
    toPickup: number; // minutos
    toDestination: number; // minutos
  };
}

export default function RideNavigationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<{
    rideId?: string;
    shipmentId?: string;
    passengerName?: string;
    passengerPhone?: string;
    pickupAddress?: string;
    pickupLat?: string;
    pickupLng?: string;
    destinationAddress?: string;
    destinationLat?: string;
    destinationLng?: string;
    etaToPickup?: string;
    etaToDestination?: string;
  }>();

  const mapRef = useRef<MapView | null>(null);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [ride, setRide] = useState<RideNavigation | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [isNearPickup, setIsNearPickup] = useState(false);
  const [isNearDestination, setIsNearDestination] = useState(false);
  const [courierUid, setCourierUid] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedInitialState, setHasSavedInitialState] = useState(false);
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isAbandonModalVisible, setIsAbandonModalVisible] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
  const collapseAnim = useRef(new Animated.Value(0)).current;
  // Flag de desenvolvimento: quando true, ignora proximidade para coletar/entregar
  const DEV = false;

  const toggleInfoPanel = () => {
    const toValue = isInfoCollapsed ? 0 : 1;
    setIsInfoCollapsed(!isInfoCollapsed);
    Animated.timing(collapseAnim, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // Função para calcular distância entre duas coordenadas (Haversine)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distância em km
  };

  // Função para verificar proximidade (raio de 100 metros)
  const checkProximity = (distance: number): boolean => {
    return distance <= 0.1; // 100 metros = 0.1 km
  };

  // Função para mapear status da corrida para português
  const getRideStatusInPortuguese = (status: RideNavigation['status']): string => {
    switch (status) {
      case 'navigating_to_pickup':
        return Translations.ride_status_navigating_to_pickup;
      case 'arrived_at_pickup':
        return Translations.ride_status_arrived_at_pickup;
      case 'navigating_to_destination':
        return Translations.ride_status_navigating_to_destination;
      case 'completed':
        return Translations.ride_status_completed;
      default:
        return status;
    }
  };

  // Função para salvar estado da corrida no shipment
  const saveRideState = async (status: RideNavigation['status']) => {
    if (!ride || !courierUid) return;
    
    try {
      // Mapeia status da corrida para status do shipment
      let shipmentStatus: string;
      switch (status) {
        case 'navigating_to_pickup':
          shipmentStatus = 'EN_ROUTE';
          break;
        case 'arrived_at_pickup':
          shipmentStatus = 'ARRIVED_PICKUP';
          break;
        case 'navigating_to_destination':
          shipmentStatus = 'PICKED_UP';
          break;
        case 'completed':
          shipmentStatus = 'DELIVERED';
          break;
        default:
          shipmentStatus = 'EN_ROUTE';
      }

      console.log(`🔄 Salvando estado da corrida: ${status} → ${shipmentStatus}`);

      // Atualiza o shipment com o novo status
      await shipmentFirestoreService.updateShipmentState(ride.id, shipmentStatus as any);
      
      // Adiciona evento à timeline com descrição em português
      await shipmentFirestoreService.addTimelineEvent(ride.id, {
        tipo: 'RIDE_STATUS_UPDATE',
        descricao: `Status da corrida atualizado para: ${getRideStatusInPortuguese(status)}`,
        payload: {
          rideStatus: status,
          shipmentStatus: shipmentStatus,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`✅ Estado salvo com sucesso: ${shipmentStatus}`);
    } catch (error) {
      console.error('Error saving ride state:', error);
    }
  };

  // Função para carregar dados completos do shipment
  const loadShipmentData = async () => {
    if (!ride) return;
    
    try {
      console.log('🔄 Carregando dados completos do shipment:', ride.id);
      const shipment = await shipmentFirestoreService.getShipmentById(ride.id);
      
      if (shipment) {
        setShipmentData(shipment);
        console.log('✅ Dados do shipment carregados:', {
          pickupContact: shipment.pickup?.contato,
          dropoffContact: shipment.dropoff?.contato,
          clienteName: shipment.clienteName
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do shipment:', error);
    }
  };

  // Função para carregar estado da corrida do shipment
  const loadRideState = async () => {
    if (!ride || !courierUid || hasLoadedState) return;
    
    try {
      console.log('🔄 Carregando estado da corrida:', ride.id);
      const shipment = await shipmentFirestoreService.getShipmentById(ride.id);
      
      if (shipment && shipment.courierUid === courierUid) {
        // Mapeia status do shipment para status da corrida
        let rideStatus: RideNavigation['status'];
        switch (shipment.state) {
          case 'EN_ROUTE':
            rideStatus = 'navigating_to_pickup';
            break;
          case 'ARRIVED_PICKUP':
            rideStatus = 'arrived_at_pickup';
            break;
          case 'PICKED_UP':
            rideStatus = 'navigating_to_destination';
            break;
          case 'DELIVERED':
            rideStatus = 'completed';
            break;
          default:
            rideStatus = 'navigating_to_pickup';
        }
        
        // Restaura o estado salvo
        setRide(prev => prev ? { ...prev, status: rideStatus } : null);
        setHasLoadedState(true);
        console.log('✅ Estado da corrida restaurado:', rideStatus, 'de', shipment.state);
        
        // Se encontrou um estado salvo, não precisa salvar o estado inicial
        setHasSavedInitialState(true);
        
        // Se o estado restaurado for 'navigating_to_destination', precisa calcular rota para o destino
        if (rideStatus === 'navigating_to_destination' && ride) {
          console.log('🔄 Calculando rota para destino após restauração');
          const calculateRouteToDestination = async () => {
            try {
              const route = await getDrivingRoute(ride.pickup.coordinates, ride.destination.coordinates);
              if (route) {
                setRouteCoords(route.coordinates);
                setRouteDistance(route.distanceKm);
                setRouteDuration(route.durationMin);
                fitToMarkers([ride.pickup.coordinates, ride.destination.coordinates]);
              }
            } catch (error) {
              console.error('Error calculating route to destination after restore:', error);
            }
          };
          
          calculateRouteToDestination();
        }
      } else {
        console.log('⚠️ Nenhum shipment encontrado ou courierUid não confere');
        // Se não encontrou shipment, marca como carregado para permitir salvamento inicial
        setHasLoadedState(true);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estado da corrida:', error);
      // Em caso de erro, marca como carregado para permitir salvamento inicial
      setHasLoadedState(true);
    }
  };

  // Obtém courierUid e inicializa a corrida
  useEffect(() => {
    const initializeRide = async () => {
      try {
        const session = await authService.getSession();
        if (session && session.role === 'courier') {
          setCourierUid(session.userId);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      }
    };

    initializeRide();
  }, []);

  // Obtém localização real do usuário
  useEffect(() => {
    const getRealLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        const realLocation: LatLng = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        setCurrentLocation(realLocation);
        setLocationError(null);
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        setLocationError('Não foi possível obter sua localização');
        // Fallback para localização mockada
        setCurrentLocation({
          latitude: -23.5515,
          longitude: -46.6343
        });
      }
    };

    getRealLocation();
  }, []);

  // Monitora localização e calcula distâncias em tempo real
  useEffect(() => {
    if (!currentLocation || !ride) return;

    const updateDistances = () => {
      // Calcula distância até o pickup
      const distToPickup = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        ride.pickup.coordinates.latitude,
        ride.pickup.coordinates.longitude
      );
      setDistanceToPickup(distToPickup);
      setIsNearPickup(checkProximity(distToPickup));

      // Calcula distância até o destino
      const distToDestination = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        ride.destination.coordinates.latitude,
        ride.destination.coordinates.longitude
      );
      setDistanceToDestination(distToDestination);
      setIsNearDestination(checkProximity(distToDestination));
    };

    updateDistances();

    // Atualiza a cada 5 segundos
    const interval = setInterval(updateDistances, 5000);

    return () => clearInterval(interval);
  }, [currentLocation, ride]);

  // Processa dados da corrida aceita
  useEffect(() => {
    console.log('🔍 Parâmetros recebidos no navegacao-corrida:', params);
    const rideData: RideNavigation = {
      id: params.shipmentId || params.rideId || 'ride_123',
      passenger: {
        name: params.passengerName || 'Maria Silva',
        phone: params.passengerPhone || '+5511999999999'
      },
      pickup: {
        address: params.pickupAddress || 'Rua das Flores, 123 - Centro',
        coordinates: { 
          latitude: parseFloat(params.pickupLat || '-23.5505'), 
          longitude: parseFloat(params.pickupLng || '-46.6333') 
        }
      },
      destination: {
        address: params.destinationAddress || 'Shopping Iguatemi - Vila Olímpia',
        coordinates: { 
          latitude: parseFloat(params.destinationLat || '-23.5925'), 
          longitude: parseFloat(params.destinationLng || '-46.6875') 
        }
      },
      status: 'navigating_to_pickup', // Estado padrão, será sobrescrito se houver estado salvo
      eta: {
        toPickup: parseInt(params.etaToPickup || '2'),
        toDestination: parseInt(params.etaToDestination || '12')
      }
    };

    setRide(rideData);
  }, [params.rideId, params.passengerName, params.passengerPhone, params.pickupAddress, params.pickupLat, params.pickupLng, params.destinationAddress, params.destinationLat, params.destinationLng, params.etaToPickup, params.etaToDestination]);

  // Desativa tracking visual dos markers após primeira renderização
  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Carrega dados completos do shipment quando a corrida estiver pronta
  useEffect(() => {
    if (ride) {
      loadShipmentData();
    }
  }, [ride]);

  // Carrega estado salvo quando a corrida e courierUid estiverem prontos (apenas uma vez)
  useEffect(() => {
    if (ride && courierUid && isInitialized && !hasLoadedState) {
      loadRideState();
    }
  }, [ride, courierUid, isInitialized, hasLoadedState]);

  // Salva estado inicial APENAS se não há estado salvo (primeira vez)
  useEffect(() => {
    if (ride && courierUid && isInitialized && !hasSavedInitialState && hasLoadedState) {
      console.log('💾 Salvando estado inicial da corrida');
      saveRideState('navigating_to_pickup');
      setHasSavedInitialState(true);
    }
  }, [ride, courierUid, isInitialized, hasSavedInitialState, hasLoadedState]);


  const fitToMarkers = React.useCallback((points: LatLng[]) => {
    if (!mapRef.current || points.length === 0) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
      animated: true,
    });
  }, []);

  // Calcula rota para o pickup
  useEffect(() => {
    if (!ride || !currentLocation) return;

    const calculateRoute = async () => {
      try {
        const route = await getDrivingRoute(currentLocation, ride.pickup.coordinates);
        if (route) {
          setRouteCoords(route.coordinates);
          setRouteDistance(route.distanceKm);
          setRouteDuration(route.durationMin);
          fitToMarkers([currentLocation, ride.pickup.coordinates]);
        }
      } catch (error) {
        console.error('Error calculating route:', error);
      }
    };

    calculateRoute();
  }, [ride?.id, currentLocation?.latitude, currentLocation?.longitude, fitToMarkers]);

  const handleArrivedAtPickup = async () => {
    if (!ride) return;
    
    // Verifica se está próximo o suficiente do pickup
    if (!isNearPickup && !DEV) {
      Alert.alert(
        Translations.too_far_pickup,
        `Você está a ${distanceToPickup ? (distanceToPickup * 1000).toFixed(0) : 'N/A'} metros da coleta. Aproxime-se mais para confirmar a chegada.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    const newStatus = 'arrived_at_pickup';
    setRide(prev => prev ? { ...prev, status: newStatus } : null);
    
    // Salva no banco de dados
    await saveRideState(newStatus);
    
    Alert.alert(
      Translations.arrived_pickup_title,
      Translations.arrived_pickup_message,
      [{ text: 'OK' }]
    );
  };

  const handleStartTrip = async () => {
    if (!ride) return;
    
    const newStatus = 'navigating_to_destination';
    setRide(prev => prev ? { ...prev, status: newStatus } : null);
    
    // Salva no banco de dados
    await saveRideState(newStatus);
    
    // Calcula nova rota para o destino
    if (ride.destination.coordinates) {
      const calculateRouteToDestination = async () => {
        try {
          const route = await getDrivingRoute(ride.pickup.coordinates, ride.destination.coordinates);
          if (route) {
            setRouteCoords(route.coordinates);
            setRouteDistance(route.distanceKm);
            setRouteDuration(route.durationMin);
            fitToMarkers([ride.pickup.coordinates, ride.destination.coordinates]);
          }
        } catch (error) {
          console.error('Error calculating route to destination:', error);
        }
      };
      
      calculateRouteToDestination();
    }
  };

  const handleCompleteTrip = async () => {
    if (!ride) return;
    
    // Verifica se está próximo o suficiente do destino
    /*
    if (!isNearDestination && !DEV) {
      Alert.alert(
        Translations.too_far_destination,
        `Você está a ${distanceToDestination ? (distanceToDestination * 1000).toFixed(0) : 'N/A'} metros da entrega. Aproxime-se mais para finalizar a entrega.`,
        [{ text: 'OK' }]
      );
      return;
    }*/
    
    // Força fluxo de confirmação via QR antes de finalizar
    router.push({
      pathname: '/confirmacao/qr-scanner',
      params: {
        shipmentId: ride.id,
      }
    });
  };

  const handleCallPassenger = () => {
    if (!ride?.passenger.phone) return;
    setIsCallModalVisible(true);
  };

  const handleMakeCall = () => {
    if (!ride?.passenger.phone) return;
    
    const phoneNumber = ride.passenger.phone.replace(/\D/g, '');
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível realizar a chamada telefônica');
    });
    setIsCallModalVisible(false);
  };

  const handleSendMessage = () => {
    if (!ride?.passenger.phone) return;
    
    const phoneNumber = ride.passenger.phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=+55${phoneNumber}`).catch(() => {
      // Fallback to web version if app is not installed
      Linking.openURL(`https://wa.me/+55${phoneNumber}`).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
      });
    });
    setIsCallModalVisible(false);
  };

  const handleAbandonRide = () => {
    setIsAbandonModalVisible(true);
  };

  const handleUpdateLocation = async () => {
    setIsUpdatingLocation(true);
    setLocationError(null);
    
    try {
      const location = await locationService.getCurrentLocation();
      const newLocation: LatLng = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setCurrentLocation(newLocation);
      setLocationError(null);
      
      // Recalcula a rota com a nova localização
      if (ride) {
        const calculateRoute = async () => {
          try {
            let route;
            if (ride.status === 'navigating_to_pickup') {
              route = await getDrivingRoute(newLocation, ride.pickup.coordinates);
            } else if (ride.status === 'navigating_to_destination') {
              route = await getDrivingRoute(newLocation, ride.destination.coordinates);
            }
            
            if (route) {
              setRouteCoords(route.coordinates);
              setRouteDistance(route.distanceKm);
              setRouteDuration(route.durationMin);
              fitToMarkers([newLocation, ride.pickup.coordinates, ride.destination.coordinates]);
            }
          } catch (error) {
            console.error('Error recalculating route:', error);
          }
        };
        
        calculateRoute();
      }
      
      Alert.alert('Sucesso', 'Localização atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      setLocationError('Não foi possível atualizar sua localização');
      Alert.alert('Erro', 'Não foi possível atualizar sua localização. Verifique se as permissões estão ativadas.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleConfirmAbandonRide = async (reason: string) => {
    if (!ride || !courierUid) return;
    
    try {
      // Salva o motivo do abandono no Firestore e remove o courierUid
      await shipmentFirestoreService.updateShipmentState(ride.id, 'COURIER_ABANDONED' as any, {
        courierUid: deleteField() as any
      });
      
      // Adiciona evento à timeline
      await shipmentFirestoreService.addTimelineEvent(ride.id, {
        tipo: 'COURIER_ABANDONED',
        descricao: `Entregador abandonou a corrida. Motivo: ${reason}`,
        payload: {
          reason: reason,
          courierUid: courierUid,
          timestamp: new Date().toISOString()
        }
      });

      // Fecha o modal
      setIsAbandonModalVisible(false);
      
      // Volta para a tela anterior
      router.replace('/(tabs)/courier/courier-home');
      
      Alert.alert('Sucesso', 'Corrida abandonada com sucesso.');
    } catch (error) {
      console.error('Error abandoning ride:', error);
      Alert.alert('Erro', 'Não foi possível abandonar a corrida. Tente novamente.');
    }
  };

  const getStatusText = () => {
    if (!ride) return '';
    
    switch (ride.status) {
      case 'navigating_to_pickup':
        return Translations.navigating_to_pickup;
      case 'arrived_at_pickup':
        return Translations.arrived_at_pickup;
      case 'navigating_to_destination':
        return Translations.navigating_to_destination;
      case 'completed':
        return Translations.completed;
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    if (!ride) return colors.tint;
    
    switch (ride.status) {
      case 'navigating_to_pickup':
        return '#2196F3';
      case 'arrived_at_pickup':
        return '#FF9800';
      case 'navigating_to_destination':
        return '#4CAF50';
      case 'completed':
        return '#9C27B0';
      default:
        return colors.tint;
    }
  };

  const formatRouteDistance = (km: number) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  const getActionButton = () => {
    if (!ride) return null;

    switch (ride.status) {
      case 'navigating_to_pickup':
        const pickupButtonTitle = isNearPickup 
          ? Translations.arrived_at_pickup_button 
          : `${Translations.arrived_at_pickup_button} (${distanceToPickup ? (distanceToPickup * 1000).toFixed(0) : 'N/A'}m)`;
        return (
          <Button
            title={pickupButtonTitle}
            onPress={handleArrivedAtPickup}
            icon={<MaterialIcons name="my-location" size={16} color="#fff" />}
            style={[
              styles.actionButton,
              isNearPickup ? {} : { opacity: 0.6 }
            ] as any}
            disabled={!isNearPickup && !DEV}
          />
        );
      case 'arrived_at_pickup':
        return (
          <Button
            title={Translations.start_trip_button}
            onPress={handleStartTrip}
            icon={<MaterialIcons name="play-arrow" size={16} color="#fff" />}
            style={styles.actionButton}
          />
        );
      case 'navigating_to_destination':
        const destinationButtonTitle = isNearDestination 
          ? Translations.complete_trip_button 
          : `${Translations.complete_trip_button} (${distanceToDestination ? (distanceToDestination * 1000).toFixed(0) : 'N/A'}m)`;
        return (
          <Button
            title={destinationButtonTitle}
            onPress={handleCompleteTrip}
            icon={<MaterialIcons name="check" size={16} color="#fff" />}
            style={[
              styles.actionButton,
              isNearDestination && !DEV ? {} : { opacity: 0.6 }
            ] as any}
            //disabled={!isNearDestination && !DEV}
          />
        );
      default:
        return null;
    }
  };

  if (!ride) {
    return null;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: currentLocation?.latitude || ride.pickup.coordinates.latitude,
            longitude: currentLocation?.longitude || ride.pickup.coordinates.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* Localização atual */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Sua localização"
              tracksViewChanges={tracksViewChanges}
            >
              <View style={styles.currentLocationMarker}>
                <View style={styles.currentLocationDot} />
              </View>
            </Marker>
          )}

          {/* Pickup */}
          <Marker
            coordinate={ride.pickup.coordinates}
            title="Ponto de Retirada"
            tracksViewChanges={tracksViewChanges}
          >
            <View style={styles.pickupMarker}>
              <MaterialIcons name="my-location" size={24} color="#fff" />
            </View>
          </Marker>

          {/* Destino */}
          <Marker
            coordinate={ride.destination.coordinates}
            title="Destino"
            tracksViewChanges={tracksViewChanges}
          >
            <View style={styles.destinationMarker}>
              <MaterialIcons name="place" size={24} color="#fff" />
            </View>
          </Marker>

          {/* Rota */}
          {routeCoords.length > 0 && (
            <Polyline 
              coordinates={routeCoords} 
              strokeColor={getStatusColor()} 
              strokeWidth={4} 
            />
          )}
        </MapView>
      </View>

      {/* Cabeçalho */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>        
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {getStatusText()}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
            {ride.passenger.name}
          </Text>
          
          {/* Indicador de erro de localização */}
          {locationError && (
            <View style={styles.locationErrorContainer}>
              <MaterialIcons name="location-off" size={14} color="#f44336" />
              <Text style={[styles.locationErrorText, { color: '#f44336' }]}>
                {locationError}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {ride.passenger.phone && (
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleCallPassenger}
            >
              <MaterialIcons name="phone" size={24} color={colors.tint} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.abandonButton}
            onPress={handleAbandonRide}
          >
            <MaterialIcons name="close" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Card de informações (minimizável) */}
      <Animated.View
        style={[
          styles.infoCard,
          { 
            backgroundColor: colors.background,
            transform: [{
              translateY: collapseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 220] as unknown as string[], // desliza para baixo quando colapsado
              })
            }]
          }
        ]}
      >
        {/* Handle de colapso/expansão */}
        <View style={styles.infoCardHandleRow}>
          <TouchableOpacity style={styles.handlePill} activeOpacity={0.7} onPress={toggleInfoPanel}>
            <MaterialIcons name={isInfoCollapsed ? 'expand-less' : 'expand-more'} size={20} color={colors.text} />
            <Text style={[styles.handleText, { color: colors.text }]}>
              {isInfoCollapsed ? 'Mostrar detalhes' : 'Ocultar detalhes'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Status e ETA */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>
              {ride.status === 'navigating_to_pickup' ? Translations.pickup_badge :
               ride.status === 'arrived_at_pickup' ? Translations.waiting_badge :
               ride.status === 'navigating_to_destination' ? Translations.delivery_badge : Translations.completed_badge}
            </Text>
          </View>
          
          <View style={styles.etaContainer}>
            <Text style={[styles.etaLabel, { color: colors.tabIconDefault }]}>
              {ride.status === 'navigating_to_pickup' ? Translations.going_to_pickup :
               ride.status === 'arrived_at_pickup' ? Translations.waiting_for_pickup :
               ride.status === 'navigating_to_destination' ? Translations.going_to_destination : Translations.trip_completed}
            </Text>
            <Text style={[styles.etaValue, { color: colors.text }]}>
              {ride.status === 'navigating_to_pickup' ? `${ride.eta.toPickup} min` :
               ride.status === 'navigating_to_destination' ? `${ride.eta.toDestination} min` : ''}
            </Text>
            {routeDistance && (
              <Text style={[styles.etaLabel, { color: colors.tabIconDefault, marginTop: 4 }]}>
                Distância: {formatRouteDistance(routeDistance)}
                {routeDuration && ` • ${Math.round(routeDuration)} min`}
              </Text>
            )}
            
            {/* Informações de proximidade */}
            {ride.status === 'navigating_to_pickup' && distanceToPickup !== null && (
              <Text style={[styles.etaLabel, { 
                color: isNearPickup ? '#10b981' : '#ef4444', 
                marginTop: 4,
                fontWeight: '600'
              }]}>
                {isNearPickup ? Translations.near_pickup : `📍 ${(distanceToPickup * 1000).toFixed(0)}${Translations.distance_to_pickup}`}
              </Text>
            )}
            
            {ride.status === 'navigating_to_destination' && distanceToDestination !== null && (
              <Text style={[styles.etaLabel, { 
                color: isNearDestination ? '#10b981' : '#ef4444', 
                marginTop: 4,
                fontWeight: '600'
              }]}>
                {isNearDestination ? Translations.near_destination : `📍 ${(distanceToDestination * 1000).toFixed(0)}${Translations.distance_to_destination}`}
              </Text>
            )}
          </View>
        </View>

        {/* Endereços */}
        <View style={styles.addressesSection}>
          <View style={styles.addressItem}>
            <View style={[styles.addressIcon, { backgroundColor: '#4CAF50' }]}>
              <MaterialIcons name="my-location" size={16} color="#fff" />
            </View>
            <View style={styles.addressText}>
              <Text style={[styles.addressTitle, { color: colors.text }]}>
                {Translations.pickup_label}
              </Text>
              {shipmentData?.pickup?.contato && (
                <Text style={[styles.contactName, { color: colors.tint }]}>
                  👤 {shipmentData.pickup.contato}
                </Text>
              )}
              <Text style={[styles.addressContent, { color: colors.tabIconDefault }]}>
                {ride.pickup.address}
              </Text>
              {shipmentData?.pickup?.instrucoes && (
                <Text style={[styles.instructions, { color: colors.tabIconDefault }]}>
                  📝 {shipmentData.pickup.instrucoes}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.addressItem}>
            <View style={[styles.addressIcon, { backgroundColor: '#2196F3' }]}>
              <MaterialIcons name="place" size={16} color="#fff" />
            </View>
            <View style={styles.addressText}>
              <Text style={[styles.addressTitle, { color: colors.text }]}>
                {Translations.destination_label}
              </Text>
              {shipmentData?.dropoff?.contato && (
                <Text style={[styles.contactName, { color: colors.tint }]}>
                  👤 {shipmentData.dropoff.contato}
                </Text>
              )}
              <Text style={[styles.addressContent, { color: colors.tabIconDefault }]}>
                {ride.destination.address}
              </Text>
              {shipmentData?.dropoff?.instrucoes && (
                <Text style={[styles.instructions, { color: colors.tabIconDefault }]}>
                  📝 {shipmentData.dropoff.instrucoes}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Botão de ação */}
        {getActionButton()}
      </Animated.View>

      {/* Botão flutuante para atualizar localização */}
      <TouchableOpacity 
        style={[
          styles.floatingLocationButton, 
          { backgroundColor: colors.tint },
          isUpdatingLocation && styles.floatingLocationButtonDisabled
        ]}
        onPress={handleUpdateLocation}
        disabled={isUpdatingLocation}
      >
        <MaterialIcons 
          name={isUpdatingLocation ? "refresh" : "my-location"} 
          size={28} 
          color="#fff" 
        />
      </TouchableOpacity>
      
      {/* Modal de chamada/mensagem */}
      <CallMessageModal
        visible={isCallModalVisible}
        onClose={() => setIsCallModalVisible(false)}
        phoneNumber={ride.passenger.phone || ''}
        onCallPress={handleMakeCall}
        onMessagePress={handleSendMessage}
      />
      
      {/* Modal de abandono de corrida */}
      <AbandonRideModal
        visible={isAbandonModalVisible}
        onClose={() => setIsAbandonModalVisible(false)}
        onSubmit={handleConfirmAbandonRide}
      />
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingLocationButton: {
    position: 'absolute',
    top: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingLocationButtonDisabled: {
    opacity: 0.6,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  abandonButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34, // Safe area bottom
  },
  infoCardHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  handlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)'
  },
  handleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  collapsedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsedEta: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  etaContainer: {
    alignItems: 'flex-end',
  },
  etaLabel: {
    fontSize: 12,
  },
  etaValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addressesSection: {
    marginBottom: 20,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  addressContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  actionButton: {
    marginTop: 0,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationErrorText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
});
