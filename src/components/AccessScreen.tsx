import { useState } from 'react'
import { signInAdmin } from '../firebase'
import type { AccessSession, Guest } from '../types/guest'
import { formatPhoneForDisplay, normalizePhone } from '../utils/phone'

type AccessScreenProps = {
  onGuestAccess: (guest: Guest) => Promise<void>
  onAdminAccess: (guest: Guest) => void
  findByPhone: (phone: string) => Promise<Guest | null>
  session: AccessSession | null
}

export function AccessScreen({ onGuestAccess, onAdminAccess, findByPhone, session }: AccessScreenProps) {
  const [phone, setPhone] = useState('')
  const [adminCandidate, setAdminCandidate] = useState<Guest | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handlePhoneSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const normalized = normalizePhone(phone)
      if (!normalized) {
        setError('Numero invalide. Utilisez un mobile francais, par exemple 06...')
        return
      }

      const guest = await findByPhone(normalized)
      if (!guest) {
        setAdminCandidate(makeAdminCandidate(normalized))
        return
      }

      if (guest.isAdmin) {
        setAdminCandidate(guest)
        return
      }

      await onGuestAccess(guest)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Acces impossible.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!adminCandidate) return

      await signInAdmin(adminCandidate.normalizedPhone, password)
      onAdminAccess(adminCandidate)
    } catch {
      setError('Authentification admin impossible.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel access-panel">
      <h1>Identification</h1>
      <p className="muted">
        Saisissez votre telephone pour continuer.
      </p>

      {!adminCandidate ? (
        <form className="stack" onSubmit={handlePhoneSubmit}>
          <label>
            Telephone
            <input
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="06 06 06 06 06"
            />
          </label>
          <button disabled={isLoading} type="submit">
            {isLoading ? 'Verification...' : 'Continuer'}
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={handleAdminSubmit}>
          <div className="notice">
            Telephone admin reconnu : {formatPhoneForDisplay(adminCandidate.normalizedPhone)}
          </div>
          <label>
            Mot de passe admin
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
            />
          </label>
          <button disabled={isLoading} type="submit">
            {isLoading ? 'Connexion...' : 'Ouvrir le dashboard'}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setAdminCandidate(null)
              setPassword('')
              setError('')
            }}
          >
            Changer de telephone
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {session && <p className="muted small">Session active : {session.kind}</p>}
    </section>
  )
}

function makeAdminCandidate(normalizedPhone: string): Guest {
  return {
    id: `admin-${normalizedPhone}`,
    phone: normalizedPhone,
    normalizedPhone,
    displayName: 'Admin',
    isAdmin: true,
    isActive: true,
    hasVisited: false,
    hasValidated: false,
    adultsCount: 0,
    attendsCivil: false,
    attendsReligious: false,
    attendsReception: false,
  }
}
