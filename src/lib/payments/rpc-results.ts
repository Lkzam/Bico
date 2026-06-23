// Contratos (shapes) dos RPCs de dinheiro do Postgres.
// Fonte única de verdade para o que cada função retorna em jsonb — usado pelas
// rotas que aprovam/creditam para evitar `any` no boundary financeiro.

/** accept_contract_proposal(p_proposal_id, p_company_profile_id) */
export interface AcceptContractResult {
  ok: boolean
  job_id?: string
  value?: number
  error?: string
}

/** accept_proposal(p_proposal_id, p_company_profile_id) */
export interface AcceptProposalResult {
  ok: boolean
  chat_id?: string
  chat_created?: boolean
  freelancer_id?: string
  error?: string
}

/** approve_milestone(p_milestone_id, p_company_profile_id) */
export interface ApproveMilestoneResult {
  ok: boolean
  credited?: number
  all_approved?: boolean
  job_id?: string
  freelancer_id?: string
  error?: string
}

/** fund_contract(p_job_id) — chamado pós-PIX (webhook/reconciliação) */
export interface FundContractResult {
  ok: boolean
  chat_id?: string
  already?: boolean
  error?: string
}
