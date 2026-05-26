import { demoGuests } from './demoGuests'
import type { Guest, GuestDraft, RsvpPayload } from '../types/guest'
import { normalizePhone } from '../utils/phone'
import { validateRsvp } from '../utils/rsvp'

const STORAGE_KEY = 'mariage-daima.guests.v1'

export type GuestStorage = {
  listGuests(): Promise<Guest[]>
  findByPhone(phone: string): Promise<Guest | null>
  markVisited(guestId: string): Promise<Guest>
  submitRsvp(guestId: string, payload: RsvpPayload): Promise<Guest>
  upsertGuest(draft: GuestDraft, adminPhone?: string): Promise<Guest>
  deactivateGuest(guestId: string, adminPhone?: string): Promise<Guest>
  deleteGuest(guestId: string): Promise<void>
  importCsv(csv: string, adminPhone?: string): Promise<{ imported: number; skipped: number; errors: string[] }>
}

function nowIso(): string {
  return new Date().toISOString()
}

function readGuests(): Guest[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    writeGuests(demoGuests)
    return demoGuests
  }

  try {
    const parsed = JSON.parse(raw) as Guest[]
    return Array.isArray(parsed) ? parsed : demoGuests
  } catch {
    return demoGuests
  }
}

export function getLocalGuestsSnapshot(): Guest[] {
  return readGuests()
}

function writeGuests(guests: Guest[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guests))
}

function ensureUniquePhone(guests: Guest[], normalizedPhone: string, currentId?: string): void {
  const duplicate = guests.find(
    (guest) => guest.normalizedPhone === normalizedPhone && guest.id !== currentId,
  )
  if (duplicate) {
    throw new Error('Ce telephone existe deja dans la liste.')
  }
}

function normalizeDraftPhone(phone: string): string {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    throw new Error('Telephone invalide. Utilisez un numero mobile francais.')
  }
  return normalizedPhone
}

function makeGuest(draft: GuestDraft, adminPhone?: string): Guest {
  const normalizedPhone = normalizeDraftPhone(draft.phone)
  const timestamp = nowIso()
  return {
    id: crypto.randomUUID(),
    phone: normalizedPhone,
    normalizedPhone,
    displayName: draft.displayName?.trim() || undefined,
    isAdmin: Boolean(draft.isAdmin),
    isActive: draft.isActive ?? true,
    hasVisited: false,
    hasValidated: false,
    adultsCount: draft.adultsCount ?? 0,
    attendsCivil: draft.attendsCivil ?? false,
    attendsReligious: draft.attendsReligious ?? false,
    attendsReception: draft.attendsReception ?? false,
    updatedAt: timestamp,
    updatedByAdmin: Boolean(adminPhone),
    updatedByPhone: adminPhone,
  }
}

export const localGuestStorage: GuestStorage = {
  async listGuests() {
    return readGuests()
  },

  async findByPhone(phone) {
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) return null
    return readGuests().find((guest) => guest.normalizedPhone === normalizedPhone && guest.isActive) ?? null
  },

  async markVisited(guestId) {
    const timestamp = nowIso()
    const guests = readGuests()
    const guest = guests.find((item) => item.id === guestId)
    if (!guest) throw new Error('Invite introuvable.')

    guest.hasVisited = true
    guest.firstVisitedAt = guest.firstVisitedAt ?? timestamp
    guest.lastVisitedAt = timestamp
    guest.updatedAt = timestamp
    writeGuests(guests)
    return guest
  },

  async submitRsvp(guestId, payload) {
    const error = validateRsvp(payload)
    if (error) throw new Error(error)

    const timestamp = nowIso()
    const guests = readGuests()
    const guest = guests.find((item) => item.id === guestId)
    if (!guest || !guest.isActive) throw new Error('Invite introuvable.')

    Object.assign(guest, payload, {
      hasValidated: true,
      validatedAt: guest.validatedAt ?? timestamp,
      updatedAt: timestamp,
      updatedByAdmin: false,
      updatedByPhone: guest.normalizedPhone,
    })
    writeGuests(guests)
    return guest
  },

  async upsertGuest(draft, adminPhone) {
    const normalizedPhone = normalizeDraftPhone(draft.phone)
    const guests = readGuests()
    ensureUniquePhone(guests, normalizedPhone, draft.id)

    const payload: RsvpPayload = {
      adultsCount: draft.adultsCount ?? 0,
      attendsCivil: draft.attendsCivil ?? false,
      attendsReligious: draft.attendsReligious ?? false,
      attendsReception: draft.attendsReception ?? false,
    }
    const rsvpError = validateRsvp(payload)
    if (rsvpError) throw new Error(rsvpError)

    if (!draft.id) {
      const guest = makeGuest({ ...draft, phone: normalizedPhone, ...payload }, adminPhone)
      guest.hasValidated = Boolean(draft.hasValidated)
      guest.validatedAt = guest.hasValidated ? guest.updatedAt : undefined
      guests.push(guest)
      writeGuests(guests)
      return guest
    }

    const guest = guests.find((item) => item.id === draft.id)
    if (!guest) throw new Error('Invite introuvable.')

    const nextHasValidated = draft.hasValidated ?? guest.hasValidated

    Object.assign(guest, {
      phone: normalizedPhone,
      normalizedPhone,
      displayName: draft.displayName?.trim() || undefined,
      isAdmin: Boolean(draft.isAdmin),
      isActive: draft.isActive ?? guest.isActive,
      hasValidated: nextHasValidated,
      validatedAt: nextHasValidated ? guest.validatedAt ?? nowIso() : undefined,
      ...payload,
      updatedAt: nowIso(),
      updatedByAdmin: true,
      updatedByPhone: adminPhone,
    })

    writeGuests(guests)
    return guest
  },

  async deactivateGuest(guestId, adminPhone) {
    const guests = readGuests()
    const guest = guests.find((item) => item.id === guestId)
    if (!guest) throw new Error('Invite introuvable.')
    guest.isActive = false
    guest.updatedAt = nowIso()
    guest.updatedByAdmin = true
    guest.updatedByPhone = adminPhone
    writeGuests(guests)
    return guest
  },

  async deleteGuest(guestId) {
    const guests = readGuests().filter((guest) => guest.id !== guestId)
    writeGuests(guests)
  },

  async importCsv(csv, adminPhone) {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length <= 1) {
      return { imported: 0, skipped: 0, errors: ['CSV vide ou sans donnees.'] }
    }

    const headers = lines[0].split(',').map((header) => header.trim())
    const phoneIndex = headers.indexOf('phone')
    const displayNameIndex = headers.indexOf('displayName')
    const isAdminIndex = headers.indexOf('isAdmin')
    const errors: string[] = []
    let imported = 0
    let skipped = 0

    if (phoneIndex < 0) {
      return { imported: 0, skipped: lines.length - 1, errors: ['Colonne phone manquante.'] }
    }

    for (const [index, line] of lines.slice(1).entries()) {
      const columns = line.split(',').map((column) => column.trim())
      try {
        await this.upsertGuest(
          {
            phone: columns[phoneIndex],
            displayName: displayNameIndex >= 0 ? columns[displayNameIndex] : undefined,
            isAdmin: isAdminIndex >= 0 ? columns[isAdminIndex].toLowerCase() === 'true' : false,
          },
          adminPhone,
        )
        imported += 1
      } catch (error) {
        skipped += 1
        errors.push(`Ligne ${index + 2}: ${error instanceof Error ? error.message : 'erreur inconnue'}`)
      }
    }

    return { imported, skipped, errors }
  },
}
