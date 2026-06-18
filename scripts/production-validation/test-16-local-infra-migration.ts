/**
 * test-16-local-infra-migration.ts
 * 
 * Script de validação pós-migração para banco local.
 * Verifica se todos os serviços estão funcionando corretamente
 * após a migração do Neon para o PostgreSQL local.
 * 
 * Execução:
 *   npx ts-node scripts/production-validation/test-16-local-infra-migration.ts
 * 
 * Resultado esperado:
 *   LOCAL_INFRA_MIGRATION_VALIDATION: PASS
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

const results: TestResult[] = [];
let allPassed = true;

function pass(name: string, detail?: string) {
  results.push({ name, pass: true, detail });
  console.log(`  ✅  ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, pass: false, detail });
  allPassed = false;
  console.error(`  ❌  ${name}${detail ? ` — ${detail}` : ''}`);
}

function warn(name: string, detail?: string) {
  results.push({ name, pass: true, detail });
  console.warn(`  ⚠️   ${name}${detail ? ` — ${detail}` : ''}`);
}

async function runTests() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   HBFlow — Validação Pós-Migração para Banco Local       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ── 1. Verificar DATABASE_URL ─────────────────────────────────────────────
  console.log('📋 1. Variáveis de Ambiente');
  const dbUrl = process.env.DATABASE_URL ?? '';
  
  if (!dbUrl) {
    fail('DATABASE_URL configurada', 'variável ausente');
  } else if (dbUrl.includes('neon.tech')) {
    fail('DATABASE_URL não aponta para Neon', `URL atual: ${dbUrl.split('@')[1]?.split('/')[0] ?? 'hidden'}`);
  } else {
    pass('DATABASE_URL configurada', dbUrl.split('@')[1]?.split('/')[0] ?? 'host-ok');
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    warn('REDIS_URL configurada', 'ausente — filas em memória (não ideal para produção)');
  } else {
    pass('REDIS_URL configurada');
  }

  // ── 2. Conectar ao banco ───────────────────────────────────────────────────
  console.log('');
  console.log('🗄️  2. Conexão com PostgreSQL');
  try {
    await prisma.$queryRaw`SELECT 1`;
    pass('Conexão com banco estabelecida');
  } catch (error: any) {
    fail('Conexão com banco', error.message);
    console.log('');
    console.error('LOCAL_INFRA_MIGRATION_VALIDATION: FAIL — Não foi possível conectar ao banco.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Verificar provider
  try {
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    const version = result[0]?.version ?? '';
    if (version.includes('PostgreSQL')) {
      pass('Provider é PostgreSQL', version.split(' ').slice(0, 2).join(' '));
    } else {
      fail('Provider é PostgreSQL', `versão desconhecida: ${version}`);
    }
  } catch (error: any) {
    fail('Verificar versão do banco', error.message);
  }

  // ── 3. Tabelas principais existem ─────────────────────────────────────────
  console.log('');
  console.log('📊 3. Tabelas Principais');

  const tablesToCheck: Array<{ label: string; query: () => Promise<bigint> }> = [
    { label: 'Tenant',           query: () => prisma.tenant.count().then(BigInt) },
    { label: 'User',             query: () => prisma.user.count().then(BigInt) },
    { label: 'Role',             query: () => prisma.role.count().then(BigInt) },
    { label: 'Permission',       query: () => prisma.permission.count().then(BigInt) },
    { label: 'Contact',          query: () => prisma.contact.count().then(BigInt) },
    { label: 'Conversation',     query: () => prisma.conversation.count().then(BigInt) },
    { label: 'WhatsappConnection', query: () => prisma.whatsappConnection.count().then(BigInt) },
    { label: 'AuditLog',         query: () => prisma.auditLog.count().then(BigInt) },
  ];

  for (const table of tablesToCheck) {
    try {
      const count = await table.query();
      pass(`Tabela ${table.label} existe`, `${count} registros`);
    } catch (error: any) {
      fail(`Tabela ${table.label}`, error.message);
    }
  }

  // ── 4. Billing ────────────────────────────────────────────────────────────
  console.log('');
  console.log('💳 4. Billing');
  try {
    const billing = await prisma.tenantBilling.count();
    pass('Tabela TenantBilling existe', `${billing} registros`);
  } catch (error: any) {
    fail('Tabela TenantBilling', error.message);
  }

  // ── 5. Multi-tenant básico ────────────────────────────────────────────────
  console.log('');
  console.log('🏢 5. Multi-tenant');
  try {
    const tenants = await prisma.tenant.findMany({ take: 3, select: { id: true, slug: true, status: true } });
    if (tenants.length > 0) {
      pass('Multi-tenant operacional', `${tenants.length} tenant(s) encontrado(s): ${tenants.map(t => t.slug).join(', ')}`);
    } else {
      warn('Multi-tenant', 'Nenhum tenant encontrado — banco pode estar vazio');
    }
  } catch (error: any) {
    fail('Multi-tenant', error.message);
  }

  // ── 6. Query Prisma simples ───────────────────────────────────────────────
  console.log('');
  console.log('🔍 6. Queries Prisma');
  try {
    const users = await prisma.user.findMany({ take: 1, select: { id: true, email: true } });
    pass('Prisma findMany funcionando');
  } catch (error: any) {
    fail('Prisma findMany', error.message);
  }

  // ── 7. Backup local ───────────────────────────────────────────────────────
  console.log('');
  console.log('💾 7. Backup');
  const backupDirs = [
    path.join(process.cwd(), '..', 'hbflow-local-infra', 'backups'),
    'C:\\Users\\HB Studio Dev\\Documents\\Site\\hbflow-local-infra\\backups',
  ];

  let backupFound = false;
  for (const dir of backupDirs) {
    if (fs.existsSync(dir)) {
      const dumps = fs.readdirSync(dir).filter(f => f.endsWith('.dump'));
      if (dumps.length > 0) {
        const sorted = dumps.sort().reverse();
        const lastBackup = path.join(dir, sorted[0]);
        const stat = fs.statSync(lastBackup);
        const ageH = (Date.now() - stat.mtimeMs) / 3600000;
        pass('Último backup encontrado', sorted[0]);
        if (ageH < 26) {
          pass('Backup recente', `${ageH.toFixed(1)}h atrás`);
        } else {
          warn('Backup desatualizado', `${ageH.toFixed(1)}h atrás — backup automático configurado?`);
        }
        backupFound = true;
        break;
      }
    }
  }
  if (!backupFound) {
    warn('Backup', 'Nenhum arquivo .dump encontrado — execute .\scripts\backup-now.ps1');
  }

  // ── 8. Health endpoint ────────────────────────────────────────────────────
  console.log('');
  console.log('🌐 8. Health Endpoint');
  const healthUrl = 'https://hbflow.vercel.app/api/health';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      pass('Health endpoint respondendo', `status ${res.status}`);
    } else {
      warn('Health endpoint', `status ${res.status}`);
    }
  } catch (error: any) {
    warn('Health endpoint', `não acessível (${error.message}) — normal em ambiente offline`);
  }

  // ── Resultado Final ───────────────────────────────────────────────────────
  await prisma.$disconnect();

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  const total  = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log(`  Total: ${total} | ✅ ${passed} | ❌ ${failed}`);
  console.log('');

  if (allPassed) {
    console.log('  LOCAL_INFRA_MIGRATION_VALIDATION: PASS');
  } else {
    console.log('  LOCAL_INFRA_MIGRATION_VALIDATION: FAIL');
    process.exit(1);
  }
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

runTests().catch(async (error) => {
  console.error('Erro inesperado:', error);
  await prisma.$disconnect();
  process.exit(1);
});
