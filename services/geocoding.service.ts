/**
 * Serviço para extrair informações geográficas de endereços
 */

export interface AddressComponents {
  city: string;
  state: string;
  country: string;
  neighborhood?: string;
}

class GeocodingService {
  /**
   * Extrai a cidade de um endereço usando regex
   * Funciona para endereços brasileiros comuns
   */
  extractCityFromAddress(address: string): string {
    try {
      // Remove caracteres especiais e normaliza
      const cleanAddress = address
        .toLowerCase()
        .replace(/[^\w\s,.-]/g, '')
        .trim();

      // Lista de cidades brasileiras comuns para matching
      const brazilianCities = [
        'são paulo', 'rio de janeiro', 'belo horizonte', 'salvador', 'brasília',
        'fortaleza', 'manaus', 'curitiba', 'recife', 'porto alegre',
        'belém', 'goiânia', 'guarulhos', 'campinas', 'são luís',
        'maceió', 'duque de caxias', 'natal', 'teresina', 'campo grande',
        'nova iguaçu', 'são bernardo do campo', 'santo andré', 'osasco',
        'jaboatão dos guararapes', 'são josé dos campos', 'ribeirão preto',
        'uberlândia', 'sorocaba', 'contagem', 'aracaju', 'feira de santana',
        'cuiabá', 'joinville', 'apucarana', 'são joão de meriti', 'londrina',
        'anápolis', 'serra', 'niterói', 'campos dos goytacazes', 'vila velha',
        'caxias do sul', 'são josé do rio preto', 'são josé dos pinhais',
        'mauá', 'diadema', 'betim', 'jundiaí', 'carapicuíba', 'maringá',
        'montes claros', 'caruaru', 'são vicente', 'são caetano do sul',
        'itaquaquecetuba', 'franca', 'são josé de ribamar', 'rio branco',
        'cariacica', 'praia grande', 'são carlos', 'são josé', 'são leopoldo',
        'são bernardo', 'são gonçalo', 'são luís', 'são paulo', 'são vicente'
      ];

      // Tenta encontrar cidade no endereço
      for (const city of brazilianCities) {
        if (cleanAddress.includes(city)) {
          return this.capitalizeCityName(city);
        }
      }

      // Se não encontrar, tenta extrair por padrões comuns
      const patterns = [
        // Padrão: "Rua X, Bairro, Cidade - Estado"
        /,\s*([^,]+?)\s*-\s*[a-z]{2}$/i,
        // Padrão: "Rua X, Cidade"
        /,\s*([^,]+?)$/i,
        // Padrão: "Cidade - Estado"
        /^([^,]+?)\s*-\s*[a-z]{2}$/i,
      ];

      for (const pattern of patterns) {
        const match = cleanAddress.match(pattern);
        if (match && match[1]) {
          const city = match[1].trim();
          if (city.length > 2 && city.length < 50) {
            return this.capitalizeCityName(city);
          }
        }
      }

      // Fallback: extrai última palavra antes de vírgula ou hífen
      const fallbackMatch = cleanAddress.match(/([^,]+?)(?:,|$)/);
      if (fallbackMatch && fallbackMatch[1]) {
        const city = fallbackMatch[1].trim();
        if (city.length > 2 && city.length < 50) {
          return this.capitalizeCityName(city);
        }
      }

      // Se nada funcionar, retorna "Cidade não identificada"
      return 'Cidade não identificada';

    } catch (error) {
      console.error('Error extracting city from address:', error);
      return 'Cidade não identificada';
    }
  }

  /**
   * Capitaliza o nome da cidade corretamente
   */
  private capitalizeCityName(city: string): string {
    return city
      .split(' ')
      .map(word => {
        // Palavras que devem ficar em minúsculo
        const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
        
        if (lowercaseWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        
        // Capitaliza primeira letra
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Extrai componentes completos do endereço
   */
  extractAddressComponents(address: string): AddressComponents {
    const city = this.extractCityFromAddress(address);
    
    // Tenta extrair estado (padrão brasileiro)
    const stateMatch = address.match(/-?\s*([A-Z]{2})\s*$/);
    const state = stateMatch ? stateMatch[1] : 'Estado não identificado';
    
    return {
      city,
      state,
      country: 'Brasil',
      neighborhood: this.extractNeighborhood(address)
    };
  }

  /**
   * Extrai bairro do endereço
   */
  private extractNeighborhood(address: string): string | undefined {
    try {
      // Padrão: "Rua X, Bairro, Cidade"
      const match = address.match(/,\s*([^,]+?),\s*[^,]+$/);
      if (match && match[1]) {
        return match[1].trim();
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Valida se a cidade extraída é válida
   */
  isValidCity(city: string): boolean {
    return city !== 'Cidade não identificada' && city.length > 2;
  }
}

export const geocodingService = new GeocodingService();
