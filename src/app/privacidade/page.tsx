import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — Bico',
  description: 'Política de Privacidade e tratamento de dados da plataforma Bico, em conformidade com a LGPD.',
}

export default function PrivacidadePage() {
  const h2Style: React.CSSProperties = {
    fontSize: '1.15rem', fontWeight: 700, color: '#fff',
    margin: '40px 0 12px', letterSpacing: '-0.01em',
    borderLeft: '3px solid #d94e18', paddingLeft: 14,
  }
  const h3Style: React.CSSProperties = {
    fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)',
    margin: '28px 0 8px',
  }
  const pStyle: React.CSSProperties = {
    fontSize: 14, color: 'rgba(185,190,200,0.75)',
    lineHeight: 1.75, margin: '0 0 12px',
  }
  const liStyle: React.CSSProperties = {
    fontSize: 14, color: 'rgba(185,190,200,0.75)',
    lineHeight: 1.75, marginBottom: 6,
  }
  const strongStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.9)' }
  const tableHeaderStyle: React.CSSProperties = {
    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)',
    padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)',
  }
  const tableCellStyle: React.CSSProperties = {
    fontSize: 13, color: 'rgba(185,190,200,0.7)',
    padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    lineHeight: 1.5,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0b0e17',
      fontFamily: 'var(--font-body), Inter, sans-serif',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Bico
          </span>
        </Link>
        <Link href="/termos" style={{ fontSize: 12, color: '#d4783a', textDecoration: 'none', fontWeight: 600 }}>
          Termos de Serviço →
        </Link>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            LGPD — Lei nº 13.709/2018
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 12px' }}>
          Política de Privacidade
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.4)', margin: '0 0 48px' }}>
          Última atualização: 01 de maio de 2026
        </p>

        {/* 1 */}
        <h2 style={h2Style}>1. Quem somos (Controlador)</h2>
        <p style={pStyle}>
          O <strong style={strongStyle}>Bico</strong> é a plataforma responsável pelo tratamento dos seus dados pessoais, na qualidade de <strong style={strongStyle}>Controlador</strong>, conforme definido pela Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). O Bico está sediado no município de <strong style={strongStyle}>Campinas, Estado de São Paulo, Brasil</strong>.
        </p>
        <p style={pStyle}>
          Para dúvidas, solicitações ou exercício dos seus direitos previstos na LGPD, entre em contato pelo canal de suporte disponível dentro da Plataforma.
        </p>

        {/* 2 */}
        <h2 style={h2Style}>2. Dados Que Coletamos</h2>
        <p style={pStyle}>Coletamos apenas os dados estritamente necessários para o funcionamento da Plataforma:</p>

        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Dado</th>
                <th style={tableHeaderStyle}>Finalidade</th>
                <th style={tableHeaderStyle}>Base Legal (LGPD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tableCellStyle}>Nome completo ou nome da empresa</td>
                <td style={tableCellStyle}>Identificação na Plataforma</td>
                <td style={tableCellStyle}>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>Endereço de e-mail</td>
                <td style={tableCellStyle}>Autenticação, comunicações e notificações</td>
                <td style={tableCellStyle}>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>Chave PIX (para saque)</td>
                <td style={tableCellStyle}>Processamento de pagamentos e saques</td>
                <td style={tableCellStyle}>Execução de contrato (art. 7º, V)</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>Descrição profissional (bio)</td>
                <td style={tableCellStyle}>Exibição no perfil público dentro da Plataforma</td>
                <td style={tableCellStyle}>Consentimento (art. 7º, I)</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>Dados de uso (logs, histórico de Jobs)</td>
                <td style={tableCellStyle}>Segurança, prevenção a fraudes e melhoria do serviço</td>
                <td style={tableCellStyle}>Legítimo interesse (art. 7º, IX)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={pStyle}>
          <strong style={strongStyle}>Não coletamos</strong> documentos de identidade, selfies, dados biométricos, informações de saúde, dados bancários completos (agência/conta), CPF ou CNPJ em formulários gerais. A chave PIX informada para saque é o único dado financeiro armazenado.
        </p>

        {/* 3 */}
        <h2 style={h2Style}>3. Como Usamos os Dados</h2>
        <p style={pStyle}>Os dados coletados são utilizados exclusivamente para:</p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}>Criar, autenticar e gerenciar a conta do Usuário;</li>
          <li style={liStyle}>Processar pagamentos e saques via PIX;</li>
          <li style={liStyle}>Enviar notificações sobre o andamento de Jobs;</li>
          <li style={liStyle}>Comunicar alterações nos Termos de Serviço ou nesta Política;</li>
          <li style={liStyle}>Detectar e prevenir fraudes e atividades suspeitas;</li>
          <li style={liStyle}>Cumprir obrigações legais e regulatórias.</li>
        </ul>
        <p style={pStyle}>
          <strong style={strongStyle}>O Bico NÃO utiliza os dados dos Usuários para treinar modelos de inteligência artificial</strong>, vender a parceiros, realizar anúncios direcionados ou qualquer finalidade comercial além da prestação do serviço de intermediação.
        </p>

        {/* 4 */}
        <h2 style={h2Style}>4. Compartilhamento de Dados</h2>
        <p style={pStyle}>
          Os dados dos Usuários são compartilhados <strong style={strongStyle}>exclusivamente</strong> com os seguintes prestadores de serviço técnico, vinculados por contratos de confidencialidade e tratamento de dados:
        </p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}><strong style={strongStyle}>Efí Bank S.A.</strong> — processamento de cobranças e transferências PIX;</li>
          <li style={liStyle}><strong style={strongStyle}>Supabase Inc.</strong> — banco de dados, autenticação e armazenamento de arquivos;</li>
          <li style={liStyle}><strong style={strongStyle}>Vercel Inc.</strong> — hospedagem e entrega da aplicação web.</li>
        </ul>
        <p style={pStyle}>
          O Bico <strong style={strongStyle}>não vende, aluga ou cede</strong> dados pessoais a terceiros para fins comerciais, de marketing ou qualquer outra finalidade não descrita nesta Política.
        </p>
        <p style={pStyle}>
          Dados poderão ser divulgados a autoridades públicas quando exigido por lei, ordem judicial ou processo legal.
        </p>

        {/* 5 */}
        <h2 style={h2Style}>5. Armazenamento e Segurança</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>5.1.</strong> Os dados são armazenados em servidores seguros da Supabase, com criptografia em trânsito (TLS/HTTPS) e em repouso. O acesso é restrito por Row Level Security (RLS) no banco de dados, garantindo que cada Usuário acesse apenas seus próprios dados.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>5.2.</strong> Adotamos práticas de segurança como comparação de tokens resistente a timing attacks, rate limiting por rota e separação de clientes de banco com diferentes níveis de privilégio.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>5.3.</strong> Em caso de incidente de segurança que possa afetar os dados dos Usuários, o Bico notificará os titulares e a Autoridade Nacional de Proteção de Dados (ANPD) nos prazos legais.
        </p>

        {/* 6 */}
        <h2 style={h2Style}>6. Retenção e Exclusão de Dados</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>6.1.</strong> Os dados pessoais são mantidos enquanto a conta estiver ativa ou pelo tempo necessário para cumprir obrigações legais.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>6.2.</strong> Ao excluir a conta, <strong style={strongStyle}>todos os dados pessoais são permanentemente removidos</strong> dos nossos sistemas no prazo de até <strong style={strongStyle}>30 (trinta) dias</strong>. Registros de transações financeiras podem ser mantidos pelo prazo mínimo exigido pela legislação tributária e financeira brasileira (5 anos), de forma anonimizada, sem vinculação ao titular identificado.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>6.3.</strong> Contas encerradas pelo Bico por violação de Termos podem ter dados retidos pelo tempo necessário para investigação e eventual processo judicial ou administrativo.
        </p>

        {/* 7 */}
        <h2 style={h2Style}>7. Seus Direitos como Titular (LGPD)</h2>
        <p style={pStyle}>
          Nos termos da LGPD (art. 18), você tem os seguintes direitos em relação aos seus dados pessoais:
        </p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}><strong style={strongStyle}>Confirmação e acesso:</strong> saber se tratamos seus dados e acessar os dados armazenados;</li>
          <li style={liStyle}><strong style={strongStyle}>Correção:</strong> solicitar a atualização de dados incompletos, inexatos ou desatualizados;</li>
          <li style={liStyle}><strong style={strongStyle}>Portabilidade:</strong> receber seus dados em formato estruturado para transferência a outro serviço;</li>
          <li style={liStyle}><strong style={strongStyle}>Eliminação:</strong> solicitar a exclusão dos dados tratados com base no consentimento;</li>
          <li style={liStyle}><strong style={strongStyle}>Revogação do consentimento:</strong> retirar o consentimento a qualquer tempo, sem prejuízo do tratamento realizado anteriormente;</li>
          <li style={liStyle}><strong style={strongStyle}>Oposição:</strong> opor-se ao tratamento realizado com fundamento em outras bases legais, em caso de descumprimento da LGPD.</li>
        </ul>
        <p style={pStyle}>
          Para exercer qualquer destes direitos, utilize o canal de suporte dentro da Plataforma. Responderemos em até <strong style={strongStyle}>15 (quinze) dias úteis</strong>.
        </p>

        {/* 8 */}
        <h2 style={h2Style}>8. Cookies e Tecnologias de Rastreamento</h2>
        <p style={pStyle}>
          O Bico utiliza <strong style={strongStyle}>cookies de sessão estritamente necessários</strong> para autenticação e funcionamento da Plataforma. Não utilizamos cookies de rastreamento, analytics de terceiros ou pixels de publicidade. Não há coleta de dados para fins de remarketing.
        </p>

        {/* 9 */}
        <h2 style={h2Style}>9. Transferência Internacional de Dados</h2>
        <p style={pStyle}>
          Alguns de nossos prestadores de serviço (Supabase e Vercel) operam com infraestrutura nos Estados Unidos. Ao utilizar a Plataforma, você consente com a transferência dos seus dados para esses países, observadas as garantias previstas no art. 33 da LGPD, incluindo cláusulas contratuais padrão de proteção de dados.
        </p>

        {/* 10 */}
        <h2 style={h2Style}>10. Alterações nesta Política</h2>
        <p style={pStyle}>
          Esta Política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas com pelo menos <strong style={strongStyle}>15 (quinze) dias de antecedência</strong> por e-mail e notificação na Plataforma. O uso contínuo após a comunicação configura aceite das alterações.
        </p>

        {/* 11 */}
        <h2 style={h2Style}>11. Contato e Encarregado (DPO)</h2>
        <p style={pStyle}>
          Para questões relacionadas a privacidade, proteção de dados ou para exercer seus direitos como titular, acesse o canal de <strong style={strongStyle}>Suporte</strong> disponível dentro da Plataforma. Enquanto o Bico não tiver designado formalmente um Encarregado de Dados (DPO), as solicitações de titulares serão tratadas diretamente pela equipe responsável pela operação.
        </p>

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.35)', margin: 0 }}>
            © 2026 Bico. Todos os direitos reservados.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/termos" style={{ fontSize: 12, color: '#d4783a', textDecoration: 'none' }}>Termos de Serviço</Link>
            <Link href="/" style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', textDecoration: 'none' }}>Voltar ao início</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
