# PostAI — Stack local de desenvolvimento

Ferramenta web SaaS que gera legendas e hashtags para Instagram a partir de fotos, usando a API do Claude (Anthropic).

---

## Arquitetura

```
postai/
├── apps/
│   ├── api/          → Express + Node.js  (porta 3011)
│   └── web/          → Next.js 14         (porta 3010)
├── infra/
│   └── postgres/
│       └── init.sql  → Schema inicial
├── docker-compose.yml
└── Makefile
```

### Serviços e portas

| Serviço    | Porta local | Descrição                        |
|------------|-------------|----------------------------------|
| Next.js    | **3010**    | Frontend da aplicação            |
| API        | **3011**    | Backend Express (API REST)       |
| PostgreSQL | **5433**    | Banco de dados (5432 no container) |
| pgAdmin    | **5050**    | Interface web para o banco       |

> Portas escolhidas para não conflitar com serviços existentes (5432, 6379, 8080/8000).

---

## Pré-requisitos

- Docker Desktop (macOS) — versão 4.x ou superior
- Make (já incluso no macOS via Xcode Command Line Tools)

---

## Setup inicial

### 1. Clone e configure as variáveis de ambiente

```bash
git clone <seu-repo> postai
cd postai
```

Edite `apps/api/.env` e insira sua chave da Anthropic:

```env
ANTHROPIC_API_KEY=sk-ant-COLOQUE_SUA_CHAVE_AQUI
JWT_SECRET=troque_por_um_segredo_forte_aqui
```

> Obtenha sua chave em https://console.anthropic.com/

### 2. Suba a stack

```bash
make up
```

Na primeira vez, o Docker vai:
- Baixar as imagens (postgres, pgadmin, node)
- Instalar as dependências npm
- Criar o banco e rodar o `init.sql` automaticamente

### 3. Acesse a aplicação

| URL                          | O quê                |
|------------------------------|----------------------|
| http://localhost:3010         | Aplicação web        |
| http://localhost:3011/health  | Health check da API  |
| http://localhost:5050         | pgAdmin              |

**pgAdmin** — credenciais padrão:
- Email: `admin@postai.local`
- Senha: `admin123`

Para conectar ao banco no pgAdmin:
- Host: `postgres` (nome do container na rede interna)
- Porta: `5432`
- Usuário: `postai_user`
- Senha: `postai_secret_local`
- Database: `postai`

**Usuário de teste** já criado no banco:
- Email: `dev@postai.local`
- Senha: `dev123456`
- Plano: `pro` | Créditos: `999`

---

## Comandos úteis

```bash
make up           # sobe todos os serviços
make down         # para todos
make restart      # restart completo
make logs         # logs em tempo real (todos)
make logs-api     # logs só da API
make logs-web     # logs só do Next.js
make status       # status dos containers
make shell-api    # shell dentro da API
make shell-db     # psql direto no banco
make reset-db     # ⚠️  apaga e recria o banco
```

---

## Endpoints da API

### Auth
| Método | Rota                 | Descrição              |
|--------|----------------------|------------------------|
| POST   | `/api/auth/register` | Cria nova conta        |
| POST   | `/api/auth/login`    | Autentica e retorna JWT|
| GET    | `/api/auth/me`       | Retorna usuário atual  |

### Geração
| Método | Rota                    | Descrição                     |
|--------|-------------------------|-------------------------------|
| POST   | `/api/generate`         | Gera legenda + hashtags (multipart/form-data com `image`) |
| GET    | `/api/generate/history` | Histórico do usuário          |

### Usuário
| Método | Rota                    | Descrição               |
|--------|-------------------------|-------------------------|
| GET    | `/api/user/profile`     | Perfil + total de gerações |
| GET    | `/api/user/credits/log` | Log de uso de créditos  |
| PATCH  | `/api/user/profile`     | Atualiza nome           |

---

## Schema do banco

```sql
users          → id, email, name, password_hash, plan, credits
sessions       → id, user_id, token, expires_at
generations    → id, user_id, nicho, tone, caption, hashtags, status
subscriptions  → id, user_id, plan, status, stripe_id (para Stripe futuro)
credits_log    → id, user_id, delta, reason, ref_id
```

Função atômica de consumo de crédito: `use_credit(user_id, generation_id)`

---

## Deploy no Vercel

### API (adaptar para Vercel Serverless ou manter no Railway/Render)

A API Express **não roda nativamente no Vercel** (que é serverless). Opções para produção:

1. **Railway** (recomendado — gratuito no tier inicial):
   ```bash
   railway up
   ```

2. **Render** — conecte o repositório e aponte para `apps/api`

3. **Fly.io** — `fly launch` dentro de `apps/api`

### Frontend (Next.js → Vercel)

```bash
cd apps/web
npx vercel
```

Configure as variáveis de ambiente no painel da Vercel:
- `NEXT_PUBLIC_API_URL` → URL da API em produção
- `INTERNAL_API_URL` → mesma URL (em produção são iguais)

---

## Próximos passos (roadmap técnico)

- [ ] Integração Stripe (planos e webhooks de pagamento)
- [ ] Upload de imagem para Cloudflare R2 (persistir imagens das gerações)
- [ ] OAuth Google via NextAuth.js
- [ ] Endpoint de regeneração (nova versão do mesmo post)
- [ ] Dashboard de métricas (gerações/dia, créditos consumidos)
- [ ] E-mail transacional (Resend) para boas-vindas e alertas de crédito
