import {
  deleteFirestoreRestDocument,
  getCurrentUserIdToken,
  getFirestoreRestDocument,
  listFirestoreRestDocuments,
  patchFirestoreRestDocument,
} from '../firebase'
import type { Guest, RsvpPayload } from '../types/guest'
import { normalizePhone } from '../utils/phone'
import { validateRsvp } from '../utils/rsvp'
import type { GuestStorage } from './guestStorage'

function nowIso(): string {
  return new Date().toISOString()
}

function guestIdFromPhone(normalizedPhone: string): string {
  return normalizedPhone.replace(/\D/g, '')
}

function normalizeDraftPhone(phone: string): string {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    throw new Error('Téléphone invalide. Utilisez un numéro mobile français.')
  }
  return normalizedPhone
}

function guestDocPath(id: string): string {
  return `guests/${id}`
}

function normalizeGuest(id: string, data: Partial<Guest>): Guest {
  const normalizedPhone = data.normalizedPhone ?? data.phone
  if (!normalizedPhone) {
    throw new Error('Invité invalide.')
  }

  return {
    id,
    phone: normalizedPhone,
    normalizedPhone,
    displayName: data.displayName,
    isAdmin: Boolean(data.isAdmin),
    isActive: data.isActive ?? true,
    hasVisited: Boolean(data.hasVisited),
    firstVisitedAt: data.firstVisitedAt,
    lastVisitedAt: data.lastVisitedAt,
    hasValidated: Boolean(data.hasValidated),
    validatedAt: data.validatedAt,
    updatedAt: data.updatedAt,
    updatedByAdmin: Boolean(data.updatedByAdmin),
    updatedByPhone: data.updatedByPhone,
    adultsCount: data.adultsCount ?? 0,
    attendsCivil: Boolean(data.attendsCivil),
    attendsReligious: Boolean(data.attendsReligious),
    attendsReception: Boolean(data.attendsReception),
  }
}

async function readGuestById(id: string): Promise<Guest> {
  const data = await getFirestoreRestDocument(guestDocPath(id), await getCurrentUserIdToken())
  if (!data) {
    throw new Error('Invité introuvable.')
  }
  return normalizeGuest(id, data as Partial<Guest>)
}

export const firestoreGuestStorage: GuestStorage = {
  async listGuests() {
    const idToken = await getCurrentUserIdToken()
    const documents = await listFirestoreRestDocuments('guests', idToken)
    const guests: Guest[] = []
    let skippedInvalidGuests = 0

    for (const document of documents) {
      try {
        guests.push(normalizeGuest(document.id, document.data as Partial<Guest>))
      } catch {
        skippedInvalidGuests += 1
      }
    }

    if (skippedInvalidGuests > 0) {
      console.error('[guest-storage]', {
        stage: 'list-guests-normalize',
        skippedInvalidGuests,
      })
    }

    return guests
  },

  async findByPhone(phone) {
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) return null

    const id = guestIdFromPhone(normalizedPhone)
    const data = await getFirestoreRestDocument(guestDocPath(id), await getCurrentUserIdToken())
    if (!data) return null

    const guest = normalizeGuest(id, data as Partial<Guest>)
    if (!guest.isActive || guest.normalizedPhone !== normalizedPhone) return null
    return guest
  },

  async markVisited(guestId) {
    const guest = await readGuestById(guestId)
    if (!guest.isActive) throw new Error('Invité introuvable.')

    const timestamp = nowIso()
    const update = {
      hasVisited: true,
      firstVisitedAt: guest.firstVisitedAt ?? timestamp,
      lastVisitedAt: timestamp,
      updatedAt: timestamp,
    }
    await patchFirestoreRestDocument(guestDocPath(guestId), update, {
      idToken: await getCurrentUserIdToken(),
      updateMask: Object.keys(update),
    })
    return { ...guest, ...update }
  },

  async submitRsvp(guestId, payload) {
    const error = validateRsvp(payload)
    if (error) throw new Error(error)

    const guest = await readGuestById(guestId)
    if (!guest.isActive) throw new Error('Invité introuvable.')

    const timestamp = nowIso()
    const update = {
      ...payload,
      hasValidated: true,
      validatedAt: guest.validatedAt ?? timestamp,
      updatedAt: timestamp,
      updatedByAdmin: false,
      updatedByPhone: guest.normalizedPhone,
    }
    await patchFirestoreRestDocument(guestDocPath(guestId), update, {
      idToken: await getCurrentUserIdToken(),
      updateMask: Object.keys(update),
    })
    return { ...guest, ...update }
  },

  async upsertGuest(draft, adminPhone) {
    const normalizedPhone = normalizeDraftPhone(draft.phone)
    const id = guestIdFromPhone(normalizedPhone)
    const payload: RsvpPayload = {
      adultsCount: draft.adultsCount ?? 0,
      attendsCivil: draft.attendsCivil ?? false,
      attendsReligious: draft.attendsReligious ?? false,
      attendsReception: draft.attendsReception ?? false,
    }
    const rsvpError = validateRsvp(payload)
    if (rsvpError) throw new Error(rsvpError)

    const idToken = await getCurrentUserIdToken()
    if (draft.id && draft.id !== id) {
      const duplicate = await getFirestoreRestDocument(guestDocPath(id), idToken)
      if (duplicate) throw new Error('Ce téléphone existe déjà dans la liste.')
      await deleteFirestoreRestDocument(guestDocPath(draft.id), idToken)
    }

    const currentData = await getFirestoreRestDocument(guestDocPath(id), idToken)
    const current = currentData ? normalizeGuest(id, currentData as Partial<Guest>) : null
    const timestamp = nowIso()
    const guest: Guest = {
      id,
      phone: normalizedPhone,
      normalizedPhone,
      displayName: draft.displayName?.trim() || undefined,
      isAdmin: Boolean(draft.isAdmin),
      isActive: draft.isActive ?? current?.isActive ?? true,
      hasVisited: current?.hasVisited ?? false,
      firstVisitedAt: current?.firstVisitedAt,
      lastVisitedAt: current?.lastVisitedAt,
      hasValidated: draft.hasValidated ?? current?.hasValidated ?? false,
      validatedAt: draft.hasValidated ? current?.validatedAt ?? timestamp : current?.validatedAt,
      updatedAt: timestamp,
      updatedByAdmin: true,
      updatedByPhone: adminPhone,
      ...payload,
    }

    await patchFirestoreRestDocument(guestDocPath(id), guest, { idToken })
    return guest
  },

  async deactivateGuest(guestId, adminPhone) {
    const guest = await readGuestById(guestId)
    const timestamp = nowIso()
    const update = {
      isActive: false,
      updatedAt: timestamp,
      updatedByAdmin: true,
      updatedByPhone: adminPhone,
    }
    await patchFirestoreRestDocument(guestDocPath(guestId), update, {
      idToken: await getCurrentUserIdToken(),
      updateMask: Object.keys(update),
    })
    return { ...guest, ...update }
  },

  async deleteGuest(guestId) {
    await deleteFirestoreRestDocument(guestDocPath(guestId), await getCurrentUserIdToken())
  },

  async importCsv() {
    throw new Error('Import CSV Firestore non implémenté.')
  },
}
