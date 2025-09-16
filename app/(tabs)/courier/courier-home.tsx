import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { locationService } from '@/services/location.service';
import { AuthUser, CourierLocation } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface NearbyCourier {
  uid: string;
  location: CourierLocation;
  name: string;
  rating: number;
}

export default function CourierHomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Screen dimensions
  const { width, height } = Dimensions.get('window');
  
  // States
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyCouriers, setNearbyCouriers] = useState<NearbyCourier[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline'>('offline');
  const [user, setUser] = useState<AuthUser | null>(null);
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  
  // Stats
  const [stats, setStats] = useState({
    todayEarnings: 85.50,
    todayDeliveries: 5,
    rating: 4.8,
    onlineHours: 3.5,
  });

  const mapRef = useRef<MapView | null>(null);

  // Animate in on load
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Load current location and nearby couriers
  const loadData = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    }
    
    setError(null);
    
    try {
      const session = await authService.getSession();
      if (session) {
        // Converter Session para AuthUser
        const userData: AuthUser = {
          id: session.userId,
          email: 'usuario@exemplo.com', // Valor padrão
          passwordHash: '',
          salt: '',
          nome: session.nome, // Valor padrão
          telefone: session.telefone,
          role: session.role,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            uid: session.userId,
            role: session.role,
            nome: session.nome,
            telefone: session.telefone,
            email: 'usuario@exemplo.com',
            docsVerificados: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            enderecos: [],
          },
        };
        setUser(userData);
      }
      // Get current location
      const location = await locationService.getCurrentLocation();
      const currentPos = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(currentPos);
      
      // Mock nearby couriers (in a real app, this would come from the backend)
      const mockCouriers: NearbyCourier[] = [
        {
          uid: 'courier1',
          name: 'Carlos Silva',
          rating: 4.9,
          location: {
            lat: currentPos.latitude + 0.005,
            lng: currentPos.longitude + 0.005,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        },
        {
          uid: 'courier2',
          name: 'Ana Costa',
          rating: 4.7,
          location: {
            lat: currentPos.latitude - 0.008,
            lng: currentPos.longitude + 0.003,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        },
        {
          uid: 'courier3',
          name: 'João Santos',
          rating: 4.8,
          location: {
            lat: currentPos.latitude + 0.002,
            lng: currentPos.longitude - 0.007,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        },
        {
          uid: 'courier4',
          name: 'Maria Oliveira',
          rating: 5.0,
          location: {
            lat: currentPos.latitude - 0.005,
            lng: currentPos.longitude - 0.009,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        },
        {
          uid: 'courier5',
          name: 'Pedro Alves',
          rating: 4.6,
          location: {
            lat: currentPos.latitude + 0.01,
            lng: currentPos.longitude + 0.002,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        }
      ];
      
      setNearbyCouriers(mockCouriers);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Não foi possível carregar sua localização');
      // Define localização padrão em caso de erro
      setCurrentLocation({
        latitude: -23.5505,
        longitude: -46.6333,
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  const toggleOnlineStatus = () => {
    setOnlineStatus(prev => prev === 'online' ? 'offline' : 'online');
  };

  const handleCenterMap = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleViewEarnings = () => {
    router.push('/courier/courier-finance');
  };

  const handleViewStats = () => {
    router.push('/courier/courier-stats');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map as Background - Full Screen */}
      <View style={styles.mapBackground}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            onMapReady={() => setMapReady(true)}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            rotateEnabled={true}
            pitchEnabled={true}
          >
            {/* Current location marker */}
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Sua localização"
            >
              <View style={[styles.locationMarker, { backgroundColor: onlineStatus === 'online' ? '#4CAF50' : '#f44336' }]}>
                <MaterialIcons name="person" size={20} color="#fff" />
              </View>
            </Marker>

            {/* Nearby couriers markers */}
            {nearbyCouriers.map((courier, index) => (
              <Marker
                key={courier.uid}
                coordinate={{
                  latitude: courier.location.lat,
                  longitude: courier.location.lng,
                }}
                title={courier.name}
                description={`Avaliação: ${courier.rating}`}
              >
                <View style={styles.courierMarker}>
                  <MaterialIcons name="motorcycle" size={24} color="#fff" />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.background }]}>
            <MaterialIcons name="map" size={48} color={colors.tabIconDefault} />
            <Text style={[styles.mapPlaceholderText, { color: colors.tabIconDefault }]}>
              Carregando mapa...
            </Text>
          </View>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: colors.background }]}
            onPress={handleCenterMap}
          >
            <MaterialIcons name="my-location" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <TouchableOpacity 
            style={[
              styles.statusBadge, 
              { 
                backgroundColor: onlineStatus === 'online' ? '#4CAF50' : '#f44336',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }
            ]}
            onPress={toggleOnlineStatus}
          >
            <MaterialIcons 
              name={onlineStatus === 'online' ? 'wifi' : 'wifi-off'} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.statusText}>
              {onlineStatus === 'online' ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content Section - Overlay on Map */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Animated.View 
          style={[
            styles.contentInner,
            {
              backgroundColor: colors.background,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.tabIconDefault }]}>
                Olá, {user?.nome}!
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                Bem-vindo(a) de volta
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.profileButton, { backgroundColor: `${colors.tint}20` }]}
              onPress={() => router.push('/telas_extras/profile')}
            >
              <MaterialIcons name="person" size={24} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <Card style={StyleSheet.flatten([styles.statCard, { backgroundColor: colors.background }])}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(stats.todayEarnings)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Ganhos hoje
              </Text>
            </Card>
            
            <Card style={StyleSheet.flatten([styles.statCard, { backgroundColor: colors.background }])}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.todayDeliveries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Entregas hoje
              </Text>
            </Card>
            
            <Card style={StyleSheet.flatten([styles.statCard, { backgroundColor: colors.background }])}>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.rating}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Avaliação
              </Text>
            </Card>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Ações Rápidas
            </Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={handleViewEarnings}
              >
                <Card style={StyleSheet.flatten([styles.actionCardContent, { backgroundColor: colors.background }])}>
                  <View style={[styles.actionIcon, { backgroundColor: `${colors.tint}20` }]}>
                    <MaterialIcons name="account-balance-wallet" size={24} color={colors.tint} />
                  </View>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Financeiro
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.tabIconDefault }]}>
                    Ver ganhos
                  </Text>
                </Card>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={handleViewStats}
              >
                <Card style={StyleSheet.flatten([styles.actionCardContent, { backgroundColor: colors.background }])}>
                  <View style={[styles.actionIcon, { backgroundColor: `${colors.tint}20` }]}>
                    <MaterialIcons name="bar-chart" size={24} color={colors.tint} />
                  </View>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>
                    Estatísticas
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.tabIconDefault }]}>
                    Seu desempenho
                  </Text>
                </Card>
              </TouchableOpacity>
            </View>
          </View>

          {/* Online Hours */}
          <Card style={StyleSheet.flatten([styles.hoursCard, { backgroundColor: colors.background }])}>
            <View style={styles.hoursHeader}>
              <Text style={[styles.hoursTitle, { color: colors.text }]}>
                Horas Online Hoje
              </Text>
              <Text style={[styles.hoursValue, { color: colors.tint }]}>
                {stats.onlineHours}h
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${(stats.onlineHours / 8) * 100}%`,
                    backgroundColor: colors.tint
                  }
                ]} 
              />
            </View>
            <Text style={[styles.hoursGoal, { color: colors.tabIconDefault }]}>
              Meta diária: 8h
            </Text>
          </Card>

          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <Button
              title={onlineStatus === 'online' ? "Você está online" : "Ficar Online"}
              onPress={toggleOnlineStatus}
              variant={onlineStatus === 'online' ? "primary" : "secondary"}
              size="lg"
              fullWidth
              disabled={onlineStatus === 'online'}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
  },
  mapControls: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    right: 16,
    gap: 12,
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
  locationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  courierMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF9800',
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
  statusBadgeContainer: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    left: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  scrollContent: {
    backgroundColor: 'transparent',
    paddingTop: 16,
  },
  contentInner: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
    minHeight: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fundo semi-transparente
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
  },
  actionCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  hoursCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  hoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  hoursGoal: {
    fontSize: 12,
    textAlign: 'right',
  },
  ctaContainer: {
    marginBottom: 30,
  },
});