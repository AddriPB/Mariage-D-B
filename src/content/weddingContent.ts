export type WeddingContent = {
  coupleNames: string
  dateLabel: string
  civilLocation: string
  religiousLocation: string
  receptionLocation: string
}

const defaultWeddingContent: WeddingContent = {
  coupleNames: 'Prenom 1 & Prenom 2',
  dateLabel: '26 septembre',
  civilLocation: 'Lieu civil a completer',
  religiousLocation: 'Lieu religieux a completer',
  receptionLocation: 'Lieu reception a completer',
}

export const PRIVATE_WEDDING_CONTENT_KEY = 'mariage-daima.privateWeddingContent.v1'

const privateContentModules = import.meta.glob<{ default: Partial<WeddingContent> }>(
  './weddingContent.private.local.ts',
)

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
