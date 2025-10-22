import { systemConfigService } from '@/services/system-config.service';

export interface PricingInput {
  distanceKm: number;
  weightKg?: number;
  fragil?: boolean;
}

export interface PricingBreakdown {
  basePrice: number; // preço mínimo
  variablePrice: number; // componente variável além da franquia
  total: number;
}

export function estimatePrice({ distanceKm, weightKg = 0, fragil = false }: PricingInput): PricingBreakdown {
  // Get pricing configuration from system config service
  const config = systemConfigService.getPricingConfig();
  
  const MIN_DISTANCE_KM = config.minDistanceKm;
  const MIN_PRICE = config.minPrice;
  const PRICE_PER_KM = config.pricePerKm;
  const WEIGHT_THRESHOLD = config.weightThreshold;
  const WEIGHT_MULTIPLIER = config.weightMultiplier;
  const FRAGILE_MULTIPLIER = config.fragileMultiplier;

  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { basePrice: MIN_PRICE, variablePrice: 0, total: MIN_PRICE };
  }

  let basePrice = MIN_PRICE;
  let variablePrice = 0;

  if (distanceKm > MIN_DISTANCE_KM) {
    const extraKm = distanceKm - MIN_DISTANCE_KM;
    variablePrice = round2(extraKm * PRICE_PER_KM);
  }

  let total = basePrice + variablePrice;

  // Aplicar multiplicador por peso (apenas sobre o peso excedente)
  if (weightKg > WEIGHT_THRESHOLD) {
    const excessWeight = weightKg - WEIGHT_THRESHOLD;
    const weightExtra = round2(excessWeight * (WEIGHT_MULTIPLIER - 1) * PRICE_PER_KM);
    total += weightExtra;
  }
  
  // Aplicar multiplicador por frágil (sobre o total)
  if (fragil) {
    total = round2(total * FRAGILE_MULTIPLIER);
  }

  // Preço mínimo final
  total = Math.max(MIN_PRICE, total);

  return { basePrice, variablePrice, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


