# 📋 Backlog do Agente — Bico / FreelaBR

Este arquivo é a "lista de tarefas na mesa" do agente autônomo.
A cada execução agendada, o agente:
1. Lê a seção **A Fazer** de cima pra baixo.
2. Pega a **primeira** tarefa não bloqueada.
3. Implementa, testa e commita.
4. Move a tarefa para **Concluído** com data e link do commit.
5. Se acabar o tempo/limite no meio, deixa anotado em **Em andamento** o que já fez.

## Regras para o agente
- Trabalhe SEMPRE numa branch `agent/<slug-da-tarefa>` e abra PR — nunca faça push direto na `master`.
- Se uma tarefa estiver ambígua, NÃO invente: mova para **Precisa de decisão** e explique a dúvida.
- Rode os testes/linter antes de commitar. Se quebrar, conserte antes de seguir.
- Um commit por passo lógico, mensagens claras em português.
- Nunca mexa em segredos, `.env`, chaves da Efí/Pagar.me ou dados de produção.

---

## 🟢 A Fazer
<!-- Adicione tarefas aqui, uma por bloco. Formato: -->

### [ ] Cobrir o helper de validação com testes
**Objetivo:** Adicionar testes unitários para `src/lib/validation.ts`, garantindo que os schemas reutilizáveis funcionam.
**Critério de pronto:**
- Teste novo cobre `moneyAmountCoerced` (aceita `100`, `"100.50"`; rejeita `0`, negativos, mais de 2 casas, acima de 1.000.000) e `uuid` (aceita um uuid válido; rejeita `"123"`).
- `npm test` passa com os testes novos verdes.
**Contexto/arquivos:** `src/lib/validation.ts`, seguir o estilo de `src/lib/__tests__/fees.test.ts`.
**Prioridade:** média

### [ ] Remover seção obsoleta "Migração Pendente" do CLAUDE.md
**Objetivo:** O `CLAUDE.md` tem uma seção "## Migração Pendente ⚠️" que já foi aplicada no banco (registrada como aplicada em `supabase/MIGRATIONS.md`). Remover para não confundir.
**Critério de pronto:**
- A seção "## Migração Pendente ⚠️" é removida de `freela-app/CLAUDE.md`.
- Nada mais é alterado no arquivo.
**Contexto/arquivos:** `freela-app/CLAUDE.md`, conferir `supabase/MIGRATIONS.md` para confirmar que já está aplicada.
**Prioridade:** baixa

---

## 🟡 Em andamento
<!-- O agente escreve aqui o que está no meio quando o limite/tempo acaba. -->

---

## 🔴 Precisa de decisão (bloqueadas)
<!-- Tarefas que o agente parou porque precisam de você decidir algo. -->

---

## ✅ Concluído
<!-- O agente move as tarefas prontas pra cá, com data e link do PR/commit. -->

### [x] Aplicar validação zod em cancel e edit de jobs — 2026-07-01
Rotas `cancel` e `edit` de jobs agora validam entrada com `parseBody` + zod
(reason opcional máx 2000; title/description/deadline_hours/work_type/address;
`value` continua imutável). `npm test` passa (40 testes); sem novos erros de lint.
PR: https://github.com/Lkzam/Bico/pull/2

### [x] Forçar `rating` a ser inteiro de 1 a 5 em avaliações — 2026-07-01
Concluída em rodada anterior (branch `agent/rating-int-validation`). Já tem PR
aberto aguardando revisão do dono. Registrada aqui para evitar retrabalho/duplicação.
PR: https://github.com/Lkzam/Bico/pull/1
