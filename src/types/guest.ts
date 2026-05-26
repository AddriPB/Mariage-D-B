export type EventKey = 'civil' | 'religious' | 'reception'

export type Guest = {
  id: string
  phone: string
  normalizedPhone: string
  displayName?: string
  isAdmin?: boolean
  isActive: boolean
  hasVisited: boolean
  firstVisitedAt?: string
  lastVisitedAt?: string
  hasValidated: boolean
  validatedAt?: string
  updatedAt?: string
  updatedByAdmin?: boolean
  updatedByPhone?: string
  adultsCount: number
  attendsCivil: boolean
  attendsReligious: boolean
  attendsReception: boolean
}

export type RsvpPayload = Pick<
  Guest,
  | 'adultsCount'
  | 'attendsCivil'
  | 'attendsReligious'
  | 'attendsReception'
>

export type GuestDraft = {
  id?: string
  phone: string
  displayName?: string
  isAdmin?: boolean
  isActive?: boolean
  hasValidated?: boolean
} & Partial<RsvpPayload>

export type AccessSession =
  | { kind: 'guest'; phone: string; guestId: string }
  | { kind: 'admin'; phone: string; guestId: string }
