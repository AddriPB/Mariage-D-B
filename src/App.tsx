import { useState } from 'react'
import { AccessScreen } from './components/AccessScreen'
import { AdminDashboard } from './components/AdminDashboard'
import { InvitationSection } from './components/InvitationSection'
import { RsvpScreen } from './components/RsvpScreen'
import { getInitialGuestsSnapshot, guestStorage } from './storage/guestStorage'
import type { AccessSession, Guest, GuestDraft, RsvpPayload } from './types/guest'

function App() {
  const [guests, setGuests] = useState<Guest[]>(() => getInitialGuestsSnapshot())
  const [session, setSession] = useState<AccessSession | null>(null)
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null)

  async function refreshGuests() {
    const nextGuests = await guestStorage.listGuests()
    setGuests([...nextGuests])
    if (session?.guestId) {
      setCurrentGuest(nextGuests.find((guest) => guest.id === session.guestId) ?? null)
    }
  }

  async function handleGuestAccess(guest: Guest) {
    const visitedGuest = await guestStorage.markVisited(guest.id)
    setSession({ kind: 'guest', phone: visitedGuest.normalizedPhone, guestId: visitedGuest.id })
    setCurrentGuest({ ...visitedGuest })
    await refreshGuests()
  }

  function handleAdminAccess(guest: Guest) {
    setSession({ kind: 'admin', phone: guest.normalizedPhone, guestId: guest.id })
    setCurrentGuest({ ...guest })
  }

  async function handleRsvpSubmit(payload: RsvpPayload) {
    if (!currentGuest) throw new Error('Session invite introuvable.')
    const updatedGuest = await guestStorage.submitRsvp(currentGuest.id, payload)
    setCurrentGuest({ ...updatedGuest })
    await refreshGuests()
    return updatedGuest
  }

  async function handleSaveGuest(draft: GuestDraft) {
    await guestStorage.upsertGuest(draft, session?.phone)
    await refreshGuests()
  }

  async function handleDeleteGuest(guest: Guest) {
    await guestStorage.deleteGuest(guest.id)
    await refreshGuests()
  }

  return (
    <main className="app-shell">
      {!session && (
        <AccessScreen
          findByPhone={guestStorage.findByPhone}
          onGuestAccess={handleGuestAccess}
          onAdminAccess={handleAdminAccess}
          session={session}
        />
      )}

      {session?.kind === 'guest' && currentGuest && (
        <>
          <InvitationSection />
          <RsvpScreen
            guest={currentGuest}
            onSubmit={handleRsvpSubmit}
            onBack={() => {
              setSession(null)
              setCurrentGuest(null)
            }}
          />
        </>
      )}

      {session?.kind === 'admin' && (
          <AdminDashboard
            guests={guests}
            onSaveGuest={handleSaveGuest}
            onDeleteGuest={handleDeleteGuest}
          />
      )}

    </main>
  )
}

export default App
