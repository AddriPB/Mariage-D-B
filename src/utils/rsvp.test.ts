import { describe, expect, it } from 'vitest'
import { validateGuestRsvp, validateRsvp } from './rsvp'

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

  it('refuse une validation invitée avec 0 adulte', () => {
    expect(
      validateGuestRsvp({
        adultsCount: 0,
        attendsCivil: true,
        attendsReligious: true,
        attendsReception: true,
      }),
    ).toContain('au moins un invité')
  })

  it('autorise encore une fiche admin à 0 adulte', () => {
    expect(
      validateRsvp({
        adultsCount: 0,
        attendsCivil: false,
        attendsReligious: false,
        attendsReception: false,
      }),
    ).toBeNull()
  })
})
