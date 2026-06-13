import { prisma } from '@/server/db/prisma';

export class ContactsSyncService {
  /**
   * Fetches all contacts from the WhatsApp QR Gateway (Evolution API)
   * and saves/merges them into the local database.
   */
  static async syncContacts(tenantId: string, instanceName: string): Promise<void> {
    try {
      const baseUrl = process.env.WHATSAPP_QR_GATEWAY_BASE_URL || process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const apiKey = process.env.WHATSAPP_QR_GATEWAY_API_KEY || process.env.EVOLUTION_API_KEY || 'global_key';

      console.log(`[ContactsSync] Starting contact sync for tenant ${tenantId}, instance ${instanceName}...`);

      const endpoint = `${baseUrl}/chat/findContacts/${instanceName}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          where: {}
        })
      });

      if (!response.ok) {
        console.error(`[ContactsSync] Gateway returned status ${response.status} for findContacts`);
        return;
      }

      const contactsArray = await response.json();
      if (!Array.isArray(contactsArray)) {
        console.warn('[ContactsSync] Evolution API did not return an array of contacts:', contactsArray);
        return;
      }

      console.log(`[ContactsSync] Downloaded ${contactsArray.length} items from gateway.`);

      let createdCount = 0;
      let ignoredCount = 0;

      for (const item of contactsArray) {
        const remoteJid = item.remoteJid || item.id || '';
        
        // Ignore group conversations (remoteJids containing @g.us)
        if (!remoteJid || remoteJid.includes('@g.us')) {
          ignoredCount++;
          continue;
        }

        // Normalize phone number (extract digits only)
        const cleanPhone = remoteJid.split('@')[0] || '';
        const normalizedPhone = cleanPhone.replace(/\D/g, '');

        if (!normalizedPhone) {
          ignoredCount++;
          continue;
        }

        const phone = `+${normalizedPhone}`;
        const name = item.pushName || item.verifiedName || phone;

        // Idempotently locate or create the contact in database
        const existing = await prisma.contact.findFirst({
          where: {
            tenantId,
            normalizedPhone
          }
        });

        if (!existing) {
          await prisma.contact.create({
            data: {
              tenantId,
              name,
              phone,
              normalizedPhone,
              source: 'whatsapp',
              status: 'lead',
              temperature: 'cold',
              score: 50,
              totalPurchased: 0.0,
              deletedAt: null
            }
          });
          createdCount++;
        } else {
          // Optionally update name if it was just the phone before
          if (existing.name === existing.phone && name !== phone) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: { name }
            });
          }
        }
      }

      console.log(`[ContactsSync] Sync finished. Created: ${createdCount}, Ignored/Groups: ${ignoredCount}`);
    } catch (error) {
      console.error('[ContactsSync] Error syncing contacts from gateway:', error);
    }
  }
}
