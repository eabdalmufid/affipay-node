import crypto from "node:crypto";
import { Buffer } from "node:buffer";

export interface AffipayClientOptions {
  baseUrl?: string;
  apiKey: string;
}

export type AffipayStatus = "pending" | "paid" | "expired" | "demo" | "cancelled";

export interface CreatePaymentPayload {
  amount: number;
  order_id?: string;
  idempotency_key?: string;
}

export interface PaymentResponse {
  status: AffipayStatus;
  reference_id: string;
  external_id?: string;
  order_id?: string | null;
  amount: number;
  fee: number;
  unique_code: number;
  total: number;
  net_amount: number;
  qris_string: string;
  checkout_url: string;
  qr_code_url: string;
  created_at?: string;
  expired_at: string;
  paid_at?: string | null;
}

export interface CancelPaymentResponse {
  status: AffipayStatus | string;
  reference_id: string;
  order_id?: string | null;
  message: string;
}

export type CreatePaymentResponse = PaymentResponse;
export type CheckStatusResponse = PaymentResponse;

export interface AffipayWebhookPayload {
  event?: "payment.paid" | "payment.expired" | "payment.cancelled" | string;
  status: AffipayStatus;
  amount: number;
  reference_id: string;
  order_id?: string | null;
  paid_at?: string;
  expired_at?: string;
  cancelled_at?: string;
}

export class AffipayError extends Error {
  statusCode: number;
  statusText: string;
  responseBody?: unknown;

  constructor(message: string, statusCode: number, statusText: string, responseBody?: unknown) {
    super(message);
    this.name = "AffipayError";
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.responseBody = responseBody;
  }
}

export interface AffipayClient {
  baseUrl: string;
  apiKey: string;

  /**
   * Create dynamic QRIS payment using POST /api/create
   */
  createPayment<TResponse = CreatePaymentResponse>(payload: CreatePaymentPayload): Promise<TResponse>;

  /**
   * Check payment status by reference_id using GET /api/status/:reference_id
   */
  checkStatus<TResponse = CheckStatusResponse>(referenceId: string): Promise<TResponse>;

  /**
   * Alias for checkStatus
   */
  getPayment<TResponse = CheckStatusResponse>(referenceId: string): Promise<TResponse>;

  /**
   * Cancel pending payment using POST /api/cancel/:reference_id
   */
  cancelPayment<TResponse = CancelPaymentResponse>(referenceId: string): Promise<TResponse>;

  /**
   * Get direct checkout URL for a reference_id
   */
  getCheckoutUrl(referenceId: string): string;

  /**
   * Get direct QR code image URL (PNG) for a reference_id
   */
  getQrCodeUrl(referenceId: string): string;

  /**
   * Verify HMAC-SHA256 signature from X-Affipay-Signature header
   */
  verifyWebhook(rawBody: string | Buffer | Record<string, unknown>, signature: string, secret?: string): boolean;
}

const DEFAULT_BASE_URL = "https://pay.affidev.com";
const MIN_PAYMENT_AMOUNT = 1000;
const MAX_PAYMENT_AMOUNT = 10000000;

export function verifyWebhookSignature(
  rawBody: string | Buffer | Record<string, unknown>,
  signature: string,
  apiKeyOrSecret: string
): boolean {
  if (!signature || !apiKeyOrSecret) return false;

  let bodyBuffer: Buffer;
  if (Buffer.isBuffer(rawBody)) {
    bodyBuffer = rawBody;
  } else if (typeof rawBody === "object" && rawBody !== null) {
    bodyBuffer = Buffer.from(JSON.stringify(rawBody), "utf8");
  } else if (typeof rawBody === "string") {
    bodyBuffer = Buffer.from(rawBody, "utf8");
  } else {
    return false;
  }

  const cleanSignature = signature.trim().toLowerCase();
  const hmac = crypto.createHmac("sha256", apiKeyOrSecret).update(bodyBuffer).digest("hex");
  const a = Buffer.from(hmac, "utf8");
  const b = Buffer.from(cleanSignature, "utf8");

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createAffipayClient({ baseUrl = DEFAULT_BASE_URL, apiKey }: AffipayClientOptions): AffipayClient {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new Error("baseUrl harus string valid");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("apiKey wajib diisi");
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  async function request<TResponse>(endpoint: string, init: RequestInit): Promise<TResponse> {
    const url = `${normalizedBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request gagal (${response.status} ${response.statusText})`;
      let parsedBody: unknown = undefined;

      try {
        const text = await response.text();
        try {
          parsedBody = JSON.parse(text);
          if (parsedBody && typeof parsedBody === "object" && "error" in parsedBody) {
            errorMessage = String((parsedBody as { error: unknown }).error);
          } else {
            errorMessage = `${errorMessage}: ${text}`;
          }
        } catch {
          if (text) errorMessage = `${errorMessage}: ${text}`;
        }
      } catch {
        // ignore
      }

      throw new AffipayError(errorMessage, response.status, response.statusText, parsedBody);
    }

    try {
      return (await response.json()) as TResponse;
    } catch {
      throw new AffipayError("Respons API bukan JSON yang valid", response.status, response.statusText);
    }
  }

  return {
    baseUrl: normalizedBaseUrl,
    apiKey,

    async createPayment<TResponse = CreatePaymentResponse>(payload: CreatePaymentPayload) {
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        throw new Error("payload createPayment harus object non-array");
      }
      if (typeof payload.amount !== "number" || !Number.isInteger(payload.amount)) {
        throw new Error("payload.amount harus berupa bilangan bulat (integer)");
      }
      if (payload.amount < MIN_PAYMENT_AMOUNT) {
        throw new Error(`payload.amount minimal adalah ${MIN_PAYMENT_AMOUNT}`);
      }
      if (payload.amount > MAX_PAYMENT_AMOUNT) {
        throw new Error(`payload.amount maksimal adalah ${MAX_PAYMENT_AMOUNT}`);
      }

      const headers: Record<string, string> = {};
      if (payload.idempotency_key) {
        headers["Idempotency-Key"] = payload.idempotency_key;
      }

      return request<TResponse>("/api/create", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },

    async checkStatus<TResponse = CheckStatusResponse>(referenceId: string) {
      if (!referenceId?.trim()) {
        throw new Error("referenceId wajib diisi");
      }
      return request<TResponse>(`/api/status/${encodeURIComponent(referenceId.trim())}`, {
        method: "GET",
      });
    },

    async getPayment<TResponse = CheckStatusResponse>(referenceId: string) {
      return this.checkStatus<TResponse>(referenceId);
    },

    async cancelPayment<TResponse = CancelPaymentResponse>(referenceId: string) {
      if (!referenceId?.trim()) {
        throw new Error("referenceId wajib diisi");
      }
      return request<TResponse>(`/api/cancel/${encodeURIComponent(referenceId.trim())}`, {
        method: "POST",
      });
    },

    getCheckoutUrl(referenceId: string) {
      if (!referenceId?.trim()) {
        throw new Error("referenceId wajib diisi");
      }
      return `${normalizedBaseUrl}/pay/${encodeURIComponent(referenceId.trim())}`;
    },

    getQrCodeUrl(referenceId: string) {
      if (!referenceId?.trim()) {
        throw new Error("referenceId wajib diisi");
      }
      return `${normalizedBaseUrl}/api/qr/${encodeURIComponent(referenceId.trim())}.png`;
    },

    verifyWebhook(rawBody: string | Buffer | Record<string, unknown>, signature: string, secret?: string): boolean {
      return verifyWebhookSignature(rawBody, signature, secret || apiKey);
    },
  };
}

export default createAffipayClient;
