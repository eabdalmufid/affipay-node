# @affidev/affipay-node

Official SDK untuk integrasi API Affipay Payment Gateway (QRIS). Bisa digunakan di **Node.js (>= 18)** baik dengan **TypeScript** maupun **JavaScript (ESM)**.

## Features

- **Typed Response**: Autocomplete otomatis untuk TypeScript & JavaScript.
- **Modern**: Menggunakan native Fetch API, ringan tanpa dependensi eksternal.
- **Secure**: Validasi input dasar sebelum mengirim request ke API.

## Installation

```bash
npm install @affidev/affipay-node
```

## Quick Start

### TypeScript / JavaScript (ESM)
```javascript
import { createAffipayClient } from "@affidev/affipay-node";

const client = createAffipayClient({
  apiKey: "api_key_project_kamu",
});

try {
  // 1. Membuat Transaksi QRIS
  const payment = await client.createPayment({
    amount: 50000,
  });
  console.log("QRIS String:", payment.qris_string);
  console.log("Total Bayar:", payment.total); // Nominal + unique fee

  // 2. Cek Status
  const status = await client.checkStatus(payment.reference_id);
  console.log("Status:", status.status); // pending, paid, expired
} catch (error) {
  console.error("Error:", error.message);
}
```

## API Reference

### `createAffipayClient(options)`
Membuat instance client.

| Option | Type | Required | Default |
| --- | --- | --- | --- |
| `apiKey` | `string` | Ya | - |
| `baseUrl` | `string` | Tidak | `https://pay.affidev.com` |

### `client.createPayment(payload)`
Mengembalikan `Promise<CreatePaymentResponse>`.
- `payload.amount`: (Wajib) Integer positif.

**Response Structure (`CreatePaymentResponse`):**
- `reference_id` (string): Kode referensi transaksi.
- `amount` (number): Nominal dasar transaksi.
- `fee` (number): Biaya layanan (MDR 0.7%).
- `unique_code` (number): Kode unik transaksi (+ / -).
- `total` (number): Total yang harus dibayar oleh pembeli.
- `net_amount` (number): Bersih yang didapat oleh merchant setelah potongan.
- `qris_string` (string): QRIS payload string.
- `expired_at` (string): Waktu kadaluarsa transaksi.
- `fee_merchant` (boolean): Apakah merchant menanggung biaya.

### `client.checkStatus(referenceId)`
Mengembalikan `Promise<CheckStatusResponse>`.
Mengecek status transaksi berdasarkan `referenceId`.

**Response Structure (`CheckStatusResponse`):**
- `reference_id` (string): Kode referensi transaksi.
- `amount` (number): Nominal dasar transaksi.
- `fee` (number): Biaya layanan (MDR 0.7%).
- `unique_code` (number): Kode unik transaksi.
- `total` (number): Total yang dibayar.
- `net_amount` (number): Bersih yang didapat merchant.
- `qris_string` (string): QRIS payload string.
- `status` (string): `'pending' | 'paid' | 'expired' | 'demo'`.
- `created_at` (string): Waktu pembuatan.
- `expired_at` (string): Waktu kadaluarsa.
- `paid_at` (string | null): Waktu pembayaran (jika sukses).
- `fee_merchant` (boolean): Apakah merchant menanggung biaya.

## Webhook / Callback

Anda bisa menggunakan interface `AffipayWebhookPayload` untuk menangani callback di server Anda:

```typescript
// Contoh dengan Express (TypeScript)
import { AffipayWebhookPayload } from "@affidev/affipay-node";

app.post('/webhook', (req, res) => {
  const data = req.body as AffipayWebhookPayload;

  if (data.status === 'paid') {
    console.log('Pembayaran Berhasil:', data.reference_id);
  }
  
  res.json({ ok: true });
});
```

## Repository

- Source: https://github.com/eabdalmufid/affipay-node
- Issues: https://github.com/eabdalmufid/affipay-node/issues

## License

[MIT](LICENSE)
