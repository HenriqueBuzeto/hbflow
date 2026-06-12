import { WhatsAppProvider, SendMessageResult, WebhookMessagePayload } from './whatsapp-provider.interface';

export class WhatsAppQrGatewayProvider implements WhatsAppProvider {
  private getApiConfig() {
    return {
      url: process.env.WHATSAPP_QR_GATEWAY_BASE_URL || process.env.EVOLUTION_API_URL || 'http://localhost:8080',
      apiKey: process.env.WHATSAPP_QR_GATEWAY_API_KEY || process.env.EVOLUTION_API_KEY || 'global_key',
      webhookSecret: process.env.WHATSAPP_QR_GATEWAY_WEBHOOK_SECRET || 'hbflow_qr_webhook_secret'
    };
  }

  async sendMessage(to: string, body: string, connection: any): Promise<SendMessageResult> {
    try {
      const instanceName = connection.instanceName;
      if (!instanceName) {
        return {
          messageId: '',
          status: 'failed',
          errorText: 'Parâmetro QR Gateway incompleto: Nome da instância ausente.'
        };
      }

      const { url, apiKey } = this.getApiConfig();
      const cleanPhone = to.replace(/\D/g, '');

      // Endpoint da Evolution API para envio de mensagens de texto
      const endpoint = `${url}/message/sendText/${instanceName}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: cleanPhone,
          options: {
            delay: 1200,
            presence: 'composing'
          },
          textMessage: {
            text: body
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          messageId: '',
          status: 'failed',
          errorText: data.message || `QR Gateway API Error: Status ${response.status}`
        };
      }

      // Evolution API retorna a mensagem criada
      const messageId = data.key?.id || data.id || '';
      return {
        messageId,
        status: 'sent'
      };
    } catch (error: any) {
      return {
        messageId: '',
        status: 'failed',
        errorText: error.message || 'Erro de rede ao enviar mensagem via QR Gateway.'
      };
    }
  }

  async validateWebhook(headers: Record<string, string>, bodyText: string, connection: any): Promise<boolean> {
    // A Evolution API envia uma chave secreta no header caso configurado (Ex: 'webhook-authorization' ou 'apikey')
    const authHeader = headers['webhook-authorization'] || headers['apikey'] || headers['authorization'];
    const expectedToken = connection.verifyToken || this.getApiConfig().webhookSecret;

    if (authHeader && expectedToken) {
      // Tratar Bearer token se necessário
      const cleanHeader = authHeader.replace(/^Bearer\s+/i, '');
      return cleanHeader === expectedToken;
    }
    return true; 
  }

  async processWebhook(body: any, connection: any): Promise<WebhookMessagePayload[] | null> {
    try {
      // Evolution API envia eventos do tipo "MESSAGES_UPSERT" ou "messages.upsert"
      const eventType = body.event || '';
      if (eventType !== 'messages.upsert' && eventType !== 'MESSAGES_UPSERT') {
        return null; // Apenas processa mensagens recebidas
      }

      // Validar se a mensagem pertence a esta instância
      if (body.instance !== connection.instanceName) {
        return null;
      }

      const messageData = body.data;
      if (!messageData || !messageData.key) {
        return null;
      }

      // Não processar mensagens enviadas pelo próprio atendente/número conectado
      if (messageData.key.fromMe) {
        return null;
      }

      // Extrair número do remetente
      const remoteJid = messageData.key.remoteJid || '';
      const cleanPhone = remoteJid.split('@')[0] || '';
      if (!cleanPhone || remoteJid.includes('@g.us')) {
        return null; // Ignorar mensagens de grupo
      }

      const senderPhone = `+${cleanPhone}`;
      const senderName = body.data.pushName || senderPhone;
      
      let messageBody = '';
      let messageType: WebhookMessagePayload['messageType'] = 'other';
      let mediaUrl: string | undefined;
      let mimeType: string | undefined;

      const messageContent = messageData.message;
      if (!messageContent) {
        return null;
      }

      // Obter conteúdo conforme o tipo de mensagem
      if (messageContent.conversation) {
        messageBody = messageContent.conversation;
        messageType = 'text';
      } else if (messageContent.extendedTextMessage) {
        messageBody = messageContent.extendedTextMessage.text || '';
        messageType = 'text';
      } else if (messageContent.imageMessage) {
        messageBody = '[Imagem]';
        messageType = 'image';
        mimeType = messageContent.imageMessage.mimetype;
      } else if (messageContent.audioMessage) {
        messageBody = '[Áudio]';
        messageType = 'audio';
        mimeType = messageContent.audioMessage.mimetype;
      } else if (messageContent.videoMessage) {
        messageBody = '[Vídeo]';
        messageType = 'video';
        mimeType = messageContent.videoMessage.mimetype;
      } else if (messageContent.documentMessage) {
        messageBody = messageContent.documentMessage.fileName || '[Documento]';
        messageType = 'document';
        mimeType = messageContent.documentMessage.mimetype;
      }

      return [{
        senderPhone,
        senderName,
        body: messageBody,
        messageType,
        providerMessageId: messageData.key.id,
        mediaUrl,
        mimeType
      }];
    } catch (error) {
      console.error('Erro ao processar webhook da Evolution API:', error);
      return null;
    }
  }

  // Métodos auxiliares para gerenciamento de instâncias na Evolution API
  async createInstance(instanceName: string): Promise<any> {
    const { url, apiKey } = this.getApiConfig();
    const webhookUrl = process.env.WHATSAPP_QR_GATEWAY_WEBHOOK_URL || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://host.docker.internal:3000'}/api/webhooks/whatsapp/qr`;

    const response = await fetch(`${url}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instanceName,
        token: apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        // Structure for v2 (nested settings and webhooks)
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
        },
        // Legacy/alternate formats for compatibility
        webhookUrl: webhookUrl,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
      })
    });
    return response.json();
  }

  async getQrCode(instanceName: string): Promise<any> {
    const { url, apiKey } = this.getApiConfig();
    const response = await fetch(`${url}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });
    return response.json();
  }

  async getStatus(instanceName: string): Promise<any> {
    const { url, apiKey } = this.getApiConfig();
    const response = await fetch(`${url}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });
    return response.json();
  }

  async logoutInstance(instanceName: string): Promise<any> {
    const { url, apiKey } = this.getApiConfig();
    const response = await fetch(`${url}/instance/logout/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey
      }
    });
    return response.json();
  }

  async reset(instanceName: string): Promise<any> {
    const { url, apiKey } = this.getApiConfig();
    const response = await fetch(`${url}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey
      }
    });
    return response.json();
  }
}
