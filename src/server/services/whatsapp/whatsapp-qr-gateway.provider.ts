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
          text: body,
          options: {
            delay: 1200,
            presence: 'composing'
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

  async sendButtons(
    to: string,
    body: string,
    buttons: string[],
    connection: any
  ): Promise<SendMessageResult> {
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

      // Endpoint da Evolution API para envio de botões
      const endpoint = `${url}/message/sendButtons/${instanceName}`;
      
      const payloadButtons = buttons.map((btn, index) => ({
        type: 'reply',
        reply: {
          id: `btn-${index + 1}`,
          title: btn
        }
      }));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: cleanPhone,
          title: '',
          description: body,
          footer: '',
          buttons: payloadButtons
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          messageId: '',
          status: 'failed',
          errorText: data.message || `QR Gateway Button API Error: Status ${response.status}`
        };
      }

      const messageId = data.key?.id || data.id || '';
      return {
        messageId,
        status: 'sent'
      };
    } catch (error: any) {
      return {
        messageId: '',
        status: 'failed',
        errorText: error.message || 'Erro de rede ao enviar botões via QR Gateway.'
      };
    }
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    mimeType: string,
    mediaType: string,
    fileName: string,
    caption: string,
    connection: any
  ): Promise<SendMessageResult> {
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

      // Extrair o base64 bruto sem o prefixo Data URI
      const base64Parts = mediaUrl.split(';base64,');
      const base64Data = base64Parts.pop() || '';

      // Se for WebP ou tipo sticker, enviar como figurinha
      const isSticker = mimeType === 'image/webp' || mediaType === 'sticker';
      const endpoint = isSticker 
        ? `${url}/message/sendSticker/${instanceName}`
        : `${url}/message/sendMedia/${instanceName}`;
      
      const payloadBody = isSticker
        ? {
            number: cleanPhone,
            sticker: base64Data
          }
        : {
            number: cleanPhone,
            mediatype: mediaType === 'document' ? 'document' : mediaType === 'video' ? 'video' : mediaType === 'audio' ? 'audio' : 'image',
            mimetype: mimeType,
            media: base64Data,
            fileName: fileName || 'arquivo',
            caption: caption || ''
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadBody)
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        return {
          messageId: '',
          status: 'failed',
          errorText: data.message || `Erro do QR Gateway ao enviar mídia: Status ${response.status}`
        };
      }

      const messageId = data.key?.id || data.id || '';
      return {
        messageId,
        status: 'sent'
      };
    } catch (error: any) {
      return {
        messageId: '',
        status: 'failed',
        errorText: error.message || 'Erro de rede ao enviar mídia via QR Gateway.'
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
      // Evolution API envia eventos do tipo "MESSAGES_UPSERT" ou "messages.upsert", e para histórico "messages.set" ou "MESSAGES_SET"
      const eventType = body.event || '';
      const isUpsert = eventType === 'messages.upsert' || eventType === 'MESSAGES_UPSERT';
      const isSet = eventType === 'messages.set' || eventType === 'MESSAGES_SET';

      if (!isUpsert && !isSet) {
        return null; // Apenas processa mensagens recebidas ou histórico
      }

      // Validar se a mensagem pertence a esta instância
      if (body.instance !== connection.instanceName) {
        return null;
      }

      // Extrair mensagens brutas dependendo do evento
      let rawMessages: any[] = [];
      if (isUpsert) {
        if (body.data) {
          rawMessages = [body.data];
        }
      } else if (isSet) {
        if (body.data && Array.isArray(body.data.messages)) {
          rawMessages = body.data.messages;
        }
      }

      if (rawMessages.length === 0) {
        return null;
      }

      const payloads: WebhookMessagePayload[] = [];

      for (const messageData of rawMessages) {
        if (!messageData || !messageData.key) {
          continue;
        }

        const fromMe = !!messageData.key.fromMe;

        // Extrair número do remetente
        const remoteJid = messageData.key.remoteJid || '';
        const cleanPhone = remoteJid.split('@')[0] || '';
        if (!cleanPhone || remoteJid.includes('@g.us')) {
          continue; // Ignorar mensagens de grupo
        }

        const senderPhone = `+${cleanPhone}`;
        const senderName = fromMe ? senderPhone : (messageData.pushName || body.data?.pushName || senderPhone);
        
        let messageBody = '';
        let messageType: WebhookMessagePayload['messageType'] = 'other';
        let mediaUrl: string | undefined;
        let mimeType: string | undefined;

        const messageContent = messageData.message;
        if (!messageContent) {
          continue;
        }

        // Obter conteúdo conforme o tipo de mensagem
        if (messageContent.conversation) {
          messageBody = messageContent.conversation;
          messageType = 'text';
        } else if (messageContent.extendedTextMessage) {
          messageBody = messageContent.extendedTextMessage.text || '';
          messageType = 'text';
        } else if (messageContent.imageMessage) {
          messageBody = messageContent.imageMessage.caption || '[Imagem]';
          messageType = 'image';
          mimeType = messageContent.imageMessage.mimetype;
        } else if (messageContent.audioMessage) {
          messageBody = '[Áudio]';
          messageType = 'audio';
          mimeType = messageContent.audioMessage.mimetype;
        } else if (messageContent.videoMessage) {
          messageBody = messageContent.videoMessage.caption || '[Vídeo]';
          messageType = 'video';
          mimeType = messageContent.videoMessage.mimetype;
        } else if (messageContent.documentMessage) {
          messageBody = messageContent.documentMessage.fileName || '[Documento]';
          messageType = 'document';
          mimeType = messageContent.documentMessage.mimetype;
        } else if (messageContent.buttonsResponseMessage) {
          messageBody = messageContent.buttonsResponseMessage.selectedDisplayText || '';
          messageType = 'text';
        } else if (messageContent.templateButtonReplyMessage) {
          messageBody = messageContent.templateButtonReplyMessage.selectedDisplayText || '';
          messageType = 'text';
        } else if (messageContent.listResponseMessage) {
          messageBody = messageContent.listResponseMessage.title || '';
          messageType = 'text';
        } else if (messageContent.stickerMessage) {
          messageBody = '[Figurinha]';
          messageType = 'image';
          mimeType = messageContent.stickerMessage.mimetype || 'image/webp';
        }

        // Baixar mídia se disponível para tipos suportados
        const messageId = messageData.key.id;
        if (['image', 'audio', 'video', 'document'].includes(messageType) && messageId) {
          try {
            const { url, apiKey } = this.getApiConfig();
            const endpoint = `${url}/chat/getBase64FromMediaMessage/${connection.instanceName}`;
            
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: {
                  key: {
                    id: messageId
                  }
                },
                convertToMp4: false
              })
            });

            if (response.ok) {
              const resData = (await response.json()) as any;
              if (resData && resData.base64) {
                const detectedMime = resData.mimetype || mimeType || 'application/octet-stream';
                mediaUrl = `data:${detectedMime};base64,${resData.base64}`;
                if (resData.mimetype) {
                  mimeType = resData.mimetype;
                }
              }
            } else {
              console.error(`Falha ao buscar mídia do QR Gateway. Status: ${response.status}`);
            }
          } catch (mediaError) {
            console.error('Erro ao baixar mídia do QR Gateway:', mediaError);
          }
        }

        payloads.push({
          senderPhone,
          senderName,
          body: messageBody,
          messageType,
          providerMessageId: messageData.key.id,
          mediaUrl,
          mimeType,
          fromMe
        });
      }

      return payloads.length > 0 ? payloads : null;
    } catch (error) {
      console.error('Erro ao processar webhook da Evolution API:', error);
      return null;
    }
  }

  // Métodos auxiliares para gerenciamento de instâncias na Evolution API
  async createInstance(instanceName: string): Promise<any> {
    const { url, apiKey, webhookSecret } = this.getApiConfig();
    let webhookUrl = process.env.WHATSAPP_QR_GATEWAY_WEBHOOK_URL || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://host.docker.internal:3000'}/api/webhooks/whatsapp/qr`;

    if (webhookUrl.includes('localhost:3000')) {
      webhookUrl = webhookUrl.replace('localhost:3000', 'host.docker.internal:3000');
    } else if (webhookUrl.includes('127.0.0.1:3000')) {
      webhookUrl = webhookUrl.replace('127.0.0.1:3000', 'host.docker.internal:3000');
    }

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
        settings: {
          syncFullHistory: true
        },
        // Structure for v2 (nested settings and webhooks)
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          headers: {
            'webhook-authorization': webhookSecret
          },
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_SET']
        },
        // Legacy/alternate formats for compatibility
        webhookUrl: webhookUrl,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_SET']
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
