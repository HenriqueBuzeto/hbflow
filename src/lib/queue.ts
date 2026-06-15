import { Queue, Worker, Job as BullJob } from 'bullmq';
import Redis from 'ioredis';

export interface QueueJob<T = any> {
  id: string;
  name: string;
  data: T;
  timestamp: number;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<void>;

class AIWorkforceQueueManager {
  private queues: Map<string, Array<{ job: QueueJob; handler: JobHandler }>> = new Map();
  private redisConnected: boolean = false;
  private bullQueues: Map<string, Queue> = new Map();
  private bullWorkers: Map<string, Worker> = new Map();
  private redisConnection: Redis | null = null;
  private isProduction = process.env.NODE_ENV === 'production';
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initConnection();
  }

  private async initConnection() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      if (this.isProduction) {
        console.error('[Queue Error] A variável REDIS_URL não está configurada. Fila em produção exige Redis real.');
        this.redisConnected = false;
      } else {
        console.log('[Queue] REDIS_URL não definido. Utilizando fallback local em memória.');
        this.redisConnected = false;
      }
      return;
    }

    try {
      // Cria a conexão com ioredis de forma explícita
      this.redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Exigido pelo BullMQ
        lazyConnect: true,
      });

      // Registra o tratador de erros para evitar "Unhandled error event" no console
      this.redisConnection.on('error', (err) => {
        if (this.isProduction) {
          console.error('[Queue Redis Connection Error]:', err.message);
        }
      });

      // Conecta manualmente
      await this.redisConnection.connect();
      this.redisConnected = true;
      console.log(`[Queue] Inicializado com sucesso. Conectado ao Redis: ${redisUrl}`);
    } catch (err) {
      this.redisConnected = false;
      if (this.isProduction) {
        console.error('[Queue Error] Falha de conexão com o Redis em produção:', err);
        throw new Error('Falha ao conectar com o Redis de produção.');
      } else {
        console.log('[Queue] Falha ao conectar ao Redis local. Ativando fallback em memória.');
      }
    }
  }

  private async ensureInitialized() {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private getQueue(queueName: string): Queue | null {
    if (!this.redisConnected || !this.redisConnection) return null;

    if (!this.bullQueues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.redisConnection as any
      });
      this.bullQueues.set(queueName, queue);
    }
    return this.bullQueues.get(queueName)!;
  }

  async addJob<T>(queueName: string, jobName: string, data: T): Promise<string> {
    await this.ensureInitialized();
    const jobId = `job_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    const job: QueueJob<T> = { id: jobId, name: jobName, data, timestamp };

    console.log(`[Queue: ${queueName}] Adicionando job "${jobName}" [ID: ${jobId}]`);

    const queue = this.getQueue(queueName);
    if (queue) {
      try {
        await queue.add(jobName, data, { jobId });
        return jobId;
      } catch (err) {
        console.error(`[Queue Error] Falha no BullMQ ao adicionar job na fila "${queueName}":`, err);
        if (this.isProduction) {
          throw err;
        }
      }
    }

    // Fallback: em memória
    if (this.isProduction) {
      throw new Error(`Fila fora do ar em produção. REDIS indisponível para fila "${queueName}".`);
    }

    const registeredHandlers = this.queues.get(queueName) || [];
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

  registerWorker(queueName: string, jobName: string, handler: JobHandler): void {
    console.log(`[Queue Worker] Registrando listener para fila "${queueName}" -> "${jobName}"`);

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    const jobPattern: QueueJob = { id: '*', name: jobName, data: null, timestamp: 0 };
    this.queues.get(queueName)!.push({ job: jobPattern, handler });

    // Inicialização assíncrona do worker se o Redis estiver disponível
    this.ensureInitialized().then(() => {
      if (this.redisConnected && this.redisConnection) {
        try {
          const workerKey = `${queueName}-${jobName}`;
          if (!this.bullWorkers.has(workerKey)) {
            const worker = new Worker(
              queueName,
              async (bullJob: BullJob) => {
                if (bullJob.name === jobName || jobName === '*') {
                  const parsedJob: QueueJob = {
                    id: bullJob.id || '',
                    name: bullJob.name,
                    data: bullJob.data,
                    timestamp: bullJob.timestamp
                  };
                  await handler(parsedJob);
                }
              },
              {
                connection: this.redisConnection as any
              }
            );
            this.bullWorkers.set(workerKey, worker);
            console.log(`[Queue Worker] Worker do BullMQ ativo com sucesso para: "${queueName}" -> "${jobName}"`);
          }
        } catch (e) {
          console.error(`[Queue Worker Error] Erro ao registrar worker BullMQ para "${queueName}":`, e);
        }
      }
    });
  }
}

export const aiQueueManager = new AIWorkforceQueueManager();
