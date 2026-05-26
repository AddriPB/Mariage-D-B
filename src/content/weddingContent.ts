export type WeddingContent = {
  coupleNames: string
  dateLabel: string
  civilLocation: string
  civilAddress: string
  civilTime: string
  religiousLocation: string
  religiousAddress: string
  religiousTime: string
  receptionLocation: string
  receptionAddress: string
  receptionTime: string
}

const defaultWeddingContent: WeddingContent = {
  coupleNames: 'Prenom 1 & Prenom 2',
  dateLabel: '26 septembre',
  civilLocation: 'Lieu civil a completer',
  civilAddress: 'Adresse civile a completer',
  civilTime: 'Heure civile a completer',
  religiousLocation: 'Lieu religieux a completer',
  religiousAddress: 'Adresse religieuse a completer',
  religiousTime: 'Heure religieuse a completer',
  receptionLocation: 'Lieu reception a completer',
  receptionAddress: 'Adresse reception a completer',
  receptionTime: 'Heure reception a completer',
}

export const PRIVATE_WEDDING_CONTENT_KEY = 'mariage-daima.privateWeddingContent.v1'

const privateContentModules = import.meta.env.DEV
  ? import.meta.glob<{ default: Partial<WeddingContent> }>('./weddingContent.private.local.ts')
  : {}

function getLocalStorageOverride(): Partial<WeddingContent> {
  if (typeof window === 'undefined') return {}

  const rawOverride = window.localStorage?.getItem(PRIVATE_WEDDING_CONTENT_KEY)
  if (!rawOverride) {
    return {}
  }

  try {
    return JSON.parse(rawOverride) as Partial<WeddingContent>
  } catch {
    return {}
  }
}

export function getDefaultWeddingContent(): WeddingContent {
  return { ...defaultWeddingContent, ...getLocalStorageOverride() }
}

export async function loadWeddingContent(): Promise<WeddingContent> {
  const privateModuleLoader = Object.values(privateContentModules)[0]
  const fileOverride = privateModuleLoader ? (await privateModuleLoader()).default : {}
  return { ...defaultWeddingContent, ...fileOverride, ...getLocalStorageOverride() }
}
