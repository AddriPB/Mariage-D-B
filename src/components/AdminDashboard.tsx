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
  const [isSaving, setIsSaving] = useState(false)

  const stats = useMemo(() => buildDashboardStats(guests), [guests])
  const visibleGuests = useMemo(() => {
    const active = guests.filter((guest) => guest.isActive && !guest.isAdmin)
    if (filter === 'notValidated') return active.filter((guest) => !guest.hasValidated)
    return active
  }, [filter, guests])

  const rsvpError = validateRsvp({
    adultsCount: draft.adultsCount ?? 0,
    attendsCivil: draft.attendsCivil ?? false,
    attendsReligious: draft.attendsReligious ?? false,
    attendsReception: draft.attendsReception ?? false,
  })

  function editGuest(guest: Guest) {
    setError('')
    setStatus('')
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

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')

    if (rsvpError) {
      setError(rsvpError)
      return
    }

    setIsSaving(true)
    try {
      await onSaveGuest(draft)
      setStatus(draft.id ? 'Invité modifié.' : 'Invité ajouté.')
      setDraft(emptyDraft)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Sauvegarde impossible.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="dashboard">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Dashboard admin</p>
          <h1>Suivi RSVP</h1>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Invités prévus" value={stats.totalInvitedAdults} />
        <StatCard label="Connectés" value={`${stats.connected} (${stats.connectedPercent}%)`} />
        <StatCard label="Validés" value={`${stats.validated} (${stats.validatedPercent}%)`} />
        <StatCard label="Adultes présents" value={stats.adults} />
      </div>

      <div className="grid three">
        <EventCard title="Mariage civil" stats={stats.events.civil} />
        <EventCard title="Mariage religieux" stats={stats.events.religious} />
        <EventCard title="Réception" stats={stats.events.reception} />
      </div>

      <section className="panel">
        <h2>{draft.id ? 'Modifier un invité' : 'Ajouter un invité'}</h2>
        <form className="guest-form" onSubmit={handleSave}>
          <label>
            Téléphone
            <input value={draft.phone} onChange={(event) => setDraftField('phone', event.target.value, setDraft)} />
          </label>
          <label>
            Libellé
            <input value={draft.displayName ?? ''} onChange={(event) => setDraftField('displayName', event.target.value, setDraft)} />
          </label>
          <label>
            Adultes
            <input
              type="number"
              min="0"
              max={MAX_PEOPLE_PER_GUEST}
              value={draft.adultsCount ?? 0}
              onChange={(event) => setDraftField('adultsCount', Number(event.target.value), setDraft)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(draft.attendsCivil)}
              onChange={(event) => setDraftField('attendsCivil', event.target.checked, setDraft)}
            />
            Civil
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(draft.attendsReligious)}
              onChange={(event) => setDraftField('attendsReligious', event.target.checked, setDraft)}
            />
            Religieux
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(draft.attendsReception)}
              onChange={(event) => setDraftField('attendsReception', event.target.checked, setDraft)}
            />
            Réception
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(draft.isAdmin)}
              onChange={(event) => setDraftField('isAdmin', event.target.checked, setDraft)}
            />
            Admin
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(draft.hasValidated)}
              onChange={(event) => setDraftField('hasValidated', event.target.checked, setDraft)}
            />
            Validé
          </label>
          <div className="form-actions">
            <button disabled={isSaving || Boolean(rsvpError)} type="submit">
              {isSaving ? 'Sauvegarde...' : draft.id ? 'Enregistrer' : 'Ajouter'}
            </button>
            {draft.id && (
              <button className="secondary" type="button" onClick={() => setDraft(emptyDraft)}>
                Annuler
              </button>
            )}
          </div>
        </form>
        {rsvpError && <p className="error">{rsvpError}</p>}
        {error && <p className="error">{error}</p>}
        {status && <p className="success">{status}</p>}
      </section>

      <section className="panel">
        <div className="list-header">
          <div>
            <h2>Liste des invités RSVP</h2>
          </div>
          <div className="filters">
            <button className={filter === 'all' ? 'active secondary' : 'secondary'} onClick={() => setFilter('all')} type="button">
              Tous
            </button>
            <button className={filter === 'notValidated' ? 'active secondary' : 'secondary'} onClick={() => setFilter('notValidated')} type="button">
              Non validés
            </button>
          </div>
        </div>

        <div className="guest-list">
          {visibleGuests.map((guest) => (
            <article className="guest-card" key={guest.id}>
              <div>
                <strong>{formatPhoneForDisplay(guest.normalizedPhone)}</strong>
                <span className="muted small">{guest.hasValidated ? 'Validé' : 'Non validé'}</span>
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
    <section className="panel event-card">
      <h2>{title}</h2>
      <p>{stats.adults} adulte(s)</p>
      <strong>{stats.totalPeople} personne(s)</strong>
    </section>
  )
}
