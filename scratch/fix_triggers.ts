import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value.trim();
        }
      });
      console.log('✅ Loaded database configuration from local .env file');
    }
  } catch (err) {
    console.error('⚠️ Failed to load local .env file:', err);
  }
}

loadEnv();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const sqlFixUpdatedAt = `
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;
`;

const sqlFixTimelineEvent = `
CREATE OR REPLACE FUNCTION create_contact_timeline_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Contact created
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'Contact' THEN
    INSERT INTO "ContactTimelineEvent" ("id", "contactId", "eventType", "title", "description", "metadata", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      NEW.id,
      'contact_created',
      'Contato Criado',
      'Novo contato criado no sistema',
      jsonb_build_object('source', NEW.source, 'type', NEW.type),
      NEW."createdAt"
    );
    RETURN NEW;
  END IF;
  
  -- Deal created
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'Deal' THEN
    INSERT INTO "ContactTimelineEvent" ("id", "contactId", "eventType", "title", "description", "metadata", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      NEW."contactId",
      'deal_created',
      'Negócio Criado',
      'Novo negócio associado ao contato',
      jsonb_build_object('dealId', NEW.id, 'title', NEW.title, 'value', NEW.value),
      NEW."createdAt"
    );
    RETURN NEW;
  END IF;
  
  -- Deal won
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'Deal' THEN
    IF OLD.status != 'won' AND NEW.status = 'won' THEN
      INSERT INTO "ContactTimelineEvent" ("id", "contactId", "eventType", "title", "description", "metadata", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        NEW."contactId",
        'deal_won',
        'Negócio Ganho',
        'Negócio foi ganho',
        jsonb_build_object('dealId', NEW.id, 'title', NEW.title, 'value', NEW.value, 'wonAt', NEW."wonAt"),
        now()
      );
    END IF;
    RETURN NEW;
  END IF;
  
  -- Deal lost
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'Deal' THEN
    IF OLD.status != 'lost' AND NEW.status = 'lost' THEN
      INSERT INTO "ContactTimelineEvent" ("id", "contactId", "eventType", "title", "description", "metadata", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        NEW."contactId",
        'deal_lost',
        'Negócio Perdido',
        'Negócio foi perdido',
        jsonb_build_object('dealId', NEW.id, 'title', NEW.title, 'value', NEW.value, 'lostAt', NEW."lostAt", 'lossReasonId', NEW."lossReasonId"),
        now()
      );
    END IF;
    RETURN NEW;
  END IF;
  
  -- Conversation created
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'Conversation' THEN
    INSERT INTO "ContactTimelineEvent" ("id", "contactId", "eventType", "title", "description", "metadata", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      NEW."contactId",
      'conversation_created',
      'Conversa Criada',
      'Nova conversa iniciada',
      jsonb_build_object('conversationId', NEW.id, 'subject', NEW.subject, 'priority', NEW.priority),
      NEW."createdAt"
    );
    RETURN NEW;
  END IF;
  
  -- Task created
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'Task' THEN
    IF NEW."contactId" IS NOT NULL THEN
      INSERT INTO "ContactTimelineEvent" ("id", "contactId", "eventType", "title", "description", "metadata", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        NEW."contactId",
        'task_created',
        'Tarefa Criada',
        'Nova tarefa associada ao contato',
        jsonb_build_object('taskId', NEW.id, 'title', NEW.title, 'dueAt', NEW.dueAt, 'priority', NEW.priority),
        NEW."createdAt"
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;
`;

const sqlFixStageHistory = `
CREATE OR REPLACE FUNCTION create_deal_stage_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_duration_days numeric;
BEGIN
  -- Verificar se stageId mudou
  IF OLD."stageId" IS DISTINCT FROM NEW."stageId" THEN
    -- Calcular duração se possível (dias desde a última mudança)
    IF OLD."movedAt" IS NOT NULL THEN
      v_duration_days := EXTRACT(EPOCH FROM (now() - OLD."movedAt")) / 86400;
    ELSE
      v_duration_days := NULL;
    END IF;
    
    -- Inserir histórico com ID autogerado
    INSERT INTO "DealStageHistory" ("id", "dealId", "fromStageId", "toStageId", "movedBy", "movedAt", "durationDays")
    VALUES (
      gen_random_uuid()::text,
      NEW.id,
      OLD."stageId",
      NEW."stageId",
      NEW."ownerUserId",
      now(),
      v_duration_days
    );
  END IF;
  
  RETURN NEW;
END;
$$;
`;

async function executeFix() {
  try {
    console.log('Connecting to database and executing trigger/function SQL corrections...');
    
    console.log('Applying correction 0: set_updated_at() with camelCase column escape...');
    await prisma.$executeRawUnsafe(sqlFixUpdatedAt);
    console.log('✅ PL/pgSQL function set_updated_at updated successfully!');

    console.log('Applying correction 1: create_contact_timeline_event() with UUID generator...');
    await prisma.$executeRawUnsafe(sqlFixTimelineEvent);
    console.log('✅ PL/pgSQL function create_contact_timeline_event updated successfully!');

    console.log('Applying correction 2: create_deal_stage_history() with UUID generator...');
    await prisma.$executeRawUnsafe(sqlFixStageHistory);
    console.log('✅ PL/pgSQL function create_deal_stage_history updated successfully!');
    
    console.log('🎉 All SQL corrections executed successfully!');
  } catch (error) {
    console.error('❌ Failed to execute SQL correction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeFix();
