# ─────────────────────────────────────────────────────────────
#  PostAI — Makefile de conveniência
#  Uso: make <comando>
# ─────────────────────────────────────────────────────────────

.PHONY: help up down restart logs db shell-api shell-web shell-db reset-db status

## Exibe esta ajuda
help:
	@echo ""
	@echo "  PostAI — comandos disponíveis"
	@echo ""
	@echo "  make up          → sobe todos os serviços"
	@echo "  make down        → para todos os serviços"
	@echo "  make restart     → restart completo"
	@echo "  make logs        → logs em tempo real (todos)"
	@echo "  make logs-api    → logs apenas da API"
	@echo "  make logs-web    → logs apenas do frontend"
	@echo "  make status      → status dos containers"
	@echo "  make shell-api   → abre shell no container da API"
	@echo "  make shell-web   → abre shell no container do Next.js"
	@echo "  make shell-db    → abre psql no container do Postgres"
	@echo "  make reset-db    → ⚠️  APAGA o banco e recria do zero"
	@echo ""

## Sobe toda a stack
up:
	docker compose up -d --build
	@echo ""
	@echo "  ✓ PostAI rodando!"
	@echo "  → Frontend:  http://localhost:3010"
	@echo "  → API:       http://localhost:3011"
	@echo "  → pgAdmin:   http://localhost:5050"
	@echo "  → Postgres:  localhost:5433"
	@echo ""

## Para todos os containers
down:
	docker compose down

## Restart completo
restart: down up

## Logs em tempo real
logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-web:
	docker compose logs -f web

logs-db:
	docker compose logs -f postgres

## Status dos containers
status:
	docker compose ps

## Shell na API
shell-api:
	docker compose exec api sh

## Shell no Next.js
shell-web:
	docker compose exec web sh

## psql direto no banco
shell-db:
	docker compose exec postgres psql -U postai_user -d postai

## ⚠️  Remove o volume do banco e recria
reset-db:
	@echo "⚠️  ATENÇÃO: isso apagará todos os dados do banco PostAI local."
	@read -p "Confirma? (s/N): " c; [ "$$c" = "s" ] || exit 1
	docker compose down -v
	docker compose up -d postgres
	@echo "Banco recriado. Aguarde alguns segundos para o init.sql rodar."
