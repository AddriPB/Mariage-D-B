import type { Guest, RsvpPayload } from '../types/guest'

export const MAX_PEOPLE_PER_GUEST = 20

export function validateRsvp(payload: RsvpPayload): string | null {
  if (!Number.isInteger(payload.adultsCount) || payload.adultsCount <= 0) {
    return "Le nombre d'adultes présents doit être supérieur à 0."
  }

  if (payload.adultsCount > MAX_PEOPLE_PER_GUEST) {
    return `Le nombre d'adultes ne peut pas dépasser ${MAX_PEOPLE_PER_GUEST}.`
  }

  return null
}

export function getGuestDisplayName(guest: Guest): string {
  return guest.displayName?.trim() || guest.phone
}

export function getGuestTotalPeople(guest: Pick<Guest, 'adultsCount'>): number {
  return guest.adultsCount
}
