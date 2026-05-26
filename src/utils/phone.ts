export function normalizePhone(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  let compact = raw.replace(/[\s.-]/g, '')
  compact = compact.replace(/[()]/g, '')

  if (compact.startsWith('0033')) {
    compact = `+33${compact.slice(4)}`
  }

  if (compact.startsWith('+33')) {
    const national = compact.slice(3)
    const withoutLeadingZero = national.startsWith('0') ? national.slice(1) : national
    return /^[67]\d{8}$/.test(withoutLeadingZero) ? `+33${withoutLeadingZero}` : null
  }

  if (/^0[67]\d{8}$/.test(compact)) {
    return `+33${compact.slice(1)}`
  }

  if (/^[67]\d{8}$/.test(compact)) {
    return `+33${compact}`
  }

  return null
}

export function formatPhoneForDisplay(normalizedPhone: string): string {
  if (!normalizedPhone.startsWith('+33') || normalizedPhone.length !== 12) {
    return normalizedPhone
  }

  const national = `0${normalizedPhone.slice(3)}`
  return national.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

