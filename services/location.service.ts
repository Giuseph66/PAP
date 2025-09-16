import { realtimeDb } from '@/config/firebase';
import { CourierLocation } from '@/types';
import * as Location from 'expo-location';
import { off, onValue, ref, set } from 'firebase/database';

export class LocationService {
  private static instance: LocationService;
  private locationWatcher: Location.LocationSubscription | null = null;
  private isTracking = false;

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Solicitar permissões de localização
   */
  public async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Permissão de localização negada');
      }

      // Para tracking em background (entregadores)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return foregroundStatus === 'granted' && backgroundStatus === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Obter localização atual
   */
  public async getCurrentLocation(): Promise<Location.LocationObject> {
    try {
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) {
        throw new Error('Permissões de localização necessárias');
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      throw new Error('Falha ao obter localização atual');
    }
  }

  /**
   * Obter cidade para coordenadas via reverse geocode
   */
  public async getCityForCoords(lat: number, lng: number): Promise<string | null> {
    try {
      const placemarks = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!placemarks || placemarks.length === 0) return null;
      const p = placemarks[0] as any;
      return p.city || p.subregion || p.region || p.district || null;
    } catch (error) {
      console.error('Erro ao obter cidade:', error);
      return null;
    }
  }

  /**
   * Obter cidade atual do usuário
   */
  public async getCurrentCity(): Promise<string | null> {
    try {
      const loc = await this.getCurrentLocation();
      return await this.getCityForCoords(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      return null;
    }
  }

  /**
   * Iniciar rastreamento de localização para entregador
   */
  public async startLocationTracking(courierUid: string): Promise<void> {
    try {
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) {
        throw new Error('Permissões de localização necessárias');
      }

      if (this.isTracking) {
        await this.stopLocationTracking();
      }

      this.locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Atualizar a cada 10 segundos
          distanceInterval: 20, // Ou quando se mover 20 metros
        },
        (location) => {
          this.updateCourierLocation(courierUid, location);
        }
      );

      this.isTracking = true;
      console.log('Rastreamento de localização iniciado');
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      throw new Error('Falha ao iniciar rastreamento');
    }
  }

  /**
   * Parar rastreamento de localização
   */
  public async stopLocationTracking(): Promise<void> {
    try {
      if (this.locationWatcher) {
        this.locationWatcher.remove();
        this.locationWatcher = null;
      }
      
      this.isTracking = false;
      console.log('Rastreamento de localização parado');
    } catch (error) {
      console.error('Erro ao parar rastreamento:', error);
    }
  }

  /**
   * Atualizar localização do entregador no Realtime Database
   */
  private async updateCourierLocation(
    courierUid: string,
    location: Location.LocationObject
  ): Promise<void> {
    try {
      const courierLocationData: CourierLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        updatedAt: new Date(),
        geohash: this.generateGeohash(location.coords.latitude, location.coords.longitude),
      };

      const locationRef = ref(realtimeDb, `courierLocations/${courierUid}`);
      await set(locationRef, {
        ...courierLocationData,
        updatedAt: courierLocationData.updatedAt.toISOString(),
      });

      // Atualizar status de presença
      const presenceRef = ref(realtimeDb, `presence/${courierUid}`);
      await set(presenceRef, 'online');

    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
    }
  }

  /**
   * Observar localização de um entregador
   */
  public subscribeToCourierLocation(
    courierUid: string,
    callback: (location: CourierLocation | null) => void
  ): () => void {
    const locationRef = ref(realtimeDb, `courierLocations/${courierUid}`);
    
    const listener = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        callback({
          ...data,
          updatedAt: new Date(data.updatedAt),
        });
      } else {
        callback(null);
      }
    };

    onValue(locationRef, listener);

    // Retorna função para remover o listener
    return () => {
      off(locationRef, 'value', listener);
    };
  }

  /**
   * Definir status de presença do entregador
   */
  public async setCourierPresence(
    courierUid: string,
    status: 'online' | 'offline'
  ): Promise<void> {
    try {
      const presenceRef = ref(realtimeDb, `presence/${courierUid}`);
      await set(presenceRef, status);
    } catch (error) {
      console.error('Erro ao definir presença:', error);
      throw new Error('Falha ao atualizar status');
    }
  }

  /**
   * Observar status de presença
   */
  public subscribeToPresence(
    courierUid: string,
    callback: (status: 'online' | 'offline') => void
  ): () => void {
    const presenceRef = ref(realtimeDb, `presence/${courierUid}`);
    
    const listener = (snapshot: any) => {
      const status = snapshot.val() || 'offline';
      callback(status);
    };

    onValue(presenceRef, listener);

    return () => {
      off(presenceRef, 'value', listener);
    };
  }

  /**
   * Calcular distância entre dois pontos
   */
  public calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Encontrar entregadores próximos
   */
  public async findNearbyCouriers(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Promise<string[]> {
    return new Promise((resolve) => {
      const courierLocationsRef = ref(realtimeDb, 'courierLocations');
      
      onValue(courierLocationsRef, (snapshot) => {
        const locations = snapshot.val() || {};
        const nearbyCouriers: string[] = [];

        Object.entries(locations).forEach(([courierUid, locationData]: [string, any]) => {
          if (locationData) {
            const distance = this.calculateDistance(
              lat,
              lng,
              locationData.lat,
              locationData.lng
            );

            if (distance <= radiusKm) {
              nearbyCouriers.push(courierUid);
            }
          }
        });

        resolve(nearbyCouriers);
      }, { onlyOnce: true });
    });
  }

  /**
   * Gerar geohash simples para indexação
   */
  private generateGeohash(lat: number, lng: number, precision: number = 6): string {
    const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
    let geohash = '';
    
    let latRange = [-90, 90];
    let lngRange = [-180, 180];
    let isEven = true;
    let bit = 0;
    let ch = 0;
    
    while (geohash.length < precision) {
      if (isEven) {
        const mid = (lngRange[0] + lngRange[1]) / 2;
        if (lng >= mid) {
          ch |= (1 << (4 - bit));
          lngRange[0] = mid;
        } else {
          lngRange[1] = mid;
        }
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (lat >= mid) {
          ch |= (1 << (4 - bit));
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }
      
      isEven = !isEven;
      
      if (bit < 4) {
        bit++;
      } else {
        geohash += chars[ch];
        bit = 0;
        ch = 0;
      }
    }
    
    return geohash;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Verificar se está rastreando
   */
  public isLocationTracking(): boolean {
    return this.isTracking;
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
