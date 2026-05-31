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
  coupleNames: 'Prénom 1 & Prénom 2',
  dateLabel: '26 septembre',
  civilLocation: 'Mairie de Champigny-sur-Marne',
  civilAddress: '14 rue Louis-Talamoni, 94500 Champigny-sur-Marne',
  civilTime: '10:00h',
  religiousLocation: 'Mariage religieux',
  religiousAddress: '381 Rue Marcel Paul, 94500 Champigny-sur-Marne',
  religiousTime: '15:00h',
  receptionLocation: 'Réception',
  receptionAddress: '381 Rue Marcel Paul, 94500 Champigny-sur-Marne',
  receptionTime: '18:00h',
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
