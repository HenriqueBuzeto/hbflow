# Runbook — Operação do Servidor Local HBFlow

Guia operacional completo para manutenção do servidor local que hospeda PostgreSQL, Redis e Evolution API.

---

## Como ligar o servidor e verificar tudo

```powershell
# 1. Abrir PowerShell na pasta do projeto
cd "C:\Users\HB Studio Dev\Documents\Site\hbflow-local-infra"

# 2. Subir containers
.\scripts\start.ps1

# 3. Verificar saúde
.\scripts\health.ps1

# 4. Verificar tunnel (se necessário)
# Ver se o cloudflared está rodando como serviço do Windows:
Get-Service -Name "*cloudflared*" -ErrorAction SilentlyContinue
```

---

## Como subir o Docker

```powershell
cd "C:\Users\HB Studio Dev\Documents\Site\hbflow-local-infra"
.\scripts\start.ps1
```

Se o Docker Desktop não estiver rodando:
1. Abra o Docker Desktop pelo menu Iniciar
2. Aguarde o ícone da baleia aparecer na barra de tarefas
3. Execute `.\scripts\start.ps1`

---

## Como verificar containers

```powershell
# Status básico
docker compose ps

# Status com healthcheck
docker inspect --format '{{.Name}} → {{.State.Health.Status}}' $(docker compose ps -q)

# Logs em tempo real
.\scripts\logs.ps1
```

---

## Como verificar o tunnel

```powershell
# Ver se cloudflared está rodando
Get-Process cloudflared -ErrorAction SilentlyContinue

# Se for serviço do Windows:
Get-Service -Name "*cloudflared*"

# Testar Evolution API localmente
Invoke-WebRequest -Uri http://localhost:8080/health -UseBasicParsing

# Testar Evolution API via tunnel
Invoke-WebRequest -Uri https://evolution.seudominio.com/health -UseBasicParsing
```

---

## Como atualizar variáveis na Vercel

1. Acesse [vercel.com](https://vercel.com) → projeto HBFlow
2. **Settings → Environment Variables**
3. Edite a variável desejada
4. **Deployments** → último deploy → `...` → **Redeploy**
5. Aguarde 1-2 minutos e teste o login

---

## Como rodar backup manual

```powershell
cd "C:\Users\HB Studio Dev\Documents\Site\hbflow-local-infra"
.\scripts\backup-now.ps1
```

O arquivo será salvo em `backups/hbflow_YYYY-MM-DD_HH-mm.dump`.

---

## Como restaurar um backup

```powershell
cd "C:\Users\HB Studio Dev\Documents\Site\hbflow-local-infra"

# Interativo (lista todos os backups disponíveis)
.\scripts\restore-backup.ps1

# Arquivo específico
.\scripts\restore-backup.ps1 -DumpFile ".\backups\hbflow_2025-06-17_18-00.dump"
```

⚠️ **O script pedirá confirmação dupla antes de prosseguir.**

---

## Como migrar para VPS futuramente

1. **Provisionar VPS** (Hetzner CX21 ou DigitalOcean 2GB — ~€5/mês)

2. **Exportar banco atual**
   ```powershell
   .\scripts\backup-now.ps1
   ```

3. **Copiar para VPS** via SCP/SFTP
   ```powershell
   scp .\backups\hbflow_ULTIMO.dump root@IP_DA_VPS:/tmp/
   ```

4. **Instalar Docker na VPS** (Ubuntu)
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

5. **Copiar docker-compose.yml e .env para a VPS**

6. **Subir containers na VPS** e restaurar o banco

7. **Atualizar Cloudflare Tunnel** para apontar para a VPS em vez do servidor local

8. **Atualizar variáveis na Vercel** com as URLs da VPS

9. **Testar** e só então desligar o servidor local

---

## O que fazer se a internet cair

- Usuários **na mesma rede local** continuam funcionando (acesso direto ao banco)
- Usuários **externos** não conseguem acessar — dependem do tunnel
- **Ação:** Aguardar retorno da internet. Serviços locais continuam rodando.
- Se a queda for prolongada: contatar usuários externos e avisar sobre a indisponibilidade

---

## O que fazer se a energia cair

1. Após retornar a energia:
   - O servidor deve reiniciar automaticamente (configurar na BIOS: "Power On After Power Loss = ON")
   - Docker inicia automaticamente se configurado
   - Containers reiniciam (restart: unless-stopped)
   - Cloudflare Tunnel reinicia se instalado como serviço do Windows

2. Verificar após retornar:
   ```powershell
   .\scripts\health.ps1
   ```

3. **Prevenção:** Use um **nobreak (UPS)** para proteger o servidor e o roteador.

---

## O que fazer se o disco encher

```powershell
# 1. Verificar espaço
Get-PSDrive C

# 2. Limpar backups antigos manualmente
Get-ChildItem .\backups\*.dump | Sort-Object LastWriteTime | Select-Object -First 5
# Depois remova os mais antigos:
# Remove-Item .\backups\hbflow_2025-01-01_18-00.dump

# 3. Limpar imagens Docker não utilizadas (NÃO remove dados!)
docker system prune -f

# 4. Verificar tamanho dos volumes Docker
docker system df -v
```

**Longo prazo:** Reduza `BACKUP_RETENTION_DAYS` no `.env` ou adicione disco externo.

---

## O que fazer se o backup falhar

```powershell
# 1. Ver log
Get-Content .\backups\backup.log | Select-Object -Last 20

# 2. Verificar se o container está healthy
docker inspect --format '{{.State.Health.Status}}' hbflow-postgres

# 3. Tentar manual
.\scripts\backup-now.ps1

# 4. Verificar espaço em disco
Get-PSDrive C | Select-Object Used, Free
```

Se o backup continuar falhando:
- Verifique se o container postgres está running
- Verifique se há espaço em disco
- Consulte [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
