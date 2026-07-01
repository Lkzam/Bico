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

### [ ] Exemplo — trocar este bloco pela sua primeira tarefa real
**Objetivo:** descreva o que você quer pronto.
**Critério de pronto:** como saber que terminou (ex: "tela X abre e salva no Supabase").
**Contexto/arquivos:** dicas de onde mexer, se souber.
**Prioridade:** alta / média / baixa

---

## 🟡 Em andamento
<!-- O agente escreve aqui o que está no meio quando o limite/tempo acaba. -->

---

## 🔴 Precisa de decisão (bloqueadas)
<!-- Tarefas que o agente parou porque precisam de você decidir algo. -->

---

## ✅ Concluído
<!-- O agente move as tarefas prontas pra cá, com data e link do PR/commit. -->
