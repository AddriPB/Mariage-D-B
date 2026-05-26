import type { Guest, RsvpPayload } from '../types/guest'

export const MAX_PEOPLE_PER_GUEST = 20

export function validateRsvp(payload: RsvpPayload): string | null {
  if (!Number.isInteger(payload.adultsCount) || payload.adultsCount < 0) {
    return 'Le nombre d adultes doit etre positif.'
  }

  if (payload.adultsCount > MAX_PEOPLE_PER_GUEST) {
    return `Le nombre d adultes ne peut pas depasser ${MAX_PEOPLE_PER_GUEST}.`
  }

  return null
}

export function getGuestDisplayName(guest: Guest): string {
  return guest.displayName?.trim() || guest.phone
}

export function getGuestTotalPeople(guest: Pick<Guest, 'adultsCount'>): number {
  return guest.adultsCount
}
