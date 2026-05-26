import { describe, expect, it } from 'vitest'
import { formatPhoneForDisplay, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('normalise les formats mobiles francais courants', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+33612345678')
    expect(normalizePhone('07.11.11.11.11')).toBe('+33711111111')
    expect(normalizePhone('06-22-22-22-22')).toBe('+33622222222')
    expect(normalizePhone('+33 6 33 33 33 33')).toBe('+33633333333')
    expect(normalizePhone('0033 7 44 44 44 44')).toBe('+33744444444')
  })

  it('refuse les valeurs non mobiles ou incompletes', () => {
    expect(normalizePhone('01 00 00 00 00')).toBeNull()
    expect(normalizePhone('0600')).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
  })
})

describe('formatPhoneForDisplay', () => {
  it('affiche un numero canonique en format lisible', () => {
    expect(formatPhoneForDisplay('+33612345678')).toBe('06 12 34 56 78')
  })
})
