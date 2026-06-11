-- Phase 4: SQL Layer - Functions and Triggers (CORRECTED - PascalCase table names)
-- Migration: add_sql_layer_functions_triggers

-- ============================================
-- FUNCTION 1: normalize_phone()
-- Normaliza números de telefone removendo caracteres não numéricos
-- ============================================

CREATE OR REPLACE FUNCTION normalize_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove tudo que não for número
  RETURN regexp_replace(phone, '[^0-9]', '', 'g');
END;
$$;

-- ============================================
-- FUNCTION 2: calculate_sla_due()
-- Calcula prazos de SLA baseados em regras ou fallback
-- ============================================

CREATE OR REPLACE FUNCTION calculate_sla_due(p_tenant_id text, p_department_id text, p_priority text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_first_response_minutes int;
  v_resolution_minutes int;
  v_first_response_due_at timestamp with time zone;
  v_resolution_due_at timestamp with time zone;
  v_priority_lower text;
BEGIN
  v_priority_lower := lower(coalesce(p_priority, 'normal'));
  
  -- Fallback baseado em priority
  CASE v_priority_lower
    WHEN 'low' THEN
      v_first_response_minutes := 60;
      v_resolution_minutes := 1440;
    WHEN 'normal' THEN
      v_first_response_minutes := 30;
      v_resolution_minutes := 480;
    WHEN 'medium' THEN
      v_first_response_minutes := 30;
      v_resolution_minutes := 480;
    WHEN 'high' THEN
      v_first_response_minutes := 10;
      v_resolution_minutes := 240;
    WHEN 'urgent' THEN
      v_first_response_minutes := 5;
      v_resolution_minutes := 120;
    ELSE
      v_first_response_minutes := 30;
      v_resolution_minutes := 480;
  END CASE;
  
  v_first_response_due_at := now() + (v_first_response_minutes || ' minutes')::interval;
  v_resolution_due_at := now() + (v_resolution_minutes || ' minutes')::interval;
  
  RETURN jsonb_build_object(
    'firstResponseDueAt', to_jsonb(v_first_response_due_at),
    'resolutionDueAt', to_jsonb(v_resolution_due_at)
  );
END;
$$;

-- ============================================
-- FUNCTION 3: calculate_lead_score()
-- Calcula score de lead (0-100) baseado em sinais disponíveis
-- CORRECTED: Usa tabelas PascalCase e colunas camelCase com aspas
-- ============================================

CREATE OR REPLACE FUNCTION calculate_lead_score(p_contact_id text)
RETURNS int
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_score int := 0;
  v_temperature text;
  v_total_purchased numeric;
  v_deals_count int;
  v_last_interaction_at timestamp with time zone;
  v_tags_count int;
BEGIN
  -- Buscar dados do contact
  SELECT 
    "temperature",
    "totalPurchased",
    "lastInteractionAt"
  INTO 
    v_temperature,
    v_total_purchased,
    v_last_interaction_at
  FROM "Contact"
  WHERE id = p_contact_id;
  
  -- Se não encontrar, retornar 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Temperature: hot +30, warm +15
  IF v_temperature = 'hot' THEN
    v_score := v_score + 30;
  ELSIF v_temperature = 'warm' THEN
    v_score := v_score + 15;
  END IF;
  
  -- Total purchased > 0: +20
  IF v_total_purchased > 0 THEN
    v_score := v_score + 20;
  END IF;
  
  -- Possui deals open: +20
  SELECT COUNT(*) INTO v_deals_count
  FROM "Deal"
  WHERE "contactId" = p_contact_id
    AND status = 'open'
    AND "deletedAt" IS NULL;
  
  IF v_deals_count > 0 THEN
    v_score := v_score + 20;
  END IF;
  
  -- Last interaction nos últimos 7 dias: +15
  IF v_last_interaction_at > (now() - interval '7 days') THEN
    v_score := v_score + 15;
  END IF;
  
  -- Possui tags: +5
  SELECT COUNT(*) INTO v_tags_count
  FROM "ContactTag"
  WHERE "contactId" = p_contact_id;
  
  IF v_tags_count > 0 THEN
    v_score := v_score + 5;
  END IF;
  
  -- Limitar entre 0 e 100
  IF v_score < 0 THEN
    v_score := 0;
  ELSIF v_score > 100 THEN
    v_score := 100;
  END IF;
  
  RETURN v_score;
END;
$$;

-- ============================================
-- FUNCTION 4: calculate_agent_monthly_cost()
-- Calcula custo mensal de agentes baseado em execution logs
-- CORRECTED: Usa tabela PascalCase e colunas camelCase com aspas
-- ============================================

CREATE OR REPLACE FUNCTION calculate_agent_monthly_cost(p_tenant_id text, p_month date)
RETURNS numeric
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  v_total_cost numeric := 0;
  v_month_start timestamp with time zone;
  v_month_end timestamp with time zone;
BEGIN
  -- Calcular início e fim do mês
  v_month_start := date_trunc('month', p_month)::timestamp with time zone;
  v_month_end := (date_trunc('month', p_month) + interval '1 month - 1 day')::timestamp with time zone + interval '1 day' - interval '1 second';
  
  -- Somar custos do mês
  SELECT COALESCE(SUM(cost), 0) INTO v_total_cost
  FROM "AgentExecutionLog"
  WHERE "tenantId" = p_tenant_id
    AND "createdAt" >= v_month_start
    AND "createdAt" <= v_month_end;
  
  RETURN v_total_cost;
END;
$$;

-- ============================================
-- FUNCTION 5: set_updated_at()
-- Função genérica para atualizar updated_at automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER 1: updated_at automático
-- CORRECTED: Usa tabelas PascalCase
-- ============================================

DROP TRIGGER IF EXISTS contacts_updated_at ON "Contact";
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON "Contact"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS conversations_updated_at ON "Conversation";
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON "Conversation"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS messages_updated_at ON "Message";
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS deals_updated_at ON "Deal";
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON "Deal"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON "Task";
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON "Task"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS tenants_updated_at ON "Tenant";
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON "Tenant"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON "User";
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS departments_updated_at ON "Department";
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON "Department"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS pipelines_updated_at ON "Pipeline";
CREATE TRIGGER pipelines_updated_at
  BEFORE UPDATE ON "Pipeline"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS pipeline_stages_updated_at ON "PipelineStage";
CREATE TRIGGER pipeline_stages_updated_at
  BEFORE UPDATE ON "PipelineStage"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================
-- TRIGGER 2: contact timeline trigger
-- CORRECTED: Usa tabelas PascalCase e colunas camelCase
-- ============================================

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

DROP TRIGGER IF EXISTS contact_timeline_trigger ON "Contact";
CREATE TRIGGER contact_timeline_trigger
  AFTER INSERT OR UPDATE ON "Contact"
  FOR EACH ROW
  EXECUTE FUNCTION create_contact_timeline_event();

DROP TRIGGER IF EXISTS contact_timeline_trigger_deals ON "Deal";
CREATE TRIGGER contact_timeline_trigger_deals
  AFTER INSERT OR UPDATE ON "Deal"
  FOR EACH ROW
  EXECUTE FUNCTION create_contact_timeline_event();

DROP TRIGGER IF EXISTS contact_timeline_trigger_conversations ON "Conversation";
CREATE TRIGGER contact_timeline_trigger_conversations
  AFTER INSERT ON "Conversation"
  FOR EACH ROW
  EXECUTE FUNCTION create_contact_timeline_event();

DROP TRIGGER IF EXISTS contact_timeline_trigger_tasks ON "Task";
CREATE TRIGGER contact_timeline_trigger_tasks
  AFTER INSERT ON "Task"
  FOR EACH ROW
  EXECUTE FUNCTION create_contact_timeline_event();

-- ============================================
-- TRIGGER 3: deal stage history trigger
-- CORRECTED: Usa tabelas PascalCase e colunas camelCase
-- ============================================

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
    
    -- Inserir histórico
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

DROP TRIGGER IF EXISTS deal_stage_history_trigger ON "Deal";
CREATE TRIGGER deal_stage_history_trigger
  AFTER UPDATE ON "Deal"
  FOR EACH ROW
  WHEN (OLD."stageId" IS DISTINCT FROM NEW."stageId")
  EXECUTE FUNCTION create_deal_stage_history();
