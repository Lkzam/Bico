import Link from 'next/link'

export const metadata = {
  title: 'Termos de Serviço — Bico',
  description: 'Termos de Serviço e Uso da plataforma Bico.',
}

export default function TermosPage() {
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
  const highlightStyle: React.CSSProperties = {
    display: 'block', padding: '14px 18px',
    background: 'rgba(217,78,24,0.08)',
    border: '1px solid rgba(217,78,24,0.2)',
    borderLeft: '3px solid #d94e18',
    fontSize: 13, color: 'rgba(185,190,200,0.8)', lineHeight: 1.65,
    margin: '16px 0',
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
        <Link href="/privacidade" style={{ fontSize: 12, color: '#d4783a', textDecoration: 'none', fontWeight: 600 }}>
          Política de Privacidade →
        </Link>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Documento legal
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 12px' }}>
          Termos de Serviço e Uso
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.4)', margin: '0 0 48px' }}>
          Última atualização: 01 de maio de 2026
        </p>

        {/* Aviso inicial */}
        <span style={highlightStyle}>
          Leia este documento com atenção antes de criar sua conta. Ao se cadastrar na plataforma Bico, você declara ter lido, compreendido e concordado com todos os termos abaixo. Caso não concorde, não utilize o serviço.
        </span>

        {/* 1 */}
        <h2 style={h2Style}>1. Das Partes e das Definições</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>1.1.</strong> A plataforma <strong style={strongStyle}>Bico</strong> é um serviço de marketplace digital que conecta empresas contratantes a profissionais freelancers para realização de trabalhos pontuais. O serviço é operado por pessoa jurídica em processo de constituição, com sede no município de <strong style={strongStyle}>Campinas, Estado de São Paulo</strong>, doravante denominada simplesmente <strong style={strongStyle}>"Bico"</strong> ou <strong style={strongStyle}>"Plataforma"</strong>.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>1.2.</strong> Para fins destes Termos, considera-se:
        </p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}><strong style={strongStyle}>Empresa:</strong> pessoa física ou jurídica que publica trabalhos e contrata freelancers pela Plataforma;</li>
          <li style={liStyle}><strong style={strongStyle}>Freelancer:</strong> profissional autônomo que aceita e executa trabalhos publicados pelas Empresas;</li>
          <li style={liStyle}><strong style={strongStyle}>Usuário:</strong> qualquer pessoa cadastrada na Plataforma, independentemente do papel;</li>
          <li style={liStyle}><strong style={strongStyle}>Job:</strong> trabalho ou serviço publicado por uma Empresa e disponível para aceitação por Freelancers;</li>
          <li style={liStyle}><strong style={strongStyle}>Escrow:</strong> valor mantido em custódia pela Plataforma após o pagamento de um Job, liberado ao Freelancer somente após aprovação da entrega pela Empresa;</li>
          <li style={liStyle}><strong style={strongStyle}>Saldo:</strong> crédito disponível na conta do Freelancer, oriundo de Jobs aprovados, passível de saque mediante solicitação.</li>
        </ul>

        {/* 2 */}
        <h2 style={h2Style}>2. Aceite e Vigência</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>2.1.</strong> O aceite destes Termos ocorre no momento do cadastro na Plataforma, mediante marcação da caixa de consentimento. Ao aceitar, o Usuário manifesta concordância livre, expressa e informada.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>2.2.</strong> O Bico se reserva o direito de alterar estes Termos a qualquer momento. Alterações serão comunicadas com pelo menos <strong style={strongStyle}>15 (quinze) dias de antecedência</strong> por e-mail e/ou notificação no sistema. O uso contínuo da Plataforma após o prazo configura novo aceite.
        </p>

        {/* 3 */}
        <h2 style={h2Style}>3. Elegibilidade e Cadastro</h2>
        <h3 style={h3Style}>3.1 Idade mínima</h3>
        <p style={pStyle}>
          O uso da Plataforma é <strong style={strongStyle}>recomendado apenas para maiores de 18 anos</strong>. Menores de idade podem utilizar o serviço sob exclusiva responsabilidade de seus pais ou responsáveis legais, que devem autorizar expressamente o uso, nos termos do art. 1.634 do Código Civil Brasileiro e da Lei nº 8.069/1990 (ECA). O Bico não realiza verificação de idade e não se responsabiliza pelo acesso indevido de menores.
        </p>
        <h3 style={h3Style}>3.2 Veracidade das informações</h3>
        <p style={pStyle}>
          O Usuário é inteiramente responsável pela veracidade das informações fornecidas no cadastro. O fornecimento de dados falsos pode resultar em suspensão ou encerramento imediato da conta, sem direito a reembolso ou saque de saldo retido.
        </p>
        <h3 style={h3Style}>3.3 Segurança da conta</h3>
        <p style={pStyle}>
          O Usuário é o único responsável pela guarda e sigilo de suas credenciais de acesso. O Bico não se responsabiliza por acessos não autorizados decorrentes de negligência do próprio Usuário.
        </p>

        {/* 4 */}
        <h2 style={h2Style}>4. Funcionamento da Plataforma</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>4.1.</strong> O Bico atua exclusivamente como <strong style={strongStyle}>intermediário tecnológico</strong>, fornecendo a infraestrutura para que Empresas e Freelancers se conectem, negociem e transacionem. O Bico não é parte contratante das obrigações estabelecidas entre Empresas e Freelancers, salvo no que diz respeito à custódia dos valores em escrow.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>4.2.</strong> A Plataforma opera exclusivamente no território <strong style={strongStyle}>nacional (Brasil)</strong>. Jobs presenciais estão sujeitos à legislação do local onde o serviço é prestado.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>4.3.</strong> O Bico não garante disponibilidade ininterrupta do serviço e pode realizar manutenções programadas ou emergenciais sem aviso prévio.
        </p>

        {/* 5 */}
        <h2 style={h2Style}>5. Serviços Permitidos e Proibidos</h2>
        <h3 style={h3Style}>5.1 Usos permitidos</h3>
        <p style={pStyle}>
          É permitida a publicação e execução de trabalhos lícitos, de natureza profissional, que possam ser entregues de forma digital ou presencial dentro do Brasil, e cujo valor mínimo seja de <strong style={strongStyle}>R$ 10,00 (dez reais)</strong>.
        </p>
        <h3 style={h3Style}>5.2 Usos expressamente proibidos</h3>
        <p style={pStyle}>É vedado o uso da Plataforma para:</p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}>Publicar ou executar serviços de <strong style={strongStyle}>conteúdo adulto, sexual ou erótico</strong>;</li>
          <li style={liStyle}>Atividades <strong style={strongStyle}>ilegais</strong> de qualquer natureza, incluindo pirataria, fraude, lavagem de dinheiro, evasão fiscal e similares;</li>
          <li style={liStyle}><strong style={strongStyle}>Jogos de azar</strong>, apostas ou qualquer serviço que contrarie a legislação brasileira de entretenimento;</li>
          <li style={liStyle}>Serviços que exijam <strong style={strongStyle}>habilitação profissional regulamentada</strong> pelo Conselho correspondente e cuja contratação informal seja proibida por lei (ex.: emissão de laudos médicos, representação legal em juízo, elaboração de projetos de engenharia sem ART);</li>
          <li style={liStyle}>Qualquer atividade que viole direitos de terceiros, legislação em vigor ou as normas destes Termos.</li>
        </ul>
        <p style={pStyle}>
          O descumprimento desta cláusula enseja encerramento imediato da conta, sem direito a saque de saldo, e pode ser comunicado às autoridades competentes.
        </p>

        {/* 6 */}
        <h2 style={h2Style}>6. Taxas e Pagamentos</h2>
        <h3 style={h3Style}>6.1 Modelo de receita</h3>
        <p style={pStyle}>A Plataforma cobra as seguintes taxas pela prestação do serviço de intermediação:</p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}><strong style={strongStyle}>Taxa da Empresa:</strong> 10% (dez por cento) sobre o valor do Job, cobrado no momento do pagamento. Exemplo: para um Job de R$ 100,00, a Empresa pagará R$ 110,00;</li>
          <li style={liStyle}><strong style={strongStyle}>Taxa do Freelancer:</strong> 7% (sete por cento) sobre o valor do Job, descontado no momento do saque. Exemplo: para um Job de R$ 100,00, o Freelancer sacará R$ 93,00.</li>
        </ul>
        <p style={pStyle}>
          <strong style={strongStyle}>6.2.</strong> As taxas são informadas ao Usuário antes de cada transação, de forma clara e transparente.
        </p>
        <h3 style={h3Style}>6.3 Sistema de escrow</h3>
        <p style={pStyle}>
          O pagamento realizado pela Empresa é retido em custódia (escrow) e liberado ao Freelancer somente após aprovação expressa da entrega pela Empresa, ou automaticamente após <strong style={strongStyle}>5 (cinco) horas</strong> do recebimento do pagamento sem manifestação da Empresa.
        </p>
        <h3 style={h3Style}>6.4 Chargeback e estornos</h3>
        <p style={pStyle}>
          Em caso de chargeback, contestação bancária ou estorno determinado por autoridade competente, o Bico poderá, a seu exclusivo critério, reembolsar o valor do Job à Empresa, <strong style={strongStyle}>descontada a taxa da Empresa já incidida</strong>. O Bico não garante reembolso em todos os casos, ficando sujeito à análise individual. O saldo do Freelancer poderá ser bloqueado durante a análise do caso.
        </p>
        <h3 style={h3Style}>6.5 Saldo do Freelancer</h3>
        <p style={pStyle}>
          O saldo aprovado na conta do Freelancer <strong style={strongStyle}>não possui prazo de expiração</strong> durante a operação normal da Plataforma. O Freelancer pode solicitar o saque a qualquer tempo, observadas as condições da cláusula 10 (Encerramento da Plataforma).
        </p>

        {/* 7 */}
        <h2 style={h2Style}>7. Cancelamentos e Disputas</h2>
        <h3 style={h3Style}>7.1 Cancelamento de Jobs</h3>
        <p style={pStyle}>
          Tanto a Empresa quanto o Freelancer podem cancelar um Job nas fases <em>Aberto</em> ou <em>Em andamento</em>, mediante informação de <strong style={strongStyle}>justificativa obrigatória</strong>. O motivo do cancelamento será comunicado à outra parte.
        </p>
        <h3 style={h3Style}>7.2 Política de disputas</h3>
        <p style={pStyle}>
          Em caso de divergência sobre a qualidade ou conformidade da entrega, a Empresa pode abrir uma <strong style={strongStyle}>contestação</strong> na Plataforma. O Bico atuará como <strong style={strongStyle}>facilitador e mediador</strong> da disputa, mas <strong style={strongStyle}>não se responsabiliza pela decisão final</strong> nem garante resultado favorável a nenhuma das partes. O pagamento ficará retido em escrow durante a análise. O Bico se reserva o direito de cancelar o Job e reembolsar a Empresa ou liberar o pagamento ao Freelancer conforme sua análise, sem que isso gere qualquer obrigação de indenização pela Plataforma.
        </p>
        <h3 style={h3Style}>7.3 Ausência de garantia de qualidade</h3>
        <p style={pStyle}>
          O Bico <strong style={strongStyle}>não garante a qualidade, o prazo ou o resultado</strong> dos serviços prestados pelos Freelancers. A relação de prestação de serviços é estabelecida diretamente entre Empresa e Freelancer, sendo responsabilidade das partes a negociação e avaliação das entregas.
        </p>

        {/* 8 */}
        <h2 style={h2Style}>8. Responsabilidades e Limitações</h2>
        <h3 style={h3Style}>8.1 Responsabilidade do Freelancer</h3>
        <p style={pStyle}>
          O Freelancer é o <strong style={strongStyle}>único e exclusivo responsável</strong> pelo conteúdo que entrega, incluindo, mas não se limitando a:
        </p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}>Plágio, cópia ou violação de direitos autorais de terceiros;</li>
          <li style={liStyle}>Violação de marcas registradas, patentes ou segredos industriais;</li>
          <li style={liStyle}>Qualquer conteúdo ilegal ou que viole direitos de personalidade de terceiros;</li>
          <li style={liStyle}>Cumprimento de suas obrigações fiscais e previdenciárias como profissional autônomo.</li>
        </ul>
        <p style={pStyle}>
          O Bico <strong style={strongStyle}>não é solidariamente responsável</strong> por infrações cometidas pelo Freelancer na execução dos serviços.
        </p>
        <h3 style={h3Style}>8.2 Jobs presenciais</h3>
        <p style={pStyle}>
          Para Jobs de natureza presencial, o Bico <strong style={strongStyle}>não se responsabiliza por despesas de deslocamento, acomodação, alimentação ou quaisquer outros custos</strong> incorridos pelo Freelancer, nem por <strong style={strongStyle}>acidentes, danos físicos, materiais ou morais</strong> que venham a ocorrer durante a prestação do serviço. A segurança pessoal dos envolvidos é de exclusiva responsabilidade das partes.
        </p>
        <h3 style={h3Style}>8.3 Limitação de responsabilidade do Bico</h3>
        <p style={pStyle}>
          Na máxima extensão permitida pela legislação aplicável, a responsabilidade do Bico por quaisquer danos decorrentes do uso da Plataforma limita-se ao <strong style={strongStyle}>valor das taxas efetivamente pagas pelo Usuário nos 30 (trinta) dias anteriores ao evento danoso</strong>. O Bico não responde por lucros cessantes, danos indiretos ou danos morais decorrentes de falhas na intermediação.
        </p>

        {/* 9 */}
        <h2 style={h2Style}>9. Propriedade Intelectual</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>9.1.</strong> Todo o conteúdo da Plataforma (marca, identidade visual, código, textos, design) é de propriedade exclusiva do Bico e está protegido pela legislação de propriedade intelectual vigente.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>9.2.</strong> O Usuário não adquire qualquer direito sobre a Plataforma além do direito de uso pessoal e intransferível durante a vigência destes Termos.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>9.3.</strong> O Freelancer declara e garante que detém todos os direitos necessários sobre o trabalho entregue, ou que possui autorização dos titulares para entregá-lo, isentando o Bico de qualquer responsabilidade por violações de propriedade intelectual.
        </p>

        {/* 10 */}
        <h2 style={h2Style}>10. Suspensão e Encerramento de Contas</h2>
        <h3 style={h3Style}>10.1 Encerramento pelo Usuário</h3>
        <p style={pStyle}>
          O Usuário pode encerrar sua conta a qualquer momento. Ao fazê-lo, <strong style={strongStyle}>todos os dados pessoais serão permanentemente excluídos</strong>, observado o prazo de até 30 dias para processamento técnico, conforme a Lei nº 13.709/2018 (LGPD). Jobs em andamento com pagamento retido em escrow serão cancelados e o valor reembolsado à Empresa antes da exclusão.
        </p>
        <h3 style={h3Style}>10.2 Encerramento pelo Bico</h3>
        <p style={pStyle}>
          O Bico pode suspender ou encerrar uma conta, a qualquer tempo e sem aviso prévio, nos seguintes casos:
        </p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <li style={liStyle}>Suspeita ou confirmação de fraude, golpe ou estelionato;</li>
          <li style={liStyle}>Violação de qualquer cláusula destes Termos;</li>
          <li style={liStyle}>Recebimento de múltiplas denúncias fundamentadas de outros Usuários;</li>
          <li style={liStyle}>Determinação judicial ou de autoridade administrativa competente.</li>
        </ul>
        <p style={pStyle}>
          <strong style={strongStyle}>Contas encerradas por violação não têm direito a saque de saldo remanescente.</strong> O Bico poderá reter os valores como medida cautelar ou repassá-los à parte prejudicada, a seu exclusivo critério.
        </p>

        {/* 11 */}
        <h2 style={h2Style}>11. Encerramento da Plataforma</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>11.1.</strong> Em caso de encerramento definitivo das operações do Bico, todos os Usuários serão notificados com antecedência <strong style={strongStyle}>mínima de 30 (trinta) dias</strong> por e-mail e notificação no sistema.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>11.2.</strong> Freelancers com saldo disponível deverão solicitar o saque dentro do prazo estipulado na comunicação. <strong style={strongStyle}>Saldos não sacados até a data de encerramento serão perdidos</strong>, sem direito a reclamação posterior. O Bico não se responsabiliza por saldos não sacados por inércia do Freelancer dentro do prazo concedido.
        </p>

        {/* 12 */}
        <h2 style={h2Style}>12. Disposições Gerais</h2>
        <p style={pStyle}>
          <strong style={strongStyle}>12.1 Lei aplicável.</strong> Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo o Código Civil, o Código de Defesa do Consumidor (Lei nº 8.078/1990), o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>12.2 Foro.</strong> Fica eleito o foro da <strong style={strongStyle}>Comarca de Campinas, Estado de São Paulo</strong>, para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>12.3 Independência das cláusulas.</strong> Se qualquer disposição destes Termos for declarada inválida ou inaplicável, as demais disposições permanecerão em pleno vigor.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>12.4 Contato.</strong> Para dúvidas sobre estes Termos, entre em contato pelo canal de suporte disponível na Plataforma.
        </p>

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.35)', margin: 0 }}>
            © 2026 Bico. Todos os direitos reservados.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/privacidade" style={{ fontSize: 12, color: '#d4783a', textDecoration: 'none' }}>Política de Privacidade</Link>
            <Link href="/" style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', textDecoration: 'none' }}>Voltar ao início</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
