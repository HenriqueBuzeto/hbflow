import { prisma } from '../../db/prisma';
import { JourneyEngineService } from './journey-engine.service';

export class OptOutHandler {
  /**
   * Verifica se a mensagem de entrada é uma palavra-chave de opt-out.
   * Se for, desativa a jornada do cliente e cancela agendamentos futuros.
   */
  static async handleIncomingMessage(
    tenantId: string,
    contactId: string,
    textBody: string
  ): Promise<boolean> {
    if (!textBody) return false;

    const cleanMsg = textBody.trim().toUpperCase();
    const optOutWords = ['PARAR', 'SAIR', 'CANCELAR'];

    if (optOutWords.includes(cleanMsg)) {
      // 1. Marcar contato com marketingOptOut = true
      await prisma.contact.update({
        where: { id: contactId },
        data: { marketingOptOut: true }
      });

      // 2. Cancelar agendamentos e jornadas do contato
      await JourneyEngineService.cancelAllForContact(tenantId, contactId);

      // 3. Registrar auditoria do opt-out
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'contact.opt_out',
          entity: 'contact',
          entityId: contactId,
          metadata: {
            reason: cleanMsg
          }
        }
      });

      // 4. Inserir log no console ou log de sistema
      console.log(`[Opt-Out] Contato ${contactId} do inquilino ${tenantId} solicitou cancelamento via palavra-chave: ${cleanMsg}`);
      return true;
    }

    return false;
  }
}
