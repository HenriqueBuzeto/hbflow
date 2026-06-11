// @ts-nocheck
/**
 * HBFlow AI Workforce Queue Manager
 * Abstração para enfileiramento de tarefas de agentes de IA usando BullMQ e Redis.
 * Possui fallback automático para execução assíncrona em memória caso o Redis não esteja disponível,
 * garantindo a estabilidade e portabilidade do workspace de desenvolvimento.
 */

export interface QueueJob<T = any> {
  id: string;
  name: string;
  data: T;
  timestamp: number;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<void>;

function getBullmqPackageName(): string {
  // Construct package name dynamically to bypass static analysis of bundlers (e.g. Next.js Turbopack)
  const parts = ['bu', 'll', 'mq'];
  return parts.join('');
}

class AIWorkforceQueueManager {
  private queues: Map<string, Array<{ job: QueueJob; handler: JobHandler }>> = new Map();
  private redisConnected: boolean = false;
  private bullQueueInstance: any = null;

  constructor() {
    // Inicialização segura: Tenta detectar as dependências do Redis/BullMQ de forma dinâmica
    this.detectRedis();
  }

  private async detectRedis() {
    try {
      // Exemplo de importação dinâmica para evitar erros caso os pacotes não estejam instalados
      const bullmqPackage = getBullmqPackageName();
      const { Queue, Worker } = await import(bullmqPackage);
      // Conexão fictícia ou real baseada em variáveis de ambiente
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Queue] Inicializando BullMQ conectado ao Redis: ${redisUrl}`);
        this.bullQueueInstance = new Queue('ai-workforce-tasks', {
          connection: { url: redisUrl }
        });
        this.redisConnected = true;
      }
    } catch (e) {
      console.log('[Queue] Redis ou BullMQ não encontrados. Ativando fila assíncrona em memória (In-Memory Fallback).');
      this.redisConnected = false;
    }
  }

  /**
   * Envia uma tarefa para processamento em segundo plano (background job)
   */
  async addJob<T>(queueName: string, jobName: string, data: T): Promise<string> {
    const jobId = `job_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    const job: QueueJob<T> = { id: jobId, name: jobName, data, timestamp };

    console.log(`[Queue: ${queueName}] Adicionando job "${jobName}" [ID: ${jobId}]`);

    if (this.redisConnected && this.bullQueueInstance) {
      try {
        await this.bullQueueInstance.add(jobName, data, { jobId });
        return jobId;
      } catch (err) {
        console.error(`[Queue] Falha no BullMQ ao adicionar job, usando fallback local:`, err);
      }
    }

    // Fallback: executa de forma assíncrona em background na thread do Node.js
    const registeredHandlers = this.queues.get(queueName) || [];
    
    // Executa os workers registrados de forma não-bloqueante
    setTimeout(async () => {
      for (const item of registeredHandlers) {
        if (item.job.name === jobName || item.job.name === '*') {
          try {
            await item.handler(job);
          } catch (e) {
            console.error(`[Queue Fallback Error] Erro ao processar job ${jobId}:`, e);
          }
        }
      }
    }, 50);

    return jobId;
  }

  /**
   * Registra um Worker para escutar e processar jobs específicos da fila
   */
  registerWorker(queueName: string, jobName: string, handler: JobHandler): void {
    console.log(`[Queue Worker] Registrando listener para fila "${queueName}" -> "${jobName}"`);
    
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    const jobPattern: QueueJob = { id: '*', name: jobName, data: null, timestamp: 0 };
    this.queues.get(queueName)!.push({ job: jobPattern, handler });

    // Em produção real com BullMQ, criaríamos o Worker correspondente:
    if (this.redisConnected) {
      try {
        const bullmqPackage = getBullmqPackageName();
        import(bullmqPackage).then(({ Worker }) => {
          new Worker(
            queueName,
            async (bullJob) => {
              const parsedJob: QueueJob = {
                id: bullJob.id || '',
                name: bullJob.name,
                data: bullJob.data,
                timestamp: bullJob.timestamp
              };
              await handler(parsedJob);
            },
            {
              connection: { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' }
            }
          );
        });
      } catch (e) {
        // Silencia erros no setup inicial
      }
    }
  }
}

export const aiQueueManager = new AIWorkforceQueueManager();
