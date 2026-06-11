import { WhatsAppProvider, SendMessageResult, WebhookMessagePayload } from './whatsapp-provider.interface';
import crypto from 'crypto';

export class WhatsAppCloudProvider implements WhatsAppProvider {
  async sendMessage(to: string, body: string, connection: any): Promise<SendMessageResult> {
    try {
      const phoneNumberId = connection.phoneNumberId;
      const accessToken = connection.accessTokenEnc; // In production this would be decrypted

      if (!phoneNumberId || !accessToken) {
        return {
          messageId: '',
          status: 'failed',
          errorText: 'Parâmetros Cloud API incompletos: Phone Number ID ou Access Token ausente.'
        };
      }

      // Limpar número (deve estar com o DDI, Ex: 5511999998888)
      const cleanPhone = to.replace(/\D/g, '');

      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: body }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          messageId: '',
          status: 'failed',
          errorText: data.error?.message || `Cloud API Error: Status ${response.status}`
        };
      }

      const messageId = data.messages?.[0]?.id || '';
      return {
        messageId,
        status: 'sent'
      };
    } catch (error: any) {
      return {
        messageId: '',
        status: 'failed',
        errorText: error.message || 'Erro de rede ao enviar mensagem para a Cloud API.'
      };
    }
  }

  async validateWebhook(headers: Record<string, string>, bodyText: string, connection: any): Promise<boolean> {
    const signature = headers['x-hub-signature-256'];
    const webhookSecret = connection.webhookSecret;

    if (!webhookSecret || !signature) {
      // Se não houver segredo cadastrado para validação rigorosa, valida por token ou aceita
      return true;
    }

    try {
      const elements = signature.split('=');
      const signatureHash = elements[1];
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('hex');

      return signatureHash === expectedHash;
    } catch (e) {
      console.error('Falha na validação de assinatura do webhook Cloud API:', e);
      return false;
    }
  }

  async processWebhook(body: any, connection: any): Promise<WebhookMessagePayload[] | null> {
    try {
      if (body.object !== 'whatsapp_business_account') {
        return null;
      }

      const results: WebhookMessagePayload[] = [];
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== 'messages') continue;

          const value = change.value || {};
          const messages = value.messages || [];
          const contacts = value.contacts || [];

          for (const msg of messages) {
            // Apenas processar mensagens de entrada enviadas por clientes (não do próprio bot/atendente)
            if (msg.from) {
              const contactInfo = contacts.find((c: any) => c.wa_id === msg.from);
              const senderName = contactInfo?.profile?.name || msg.from;
              
              let messageBody = '';
              let messageType: WebhookMessagePayload['messageType'] = 'other';

              if (msg.type === 'text') {
                messageBody = msg.text?.body || '';
                messageType = 'text';
              } else if (msg.type === 'image') {
                messageBody = '[Imagem]';
                messageType = 'image';
              } else if (msg.type === 'audio') {
                messageBody = '[Áudio]';
                messageType = 'audio';
              } else if (msg.type === 'video') {
                messageBody = '[Vídeo]';
                messageType = 'video';
              } else if (msg.type === 'document') {
                messageBody = msg.document?.filename || '[Documento]';
                messageType = 'document';
              }

              results.push({
                senderPhone: `+${msg.from}`,
                senderName,
                body: messageBody,
                messageType,
                providerMessageId: msg.id,
                mediaUrl: msg[msg.type]?.id ? `media://cloud/${msg[msg.type].id}` : undefined,
                mimeType: msg[msg.type]?.mime_type || undefined
              });
            }
          }
        }
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      console.error('Erro ao processar webhook da Cloud API:', error);
      return null;
    }
  }
}
