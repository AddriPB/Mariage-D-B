import { useEffect, useState } from 'react'
import { getDefaultWeddingContent, loadWeddingContent } from '../content/weddingContent'

type EventDetailsProps = {
  title: string
  time: string
  location: string
  address: string
}

function EventDetails({ title, time, location, address }: EventDetailsProps) {
  return (
    <article className="event-details">
      <div>
        <h3>{title}</h3>
        <p>{location}</p>
      </div>
      <time>{time}</time>
      <address>{address}</address>
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
    <section className="panel invitation-panel">
      <h2>{weddingContent.coupleNames}</h2>
      <p className="date-label">{weddingContent.dateLabel}</p>
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
