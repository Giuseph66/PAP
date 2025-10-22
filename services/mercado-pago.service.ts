// Mercado Pago PIX minimal client for app payments (PIX only)
// Uses Expo public env vars for credentials

const MP_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN || '';

type CreatePixParams = {
  transaction_amount: number;
  description: string;
  external_reference: string;
  notification_url?: string;
  payer: { email: string };
  metadata?: Record<string, any>;
  date_of_expiration?: string; // ISO-8601
  idempotencyKey?: string;
};

export type PixCreateResponse = {
  id: string | number;
  status: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
  date_of_expiration?: string;
};

export async function createPixPayment(params: CreatePixParams): Promise<PixCreateResponse> {
  const {
    transaction_amount,
    description,
    external_reference,
    notification_url,
    payer,
    metadata,
    date_of_expiration,
    idempotencyKey,
  } = params;

  // Normalização e validação do valor (em reais)
  const normalizedAmount = Number.parseFloat(String(transaction_amount));
  if (!Number.isFinite(normalizedAmount) || Number.isNaN(normalizedAmount)) {
    throw new Error('Invalid transaction_amount: not a number');
  }
  const roundedAmount = +normalizedAmount.toFixed(2);
  if (roundedAmount < 1) {
    throw new Error('Invalid transaction_amount: must be >= 1.00 BRL');
  }

  const expirationISO = date_of_expiration || new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const idemp = idempotencyKey || `${external_reference}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'X-Idempotency-Key': idemp,
    },
    body: JSON.stringify({
      transaction_amount: roundedAmount,
      description,
      payment_method_id: 'pix',
      external_reference,
      notification_url,
      date_of_expiration: expirationISO,
      payer,
      metadata: metadata || {},
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  return data as PixCreateResponse;
}

export async function getPaymentStatus(paymentId: string | number): Promise<any> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  return data;
}


