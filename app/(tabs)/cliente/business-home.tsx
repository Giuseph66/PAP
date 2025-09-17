import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { locationService } from '@/services/location.service';
import { AuthUser, CourierLocation } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface NearbyCourier {
  uid: string;
  location: CourierLocation;
  name: string;
  rating: number;
  vehicle: 'moto' | 'carro' | 'bike';
}

export default function BusinessMapHomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Screen dimensions
  const { width, height } = Dimensions.get('window');
  
  // States
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyCouriers, setNearbyCouriers] = useState<NearbyCourier[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const mapRef = useRef<MapView | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  // Load current location and nearby couriers
  const loadData = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    }
    
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
      
      // Solicitar permissões de localização primeiro
      const hasPermission = await locationService.requestLocationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permissão de Localização',
          'Para usar o mapa, é necessário permitir o acesso à sua localização. Você pode ativar isso nas configurações do dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurações', onPress: () => console.log('Abrir configurações') }
          ]
        );
        return;
      }
      
      // Get current location
      const location = await locationService.getCurrentLocation();
      const currentPos = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(currentPos);
      
      // Update map region to center on user
      setMapRegion({
        latitude: currentPos.latitude,
        longitude: currentPos.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      
      // Mock nearby couriers (in a real app, this would come from the backend)
      const mockCouriers: NearbyCourier[] = [
        {
          uid: 'courier1',
          name: 'Carlos Silva',
          rating: 4.9,
          vehicle: 'moto',
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
          vehicle: 'moto',
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
          vehicle: 'carro',
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
          vehicle: 'moto',
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
          vehicle: 'bike',
          location: {
            lat: currentPos.latitude + 0.01,
            lng: currentPos.longitude + 0.002,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        },
        {
          uid: 'courier6',
          name: 'Fernanda Lima',
          rating: 4.9,
          vehicle: 'moto',
          location: {
            lat: currentPos.latitude - 0.012,
            lng: currentPos.longitude - 0.004,
            speed: 0,
            heading: 0,
            updatedAt: new Date(),
            geohash: ''
          }
        },
        {
          uid: 'courier7',
          name: 'Ricardo Pereira',
          rating: 4.5,
          vehicle: 'carro',
          location: {
            lat: currentPos.latitude + 0.007,
            lng: currentPos.longitude + 0.01,
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
      Alert.alert('Erro', 'Não foi possível carregar sua localização');
      // Define localização padrão em caso de erro
      setCurrentLocation({
        latitude: -23.5505,
        longitude: -46.6333,
      });
      setMapRegion({
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
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

  const handleCreateShipment = () => {
    router.push('/pedir/create-shipment');
  };

  const handleViewProfile = () => {
    router.push('/telas_extras/profile');
  };

  const handleViewShipments = () => {
    router.push('/telas_extras/shipments');
  };


  const getVehicleIcon = (vehicle: string) => {
    switch (vehicle) {
      case 'moto': return 'motorcycle';
      case 'carro': return 'directions-car';
      case 'bike': return 'pedal-bike';
      default: return 'motorcycle';
    }
  };

  const getVehicleColor = (vehicle: string) => {
    switch (vehicle) {
      case 'moto': return '#FF9800';
      case 'carro': return '#2196F3';
      case 'bike': return '#4CAF50';
      default: return '#FF9800';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map as Background - Full Screen */}
      <View style={styles.mapBackground}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          rotateEnabled={true}
          pitchEnabled={true}
          onRegionChangeComplete={(region) => setMapRegion(region)}
        >
          {/* Current location marker (business) */}
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Sua empresa"
            >
              <View style={[styles.businessMarker, { backgroundColor: colors.tint }]}>
                <MaterialIcons name="business" size={24} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Nearby couriers markers */}
          {nearbyCouriers.map((courier) => (
            <Marker
              key={courier.uid}
              coordinate={{
                latitude: courier.location.lat,
                longitude: courier.location.lng,
              }}
              title={courier.name}
              description={`${courier.vehicle} • Avaliação: ${courier.rating}`}
            >
              <View style={[styles.courierMarker, { backgroundColor: getVehicleColor(courier.vehicle) }]}>
                <MaterialIcons 
                  name={getVehicleIcon(courier.vehicle)} 
                  size={28} 
                  color="#fff" 
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: colors.background }]}
            onPress={handleCenterMap}
          >
            <MaterialIcons name="my-location" size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <View style={styles.addCourierButton}>
          <TouchableOpacity 
            style={[styles.addCourierButton, { backgroundColor: colors.background }]}
            onPress={handleCreateShipment}
          >
            <MaterialIcons name="add" size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Stats Overlay */}
        <View style={styles.statsOverlay}>
          <View style={[styles.statsCard, { backgroundColor: `${colors.background}dd` }]}>
            <View style={styles.statItem}>
              <MaterialIcons name="motorcycle" size={20} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {nearbyCouriers.length}+
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Entregadores próximos
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={20} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                28 min
              </Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
                Tempo médio
              </Text>
            </View>
          </View>
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
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <View style={styles.footerHeader}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Olá, {user?.nome}!
            </Text>
            <TouchableOpacity onPress={handleViewProfile}>
              <MaterialIcons name="business" size={28} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <MaterialIcons name="local-shipping" size={24} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Envios hoje</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <MaterialIcons name="schedule" size={24} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>28min</Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Tempo médio</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <MaterialIcons name="star" size={24} color="#FFD700" />
              <Text style={[styles.statValue, { color: colors.text }]}>4.8</Text>
              <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Avaliação</Text>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Atividade Recente
            </Text>
            
            <View style={styles.activityList}>
              <View style={[styles.activityItem, { backgroundColor: colors.background }]}>
                <View style={[styles.activityIcon, { backgroundColor: '#4CAF50' }]}>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    Envio #1234 entregue
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.tabIconDefault }]}>
                    Há 15 minutos
                  </Text>
                </View>
                <Text style={[styles.activityPrice, { color: '#4CAF50' }]}>
                  R$ 15,50
                </Text>
              </View>

              <View style={[styles.activityItem, { backgroundColor: colors.background }]}>
                <View style={[styles.activityIcon, { backgroundColor: '#FF9800' }]}>
                  <MaterialIcons name="local-shipping" size={20} color="#fff" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    Envio #1235 em trânsito
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.tabIconDefault }]}>
                    Há 1 hora
                  </Text>
                </View>
                <Text style={[styles.activityPrice, { color: colors.tint }]}>
                  R$ 22,00
                </Text>
              </View>

              <View style={[styles.activityItem, { backgroundColor: colors.background }]}>
                <View style={[styles.activityIcon, { backgroundColor: '#2196F3' }]}>
                  <MaterialIcons name="add" size={20} color="#fff" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    Novo envio criado
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.tabIconDefault }]}>
                    Há 2 horas
                  </Text>
                </View>
                <Text style={[styles.activityPrice, { color: colors.tint }]}>
                  R$ 18,50
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Ações Rápidas
            </Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={[styles.quickActionCard, { backgroundColor: colors.background }]}
                onPress={handleCreateShipment}
              >
                <MaterialIcons name="add-circle" size={32} color={colors.tint} />
                <Text style={[styles.quickActionTitle, { color: colors.text }]}>
                  Novo Envio
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickActionCard, { backgroundColor: colors.background }]}
                onPress={handleViewShipments}
              >
                <MaterialIcons name="list-alt" size={32} color={colors.tint} />
                <Text style={[styles.quickActionTitle, { color: colors.text }]}>
                  Meus Envios
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickActionCard, { backgroundColor: colors.background }]}
                onPress={() => router.push('/telas_extras/profile')}
              >
                <MaterialIcons name="analytics" size={32} color={colors.tint} />
                <Text style={[styles.quickActionTitle, { color: colors.text }]}>
                  Relatórios
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickActionCard, { backgroundColor: colors.background }]}
                onPress={() => router.push('/telas_extras/profile')}
              >
                <MaterialIcons name="settings" size={32} color={colors.tint} />
                <Text style={[styles.quickActionTitle, { color: colors.text }]}>
                  Configurações
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <Button
              title="Criar Envio"
              onPress={handleCreateShipment}
              variant="primary"
              style={styles.actionButton}
              icon={<MaterialIcons name="add" size={16} color="#fff" />}
              size="lg"
              fullWidth
            />
            
            <View style={styles.secondaryActions}>
              <Button
                title="Meus Envios"
                onPress={handleViewShipments}
                variant="outline"
                style={styles.secondaryButton}
                icon={<MaterialIcons name="local-shipping" size={16} color={colors.tint} />}
              />
            </View>
          </View>
        </View>
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
  mapControls: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 120 : 120,
    right: 16,
    gap: 12,
  },
  mapControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  businessMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  courierMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  statsOverlay: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    left: 16,
    right: 16,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
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
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
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
    flexGrow: 1,
  },
  footer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    minHeight: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fundo semi-transparente
  },
  footerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activitySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  addCourierButton: {
    position: 'absolute',
    top: '62%',
    borderRadius: 50,
    padding: 12,
    right: 10,
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
  },
  activityPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 16,
  },
  actionButton: {
    marginBottom: 0,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
});