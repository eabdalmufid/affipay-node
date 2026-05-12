# @affidev/affipay-node

Official TypeScript SDK untuk integrasi API Affipay Payment Gateway.

## Features

- Simple API client untuk membuat pembayaran dan cek status.
- Validasi input dasar agar integrasi lebih aman.
- `baseUrl` opsional, default ke `https://pay.affidev.com`.

## Installation

```bash
npm install @affidev/affipay-node
```

## Quick Start

```ts
import { createAffipayClient } from "@affidev/affipay-node";

const client = createAffipayClient({
  apiKey: "api_key_project_kamu",
  // baseUrl opsional, default: "https://pay.affidev.com"
});

const payment = await client.createPayment({
  amount: 10000,
  // field lain diteruskan apa adanya ke endpoint /api/create
});

const status = await client.checkStatus(payment.reference_id);
```

## API

### `createAffipayClient(options)`

Membuat instance client.

| Option | Type | Required | Default |
| --- | --- | --- | --- |
| `apiKey` | `string` | Ya | - |
| `baseUrl` | `string` | Tidak | `https://pay.affidev.com` |

### `client.createPayment(payload)`

Membuat transaksi pembayaran.

- `payload.amount` wajib berupa integer positif.
- Field lain di payload akan diteruskan ke API.

### `client.checkStatus(referenceId)`

Mengecek status transaksi berdasarkan `referenceId`.

## Repository

- Source: https://github.com/eabdalmufid/affipay-node
- Issues: https://github.com/eabdalmufid/affipay-node/issues

## License

[MIT](LICENSE)
