import { useState } from 'react'
import { signInAdmin } from '../firebase'
import type { AccessSession, Guest } from '../types/guest'
import { normalizePhone } from '../utils/phone'

type AccessScreenProps = {
  onGuestAccess: (guest: Guest) => Promise<void>
  onAdminAccess: (guest: Guest) => void
  findByPhone: (phone: string) => Promise<Guest | null>
  session: AccessSession | null
}

export function AccessScreen({ onGuestAccess, onAdminAccess, findByPhone, session }: AccessScreenProps) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleAccessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const normalized = normalizePhone(phone)
      if (!normalized) {
        setError('Numero invalide. Utilisez un mobile francais, par exemple 06...')
        return
      }

      if (password.trim()) {
        await signInAdmin(normalized, password)
        onAdminAccess(makeAdminCandidate(normalized))
        return
      }

      const guest = await findByPhone(normalized)
      if (!guest) {
        setError('Ce telephone n est pas autorise.')
        return
      }

      await onGuestAccess(guest)
    } catch (submitError) {
      if (password.trim()) {
        setError('Authentification admin impossible.')
        return
      }
      setError(submitError instanceof Error ? submitError.message : 'Acces impossible.')
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

      <form className="stack" onSubmit={handleAccessSubmit}>
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
        <label>
          Mot de passe admin
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Uniquement pour admin"
          />
        </label>
        <button disabled={isLoading} type="submit">
          {isLoading ? 'Verification...' : password.trim() ? 'Ouvrir le dashboard' : 'Continuer'}
        </button>
      </form>

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
