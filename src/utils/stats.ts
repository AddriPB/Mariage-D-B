import type { EventKey, Guest } from '../types/guest'

export type EventStats = {
  adults: number
  totalPeople: number
}

export type DashboardStats = {
  totalInvitedAdults: number
  connected: number
  connectedPercent: number
  validated: number
  validatedPercent: number
  adults: number
  events: Record<EventKey, EventStats>
}

const emptyEventStats = (): EventStats => ({
  adults: 0,
  totalPeople: 0,
})

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}

export function buildDashboardStats(guests: Guest[]): DashboardStats {
  const activeGuests = guests.filter((guest) => guest.isActive && !guest.isAdmin)
  const connected = activeGuests.filter((guest) => guest.hasVisited)
  const validated = activeGuests.filter((guest) => guest.hasValidated)
  const totalInvitedAdults = activeGuests.reduce((sum, guest) => sum + guest.adultsCount, 0)
  const connectedAdults = connected.reduce((sum, guest) => sum + guest.adultsCount, 0)
  const validatedAdults = validated.reduce((sum, guest) => sum + guest.adultsCount, 0)
  const events: Record<EventKey, EventStats> = {
    civil: emptyEventStats(),
    religious: emptyEventStats(),
    reception: emptyEventStats(),
  }

  const adults = validated.reduce((sum, guest) => sum + guest.adultsCount, 0)

  for (const guest of validated) {
    const addToEvent = (event: EventStats) => {
      event.adults += guest.adultsCount
      event.totalPeople += guest.adultsCount
    }

    if (guest.attendsCivil) addToEvent(events.civil)
    if (guest.attendsReligious) addToEvent(events.religious)
    if (guest.attendsReception) addToEvent(events.reception)
  }

  return {
    totalInvitedAdults,
    connected: connectedAdults,
    connectedPercent: percent(connectedAdults, totalInvitedAdults),
    validated: validatedAdults,
    validatedPercent: percent(validatedAdults, totalInvitedAdults),
    adults,
    events,
  }
}
