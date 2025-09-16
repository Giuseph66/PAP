import { geocodingService } from './geocoding.service';
import { locationService } from './location.service';

class CourierLocationService {
  private cachedCity: string | null = null;
  private lastLocationUpdate: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtém a cidade atual do entregador
   */
  async getCurrentCity(): Promise<string> {
    try {
      // Verifica se tem cache válido
      if (this.cachedCity && this.lastLocationUpdate) {
        const timeSinceUpdate = Date.now() - this.lastLocationUpdate.getTime();
        if (timeSinceUpdate < this.CACHE_DURATION) {
          return this.cachedCity;
        }
      }

      // Obtém localização atual
      const location = await locationService.getCurrentLocation();
      if (!location) {
        console.warn('Could not get current location, using default city');
        return 'São Paulo'; // Fallback
      }

      // Converte coordenadas para endereço (reverse geocoding)
      const address = await this.reverseGeocode(location.latitude, location.longitude);
      
      if (address) {
        // Extrai cidade do endereço
        const city = geocodingService.extractCityFromAddress(address);
        
        if (geocodingService.isValidCity(city)) {
          this.cachedCity = city;
          this.lastLocationUpdate = new Date();
          return city;
        }
      }

      // Fallback para cidade padrão
      console.warn('Could not determine city from location, using default');
      return 'São Paulo';

    } catch (error) {
      console.error('Error getting courier city:', error);
      return 'São Paulo'; // Fallback seguro
    }
  }

  /**
   * Reverse geocoding usando API do Google (ou similar)
   * TODO: Implementar com API real de geocoding
   */
  private async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      // Por enquanto, retorna um endereço mock baseado na região
      // Em produção, usar Google Geocoding API ou similar
      
      // Região de São Paulo
      if (lat >= -24.0 && lat <= -23.0 && lng >= -47.0 && lng <= -46.0) {
        return 'Rua das Flores, 123, São Paulo - SP';
      }
      
      // Região do Rio de Janeiro
      if (lat >= -23.0 && lat <= -22.0 && lng >= -44.0 && lng <= -43.0) {
        return 'Rua das Flores, 123, Rio de Janeiro - RJ';
      }
      
      // Região de Belo Horizonte
      if (lat >= -20.0 && lat <= -19.0 && lng >= -44.0 && lng <= -43.0) {
        return 'Rua das Flores, 123, Belo Horizonte - MG';
      }
      
      // Fallback genérico
      return 'Rua das Flores, 123, São Paulo - SP';
      
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Limpa cache de localização
   */
  clearCache(): void {
    this.cachedCity = null;
    this.lastLocationUpdate = null;
  }

  /**
   * Força atualização da cidade (ignora cache)
   */
  async refreshCity(): Promise<string> {
    this.clearCache();
    return this.getCurrentCity();
  }
}

export const courierLocationService = new CourierLocationService();
