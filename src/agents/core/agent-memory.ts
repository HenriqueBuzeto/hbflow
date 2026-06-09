export interface MessageContext {
  senderType: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export const getConversationHistoryPrompt = (messages: MessageContext[], maxMessages = 15): string => {
  const recentMessages = messages.slice(-maxMessages);
  return recentMessages
    .map((m) => {
      const sender = m.senderType === 'contact' ? 'Cliente' : m.senderType === 'user' ? `Agente (${m.senderName})` : m.senderName;
      return `${sender}: ${m.body}`;
    })
    .join('\n');
};

export const getContactProfileContext = (contact: any): string => {
  if (!contact) return "Nenhum perfil de contato disponível.";
  return `Nome: ${contact.name}
Telefone: ${contact.phone}
Etiquetas: ${contact.tags?.join(', ') || 'Nenhuma'}
Notas CRM: ${contact.notes || 'Nenhuma'}
Score Atual: ${contact.score || 0}`;
};
