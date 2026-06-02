import { useEffect, useState } from 'react'
import { getDefaultWeddingContent, loadWeddingContent, type WeddingContent } from '../content/weddingContent'

type CalendarEvent = {
  id: 'civil' | 'religious' | 'reception'
  title: string
  start: string
  end: string
  googleStart: string
  googleEnd: string
  location: string
  address: string
}

type EventDetailsProps = {
  time: string
  event: CalendarEvent
  isCalendarOpen: boolean
  calendarError: string
  onToggleCalendar: (eventId: CalendarEvent['id']) => void
  onOpenIcsCalendar: (eventId: CalendarEvent['id']) => void
}

function getCalendarEvents(content: WeddingContent): CalendarEvent[] {
  return [
    {
      id: 'civil',
      title: 'Mariage civil',
      start: '20260926T100000',
      end: '20260926T110000',
      googleStart: '20260926T100000',
      googleEnd: '20260926T110000',
      location: content.civilLocation,
      address: content.civilAddress,
    },
    {
      id: 'religious',
      title: 'Bénédiction',
      start: '20260926T150000',
      end: '20260926T163000',
      googleStart: '20260926T150000',
      googleEnd: '20260926T163000',
      location: content.religiousLocation,
      address: content.religiousAddress,
    },
    {
      id: 'reception',
      title: 'Réception',
      start: '20260926T180000',
      end: '20260927T020000',
      googleStart: '20260926T180000',
      googleEnd: '20260927T020000',
      location: content.receptionLocation,
      address: content.receptionAddress,
    },
  ]
}

function getPublicIcsUrl(eventId: CalendarEvent['id']): string | null {
  if (typeof window === 'undefined') return null
  return new URL(`${import.meta.env.BASE_URL}mariage-daima-${eventId}.ics`, window.location.origin).toString()
}

function getGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.googleStart}/${event.googleEnd}`,
    ctz: 'Europe/Paris',
    details: `${event.title} - ${event.address}`,
    location: `${event.location}, ${event.address}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function CalendarIcon() {
  return (
    <svg className="calendar-button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M8 2.75v3M16 2.75v3M4.75 9.25h14.5" />
      <path d="M6.75 4.75h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" />
      <path d="M12 12v5M9.5 14.5h5" />
    </svg>
  )
}

function EventDetails({
  time,
  event,
  isCalendarOpen,
  calendarError,
  onToggleCalendar,
  onOpenIcsCalendar,
}: EventDetailsProps) {
  const shouldShowLocation =
    event.location.trim().toLowerCase() !== event.title.trim().toLowerCase()
    && event.location.trim().toLowerCase() !== 'mairie de champigny-sur-marne'

  return (
    <article className="event-details">
      <div className="event-time" aria-label={`Horaire ${event.title}`}>
        {time}
      </div>
      <div className="event-copy">
        <h3>{event.title}</h3>
        {shouldShowLocation && <p>{event.location}</p>}
        <address>{event.address}</address>
      </div>
      <button
        className="event-calendar-toggle"
        type="button"
        aria-label={`Ajouter ${event.title} à un agenda`}
        aria-expanded={isCalendarOpen}
        onClick={() => onToggleCalendar(event.id)}
      >
        <CalendarIcon />
      </button>
      {isCalendarOpen && (
        <div className="event-calendar-panel" aria-label={`Choisir un calendrier pour ${event.title}`}>
          <a className="calendar-provider-button" href={getGoogleCalendarUrl(event)} target="_blank" rel="noreferrer">
            Google Agenda
          </a>
          <button className="calendar-provider-button" type="button" onClick={() => onOpenIcsCalendar(event.id)}>
            Apple Calendar
          </button>
          <button className="calendar-provider-button" type="button" onClick={() => onOpenIcsCalendar(event.id)}>
            Samsung Calendar
          </button>
          <button className="calendar-provider-button" type="button" onClick={() => onOpenIcsCalendar(event.id)}>
            Outlook
          </button>
          {calendarError && (
            <p className="error event-calendar-error" role="alert">
              {calendarError}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export function InvitationSection() {
  const [weddingContent, setWeddingContent] = useState(getDefaultWeddingContent)
  const [openCalendarEventId, setOpenCalendarEventId] = useState<CalendarEvent['id'] | null>(null)
  const [calendarError, setCalendarError] = useState('')

  useEffect(() => {
    let isMounted = true
    void loadWeddingContent().then((content) => {
      if (isMounted) setWeddingContent(content)
    })
    return () => {
      isMounted = false
    }
  }, [])

  function handleToggleCalendar(eventId: CalendarEvent['id']) {
    setCalendarError('')
    setOpenCalendarEventId((currentEventId) => currentEventId === eventId ? null : eventId)
  }

  function handleIcsCalendarOpen(eventId: CalendarEvent['id']) {
    const publicUrl = getPublicIcsUrl(eventId)

    if (!publicUrl) {
      setCalendarError('L’ouverture du calendrier n’a pas fonctionné.')
      return
    }

    window.location.assign(publicUrl)
  }

  const calendarEvents = getCalendarEvents(weddingContent)

  return (
    <section className="invitation-panel" aria-labelledby="invitation-title">
      <div className="guest-ambient guest-ambient-form" aria-hidden="true">
        <span className="ambient-glow ambient-glow-1" />
        <span className="ambient-glow ambient-glow-2" />
        <span className="ambient-heart heart-1" />
        <span className="ambient-heart heart-2" />
        <span className="ambient-petal petal-1" />
        <span className="ambient-petal petal-2" />
      </div>
      <div className="invitation-heading">
        <p className="eyebrow">Célébration</p>
        <h2 id="invitation-title">{weddingContent.coupleNames}</h2>
        <p className="date-label">{weddingContent.dateLabel}</p>
      </div>
      <div className="event-list">
        <EventDetails
          event={calendarEvents[0]}
          time={weddingContent.civilTime}
          isCalendarOpen={openCalendarEventId === 'civil'}
          calendarError={openCalendarEventId === 'civil' ? calendarError : ''}
          onToggleCalendar={handleToggleCalendar}
          onOpenIcsCalendar={handleIcsCalendarOpen}
        />
        <EventDetails
          event={calendarEvents[1]}
          time={weddingContent.religiousTime}
          isCalendarOpen={openCalendarEventId === 'religious'}
          calendarError={openCalendarEventId === 'religious' ? calendarError : ''}
          onToggleCalendar={handleToggleCalendar}
          onOpenIcsCalendar={handleIcsCalendarOpen}
        />
        <EventDetails
          event={calendarEvents[2]}
          time={weddingContent.receptionTime}
          isCalendarOpen={openCalendarEventId === 'reception'}
          calendarError={openCalendarEventId === 'reception' ? calendarError : ''}
          onToggleCalendar={handleToggleCalendar}
          onOpenIcsCalendar={handleIcsCalendarOpen}
        />
      </div>
    </section>
  )
}
