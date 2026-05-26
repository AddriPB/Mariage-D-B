import { useEffect, useState } from 'react'
import { getDefaultWeddingContent, loadWeddingContent } from '../content/weddingContent'

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
        <span>Civil : {weddingContent.civilLocation}</span>
        <span>Religieux : {weddingContent.religiousLocation}</span>
        <span>Reception : {weddingContent.receptionLocation}</span>
      </div>
    </section>
  )
}
