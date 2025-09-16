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

// Regra: R$ 5,00 até 0.5 km (500m). Após isso, preço cresce gradualmente.
// Implementação: preço variável linear por km adicional com degraus suaves.
// Exemplo: R$ 3,50 por km adicional após 0.5 km, com arredondamento a 2 casas.
const MIN_DISTANCE_KM = 0.5;
const MIN_PRICE = 5.0;
const PRICE_PER_KM = 3.5;

export function estimatePrice({ distanceKm, weightKg = 0, fragil = false }: PricingInput): PricingBreakdown {
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

  // Aplicar multiplicadores
  if (weightKg > 5) {
    total = round2(total * 1.2); // 20% extra para >5kg
  }
  if (fragil) {
    total = round2(total * 1.15); // 15% extra para frágil
  }

  // Preço mínimo final
  total = Math.max(MIN_PRICE, total);

  return { basePrice, variablePrice, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


