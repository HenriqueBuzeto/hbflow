# Migração para Banco de Dados Local

Este documento descreve as mudanças necessárias no projeto HBFlow para suportar a nova arquitetura de banco local (PostgreSQL Docker + Redis Docker + Evolution API local via Cloudflare Tunnel).

---

## O que muda

Nada na estrutura do código é alterado. O Prisma já usa `DATABASE_URL` e `DIRECT_URL` via variáveis de ambiente sem hardcode para o Neon. A migração é 100% feita nas variáveis de ambiente da Vercel.

### Variáveis de ambiente a atualizar na Vercel

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL local via Cloudflare Tunnel |
| `DIRECT_URL` | URL direta (mesma ou sem pooler) para migrations do Prisma |
| `REDIS_URL` | Redis local via Cloudflare Tunnel |
| `WHATSAPP_QR_GATEWAY_BASE_URL` | URL pública da Evolution API local |

### Infraestrutura

Consulte o projeto `hbflow-local-infra` para:

- `docker-compose.yml` com PostgreSQL, Redis e Evolution API
- Scripts de backup/restore/healthcheck
- Documentação de Cloudflare Tunnel
- Guia de migração do Neon

Localização: `C:\Users\HB Studio Dev\Documents\Site\hbflow-local-infra\`

---

## Validação do Prisma

Após apontar para o banco local, execute no projeto:

```powershell
cd "C:\Users\HB Studio Dev\Documents\Site\hbflow"

npx prisma validate
npx prisma generate
npx prisma migrate status
```

> [!CAUTION]
> **Não rode** `prisma migrate deploy` nem `prisma db push` sem ter os dados migrados e sem autorização.

---

## Redis em Produção

O arquivo `src/lib/queue.ts` já emite warning crítico se `REDIS_URL` estiver ausente em produção:

```
[Queue Error] A variável REDIS_URL não está configurada. Fila em produção exige Redis real.
```

Configure `REDIS_URL` na Vercel após subir o Redis local.

Formato: `redis://:SENHA@<host-tunnel>:6379`

---

## Checklist de Migração

- [ ] `hbflow-local-infra` configurado e containers healthy
- [ ] Backup do Neon exportado: `backups/neon-export.dump`
- [ ] Dados restaurados no PostgreSQL local
- [ ] Dados validados (contagem de Tenant/User/Contact/Conversation)
- [ ] Cloudflare Tunnel configurado (Evolution + DB)
- [ ] Variáveis atualizadas na Vercel
- [ ] Redeploy feito na Vercel
- [ ] `/api/health` retorna `healthy` para Database e Redis
- [ ] Login testado com usuário real
- [ ] Backup automático às 18h instalado
- [ ] Teste de restore realizado
- [ ] Backup externo (rclone) configurado e testado
