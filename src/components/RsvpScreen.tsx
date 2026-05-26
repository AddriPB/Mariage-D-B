import { useMemo, useState } from 'react'
import type { Guest, RsvpPayload } from '../types/guest'
import { MAX_PEOPLE_PER_GUEST, validateRsvp } from '../utils/rsvp'

type RsvpScreenProps = {
  guest: Guest
  onSubmit: (payload: RsvpPayload) => Promise<Guest>
  onBack: () => void
}

export function RsvpScreen({ guest, onSubmit }: RsvpScreenProps) {
  const [form, setForm] = useState<RsvpPayload>({
    adultsCount: guest.adultsCount,
    attendsCivil: guest.attendsCivil,
    attendsReligious: guest.attendsReligious,
    attendsReception: guest.attendsReception,
  })
  const [error, setError] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const validationError = useMemo(() => validateRsvp(form), [form])
  const confirmationText =
    form.adultsCount === 1
      ? 'Merci pour votre venue.'
      : 'Merci pour votre venue à tous.'

  function updateNumber(value: string) {
    const nextValue = Number.parseInt(value || '0', 10)
    setForm((current) => ({ ...current, adultsCount: Number.isNaN(nextValue) ? 0 : nextValue }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsConfirmed(false)

    const localError = validateRsvp(form)
    if (localError) {
      setError(localError)
      return
    }

    setIsSaving(true)
    try {
      await onSubmit(form)
      setIsConfirmed(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enregistrement impossible.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isConfirmed) {
    return (
      <section className="confirmation-screen" aria-live="polite">
        <div className="confirmation-screen-mark" aria-hidden="true">
          ✓
        </div>
        <h1>Réponse enregistrée</h1>
        <p>Votre confirmation est bien sauvegardée.</p>
        <p>{confirmationText}</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <form className="stack" onSubmit={handleSubmit}>
        <div className="grid compact-rsvp-grid">
          <label>
            Nombre d'adultes présents
            <input
              min="0"
              max={MAX_PEOPLE_PER_GUEST}
              type="number"
              value={form.adultsCount}
              onChange={(event) => updateNumber(event.target.value)}
            />
          </label>
        </div>

        <fieldset>
          <legend>Présences</legend>
          <Toggle
            label="Mariage civil"
            checked={form.attendsCivil}
            onChange={(checked) => setForm((current) => ({ ...current, attendsCivil: checked }))}
          />
          <Toggle
            label="Mariage religieux"
            checked={form.attendsReligious}
            onChange={(checked) => setForm((current) => ({ ...current, attendsReligious: checked }))}
          />
          <Toggle
            label="Réception"
            checked={form.attendsReception}
            onChange={(checked) => setForm((current) => ({ ...current, attendsReception: checked }))}
          />
        </fieldset>

        <div className="recap">
          <h2>Récapitulatif</h2>
          <p>
            {form.adultsCount} adulte(s).
          </p>
          <p>
            Civil : {form.attendsCivil ? 'oui' : 'non'} · Religieux :{' '}
            {form.attendsReligious ? 'oui' : 'non'} · Réception :{' '}
            {form.attendsReception ? 'oui' : 'non'}
          </p>
        </div>

        {error && <p className="error">{error}</p>}
        {validationError && !error && <p className="error">{validationError}</p>}
        <button disabled={Boolean(validationError) || isSaving} type="submit">
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
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}
