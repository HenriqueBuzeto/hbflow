import { prisma } from '@/server/db/prisma';

export class DepartmentBootstrapService {
  /**
   * Idempotently seeds default departments/queues for a tenant
   */
  static async bootstrapDefaultDepartments(tenantId: string): Promise<void> {
    try {
      const defaultDepts = [
        {
          name: 'Vendas',
          description: 'Atendimento comercial, orçamentos e captação de leads.',
          color: '#7C3AED',
          icon: 'ShoppingBag',
          greetingMessage: 'Olá! Você está no setor de Vendas. Um vendedor já vai te atender.',
          awayMessage: 'Olá! Nosso time comercial está fora do horário. Retornamos às 08:00.'
        },
        {
          name: 'Atendimento',
          description: 'Suporte técnico, garantia e atendimento geral.',
          color: '#2563EB',
          icon: 'Shield',
          greetingMessage: 'Olá! Você está no setor de Atendimento. Assim que possível nosso técnico irá atender.',
          awayMessage: 'Olá! Nosso suporte técnico está offline. Deixe sua mensagem.'
        }
      ];

      for (const d of defaultDepts) {
        const existing = await prisma.department.findFirst({
          where: {
            tenantId,
            name: {
              equals: d.name,
              mode: 'insensitive'
            }
          }
        });

        if (!existing) {
          await prisma.department.create({
            data: {
              tenantId,
              name: d.name,
              description: d.description,
              color: d.color,
              icon: d.icon,
              greetingMessage: d.greetingMessage,
              awayMessage: d.awayMessage,
              isActive: true,
              distributionMode: d.name === 'Vendas' ? 'round_robin' : 'workload'
            }
          });
        }
      }
      console.log(`✅ Default departments bootstrapped for tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Failed to bootstrap departments for tenant ${tenantId}:`, error);
    }
  }
}
