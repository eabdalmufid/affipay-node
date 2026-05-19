export interface AffipayClientOptions {
  baseUrl?: string;
  apiKey: string;
}

export type CreatePaymentPayload = {
  amount: number;
  [key: string]: unknown;
};

export type AffipayStatus = "pending" | "paid" | "expired" | "demo";

export interface CreatePaymentResponse {
  reference_id: string;
  amount: number;
  fee: number;
  unique_code: number;
  total: number;
  net_amount: number;
  qris_string: string;
  expired_at: string;
  fee_merchant: boolean;
}

export interface CheckStatusResponse {
  reference_id: string;
  amount: number;
  fee: number;
  unique_code: number;
  total: number;
  net_amount: number;
  qris_string: string;
  status: AffipayStatus;
  created_at: string;
  expired_at: string;
  paid_at: string | null;
  fee_merchant: boolean;
}

/**
 * Interface untuk payload webhook callback dari Affipay.
 */
export interface AffipayWebhookPayload {
  status: AffipayStatus;
  amount: number;
  reference_id: string;
  paid_at?: string;
  expired_at?: string;
  demo?: boolean;
}

export interface AffipayClient {
  baseUrl: string;
  apiKey: string;
  /**
   * Membuat transaksi pembayaran baru.
   */
  createPayment<TResponse = CreatePaymentResponse>(payload: CreatePaymentPayload): Promise<TResponse>;
  /**
   * Mengecek status transaksi berdasarkan referenceId.
   */
  checkStatus<TResponse = CheckStatusResponse>(referenceId: string): Promise<TResponse>;
}

const DEFAULT_BASE_URL = "https://pay.affidev.com";

export function createAffipayClient({ baseUrl = DEFAULT_BASE_URL, apiKey }: AffipayClientOptions): AffipayClient {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new Error("baseUrl harus string valid");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("apiKey wajib diisi");
  }

  let normalizedBaseUrl = baseUrl.trim();
  while (normalizedBaseUrl.endsWith("/")) {
    normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
  }

  async function request<TResponse = unknown>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Request gagal: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`,
      );
    }

    try {
      return (await response.json()) as TResponse;
    } catch {
      throw new Error("Respons API bukan JSON yang valid");
    }
  }

  return {
    baseUrl: normalizedBaseUrl,
    apiKey,
    async createPayment<TResponse = unknown>(payload: CreatePaymentPayload) {
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        throw new Error("payload createPayment harus object non-array");
      }
      if (typeof payload.amount !== "number" || !Number.isInteger(payload.amount) || payload.amount <= 0) {
        throw new Error("payload.amount harus integer positif");
      }

      return request<TResponse>("/api/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async checkStatus<TResponse = unknown>(referenceId: string) {
      if (typeof referenceId !== "string" || !referenceId.trim()) {
        throw new Error("referenceId wajib diisi");
      }

      return request<TResponse>(`/api/status/${encodeURIComponent(referenceId.trim())}`, {
        method: "GET",
      });
    },
  };
}
