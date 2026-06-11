import { prisma } from './prisma';

export async function withTransaction<T>(
  callback: (tx: Omit<typeof prisma, '$transaction' | '$use' | '$on' | '$disconnect' | '$connect'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return await callback(tx as any);
  });
}

export async function withIsolationLevel<T>(
  level: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable',
  callback: (tx: Omit<typeof prisma, '$transaction' | '$use' | '$on' | '$disconnect' | '$connect'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      return await callback(tx as any);
    },
    {
      isolationLevel: level,
    }
  );
}
