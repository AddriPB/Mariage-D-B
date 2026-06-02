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
  const [isGuestRsvpOverlayVisible, setIsGuestRsvpOverlayVisible] = useState(false)

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
    setIsGuestRsvpOverlayVisible(false)
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
    setIsGuestRsvpOverlayVisible(false)
  }

  async function handleRsvpSubmit(payload: RsvpPayload) {
    if (!currentGuest) throw new Error('Session invité introuvable.')
    const updatedGuest = await guestStorage.submitRsvp(currentGuest.id, payload)
    setCurrentGuest({ ...updatedGuest })
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

  const shellClassName = session ? `app-shell app-shell-${session.kind}` : 'app-shell app-shell-access'

  return (
    <main className={shellClassName}>
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
          {!isGuestRsvpOverlayVisible && <InvitationSection />}
          <RsvpScreen
            guest={currentGuest}
            onOverlayChange={setIsGuestRsvpOverlayVisible}
            onSubmit={handleRsvpSubmit}
            onBack={() => {
              setSession(null)
              setCurrentGuest(null)
              setIsGuestRsvpOverlayVisible(false)
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
