import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocodeAddress, getDrivingRoute, LatLng, reverseGeocode, suggestAddresses, SuggestionItem } from '@/services/directions.service';
import { locationService } from '@/services/location.service';
import { estimatePrice } from '@/services/pricing.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function MapRouteScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<{ 
    mode?: string; 
    type?: 'pickup' | 'dropoff';
    weightKg?: string;
    dimC?: string; dimL?: string; dimA?: string;
    fragil?: string;
  }>();

  const mapRef = useRef<MapView | null>(null);
  const [loading, setLoading] = useState(true);
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<SuggestionItem[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<SuggestionItem[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [city, setCity] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [showTips, setShowTips] = useState(() => (params.mode === 'select'));
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState('');
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [searchTimeoutOrigin, setSearchTimeoutOrigin] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searchTimeoutDest, setSearchTimeoutDest] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [abortControllerOrigin, setAbortControllerOrigin] = useState<AbortController | null>(null);
  const [abortControllerDest, setAbortControllerDest] = useState<AbortController | null>(null);
  const [showNotFoundOrigin, setShowNotFoundOrigin] = useState(false);
  const [showNotFoundDest, setShowNotFoundDest] = useState(false);
  const [isDraggingOrigin, setIsDraggingOrigin] = useState(false);
  const [isDraggingDest, setIsDraggingDest] = useState(false);
  const [dragThrottle, setDragThrottle] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [showMapTypeModal, setShowMapTypeModal] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [showLocationFallback, setShowLocationFallback] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [showOriginConfirmation, setShowOriginConfirmation] = useState(false);
  const [tempOrigin, setTempOrigin] = useState<LatLng | null>(null);
  const [tempOriginLabel, setTempOriginLabel] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const loc = await locationService.getCurrentLocation();
        const current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setOrigin(current);
        setCurrentLocation(current); // Sempre mantém a localização atual visível
        // Preenche cidade padrão pela localização atual
        const currentCity = await locationService.getCurrentCity();
        if (currentCity) setCity(currentCity);
        setLocationPermissionDenied(false);
      } catch (e) {
        // Sem permissão: mostra fallback
        setLocationPermissionDenied(true);
        setShowLocationFallback(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cleanup dos timeouts e abort controllers ao desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutOrigin) clearTimeout(searchTimeoutOrigin);
      if (searchTimeoutDest) clearTimeout(searchTimeoutDest);
      if (abortControllerOrigin) abortControllerOrigin.abort();
      if (abortControllerDest) abortControllerDest.abort();
      if (dragThrottle) clearTimeout(dragThrottle);
    };
  }, [searchTimeoutOrigin, searchTimeoutDest, abortControllerOrigin, abortControllerDest, dragThrottle]);

  const initialRegion = useMemo(() => {
    return origin
      ? { latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { latitude: -23.5505, longitude: -46.6333, latitudeDelta: 0.2, longitudeDelta: 0.2 };
  }, [origin]);

  const fitToMarkers = (points: LatLng[]) => {
    if (!mapRef.current || points.length === 0) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 150, right: 60, bottom: 300, left: 60 },
      animated: true,
    });
  };

  const recenterMap = (type: 'user' | 'route') => {
    if (!mapRef.current) return;
    
    if (type === 'user' && origin) {
      mapRef.current.animateToRegion({
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else if (type === 'route' && routeCoords.length > 0) {
      fitToMarkers(routeCoords);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      const current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setOrigin(current);
      setCurrentLocation(current); // Atualiza localização atual
      
      // Atualiza o texto de origem
      const currentCity = await locationService.getCurrentCity();
      if (currentCity) {
        setOriginText(`Minha localização - ${currentCity}`);
      } else {
        setOriginText('Minha localização');
      }
      
      // Foca no usuário
      recenterMap('user');
      setLocationPermissionDenied(false);
      setShowLocationFallback(false);
    } catch (error) {
      setLocationPermissionDenied(true);
      setShowLocationFallback(true);
      Alert.alert(
        'Localização Indisponível', 
        'Não foi possível obter sua localização. Por favor, digite seu endereço manualmente.',
        [{ text: 'OK' }]
      );
    }
  };

  const mapTypeOptions = [
    { key: 'standard', label: 'Padrão', icon: 'map' },
    { key: 'satellite', label: 'Satélite', icon: 'satellite' },
    { key: 'hybrid', label: 'Híbrido', icon: 'layers' },
  ] as const;

  const handleBuildRoute = async () => {
    if (!originText.trim() && !origin) {
      Alert.alert('Origem', 'Informe a origem ou permita a localização atual');
      return;
    }
    if (!destinationText.trim()) {
      Alert.alert('Destino', 'Informe o endereço de destino');
      return;
    }
    setIsFetching(true);
    try {
      const a = origin ?? (await geocodeAddress(originText));
      const b = destination ?? (await geocodeAddress(destinationText));
      if (!a || !b) {
        const which = !a ? 'origem' : 'destino';
        Alert.alert('Endereços', `Não foi possível localizar o ${which}`);
        return;
      }
      setOrigin({ latitude: a.latitude, longitude: a.longitude });
      setDestination({ latitude: b.latitude, longitude: b.longitude });

      const route = await getDrivingRoute(a, b);
      if (!route) {
        Alert.alert('Rota', 'Não foi possível calcular a rota');
        return;
      }
      setRouteCoords(route.coordinates);
      setDistanceKm(route.distanceKm);
      setDurationMin(route.durationMin);
      try {
        const pricing = estimatePrice({ 
          distanceKm: route.distanceKm,
          weightKg: parseFloat(params.weightKg || '0'),
          fragil: params.fragil === 'true'
        });
        setPrice(pricing.total);
      } catch (e) {
        // Não bloquear visualização da rota por falha no preço
        setPrice(null);
      }
      fitToMarkers(route.coordinates);
    } catch (e) {
      Alert.alert('Erro', 'Falha ao calcular rota');
    } finally {
      setIsFetching(false);
    }
  };

  // Calcula rota automaticamente quando ambos pontos estão definidos
  useEffect(() => {
    if (origin && destination) {
      setReadyToConfirm(false);
      // ignora se já está buscando
      if (!isFetching) {
        // fire and forget
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleBuildRoute();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  const handleContinue = () => {
    if (routeCoords.length === 0) return;
    setReadyToConfirm(true);
  };

  const handleConfirm = async () => {
    if (!origin || !destination) return;
    
    setIsFetching(true);
    try {
      let oLabel = originText;
      let dLabel = destinationText;
      
      if (!oLabel) {
        try {
          oLabel = (await reverseGeocode(origin.latitude, origin.longitude)) || '';
        } catch (error) {
          console.error('Error reverse geocoding origin:', error);
          oLabel = 'Origem selecionada';
        }
      }
      
      if (!dLabel) {
        try {
          dLabel = (await reverseGeocode(destination.latitude, destination.longitude)) || '';
        } catch (error) {
          console.error('Error reverse geocoding destination:', error);
          dLabel = 'Destino selecionado';
        }
      }
      
      router.replace({
        pathname: '/pedir/create-shipment',
        params: {
          fromMap: '2',
          oLat: String(origin.latitude),
          oLng: String(origin.longitude),
          oLabel: oLabel || originText || '',
          dLat: String(destination.latitude),
          dLng: String(destination.longitude),
          dLabel: dLabel || destinationText || '',
          distKm: distanceKm != null ? String(distanceKm) : '',
          price: price != null ? String(price) : '',
        },
      });
    } catch (error) {
      console.error('Error confirming selection:', error);
      Alert.alert('Erro', 'Falha ao confirmar seleção. Tente novamente.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSuggest = (text: string, type: 'origin' | 'dest') => {
    // Atualiza o texto imediatamente
    if (type === 'origin') {
      setOriginText(text);
    } else {
      setDestinationText(text);
    }
    
    // Cancela timeout anterior
    if (type === 'origin') {
      if (searchTimeoutOrigin) {
        clearTimeout(searchTimeoutOrigin);
      }
    } else {
      if (searchTimeoutDest) {
        clearTimeout(searchTimeoutDest);
      }
    }
    
    // Cancela requisição anterior
    if (type === 'origin') {
      if (abortControllerOrigin) {
        abortControllerOrigin.abort();
      }
    } else {
      if (abortControllerDest) {
        abortControllerDest.abort();
      }
    }
    
    if (text.length < 3) {
      if (type === 'origin') {
        setOriginSuggestions([]);
        setIsSearchingOrigin(false);
        setShowNotFoundOrigin(false);
      } else {
        setDestSuggestions([]);
        setIsSearchingDest(false);
        setShowNotFoundDest(false);
      }
      return;
    }
    
    // Cria novo AbortController
    const abortController = new AbortController();
    if (type === 'origin') {
      setAbortControllerOrigin(abortController);
    } else {
      setAbortControllerDest(abortController);
    }
    
    // Debounce de 300ms
    const timeout = setTimeout(async () => {
      if (type === 'origin') {
        setIsSearchingOrigin(true);
      } else {
        setIsSearchingDest(true);
      }
      
      try {
    const region = mapRef.current?.getMapBoundaries ? await mapRef.current.getMapBoundaries() : undefined;
    const viewbox = region
      ? { minLon: region.southWest.longitude, minLat: region.southWest.latitude, maxLon: region.northEast.longitude, maxLat: region.northEast.latitude }
      : undefined;
        
        const list = await suggestAddresses(text, { 
          city: city || undefined, 
          countryCodes: 'br', 
          viewbox, 
          bounded: !!city 
        });
        
        // Verifica se a requisição não foi cancelada
        if (!abortController.signal.aborted) {
          if (type === 'origin') {
            if (list.length === 0) {
              setShowNotFoundOrigin(true);
              setOriginSuggestions([]);
            } else {
              setShowNotFoundOrigin(false);
              setOriginSuggestions(list);
            }
            setIsSearchingOrigin(false);
          } else {
            if (list.length === 0) {
              setShowNotFoundDest(true);
              setDestSuggestions([]);
            } else {
              setShowNotFoundDest(false);
              setDestSuggestions(list);
            }
            setIsSearchingDest(false);
          }
        }
      } catch (error) {
        // Ignora erros de cancelamento
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        console.error('Error fetching suggestions:', error);
        if (!abortController.signal.aborted) {
          if (type === 'origin') {
            setShowNotFoundOrigin(true);
            setOriginSuggestions([]);
            setIsSearchingOrigin(false);
          } else {
            setShowNotFoundDest(true);
            setDestSuggestions([]);
            setIsSearchingDest(false);
          }
        }
      }
    }, 300);
    
    if (type === 'origin') {
      setSearchTimeoutOrigin(timeout);
    } else {
      setSearchTimeoutDest(timeout);
    }
  };

  const applySuggestion = (s: SuggestionItem, type: 'origin' | 'dest') => {
    // Cancela timeout e requisição em andamento
    if (type === 'origin') {
      if (searchTimeoutOrigin) {
        clearTimeout(searchTimeoutOrigin);
        setSearchTimeoutOrigin(null);
      }
      if (abortControllerOrigin) {
        abortControllerOrigin.abort();
        setAbortControllerOrigin(null);
      }
      setOriginText(s.label);
      setOrigin({ latitude: s.latitude, longitude: s.longitude });
      setOriginSuggestions([]);
      setIsSearchingOrigin(false);
      setShowNotFoundOrigin(false);
    } else {
      if (searchTimeoutDest) {
        clearTimeout(searchTimeoutDest);
        setSearchTimeoutDest(null);
      }
      if (abortControllerDest) {
        abortControllerDest.abort();
        setAbortControllerDest(null);
      }
      setDestinationText(s.label);
      setDestination({ latitude: s.latitude, longitude: s.longitude });
      setDestSuggestions([]);
      setIsSearchingDest(false);
      setShowNotFoundDest(false);
    }
  };

  const handleLocationChoice = (choice: 'origin' | 'dest') => {
    if (!selectedLocation) return;
    
    if (choice === 'origin') {
      // Para origem, abre confirmação com mira
      setTempOrigin(selectedLocation);
      setTempOriginLabel(selectedLocationLabel);
      setShowOriginConfirmation(true);
    } else {
      setDestination(selectedLocation);
      setDestinationText(selectedLocationLabel);
    }
    
    setShowLocationModal(false);
    setSelectedLocation(null);
    setSelectedLocationLabel('');
  };

  const handleSinglePointSelection = async () => {
    if (!selectedLocation) return;
    
    setIsFetching(true);
    try {
      const type = (params.type as 'pickup' | 'dropoff') || 'pickup';
      router.replace({
        pathname: '/pedir/create-shipment',
        params: {
          fromMap: '1',
          type,
          lat: String(selectedLocation.latitude),
          lng: String(selectedLocation.longitude),
          label: selectedLocationLabel,
        },
      });
    } catch (error) {
      console.error('Error selecting single point:', error);
      Alert.alert('Erro', 'Falha ao selecionar local. Tente novamente.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDragStart = (type: 'origin' | 'dest') => {
    if (type === 'origin') {
      setIsDraggingOrigin(true);
    } else {
      setIsDraggingDest(true);
    }
  };

  const handleDragEnd = (type: 'origin' | 'dest', coordinate: LatLng) => {
    if (type === 'origin') {
      setIsDraggingOrigin(false);
      setOrigin(coordinate);
    } else {
      setIsDraggingDest(false);
      setDestination(coordinate);
    }

    // Throttle reverse geocoding
    if (dragThrottle) {
      clearTimeout(dragThrottle);
    }

    const timeout = setTimeout(async () => {
      try {
        const address = await reverseGeocode(coordinate.latitude, coordinate.longitude);
        if (type === 'origin') {
          setOriginText(address || 'Origem selecionada');
        } else {
          setDestinationText(address || 'Destino selecionado');
        }
      } catch (error) {
        console.error('Error reverse geocoding dragged location:', error);
      }
    }, 500);

    setDragThrottle(timeout);
  };

  const handleOriginConfirmation = async () => {
    if (!tempOrigin) return;
    
    try {
      // Busca o endereço atualizado da posição da mira
      const address = await reverseGeocode(tempOrigin.latitude, tempOrigin.longitude);
      setOrigin(tempOrigin);
      setOriginText(address || tempOriginLabel);
      setShowOriginConfirmation(false);
      setTempOrigin(null);
      setTempOriginLabel('');
    } catch (error) {
      console.error('Error confirming origin:', error);
      setOrigin(tempOrigin);
      setOriginText(tempOriginLabel);
      setShowOriginConfirmation(false);
      setTempOrigin(null);
      setTempOriginLabel('');
    }
  };

  const handleOriginAdjustment = (coordinate: LatLng) => {
    setTempOrigin(coordinate);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.mapContainer}>
        <MapView
          ref={(r) => {
            mapRef.current = r;
          }}
          style={StyleSheet.absoluteFill}
          mapType={mapType}
          onLongPress={async (e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            const location = { latitude, longitude };
            setSelectedLocation(location);
            
            try {
              // Busca o nome do local
              const name = await reverseGeocode(latitude, longitude);
              setSelectedLocationLabel(name || 'Local selecionado');
            } catch (error) {
              console.error('Error reverse geocoding:', error);
              setSelectedLocationLabel('Local selecionado');
            }
            
            // Abre modal para escolher se é origem ou destino
            setShowLocationModal(true);
          }}
          initialRegion={initialRegion as any}
        >
          {/* Marcador da localização atual - sempre visível */}
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
          
          {/* Marcador temporário da origem durante confirmação */}
          {showOriginConfirmation && tempOrigin && (
            <Marker 
              coordinate={tempOrigin} 
              title="Ajuste a posição da origem"
              draggable
              onDragEnd={(e) => handleOriginAdjustment(e.nativeEvent.coordinate)}
            >
              <View style={styles.originConfirmationMarker}>
                <View style={styles.crosshair}>
                  <View style={styles.crosshairHorizontal} />
                  <View style={styles.crosshairVertical} />
                </View>
              </View>
            </Marker>
          )}
          
          {origin && !showOriginConfirmation && (
            <Marker 
              coordinate={origin} 
              title="Origem" 
              pinColor="#4CAF50"
              draggable
              onDragStart={() => handleDragStart('origin')}
              onDragEnd={(e) => handleDragEnd('origin', e.nativeEvent.coordinate)}
            >
              <View style={[styles.originMarker, isDraggingOrigin && styles.draggingMarker]}>
                <MaterialIcons name="my-location" size={24} color="#fff" />
              </View>
            </Marker>
          )}
          {destination && (
            <Marker 
              coordinate={destination} 
              title="Destino"
              pinColor="#FF5722"
              draggable
              onDragStart={() => handleDragStart('dest')}
              onDragEnd={(e) => handleDragEnd('dest', e.nativeEvent.coordinate)}
            >
              <View style={[styles.destinationMarker, isDraggingDest && styles.draggingMarker]}>
                <MaterialIcons name="place" size={24} color="#fff" />
              </View>
            </Marker>
          )}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={5} />
          )}
        </MapView>
        {/* Informações do pacote - discreto */}
        <View style={styles.packageInfoOverlay}>
          <View style={[styles.packageInfoCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }]}>
            <View style={styles.packageInfoRow}>
              <MaterialIcons name="inventory" size={16} color={colorScheme === 'dark' ? '#fff' : '#000'} />
              <Text style={[styles.packageInfoText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                {params.weightKg ? `${params.weightKg}kg` : 'N/A'} • 
                {params.dimC && params.dimL && params.dimA 
                  ? `${params.dimC}×${params.dimL}×${params.dimA}cm`
                  : 'N/A'
                }
                {params.fragil === 'true' && ' • Frágil'}
              </Text>
            </View>
            {distanceKm != null && (
              <View style={styles.packageInfoRow}>
                <MaterialIcons name="straighten" size={16} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                <Text style={[styles.packageInfoText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                  {distanceKm.toFixed(2)} km
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Botões de controle do mapa */}
        <View style={styles.mapControlButtons}>
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: colors.background }]}
            onPress={getCurrentLocation}
          >
            <MaterialIcons name="my-location" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: colors.background }]}
            onPress={() => recenterMap('route')}
            disabled={routeCoords.length === 0}
          >
            <MaterialIcons name="route" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: colors.background }]}
            onPress={() => setShowMapTypeModal(true)}
          >
            <MaterialIcons name="layers" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Confirmação de origem com mira */}
        {showOriginConfirmation && (
          <View style={styles.originConfirmationOverlay}>
            <Card style={StyleSheet.flatten([styles.originConfirmationCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <View style={styles.originConfirmationHeader}>
                <MaterialIcons name="my-location" size={24} color={colors.tint} />
                <Text style={[styles.originConfirmationTitle, { color: colors.text }]}>Confirmar Origem</Text>
              </View>
              <Text style={[styles.originConfirmationText, { color: colors.tabIconDefault }]}>
                Ajuste a mira para posicionar exatamente onde o pacote será coletado. Arraste o marcador se necessário.
              </Text>
              <Text style={[styles.originConfirmationAddress, { color: colors.text }]}>
                {tempOriginLabel}
              </Text>
              <View style={styles.originConfirmationButtons}>
                <Button
                  title="Confirmar Posição"
                  onPress={handleOriginConfirmation}
                  icon={<MaterialIcons name="check" size={16} color="#fff" />}
                  style={styles.originConfirmButton}
                />
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={() => {
                    setShowOriginConfirmation(false);
                    setTempOrigin(null);
                    setTempOriginLabel('');
                  }}
                  style={styles.originCancelButton}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Aviso de fallback de localização */}
        {showLocationFallback && (
          <View style={styles.fallbackOverlay}>
            <Card style={StyleSheet.flatten([styles.fallbackCard, { backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }])}>
              <View style={styles.fallbackHeader}>
                <MaterialIcons name="location-off" size={24} color="#856404" />
                <Text style={[styles.fallbackTitle, { color: '#856404' }]}>Localização Indisponível</Text>
              </View>
              <Text style={[styles.fallbackText, { color: '#856404' }]}>
                Não foi possível obter sua localização automaticamente. Por favor, digite seu endereço de origem manualmente no campo abaixo.
              </Text>
              <View style={{ height: 12 }} />
              <Button 
                title="Entendi" 
                variant="outline" 
                onPress={() => setShowLocationFallback(false)}
                style={{ borderColor: '#856404' }}
                textStyle={{ color: '#856404' }}
              />
            </Card>
          </View>
        )}

        {showTips && (
          <View style={styles.tipsOverlay}>
            <Card style={styles.tipsCard}>
              <Text style={[styles.tipsTitle, { color: colors.text }]}>Como selecionar endereços</Text>
              <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>1) Toque e segure no mapa para marcar Origem e depois Destino.</Text>
              <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>2) Use os campos abaixo para buscar por endereço ou a cidade atual.</Text>
              <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>3) A rota e o valor aparecem automaticamente. Toque em Continuar para confirmar.</Text>
              <View style={{ height: 8 }} />
              <Button title="Entendi" variant="outline" onPress={() => setShowTips(false)} />
            </Card>
          </View>
        )}
      </View>

      <View style={collapsed ? StyleSheet.flatten([styles.bottomPanel, { height: 90 }]) : styles.bottomPanel}> 
        <Card style={collapsed ? StyleSheet.flatten([styles.inputsCard, { paddingVertical: 8 }]) : styles.inputsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>Rota</Text>
            <TouchableOpacity onPress={() => setCollapsed(!collapsed)}>
              <MaterialIcons name={collapsed ? 'expand-less' : 'expand-more'} size={22} color={colors.tint} />
            </TouchableOpacity>
          </View>
          {!collapsed && (
            <>
          <Input
            label="Cidade (opcional)"
            placeholder="Ex.: São Paulo"
            value={city}
            onChangeText={setCity}
            hint="Ajuda a refinar a busca de endereços"
          />
          <View style={{ height: 6 }} />
          <Input
            label="Origem"
            placeholder={locationPermissionDenied ? 'Digite seu endereço de origem' : (origin ? 'Sua localização atual' : 'Digite a origem')}
            value={originText}
            onChangeText={(t) => handleSuggest(t, 'origin')}
            required={locationPermissionDenied}
          />
          {(isSearchingOrigin || originSuggestions.length > 0 || showNotFoundOrigin) && (
            <View style={[styles.suggestions, { backgroundColor: colors.background, borderColor: colors.border }]}> 
              {isSearchingOrigin ? (
                <View style={styles.searchingItem}>
                  <MaterialIcons name="search" size={18} color={colors.tint} />
                  <Text style={[styles.searchingText, { color: colors.tabIconDefault }]}>
                    Buscando local...
                  </Text>
                </View>
              ) : showNotFoundOrigin ? (
                <View style={styles.notFoundItem}>
                  <MaterialIcons name="location-off" size={18} color="#f44336" />
                  <View style={styles.notFoundTextContainer}>
                    <Text style={[styles.notFoundTitle, { color: colors.text }]}>
                      Endereço não encontrado
                    </Text>
                    <Text style={[styles.notFoundSubtitle, { color: colors.tabIconDefault }]}>
                      Pressione sobre o mapa no ponto desejado ou tente informar o local corretamente novamente
                    </Text>
                  </View>
                </View>
              ) : (
                originSuggestions.map((s, idx) => (
                <View key={`o-${idx}`}>
                  <TouchableOpacity style={styles.suggestionItem} activeOpacity={0.7} onPress={() => applySuggestion(s, 'origin')}>
                    <MaterialIcons name="location-on" size={18} color={colors.tint} />
                    <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={2}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                  {idx < originSuggestions.length - 1 && (
                    <View style={[styles.suggestionDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
                ))
              )}
            </View>
          )}
          <View style={{ height: 10 }} />
          <Input
            label="Destino"
            placeholder="Digite o destino"
            value={destinationText}
            onChangeText={(t) => handleSuggest(t, 'dest')}
            required
          />
          {(isSearchingDest || destSuggestions.length > 0 || showNotFoundDest) && (
            <View style={[styles.suggestions, { backgroundColor: colors.background, borderColor: colors.border }]}> 
              {isSearchingDest ? (
                <View style={styles.searchingItem}>
                  <MaterialIcons name="search" size={18} color={colors.tint} />
                  <Text style={[styles.searchingText, { color: colors.tabIconDefault }]}>
                    Buscando local...
                  </Text>
                </View>
              ) : showNotFoundDest ? (
                <View style={styles.notFoundItem}>
                  <MaterialIcons name="location-off" size={18} color="#f44336" />
                  <View style={styles.notFoundTextContainer}>
                    <Text style={[styles.notFoundTitle, { color: colors.text }]}>
                      Endereço não encontrado
                    </Text>
                    <Text style={[styles.notFoundSubtitle, { color: colors.tabIconDefault }]}>
                      Pressione sobre o mapa no ponto desejado ou tente informar o local corretamente novamente
                    </Text>
                  </View>
                </View>
              ) : (
                destSuggestions.map((s, idx) => (
                <View key={`d-${idx}`}>
                  <TouchableOpacity style={styles.suggestionItem} activeOpacity={0.7} onPress={() => applySuggestion(s, 'dest')}>
                    <MaterialIcons name="location-on" size={18} color={colors.tint} />
                    <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={2}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                  {idx < destSuggestions.length - 1 && (
                    <View style={[styles.suggestionDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
                ))
              )}
            </View>
          )}

          {/* Card com informações da rota */}
          {origin && destination && (distanceKm != null || durationMin != null || price != null) ? (
            <Card style={StyleSheet.flatten([styles.routeInfoCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <View style={styles.routeInfoHeader}>
                <MaterialIcons name="route" size={20} color={colors.tint} />
                <Text style={[styles.routeInfoTitle, { color: colors.text }]}>Informações da Rota</Text>
              </View>
              <View style={styles.routeInfoRow}>
                {distanceKm != null && (
                  <View style={styles.routeInfoItem}>
                    <MaterialIcons name="straighten" size={16} color={colors.tabIconDefault} />
                    <Text style={[styles.routeInfoLabel, { color: colors.tabIconDefault }]}>Distância:</Text>
                    <Text style={[styles.routeInfoValue, { color: colors.text }]}>{distanceKm.toFixed(2)} km</Text>
                  </View>
                )}
                {durationMin != null && (
                  <View style={styles.routeInfoItem}>
                    <MaterialIcons name="access-time" size={16} color={colors.tabIconDefault} />
                    <Text style={[styles.routeInfoLabel, { color: colors.tabIconDefault }]}>Tempo:</Text>
                    <Text style={[styles.routeInfoValue, { color: colors.text }]}>{Math.round(durationMin)} min</Text>
                  </View>
                )}
                {price != null && (
                  <View style={styles.routeInfoItem}>
                    <MaterialIcons name="attach-money" size={16} color={colors.tint} />
                    <Text style={[styles.routeInfoLabel, { color: colors.tabIconDefault }]}>Preço:</Text>
                    <Text style={[styles.routeInfoValue, { color: colors.tint, fontWeight: 'bold' }]}>R$ {price.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </Card>
          ) : origin && destination && isFetching ? (
            <Card style={StyleSheet.flatten([styles.routeInfoCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <View style={styles.routeInfoHeader}>
                <MaterialIcons name="route" size={20} color={colors.tint} />
                <Text style={[styles.routeInfoTitle, { color: colors.text }]}>Calculando rota...</Text>
              </View>
              <View style={styles.skeletonContainer}>
                <View style={[styles.skeletonLine, { backgroundColor: colors.border }]} />
                <View style={[styles.skeletonLine, { backgroundColor: colors.border }]} />
                <View style={[styles.skeletonLine, { backgroundColor: colors.border }]} />
              </View>
            </Card>
          ) : null}

          {!readyToConfirm ? (
            <Button 
              title={isFetching ? 'Calculando rota...' : 'Continuar'} 
              onPress={handleContinue} 
              disabled={isFetching || routeCoords.length === 0} 
              loading={isFetching}
              style={{ marginTop: 12 }} 
            />
          ) : (
            <Button 
              title={isFetching ? 'Confirmando...' : 'Confirmar Endereços'} 
              onPress={handleConfirm} 
              loading={isFetching}
              disabled={isFetching || !origin || !destination}
              style={{ marginTop: 12 }} 
            />
          )}

            </>
          )}
        </Card>
      </View>
      {price != null && (
        <View style={styles.fabPrice}>
          <Text style={styles.fabPriceText}>R$ {price.toFixed(2)}</Text>
        </View>
      )}

        {/* Modal para escolher se o local selecionado é origem ou destino */}
        <Modal
          visible={showLocationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Local</Text>
              <Text style={[styles.modalSubtitle, { color: colors.tabIconDefault }]}>
                {selectedLocationLabel}
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  title="Origem (Saída)"
                  onPress={() => handleLocationChoice('origin')}
                  icon={<MaterialIcons name="my-location" size={20} color="#fff" />}
                  style={styles.modalButton}
                />
                <Button
                  title="Destino (Chegada)"
                  onPress={() => handleLocationChoice('dest')}
                  icon={<MaterialIcons name="place" size={20} color="#fff" />}
                  style={[styles.modalButton, { marginBottom: 10}]}
                />
              </View>
              
              {params.mode === 'select' && (
                <Button
                  title={isFetching ? 'Selecionando...' : 'Usar este local'}
                  variant="outline"
                  onPress={handleSinglePointSelection}
                  loading={isFetching}
                  disabled={isFetching}
                  style={styles.modalButton}
                />
              )}
              
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowLocationModal(false)}
                style={StyleSheet.flatten([styles.modalButton, { marginTop: 8 }])}
              />
            </View>
          </View>
        </Modal>

        {/* Modal para escolher tipo do mapa */}
        <Modal
          visible={showMapTypeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMapTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tipo do Mapa</Text>
              
              <View style={styles.mapTypeOptions}>
                {mapTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.mapTypeOption,
                      { 
                        backgroundColor: mapType === option.key ? colors.tint : 'transparent',
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => {
                      setMapType(option.key);
                      setShowMapTypeModal(false);
                    }}
                  >
                    <MaterialIcons 
                      name={option.icon as any} 
                      size={24} 
                      color={mapType === option.key ? '#fff' : colors.tint} 
                    />
                    <Text style={[
                      styles.mapTypeOptionText, 
                      { color: mapType === option.key ? '#fff' : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Button
                title="Fechar"
                variant="outline"
                onPress={() => setShowMapTypeModal(false)}
                style={styles.modalButton}
              />
            </View>
          </View>
        </Modal>
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
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  inputsCard: {
    padding: 12,
  },
  summary: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  tipsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 8,
    paddingHorizontal: 16,
  },
  tipsCard: {
    padding: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  fabPrice: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  fabPriceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: -8,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
  },
  suggestionDivider: {
    height: 1,
  },
  searchingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  searchingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  notFoundItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  notFoundTextContainer: {
    flex: 1,
  },
  notFoundTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notFoundSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  routeInfoCard: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  routeInfoRow: {
    gap: 8,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeInfoLabel: {
    fontSize: 14,
    minWidth: 60,
  },
  routeInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  mapControlButtons: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 80 : 80,
    right: 16,
    gap: 8,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapTypeOptions: {
    gap: 12,
    marginBottom: 24,
  },
  mapTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapTypeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  fallbackOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  fallbackCard: {
    padding: 16,
    borderWidth: 1,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackText: {
    fontSize: 14,
    lineHeight: 20,
  },
  draggingMarker: {
    transform: [{ scale: 1.2 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  skeletonContainer: {
    gap: 8,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 4,
    opacity: 0.6,
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    marginBottom: 0,
  },
  packageInfoOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  packageInfoCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  packageInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  packageInfoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  originMarker: {
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
    backgroundColor: '#FF5722',
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
  originConfirmationOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  originConfirmationCard: {
    padding: 20,
    borderWidth: 1,
  },
  originConfirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  originConfirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  originConfirmationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  originConfirmationAddress: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  originConfirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  originConfirmButton: {
    flex: 1,
  },
  originCancelButton: {
    flex: 1,
  },
  originConfirmationMarker: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  crosshairHorizontal: {
    position: 'absolute',
    top: 19,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FF5722',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  crosshairVertical: {
    position: 'absolute',
    left: 19,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF5722',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
});
