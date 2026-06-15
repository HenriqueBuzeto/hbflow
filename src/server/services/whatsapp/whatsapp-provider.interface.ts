export interface SendMessageResult {
  messageId: string;
  status: 'sent' | 'failed';
  errorText?: string;
}

export interface WebhookMessagePayload {
  senderPhone: string;
  senderName: string;
  body: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'other';
  providerMessageId: string;
  mediaUrl?: string;
  mimeType?: string;
  fromMe?: boolean;
}

export interface WhatsAppProvider {
  sendMessage(to: string, body: string, connection: any): Promise<SendMessageResult>;
  validateWebhook(headers: Record<string, string>, bodyText: string, connection: any): Promise<boolean>;
  processWebhook(body: any, connection: any): Promise<WebhookMessagePayload[] | null>;
  sendMedia?(
    to: string,
    mediaUrl: string,
    mimeType: string,
    mediaType: string,
    fileName: string,
    caption: string,
    connection: any
  ): Promise<SendMessageResult>;
}
