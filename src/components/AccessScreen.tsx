import { useState } from 'react'
import { AdminAccessError, signInAdmin, type AdminProfile } from '../firebase'
import type { AccessSession, Guest } from '../types/guest'
import { normalizePhone } from '../utils/phone'

type AccessScreenProps = {
  onGuestAccess: (guest: Guest) => Promise<void>
  onAdminAccess: (admin: AdminProfile) => Promise<void>
  findByPhone: (phone: string) => Promise<Guest | null>
  session: AccessSession | null
}

export function AccessScreen({ onGuestAccess, onAdminAccess, findByPhone, session }: AccessScreenProps) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isAdminPasswordStep = Boolean(adminPhone)

  async function handleAccessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const normalized = normalizePhone(phone)
      if (!normalized) {
        setError('Numéro invalide. Utilisez un mobile français, par exemple 06...')
        return
      }

      if (isAdminPasswordStep) {
        if (normalized !== adminPhone) {
          setAdminPhone('')
          setPassword('')
          setError('')
          return
        }

        if (!password.trim()) {
          setError('Mot de passe admin requis.')
          return
        }

        const admin = await signInAdmin(adminPhone, password)
        await onAdminAccess(admin)
        return
      }

      const guest = await findByPhone(normalized)
      if (!guest) {
        setError("Ce téléphone n'est pas autorisé.")
        return
      }

      if (guest.isAdmin) {
        setAdminPhone(normalized)
        setPassword('')
        return
      }

      await onGuestAccess(guest)
    } catch (submitError) {
      if (isAdminPasswordStep) {
        if (submitError instanceof AdminAccessError) {
          setError(submitError.message)
          return
        }

        console.error('[admin-access]', {
          stage: 'dashboard',
          message: submitError instanceof Error ? submitError.message : String(submitError),
        })
        setError('Ouverture du dashboard admin impossible.')
        return
      }
      setError(submitError instanceof Error ? submitError.message : 'Accès impossible.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel access-panel">
      <h1>Identification</h1>
      <p className="muted">
        Saisissez votre téléphone pour continuer.
      </p>

      <form className="stack" onSubmit={handleAccessSubmit}>
        <label>
          Téléphone
          <input
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
              setPassword('')
              setAdminPhone('')
              setError('')
            }}
            placeholder="06 06 06 06 06"
          />
        </label>
        {isAdminPasswordStep && (
          <label>
            Mot de passe admin
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe admin"
            />
          </label>
        )}
        <button disabled={isLoading} type="submit">
          {isLoading ? 'Vérification...' : isAdminPasswordStep ? 'Ouvrir le dashboard' : 'Continuer'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {session && <p className="muted small">Session active : {session.kind}</p>}
    </section>
  )
}
