import { useMemo, useState } from 'react'
import type { Guest, GuestDraft } from '../types/guest'
import { formatPhoneForDisplay } from '../utils/phone'
import { getGuestTotalPeople, MAX_PEOPLE_PER_GUEST, validateRsvp } from '../utils/rsvp'
import { buildDashboardStats } from '../utils/stats'

type FilterKey = 'all' | 'notValidated'

type AdminDashboardProps = {
  guests: Guest[]
  onSaveGuest: (draft: GuestDraft) => Promise<void>
  onDeleteGuest: (guest: Guest) => Promise<void>
}

const emptyDraft: GuestDraft = {
  phone: '',
  displayName: '',
  isAdmin: false,
  isActive: true,
  hasValidated: false,
  adultsCount: 0,
  attendsCivil: false,
  attendsReligious: false,
  attendsReception: false,
}

export function AdminDashboard({
  guests,
  onSaveGuest,
  onDeleteGuest,
}: AdminDashboardProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [draft, setDraft] = useState<GuestDraft>(emptyDraft)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showValidationError, setShowValidationError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const stats = useMemo(() => buildDashboardStats(guests), [guests])
  const visibleGuests = useMemo(() => {
    const active = guests.filter((guest) => guest.isActive && !guest.isAdmin)
    if (filter === 'notValidated') return active.filter((guest) => !guest.hasValidated)
    return active
  }, [filter, guests])
  const hasVisibleGuests = visibleGuests.length > 0

  const rsvpError = validateRsvp({
    adultsCount: draft.adultsCount ?? 0,
    attendsCivil: draft.attendsCivil ?? false,
    attendsReligious: draft.attendsReligious ?? false,
    attendsReception: draft.attendsReception ?? false,
  })

  function editGuest(guest: Guest) {
    setError('')
    setStatus('')
    setShowValidationError(false)
    setDraft({
      id: guest.id,
      phone: guest.normalizedPhone,
      displayName: guest.displayName ?? '',
      isAdmin: Boolean(guest.isAdmin),
      isActive: guest.isActive,
      hasValidated: guest.hasValidated,
      adultsCount: guest.adultsCount,
      attendsCivil: guest.attendsCivil,
      attendsReligious: guest.attendsReligious,
      attendsReception: guest.attendsReception,
    })
  }

  function resetDraft() {
    setDraft(emptyDraft)
    setError('')
    setStatus('')
    setShowValidationError(false)
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')
    setShowValidationError(false)

    if (rsvpError) {
      setShowValidationError(true)
      setError(rsvpError)
      return
    }

    setIsSaving(true)
    try {
      await onSaveGuest(draft)
      setStatus(draft.id ? 'Invité modifié.' : 'Invité ajouté.')
      setDraft(emptyDraft)
      setShowValidationError(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Sauvegarde impossible.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="dashboard" aria-labelledby="admin-title">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard admin</p>
          <h1 id="admin-title">Suivi RSVP</h1>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Invités prévus" value={stats.totalInvitedAdults} />
        <StatCard label="Connectés" value={`${stats.connected} (${stats.connectedPercent}%)`} />
        <StatCard label="Validés" value={`${stats.validated} (${stats.validatedPercent}%)`} />
        <StatCard label="Adultes présents" value={stats.adults} />
      </div>

      <div className="event-grid">
        <EventCard title="Mariage civil" stats={stats.events.civil} />
        <EventCard title="Mariage religieux" stats={stats.events.religious} />
        <EventCard title="Réception" stats={stats.events.reception} />
      </div>

      <section className="surface-panel admin-form-panel" aria-labelledby="guest-form-title">
        <div className="section-heading">
          <p className="eyebrow">Gestion</p>
          <h2 id="guest-form-title">{draft.id ? 'Modifier un invité' : 'Ajouter un invité'}</h2>
        </div>
        <form className="guest-form" onSubmit={handleSave}>
          <label htmlFor="admin-guest-phone">
            Téléphone
            <input
              id="admin-guest-phone"
              inputMode="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(event) => setDraftField('phone', event.target.value, setDraft)}
              aria-describedby={(showValidationError && rsvpError) || error ? 'admin-form-error' : undefined}
            />
          </label>
          <label htmlFor="admin-guest-label">
            Libellé
            <input
              id="admin-guest-label"
              value={draft.displayName ?? ''}
              onChange={(event) => setDraftField('displayName', event.target.value, setDraft)}
            />
          </label>
          <label htmlFor="admin-guest-adults">
            Adultes
            <input
              id="admin-guest-adults"
              type="number"
              min="0"
              max={MAX_PEOPLE_PER_GUEST}
              inputMode="numeric"
              value={draft.adultsCount ?? 0}
              onChange={(event) => setDraftField('adultsCount', Number(event.target.value), setDraft)}
              aria-describedby={(showValidationError && rsvpError) || error ? 'admin-form-error' : undefined}
            />
          </label>
          <div className="checkbox-grid">
            <AdminCheckbox
              label="Civil"
              checked={Boolean(draft.attendsCivil)}
              onChange={(checked) => setDraftField('attendsCivil', checked, setDraft)}
            />
            <AdminCheckbox
              label="Religieux"
              checked={Boolean(draft.attendsReligious)}
              onChange={(checked) => setDraftField('attendsReligious', checked, setDraft)}
            />
            <AdminCheckbox
              label="Réception"
              checked={Boolean(draft.attendsReception)}
              onChange={(checked) => setDraftField('attendsReception', checked, setDraft)}
            />
            <AdminCheckbox
              label="Admin"
              checked={Boolean(draft.isAdmin)}
              onChange={(checked) => setDraftField('isAdmin', checked, setDraft)}
            />
            <AdminCheckbox
              label="Validé"
              checked={Boolean(draft.hasValidated)}
              onChange={(checked) => setDraftField('hasValidated', checked, setDraft)}
            />
          </div>
          <div className="form-actions">
            <button className="primary-action" disabled={isSaving} type="submit">
              {isSaving ? 'Sauvegarde...' : draft.id ? 'Enregistrer' : 'Ajouter'}
            </button>
            {draft.id && (
              <button className="secondary" type="button" onClick={resetDraft}>
                Annuler
              </button>
            )}
          </div>
        </form>
        {showValidationError && rsvpError && !error && (
          <p className="error" id="admin-form-error" role="alert">{rsvpError}</p>
        )}
        {error && <p className="error" id="admin-form-error" role="alert">{error}</p>}
        {status && <p className="success" role="status">{status}</p>}
      </section>

      <section className="surface-panel guest-list-panel" aria-labelledby="guest-list-title">
        <div className="list-header">
          <div>
            <p className="eyebrow">Invités</p>
            <h2 id="guest-list-title">Liste RSVP</h2>
          </div>
          <div className="filters" role="group" aria-label="Filtres invités">
            <button className={filter === 'all' ? 'active secondary' : 'secondary'} onClick={() => setFilter('all')} type="button">
              Tous
            </button>
            <button className={filter === 'notValidated' ? 'active secondary' : 'secondary'} onClick={() => setFilter('notValidated')} type="button">
              Non validés
            </button>
          </div>
        </div>

        {!hasVisibleGuests && (
          <div className="empty-state">
            <strong>Aucun invité dans ce filtre.</strong>
            <span>Les invités actifs apparaîtront ici après ajout ou changement de filtre.</span>
          </div>
        )}

        {hasVisibleGuests && (
          <div className="guest-list">
            {visibleGuests.map((guest) => (
              <article className={`guest-card ${guest.hasValidated ? 'is-validated' : ''}`} key={guest.id}>
                <div className="guest-identity">
                  <strong>{guest.displayName?.trim() || formatPhoneForDisplay(guest.normalizedPhone)}</strong>
                  {guest.displayName?.trim() && (
                    <span className="muted small">{formatPhoneForDisplay(guest.normalizedPhone)}</span>
                  )}
                  <span className={`status-pill ${guest.hasValidated ? 'is-success' : 'is-waiting'}`}>
                    {guest.hasValidated ? 'Validé' : 'Non validé'}
                  </span>
                </div>
                <div className="guest-meta">
                  <span>{getGuestTotalPeople(guest)} pers.</span>
                  <span>Civil {guest.attendsCivil ? 'oui' : 'non'}</span>
                  <span>Rel. {guest.attendsReligious ? 'oui' : 'non'}</span>
                  <span>Rec. {guest.attendsReception ? 'oui' : 'non'}</span>
                </div>
                <div className="card-actions">
                  <button className="secondary" type="button" onClick={() => editGuest(guest)}>
                    Modifier
                  </button>
                  <button
                    className="secondary danger"
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer définitivement cet invité ?')) void onDeleteGuest(guest)
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

function setDraftField<K extends keyof GuestDraft>(
  key: K,
  value: GuestDraft[K],
  setDraft: React.Dispatch<React.SetStateAction<GuestDraft>>,
) {
  setDraft((current) => ({ ...current, [key]: value }))
}

function StatCard({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

function EventCard({ title, stats }: { title: string; stats: { adults: number; totalPeople: number } }) {
  return (
    <section className="event-card">
      <h2>{title}</h2>
      <p>{stats.adults} adulte(s)</p>
      <strong>{stats.totalPeople} personne(s)</strong>
    </section>
  )
}

function AdminCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="checkbox-label">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
