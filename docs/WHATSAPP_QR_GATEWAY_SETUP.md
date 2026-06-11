# WhatsApp QR Code Connection Gateway (Evolution API) Setup Guide

This guide describes how to configure, run, and maintain a local Evolution API (Baileys) setup as a QR connection gateway for **HBFlow** internal pilot testing.

---

## 1. Gateway Prerequisites & Architecture

The WhatsApp QR Code connection uses the **Evolution API**, which interfaces directly with WhatsApp via Baileys (a reverse-engineered WhatsApp Web library).

```
                        +----------------------+
                        |    Evolution API     |
                        | (Docker / port 8080) |
                        +----------+-----------+
                                   ^
                                   | HTTP REST API calls
                                   v
+------------------+    +----------+-----------+
| WhatsApp Personal|    |        HBFlow        |
| / Business Phone |<==>|  (Next.js App / 3000)|
+------------------+    +----------+-----------+
                                   ^
                                   | Webhook Events (MESSAGES_UPSERT, connection.update)
                                   v
                        +----------------------+
                        |   Webhook Receiver   |
                        |  (api/webhooks/qr)   |
                        +----------------------+
```

---

## 2. Evolution API Local Setup via Docker

Create a local `docker-compose.yml` configuration (we suggest creating this in a dedicated directory or alongside the root of the project for developmental testing):

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendare/evolution-api:latest
    container_name: evolution_api
    ports:
      - "8080:8080"
    environment:
      - SERVER_PORT=8080
      - SERVER_TYPE=http
      - SERVER_URL=http://localhost:8080
      # API Key authentication to protect the gateway
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=evolution_gateway_api_key_secret_123
      # Enable local session store
      - STORE_TYPE=DATABASE
      - STORE_LOCATION=local
      # Configure databases if scaling, otherwise local SQlite is used by default inside the container
      - DATABASE_ENABLED=false
      # QR settings
      - QR_LIMIT=20
      - QR_COLOR=#7C3AED
      # Webhooks configuration
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=http://host.docker.internal:3000/api/webhooks/whatsapp/qr
      - WEBHOOK_GLOBAL_HEADERS_WEBHOOK_AUTHORIZATION=hbflow_qr_webhook_secret
      - WEBHOOK_EVENTS_APPLICATION_STATUS_CONNECTED=true
      - WEBHOOK_EVENTS_APPLICATION_STATUS_DISCONNECTED=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true
      - WEBHOOK_EVENTS_QRCODE_UPDATED=true
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
    volumes:
      - evolution_instances:/evolution/instances

volumes:
  evolution_instances:
```

### Starting the Gateway
Run the following command on your terminal to spin up the container:
```bash
docker compose up -d
```

---

## 3. HBFlow Environment Configuration

Update your root `.env` or `.env.local` to enable the QR gateway integration:

```env
# Enable the QR Code Provider Tab in Frontend & API Gateways
WHATSAPP_QR_GATEWAY_ENABLED=true

# Gateway Target URL
WHATSAPP_QR_GATEWAY_URL=http://localhost:8080

# The API Authentication key matching Evolution's AUTHENTICATION_API_KEY
WHATSAPP_QR_GATEWAY_API_KEY=evolution_gateway_api_key_secret_123

# Secret Token matched by Webhook events arriving from the gateway
WHATSAPP_QR_GATEWAY_WEBHOOK_SECRET=hbflow_qr_webhook_secret
```

---

## 4. Hooking Up Webhooks

Evolution API transmits real-time incoming messages and session updates via Webhooks.

1. **Local webhook testing**: When developing locally, Evolution API running inside Docker needs to send webhooks to your local Next.js server. Use `http://host.docker.internal:3000/api/webhooks/whatsapp/qr` (if running Docker under Windows/macOS) or use an **ngrok** tunnel:
   ```bash
   ngrok http 3000
   ```
   If using ngrok, update `WEBHOOK_GLOBAL_URL` in the docker configuration to:
   `https://<YOUR_NGROK_SUBDOMAIN>.ngrok-free.app/api/webhooks/whatsapp/qr`

2. **Security**: Webhook events sent to `/api/webhooks/whatsapp/qr` will match the `webhook-authorization` header against the token specified in `WHATSAPP_QR_GATEWAY_WEBHOOK_SECRET`.

---

## 5. UI Operational Workflow

Go to the **Canais** page (`/conexao`):

1. **Select QR Code Tab**: Toggle the "QR Code (Piloto)" tab on the top right.
2. **Generate QR**: Input your connection display name and click **Gerar QR Code**. This commands Evolution API to register a unique multi-tenant sandbox session.
3. **Scan QR**: Use your phone (WhatsApp > Linked Devices > Link a Device) to scan the generated code.
4. **Interactive Sandbox Simulation**: If your Docker instance is offline, click **Simular Leitura (Ok)** to dispatch a mock webhook event to local receiver routes and mock active connectivity state.
5. **Test outbound messages**: Use the **Teste de Envio** button to verify message routing to any destination number.
6. **Disconnect / Reset**: Log out of the session or completely wipe instance records to provision a fresh connection.
