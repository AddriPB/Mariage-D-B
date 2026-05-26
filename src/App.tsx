import { useState } from 'react'
import { AccessScreen } from './components/AccessScreen'
import { AdminDashboard } from './components/AdminDashboard'
import { InvitationSection } from './components/InvitationSection'
import { RsvpScreen } from './components/RsvpScreen'
import type { AdminProfile } from './firebase'
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

  async function handleAdminAccess(admin: AdminProfile) {
    let nextGuests: Guest[]
    try {
      nextGuests = await guestStorage.listGuests()
    } catch (error) {
      console.error('[admin-access]', {
        stage: 'list-guests',
        uid: admin.uid,
        code: typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : undefined,
        message: error instanceof Error ? error.message : String(error),
      })
      throw error
    }

    setGuests([...nextGuests])
    setSession({ kind: 'admin', phone: admin.phone, guestId: admin.uid })
    setCurrentGuest(null)
  }

  async function handleRsvpSubmit(payload: RsvpPayload) {
    if (!currentGuest) throw new Error('Session invité introuvable.')
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
