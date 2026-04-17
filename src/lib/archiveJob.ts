import { createAdminClient } from './supabase/admin'
import { calcFreelancerReceives } from './fees'

/**
 * Arquiva um job concluído e limpa todos os dados relacionados:
 * - Compila o log de chat em JSON (para auditoria)
 * - Deleta arquivos do Storage (chat-files + deliveries)
 * - Deleta mensagens e sala de chat
 * - Deleta o registro de pagamento
 * - Deleta o job
 *
 * Deve ser chamado APÓS o freelancer já ter sido creditado.
 */
/** Retorna o id do registro criado em job_archives */
export async function archiveAndCleanJob(jobId: string): Promise<string> {
  const admin = createAdminClient()

  // ── 1. Busca snapshot completo do job ─────────────────────────────────────
  const { data: job } = await admin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (!job) throw new Error(`archiveJob: job ${jobId} não encontrado`)

  // ── 2. Busca snapshot do pagamento ────────────────────────────────────────
  const { data: payment } = await admin
    .from('payments')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()

  const freelancerReceived = payment
    ? calcFreelancerReceives(payment.job_value ?? job.value)
    : null

  // ── 3. Busca chat e compila log de mensagens ───────────────────────────────
  const { data: chat } = await admin
    .from('chats')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle()

  let chatLog: any[] = []
  const chatFileStoragePaths: string[] = []

  if (chat) {
    const { data: messages } = await admin
      .from('messages')
      .select('id, content, file_url, file_name, file_type, created_at, sender_id, sender:profiles(name, role)')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })

    // Monta log legível
    chatLog = (messages ?? []).map((m: any) => ({
      id:          m.id,
      sender_name: m.sender?.name ?? 'Desconhecido',
      sender_role: m.sender?.role ?? 'unknown',
      content:     m.content ?? null,
      file_url:    m.file_url ?? null,
      file_name:   m.file_name ?? null,
      file_type:   m.file_type ?? null,
      sent_at:     m.created_at,
    }))

    // Coleta caminhos dos arquivos do chat para deletar do Storage
    for (const m of messages ?? []) {
      if (m.file_url) {
        // URL pública: https://xxx.supabase.co/storage/v1/object/public/chat-files/PATH
        const match = m.file_url.split('/chat-files/')
        if (match[1]) chatFileStoragePaths.push(match[1])
      }
    }
  }

  // ── 4. Salva o arquivo histórico ──────────────────────────────────────────
  const { data: insertedArchive } = await admin.from('job_archives').insert({
    job_id:            job.id,
    company_id:        job.company_id,
    freelancer_id:     job.freelancer_id,
    title:             job.title,
    description:       job.description ?? null,
    value:             job.value,
    freelancer_received: freelancerReceived,
    auto_approved:     !!job.auto_approved_at,
    job_data:          job,
    payment_data:      payment ?? null,
    chat_log:          chatLog,
    job_created_at:    job.created_at,
    completed_at:      job.completed_at ?? new Date().toISOString(),
  }).select('id').single()

  // ── 5. Deleta arquivos do chat no Storage ─────────────────────────────────
  if (chatFileStoragePaths.length > 0) {
    const { error: chatFilesErr } = await admin.storage
      .from('chat-files')
      .remove(chatFileStoragePaths)

    if (chatFilesErr) {
      console.error('[archiveJob] Erro ao deletar chat-files:', chatFilesErr)
    }
  }

  // ── 6. Deleta arquivo de entrega do Storage ───────────────────────────────
  if (job.delivery_url) {
    const { error: deliveryErr } = await admin.storage
      .from('deliveries')
      .remove([job.delivery_url])

    if (deliveryErr) {
      console.error('[archiveJob] Erro ao deletar delivery file:', deliveryErr)
    }
  }

  // ── 7. Deleta mensagens e sala de chat ────────────────────────────────────
  if (chat) {
    await admin.from('messages').delete().eq('chat_id', chat.id)
    await admin.from('chats').delete().eq('id', chat.id)
  }

  // ── 8. Deleta pagamento ───────────────────────────────────────────────────
  if (payment) {
    await admin.from('payments').delete().eq('id', payment.id)
  }

  // ── 9. Deleta o job ───────────────────────────────────────────────────────
  await admin.from('jobs').delete().eq('id', jobId)

  console.log(`[archiveJob] Job ${jobId} arquivado e limpo. Archive ID: ${insertedArchive?.id}. Chat: ${chatLog.length} mensagens.`)

  return insertedArchive?.id ?? ''
}
