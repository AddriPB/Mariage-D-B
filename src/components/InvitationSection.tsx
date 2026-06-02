import { useEffect, useState } from 'react'
import { getDefaultWeddingContent, loadWeddingContent } from '../content/weddingContent'

type EventDetailsProps = {
  title: string
  time: string
  location: string
  address: string
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

  useEffect(() => {
    let isMounted = true
    void loadWeddingContent().then((content) => {
      if (isMounted) setWeddingContent(content)
    })
    return () => {
      isMounted = false
    }
  }, [])

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
    </section>
  )
}
