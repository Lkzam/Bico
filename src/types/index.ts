export type UserRole = 'company' | 'freelancer'

export type JobStatus = 'open' | 'in_progress' | 'delivered' | 'completed' | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'released' | 'withdrawn'

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  name: string
  bio: string | null
  avatar_url: string | null
  rating: number
  rating_count: number
  created_at: string
}

export interface CompanyProfile extends Profile {
  role: 'company'
  website: string | null
  cnpj: string | null
}

export interface FreelancerProfile extends Profile {
  role: 'freelancer'
  cpf: string | null
  pix_key: string | null
  portfolio_url: string | null
  balance: number
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export interface Job {
  id: string
  company_id: string
  title: string
  description: string
  value: number
  status: JobStatus
  deadline_hours: number | null
  tags: Tag[]
  company?: CompanyProfile
  freelancer_id?: string | null
  freelancer?: FreelancerProfile
  created_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export interface Chat {
  id: string
  job_id: string
  company_id: string
  freelancer_id: string
  created_at: string
  job?: Job
  messages?: Message[]
}

export interface Review {
  id: string
  job_id: string
  reviewer_id: string
  reviewee_id: string
  stars: number
  comment: string | null
  created_at: string
}

export interface Payment {
  id: string
  job_id: string
  amount: number
  fee: number
  freelancer_amount: number
  status: PaymentStatus
  abacatepay_id: string | null
  created_at: string
}
