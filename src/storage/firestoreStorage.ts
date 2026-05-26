import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '../firebase'
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
    throw new Error('Telephone invalide. Utilisez un numero mobile francais.')
  }
  return normalizedPhone
}

function guestDoc(id: string) {
  return doc(getFirebaseFirestore(), 'guests', id)
}

function normalizeGuest(id: string, data: Partial<Guest>): Guest {
  const normalizedPhone = data.normalizedPhone ?? data.phone
  if (!normalizedPhone) {
    throw new Error('Invite invalide.')
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
  const snapshot = await getDoc(guestDoc(id))
  if (!snapshot.exists()) {
    throw new Error('Invite introuvable.')
  }
  return normalizeGuest(snapshot.id, snapshot.data() as Partial<Guest>)
}

export const firestoreGuestStorage: GuestStorage = {
  async listGuests() {
    const snapshot = await getDocs(collection(getFirebaseFirestore(), 'guests'))
    return snapshot.docs.map((guestSnapshot) =>
      normalizeGuest(guestSnapshot.id, guestSnapshot.data() as Partial<Guest>),
    )
  },

  async findByPhone(phone) {
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) return null

    const id = guestIdFromPhone(normalizedPhone)
    const snapshot = await getDoc(guestDoc(id))
    if (!snapshot.exists()) return null

    const guest = normalizeGuest(snapshot.id, snapshot.data() as Partial<Guest>)
    if (!guest.isActive || guest.normalizedPhone !== normalizedPhone) return null
    return guest
  },

  async markVisited(guestId) {
    const guest = await readGuestById(guestId)
    if (!guest.isActive) throw new Error('Invite introuvable.')

    const timestamp = nowIso()
    await updateDoc(guestDoc(guestId), {
      hasVisited: true,
      firstVisitedAt: guest.firstVisitedAt ?? timestamp,
      lastVisitedAt: timestamp,
      updatedAt: timestamp,
    })
    return { ...guest, hasVisited: true, firstVisitedAt: guest.firstVisitedAt ?? timestamp, lastVisitedAt: timestamp, updatedAt: timestamp }
  },

  async submitRsvp(guestId, payload) {
    const error = validateRsvp(payload)
    if (error) throw new Error(error)

    const guest = await readGuestById(guestId)
    if (!guest.isActive) throw new Error('Invite introuvable.')

    const timestamp = nowIso()
    const nextGuest = {
      ...guest,
      ...payload,
      hasValidated: true,
      validatedAt: guest.validatedAt ?? timestamp,
      updatedAt: timestamp,
      updatedByAdmin: false,
      updatedByPhone: guest.normalizedPhone,
    }
    await updateDoc(guestDoc(guestId), {
      ...payload,
      hasValidated: true,
      validatedAt: nextGuest.validatedAt,
      updatedAt: timestamp,
      updatedByAdmin: false,
      updatedByPhone: guest.normalizedPhone,
    })
    return nextGuest
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

    if (draft.id && draft.id !== id) {
      const duplicate = await getDoc(guestDoc(id))
      if (duplicate.exists()) throw new Error('Ce telephone existe deja dans la liste.')
      await deleteDoc(guestDoc(draft.id))
    }

    const currentSnapshot = await getDoc(guestDoc(id))
    const current = currentSnapshot.exists()
      ? normalizeGuest(currentSnapshot.id, currentSnapshot.data() as Partial<Guest>)
      : null
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

    await setDoc(guestDoc(id), guest)
    return guest
  },

  async deactivateGuest(guestId, adminPhone) {
    const guest = await readGuestById(guestId)
    const timestamp = nowIso()
    await updateDoc(guestDoc(guestId), {
      isActive: false,
      updatedAt: timestamp,
      updatedByAdmin: true,
      updatedByPhone: adminPhone,
    })
    return { ...guest, isActive: false, updatedAt: timestamp, updatedByAdmin: true, updatedByPhone: adminPhone }
  },

  async deleteGuest(guestId) {
    await deleteDoc(guestDoc(guestId))
  },

  async importCsv() {
    throw new Error('Import CSV Firestore non implemente.')
  },
}
