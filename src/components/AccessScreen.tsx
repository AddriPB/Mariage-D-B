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
  const submitLabel = isLoading
    ? 'Vérification...'
    : isAdminPasswordStep
      ? 'Ouvrir le dashboard'
      : 'Continuer'
  const accessScreenClassName = `access-screen guest-flow-enter ${error ? 'has-form-error' : ''}`

  function resetAdminStep() {
    setAdminPhone('')
    setPassword('')
    setError('')
  }

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
      if (!guest && import.meta.env.PROD) {
        setAdminPhone(normalized)
        setPassword('')
        return
      }

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
    <section className={accessScreenClassName} aria-labelledby="access-title">
      <div className="guest-ambient guest-ambient-access" aria-hidden="true">
        <span className="ambient-blob blob-1" />
        <span className="ambient-blob blob-2" />
        <span className="ambient-blob blob-3" />
        <span className="ambient-glow ambient-glow-1" />
        <span className="ambient-glow ambient-glow-2" />
        <span className="ambient-heart heart-1" />
        <span className="ambient-heart heart-2" />
        <span className="ambient-heart heart-3" />
        <span className="ambient-heart heart-4" />
        <span className="ambient-heart heart-5" />
        <span className="ambient-petal petal-1" />
        <span className="ambient-petal petal-2" />
        <span className="ambient-petal petal-3" />
        <span className="ambient-petal petal-4" />
        <span className="ambient-petal petal-5" />
      </div>
      <div className="access-hero" aria-hidden="true">
        <span className="hero-orbit hero-orbit-1" />
        <span className="hero-orbit hero-orbit-2" />
        <span className="hero-kicker">RSVP</span>
        <span className="hero-line" />
        <span className="hero-date">Mariage</span>
      </div>

      <section className="surface-panel access-panel">
        <div className="section-heading">
          <p className="eyebrow">Invitation privée</p>
          <h1 id="access-title">Bienvenue</h1>
          <p className="muted">
            Entrez le téléphone associé à votre invitation.
          </p>
        </div>

        {isAdminPasswordStep && (
          <div className="notice" role="status">
            Accès admin détecté. Confirmez avec le mot de passe Firebase.
          </div>
        )}

        <form className="stack guest-form-stack" onSubmit={handleAccessSubmit} aria-busy={isLoading}>
          <label htmlFor="guest-phone">
            Téléphone
            <input
              id="guest-phone"
              className={error ? 'has-error' : undefined}
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                resetAdminStep()
              }}
              placeholder="06 06 06 06 06"
              aria-describedby={error ? 'access-error' : undefined}
            />
          </label>
        {isAdminPasswordStep && (
          <label htmlFor="admin-password">
            Mot de passe admin
            <input
              id="admin-password"
              className={error ? 'has-error' : undefined}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe admin"
              aria-describedby={error ? 'access-error' : undefined}
            />
          </label>
        )}
          <div className="form-actions">
            <button className={`primary-action liquid-cta ${isLoading ? 'is-loading' : ''}`} disabled={isLoading} type="submit">
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>

        {error && (
          <p className="error" id="access-error" role="alert">
            {error}
          </p>
        )}
        {session && <p className="muted small">Session active : {session.kind}</p>}
      </section>
    </section>
  )
}
