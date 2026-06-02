import { useEffect, useState } from 'react'
import { getDefaultWeddingContent, loadWeddingContent, type WeddingContent } from '../content/weddingContent'

type CalendarEvent = {
  id: 'civil' | 'religious' | 'reception'
  title: string
  start: string
  end: string
  location: string
  address: string
}

type EventDetailsProps = {
  title: string
  time: string
  location: string
  address: string
}

function getCalendarEvents(content: WeddingContent): CalendarEvent[] {
  return [
    {
      id: 'civil',
      title: 'Mariage civil',
      start: '20260926T100000',
      end: '20260926T110000',
      location: content.civilLocation,
      address: content.civilAddress,
    },
    {
      id: 'religious',
      title: 'Bénédiction',
      start: '20260926T150000',
      end: '20260926T163000',
      location: content.religiousLocation,
      address: content.religiousAddress,
    },
    {
      id: 'reception',
      title: 'Réception',
      start: '20260926T180000',
      end: '20260927T020000',
      location: content.receptionLocation,
      address: content.receptionAddress,
    },
  ]
}

const timezoneBlock = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Paris',
  'X-LIC-LOCATION:Europe/Paris',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

function escapeIcsValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function foldIcsLine(line: string): string {
  const chunks: string[] = []
  let remaining = line

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75))
    remaining = remaining.slice(75)
  }

  chunks.push(remaining)
  return chunks.join('\r\n ')
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function buildIcs(events: CalendarEvent[]): string {
  const timestamp = formatIcsDate(new Date())
  const eventLines = events.flatMap((event) => [
    'BEGIN:VEVENT',
    `UID:mariage-daima-${event.id}-20260926@daima`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;TZID=Europe/Paris:${event.start}`,
    `DTEND;TZID=Europe/Paris:${event.end}`,
    `SUMMARY:${escapeIcsValue(event.title)}`,
    `LOCATION:${escapeIcsValue(`${event.location}, ${event.address}`)}`,
    `DESCRIPTION:${escapeIcsValue(`${event.title} - ${event.address}`)}`,
    'END:VEVENT',
  ])

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mariage Daima//Invitation//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...timezoneBlock,
    ...eventLines,
    'END:VCALENDAR',
  ].map(foldIcsLine).join('\r\n')
}

function downloadIcs(events: CalendarEvent[], filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Téléchargement indisponible.')
  }

  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  try {
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }
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

function EventDetails({ title, time, location, address }: EventDetailsProps) {
  const shouldShowLocation =
    location.trim().toLowerCase() !== title.trim().toLowerCase()
    && location.trim().toLowerCase() !== 'mairie de champigny-sur-marne'

  return (
    <article className="event-details">
      <div className="event-time" aria-label={`Horaire ${title}`}>
        {time}
      </div>
      <div className="event-copy">
        <h3>{title}</h3>
        {shouldShowLocation && <p>{location}</p>}
        <address>{address}</address>
      </div>
    </article>
  )
}

export function InvitationSection() {
  const [weddingContent, setWeddingContent] = useState(getDefaultWeddingContent)
  const [showCalendarFallback, setShowCalendarFallback] = useState(false)

  useEffect(() => {
    let isMounted = true
    void loadWeddingContent().then((content) => {
      if (isMounted) setWeddingContent(content)
    })
    return () => {
      isMounted = false
    }
  }, [])

  function handleGroupedCalendarDownload() {
    try {
      downloadIcs(getCalendarEvents(weddingContent), 'mariage-daima-agenda.ics')
    } catch {
      setShowCalendarFallback(true)
    }
  }

  function handleSingleCalendarDownload(event: CalendarEvent) {
    try {
      downloadIcs([event], `mariage-daima-${event.id}.ics`)
    } catch {
      setShowCalendarFallback(true)
    }
  }

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
          title="Mariage civil"
          time={weddingContent.civilTime}
          location={weddingContent.civilLocation}
          address={weddingContent.civilAddress}
        />
        <EventDetails
          title="Mariage religieux"
          time={weddingContent.religiousTime}
          location={weddingContent.religiousLocation}
          address={weddingContent.religiousAddress}
        />
        <EventDetails
          title="Réception"
          time={weddingContent.receptionTime}
          location={weddingContent.receptionLocation}
          address={weddingContent.receptionAddress}
        />
      </div>
      <div className="calendar-actions" aria-label="Ajouter les événements à l'agenda">
        <button className="primary-action calendar-action-button" type="button" onClick={handleGroupedCalendarDownload}>
          <CalendarIcon />
          <span>Ajouter les 3 événements à mon agenda</span>
        </button>
        {showCalendarFallback && (
          <div className="calendar-fallback">
            <p className="error" role="alert">
              L’ajout groupé n’a pas fonctionné. Vous pouvez ajouter les événements un par un.
            </p>
            <div className="calendar-fallback-actions">
              {getCalendarEvents(weddingContent).map((event) => (
                <button
                  className="secondary calendar-action-button"
                  type="button"
                  onClick={() => handleSingleCalendarDownload(event)}
                  key={event.id}
                >
                  <CalendarIcon />
                  <span>
                    {event.id === 'civil' && 'Ajouter le mariage civil'}
                    {event.id === 'religious' && 'Ajouter la bénédiction'}
                    {event.id === 'reception' && 'Ajouter la réception'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
