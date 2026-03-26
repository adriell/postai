# PostAI — Product Backlog

> Última atualização: 2026-03-25
> Formato: `[prioridade] Título — Esforço (P/M/G)`

---

## 🚀 Em desenvolvimento

| Branch | Feature | Status |
|---|---|---|
| `feat/variation-pack` | Pacote de 3 variações de legenda | Em andamento |
| `feat/multi-format` | Múltiplos formatos (feed / story / portrait) | Em andamento |
| `feat/image-editor` | Editor leve de imagem antes do envio | Em andamento |
| `feat/post-scheduling` | Agendamento de posts com notificação por e-mail | Em andamento |

---

## P0 — Must have (próximas sprints)

### Monetização
- [ ] **Integração Stripe — planos pagos** (G)
  Checkout com planos starter/pro/agency e cobrança recorrente.
  Tabela `subscriptions` já existe no banco.
  _Dependência: definir preços e criar produtos no Stripe_

- [ ] **Recarga de créditos avulsos** (M)
  Pacotes de créditos sem assinatura (ex: 20 créditos por R$19).
  _Dependência: Stripe implementado_

### Produto
- [ ] **Onboarding guiado** (M)
  Wizard de 3 passos no primeiro acesso: nicho → tom → primeiro post.
  Reduz abandono na ativação.

- [ ] **Perfis de marca** (M)
  Salvar configurações de nicho, tom, hashtags fixas e nome do perfil.
  Usuário não preenche do zero em cada geração.

---

## P1 — Should have

### Engajamento / Retenção
- [ ] **Calendário editorial** (G)
  Visualização mensal dos posts agendados e publicados.
  Ajuda o usuário a manter consistência de postagens.

- [ ] **Sugestão de pauta** (M)
  "Você não posta há 5 dias. Quer sugestões para hoje?"
  Baseado no nicho cadastrado, envia sugestões por e-mail ou notificação no app.

- [ ] **Histórico com reaproveitamento** (P)
  Botão "Reusar foto" e "Nova legenda para esta foto" no histórico.
  Hoje o histórico é somente leitura.

### Distribuição
- [ ] **Integração Instagram Graph API** (G)
  Publicação e agendamento direto no Instagram Business/Creator.
  _Dependência: aprovação do app Meta Business_
  _Observação: agendamento via e-mail já coberto pelo feat/post-scheduling_

### Analytics
- [ ] **Analytics básico** (G)
  Alcance e engajamento dos posts gerados (requer Instagram API).
  Prova de valor direta para o usuário.

---

## P2 — Nice to have

- [ ] **Templates por segmento** (M)
  Coleção de prompts otimizados por nicho: restaurante, salão, academia, loja.
  Melhora o resultado sem esforço extra do usuário.

- [ ] **Suporte a múltiplos perfis** (G)
  Uma conta PostAI gerenciando várias contas do Instagram.
  Direciona para agências e gestores de redes sociais.

- [ ] **Programa de indicação com créditos** (P)
  "Indique um amigo e ganhe 10 créditos." Crescimento orgânico de baixo custo.

- [ ] **Exportar para PDF / relatório** (P)
  Relatório mensal com os posts gerados, métricas e hashtags mais usadas.

---

## P3 — Futuro / pesquisa

- [ ] **App mobile (React Native / PWA)** (G)
  Acesso e geração direto do celular. Integração com câmera e galeria nativa.

- [ ] **Integração com outras redes** (G)
  TikTok, Pinterest, LinkedIn — adaptar legenda ao formato de cada rede.

- [ ] **IA de voz** (G)
  Usuário fala o contexto do post ao invés de digitar. Reduz fricção.

- [ ] **White-label para agências** (G)
  Agências que querem oferecer o PostAI com a própria marca.

---

## Bugs conhecidos / Tech debt

- [ ] Configurar git `user.name` e `user.email` globalmente (committer warning)
- [ ] Adicionar testes automatizados (Jest / Vitest) nas rotas críticas
- [ ] Adicionar CI/CD com GitHub Actions (lint + build check em PRs)
- [ ] Revisar `@types/react-dom` ausente no package.json
- [ ] Configurar domínio customizado no Vercel e Railway

---

## Legenda de esforço

| Sigla | Descrição |
|---|---|
| P (Pequeno) | 1–2 dias |
| M (Médio) | 3–5 dias |
| G (Grande) | 1–2 semanas |
