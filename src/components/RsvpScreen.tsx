import { useEffect, useMemo, useState } from 'react'
import couple1 from '../assets/guest/couple-1.jpg'
import couple2 from '../assets/guest/couple-2.jpg'
import couple3 from '../assets/guest/couple-3.jpg'
import couple4 from '../assets/guest/couple-4.jpg'
import type { Guest, RsvpPayload } from '../types/guest'
import { MAX_PEOPLE_PER_GUEST, validateRsvp } from '../utils/rsvp'

type RsvpScreenProps = {
  guest: Guest
  onOverlayChange?: (isVisible: boolean) => void
  onSubmit: (payload: RsvpPayload) => Promise<Guest>
  onBack: () => void
}

type ConfirmationState = 'idle' | 'celebrating' | 'done'

const eventLabels: Array<{ key: keyof Pick<RsvpPayload, 'attendsCivil' | 'attendsReligious' | 'attendsReception'>; label: string }> = [
  { key: 'attendsCivil', label: 'Mariage civil' },
  { key: 'attendsReligious', label: 'Mariage religieux' },
  { key: 'attendsReception', label: 'Réception' },
]

const celebrationPhotos = [couple1, couple2, couple3, couple4]

export function RsvpScreen({ guest, onOverlayChange, onSubmit, onBack }: RsvpScreenProps) {
  const [form, setForm] = useState<RsvpPayload>({
    adultsCount: guest.adultsCount,
    attendsCivil: guest.attendsCivil,
    attendsReligious: guest.attendsReligious,
    attendsReception: guest.attendsReception,
  })
  const [adultsInput, setAdultsInput] = useState(String(guest.adultsCount || ''))
  const [error, setError] = useState('')
  const [showValidationError, setShowValidationError] = useState(false)
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>('idle')
  const [isSaving, setIsSaving] = useState(false)

  const validationError = useMemo(() => validateRsvp(form), [form])
  const guestLabel = guest.displayName?.trim() || 'Votre invitation'
  const celebrationName = guest.displayName?.trim()
  const selectedEvents = eventLabels
    .filter((event) => form[event.key])
    .map((event) => event.label)
    .join(', ') || 'Aucune présence confirmée'

  useEffect(() => {
    if (confirmationState !== 'celebrating') return undefined

    const timeout = window.setTimeout(() => {
      setConfirmationState('done')
    }, 8200)

    return () => window.clearTimeout(timeout)
  }, [confirmationState])

  useEffect(() => {
    onOverlayChange?.(confirmationState !== 'idle')
  }, [confirmationState, onOverlayChange])

  function updateNumber(value: string) {
    if (value === '') {
      setAdultsInput('')
      setForm((current) => ({ ...current, adultsCount: 0 }))
      setError('')
      return
    }

    const nextValue = Number.parseInt(value, 10)
    const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue
    setAdultsInput(String(normalizedValue))
    setForm((current) => ({ ...current, adultsCount: normalizedValue }))
    setError('')
  }

  function adjustAdults(delta: number) {
    const nextAdultsCount = Math.min(MAX_PEOPLE_PER_GUEST, Math.max(0, form.adultsCount + delta))
    setAdultsInput(String(nextAdultsCount))
    setForm((current) => ({ ...current, adultsCount: nextAdultsCount }))
    setError('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setConfirmationState('idle')

    const localError = validateRsvp(form)
    if (localError) {
      setShowValidationError(true)
      setError(localError)
      return
    }

    setShowValidationError(false)
    setIsSaving(true)
    try {
      await onSubmit(form)
      setConfirmationState('celebrating')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.')
    } finally {
      setIsSaving(false)
    }
  }

  if (confirmationState === 'celebrating') {
    return <CelebrationScreen guestName={celebrationName} />
  }

  if (confirmationState === 'done') {
    return (
      <section className="confirmation-screen final-photo-screen" aria-live="polite">
        <img className="final-photo" src={couple4} alt="" aria-hidden="true" />
        <div className="confirmation-actions">
          <button type="button" onClick={() => setConfirmationState('idle')}>
            Modifier ma réponse
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="surface-panel rsvp-panel" aria-labelledby="rsvp-title">
      <div className="section-heading rsvp-heading">
        <div>
          <p className="eyebrow">Votre réponse</p>
          <h1 id="rsvp-title">Confirmer le RSVP</h1>
        </div>
        <button className="secondary compact-action" type="button" onClick={onBack}>
          Changer de téléphone
        </button>
      </div>

      <form className="stack" onSubmit={handleSubmit} aria-busy={isSaving}>
        <div className="form-block">
          <label htmlFor="adults-count">Nombre d'adultes présents</label>
          <div className="number-control">
            <button
              aria-label="Retirer un adulte"
              className="stepper-button"
              disabled={form.adultsCount <= 0 || isSaving}
              type="button"
              onClick={() => adjustAdults(-1)}
            >
              −
            </button>
            <input
              id="adults-count"
              min="0"
              max={MAX_PEOPLE_PER_GUEST}
              inputMode="numeric"
              type="number"
              value={adultsInput}
              onChange={(event) => updateNumber(event.target.value)}
              aria-describedby={(showValidationError && validationError) || error ? 'rsvp-error' : undefined}
            />
            <button
              aria-label="Ajouter un adulte"
              className="stepper-button"
              disabled={form.adultsCount >= MAX_PEOPLE_PER_GUEST || isSaving}
              type="button"
              onClick={() => adjustAdults(1)}
            >
              +
            </button>
          </div>
        </div>

        <fieldset className="attendance-fieldset">
          <legend>Présences</legend>
          {eventLabels.map((event) => (
            <Toggle
              key={event.key}
              label={event.label}
              checked={form[event.key]}
              onChange={(checked) => setForm((current) => ({ ...current, [event.key]: checked }))}
            />
          ))}
        </fieldset>

        <div className="recap">
          <h2>Récapitulatif</h2>
          <dl>
            <div>
              <dt>Invité</dt>
              <dd>{guestLabel}</dd>
            </div>
            <div>
              <dt>Adultes</dt>
              <dd>{form.adultsCount}</dd>
            </div>
            <div>
              <dt>Présences</dt>
              <dd>{selectedEvents}</dd>
            </div>
          </dl>
        </div>

        {error && (
          <p className="error" id="rsvp-error" role="alert">
            {error}
          </p>
        )}
        {showValidationError && validationError && !error && (
          <p className="error" id="rsvp-error" role="alert">
            {validationError}
          </p>
        )}
        <button className="primary-action" disabled={isSaving} type="submit">
          {isSaving ? 'Enregistrement...' : 'Valider ma réponse'}
        </button>
      </form>
    </section>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`toggle-row ${checked ? 'is-checked' : ''}`}>
      <input
        className="toggle-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-copy">
        <span>{label}</span>
        <small>{checked ? 'Présence confirmée' : 'Non confirmé'}</small>
      </span>
      <span className="toggle-switch" aria-hidden="true">
        <span />
      </span>
    </label>
  )
}

function CelebrationScreen({ guestName }: { guestName?: string }) {
  return (
    <section className="rsvp-celebration" aria-live="polite" aria-labelledby="celebration-title">
      <div className="celebration-photo-reel" aria-hidden="true">
        {celebrationPhotos.map((photo, index) => (
          <img
            className={`celebration-photo celebration-photo-${index + 1}`}
            src={photo}
            alt=""
            key={photo}
          />
        ))}
      </div>
      <div className="celebration-stage" aria-hidden="true">
        <span className="celebration-moon" />
        <span className="celebration-ring ring-1" />
        <span className="celebration-ring ring-2" />
        <span className="celebration-ring ring-3" />
        {Array.from({ length: 18 }, (_, index) => (
          <span className={`celebration-spark spark-${index + 1}`} key={index} />
        ))}
        {Array.from({ length: 8 }, (_, index) => (
          <span className={`celebration-floating-heart floating-heart-${index + 1}`} key={`heart-${index}`} />
        ))}
      </div>
      <p className="eyebrow">Réponse sauvegardée</p>
      <h1 id="celebration-title">{guestName ? `Merci ${guestName}` : 'Merci'}</h1>
      <p>Votre RSVP est confirmé.</p>
    </section>
  )
}
