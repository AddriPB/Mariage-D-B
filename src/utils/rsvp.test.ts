import { describe, expect, it } from 'vitest'
import { validateRsvp } from './rsvp'

describe('validateRsvp', () => {
  it('accepte un RSVP de 20 adultes maximum', () => {
    expect(
      validateRsvp({
        adultsCount: 12,
        attendsCivil: true,
        attendsReligious: true,
        attendsReception: true,
      }),
    ).toBeNull()
  })

  it('refuse un RSVP au-dessus de 20 adultes', () => {
    expect(
      validateRsvp({
        adultsCount: 21,
        attendsCivil: true,
        attendsReligious: false,
        attendsReception: true,
      }),
    ).toContain('20')
  })
})
