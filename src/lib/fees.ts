// Taxas da plataforma Bico — pode ser importado em qualquer lugar (client ou server)

// Taxa cobrada DA EMPRESA em cima do valor proposto
export const PLATFORM_FEE_COMPANY = 0.10   // empresa paga +10%

// Taxa descontada DO FREELANCER no recebimento
export const PLATFORM_FEE_FREELANCER = 0.07  // freelancer recebe -7%

// Valor total que a empresa paga (valor do trabalho + taxa)
export function calcCompanyTotal(jobValue: number) {
  return parseFloat((jobValue * (1 + PLATFORM_FEE_COMPANY)).toFixed(2))
}

// Valor que o freelancer efetivamente recebe
export function calcFreelancerReceives(jobValue: number) {
  return parseFloat((jobValue * (1 - PLATFORM_FEE_FREELANCER)).toFixed(2))
}
