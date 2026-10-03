# @affidev/affipay

Official SDK untuk integrasi API Affipay Payment Gateway (QRIS). Standar payment gateway modern yang sangat **simpel, cepat, dan mudah** digunakan oleh para developer di Node.js (>= 18), TypeScript, maupun JavaScript.

## Fitur Utama

- **Endpoint Standar & Simpel**: Menggunakan endpoint resmi `/api/create`, `/api/status/:reference_id`, `/api/cancel/:reference_id`, dan `/api/qr/:reference_id.png`.
- **Standar Payment Gateway**: Mendukung referensi invoice merchant (`order_id`) dan proteksi idempotensi (`idempotency_key`).
- **HMAC-SHA256 Webhook Verification**: Proteksi keamanan callback bawaan dengan `verifyWebhook()`.
- **Langsung Siap Pakai**: Mengembalikan `checkout_url` (halaman pembayaran) dan `qr_code_url` (gambar PNG QRIS siap tampil).

## Instalasi

```bash
npm install @affidev/affipay
```

## Quick Start

```typescript
import { createAffipayClient } from "@affidev/affipay";

const affipay = createAffipayClient({
  apiKey: "YOUR_AFFIPAY_API_KEY",
  // baseUrl: "https://pay.affidev.com", // Opsional, default: https://pay.affidev.com
});

// 1. Buat Transaksi QRIS Baru
const payment = await affipay.createPayment({
  amount: 50000,
  order_id: "INV-2026-001", // Opsional: ID pesanan sistem toko Anda
  idempotency_key: "req-abc-123", // Opsional: Mencegah tagihan ganda saat retry jaringan
});

console.log("Kode Referensi:", payment.reference_id);
console.log("Total Bayar:", payment.total);
console.log("QRIS String:", payment.qris_string);
console.log("URL Gambar QR (PNG):", payment.qr_code_url);
console.log("Link Checkout:", payment.checkout_url);

// 2. Cek Status Pembayaran (menggunakan reference_id unik)
const status = await affipay.checkStatus(payment.reference_id);
console.log("Status Pembayaran:", status.status); // "pending" | "paid" | "expired" | "cancelled"

// 3. Batalkan Transaksi Pending (jika pesanan dibatalkan pembeli)
// const cancelResult = await affipay.cancelPayment(payment.reference_id);
// console.log(cancelResult.message);
```

## Callback Webhook & Verifikasi Signature

Affipay mengirimkan HTTP POST secara real-time ke URL Webhook yang Anda daftarkan di dashboard setiap kali pembayaran berhasil lunas (`paid`) atau kedaluwarsa (`expired`), disertai header tanda tangan `X-Affipay-Signature`.

Gunakan SDK untuk memvalidasi keaslian webhook secara aman:

```typescript
import express from "express";
import { createAffipayClient } from "@affidev/affipay";

const app = express();
app.use(express.json());

const affipay = createAffipayClient({
  apiKey: process.env.AFFIPAY_API_KEY!,
});

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-affipay-signature"] as string;
  const rawBody = JSON.stringify(req.body);

  // Verifikasi keaslian signature webhook menggunakan Webhook Secret atau API Key
  const isValid = affipay.verifyWebhook(rawBody, signature, process.env.AFFIPAY_WEBHOOK_SECRET);
  if (!isValid) {
    return res.status(403).send("Invalid signature");
  }

  const { status, reference_id, order_id, amount } = req.body;

  if (status === "paid") {
    console.log(`Order ${order_id || reference_id} sebesar Rp ${amount} telah lunas!`);
    // Lakukan proses pemenuhan pesanan (misal: aktifkan akun, kirim voucher)
  }

  res.status(200).send("OK");
});

app.listen(3000, () => console.log("Webhook server running on port 3000"));
```

## Referensi API SDK

| Metode | HTTP Target | Deskripsi |
| :--- | :--- | :--- |
| `createPayment(payload)` | `POST /api/create` | Membuat tagihan QRIS dinamis baru dengan nominal, kode unik, & QR string. |
| `checkStatus(referenceId)` | `GET /api/status/:reference_id` | Mengecek status transaksi terkini berdasarkan reference ID unik. |
| `getPayment(referenceId)` | `GET /api/status/:reference_id` | Alias untuk `checkStatus()`. |
| `cancelPayment(referenceId)` | `POST /api/cancel/:reference_id` | Membatalkan transaksi pending berdasarkan reference ID unik. |
| `getCheckoutUrl(referenceId)` | — | Mendapatkan URL halaman checkout langsung untuk reference ID tertentu. |
| `getQrCodeUrl(referenceId)` | — | Mendapatkan URL langsung gambar PNG QRIS untuk reference ID tertentu. |
| `verifyWebhook(rawBody, sig, secret?)` | — | Memvalidasi HMAC-SHA256 signature dari header `X-Affipay-Signature`. |

## TypeScript Interfaces

```typescript
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
```

## Lisensi
MIT
