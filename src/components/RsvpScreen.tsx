import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
}

type ConfirmationState = 'idle' | 'celebrating' | 'done'

const eventLabels: Array<{ key: keyof Pick<RsvpPayload, 'attendsCivil' | 'attendsReligious' | 'attendsReception'>; label: string }> = [
  { key: 'attendsCivil', label: 'Mariage civil' },
  { key: 'attendsReligious', label: 'Mariage religieux' },
  { key: 'attendsReception', label: 'Réception' },
]

const celebrationPhotos = [couple1, couple2, couple3, couple4]
const thankYouLines = ['En vous remerciant', 'votre présence']
const thankYouMessage = thankYouLines.join('\n')

export function RsvpScreen({ guest, onOverlayChange, onSubmit }: RsvpScreenProps) {
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
  const [adultsPulseKey, setAdultsPulseKey] = useState(0)
  const [changedEventKey, setChangedEventKey] = useState<string | null>(null)

  const validationError = useMemo(() => validateRsvp(form), [form])
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

  useEffect(() => {
    if (confirmationState === 'idle') return

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [confirmationState])

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
    setAdultsPulseKey((current) => current + 1)
    setError('')
  }

  function adjustAdults(delta: number) {
    const nextAdultsCount = Math.min(MAX_PEOPLE_PER_GUEST, Math.max(0, form.adultsCount + delta))
    setAdultsInput(String(nextAdultsCount))
    setForm((current) => ({ ...current, adultsCount: nextAdultsCount }))
    setAdultsPulseKey((current) => current + 1)
    setError('')
  }

  function updateAttendance(
    eventKey: keyof Pick<RsvpPayload, 'attendsCivil' | 'attendsReligious' | 'attendsReception'>,
    checked: boolean,
  ) {
    setForm((current) => ({ ...current, [eventKey]: checked }))
    setChangedEventKey(eventKey)
    window.setTimeout(() => {
      setChangedEventKey((current) => current === eventKey ? null : current)
    }, 420)
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
    return <CelebrationScreen />
  }

  if (confirmationState === 'done') {
    return (
      <section className="confirmation-screen final-photo-screen" aria-live="polite" aria-label={thankYouMessage}>
        <img className="final-photo" src={couple4} alt="" aria-hidden="true" />
        <HandwrittenThanks />
      </section>
    )
  }

  return (
    <section className={`surface-panel rsvp-panel guest-flow-enter ${error || (showValidationError && validationError) ? 'has-form-error' : ''}`} aria-label="Formulaire RSVP">
      <form className="stack guest-form-stack" onSubmit={handleSubmit} aria-busy={isSaving}>
        <div className="form-block reveal-section reveal-section-1">
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
              className={`adults-count-input count-pulse-${adultsPulseKey % 2}`}
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

        <fieldset className="attendance-fieldset reveal-section reveal-section-2">
          <legend>Présences</legend>
          {eventLabels.map((event) => (
            <Toggle
              key={event.key}
              label={event.label}
              checked={form[event.key]}
              justChanged={changedEventKey === event.key}
              onChange={(checked) => updateAttendance(event.key, checked)}
            />
          ))}
        </fieldset>

        <div className="recap reveal-section reveal-section-3">
          <h2>Récapitulatif</h2>
          <dl>
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
        <button className={`primary-action liquid-cta ${isSaving ? 'is-loading' : ''}`} disabled={isSaving} type="submit">
          <span>{isSaving ? 'Enregistrement...' : 'Valider ma réponse'}</span>
        </button>
      </form>
    </section>
  )
}

function Toggle({
  label,
  checked,
  justChanged,
  onChange,
}: {
  label: string
  checked: boolean
  justChanged: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`toggle-row ${checked ? 'is-checked' : ''} ${justChanged ? 'just-changed' : ''}`}>
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

function HandwrittenThanks() {
  let characterIndex = 0

  return (
    <p className="handwritten-thanks" aria-label={thankYouMessage}>
      {thankYouLines.map((line, lineIndex) => (
        <span className="handwritten-line" aria-hidden="true" key={line}>
          {line.split(' ').map((word, wordIndex, words) => {
            const trailingSpace = wordIndex < words.length - 1 ? ' ' : ''

            return (
              <span className="handwritten-word" key={`${word}-${lineIndex}-${wordIndex}`}>
                {Array.from(`${word}${trailingSpace}`).map((character) => {
                  const index = characterIndex
                  characterIndex += 1

                  return (
                    <span
                      className="handwritten-character"
                      key={`${character}-${lineIndex}-${wordIndex}-${index}`}
                      style={{ '--character-index': index } as CSSProperties}
                    >
                      {character === ' ' ? '\u00A0' : character}
                    </span>
                  )
                })}
              </span>
            )
          })}
        </span>
      ))}
    </p>
  )
}

function CelebrationScreen() {
  return (
    <section className="rsvp-celebration" aria-live="polite" aria-label={thankYouMessage}>
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
      <HandwrittenThanks />
    </section>
  )
}
