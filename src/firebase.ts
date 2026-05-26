import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth'

function readEnvValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/^["']|["']$/g, '') : ''
}

const firebaseConfig = {
  apiKey: readEnvValue(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: readEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: readEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: readEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: readEnvValue(import.meta.env.VITE_FIREBASE_APP_ID),
}

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null

type AdminAccessStage = 'auth' | 'admin-read' | 'admin-validation'
type FirestorePrimitive = string | number | boolean | null
type FirestoreData = Record<string, FirestorePrimitive | undefined>

type FirestoreRestValue = {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  nullValue?: null
}

type FirestoreRestDocument = {
  name?: string
  fields?: Record<string, FirestoreRestValue>
}

export type AdminProfile = {
  uid: string
  phone: string
}

export class AdminAccessError extends Error {
  readonly stage: AdminAccessStage

  constructor(
    stage: AdminAccessStage,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AdminAccessError'
    this.stage = stage
  }
}

export class FirestoreRestError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'FirestoreRestError'
    this.code = code
    this.status = status
  }
}

export function hasFirebaseConfig(): boolean {
  return Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0)
}

export function shouldUseFirebaseStorage(): boolean {
  return hasFirebaseConfig() || import.meta.env.PROD
}

function getFirebaseAuth(): Auth {
  if (!hasFirebaseConfig()) {
    throw new Error('Configuration Firebase incomplete.')
  }

  firebaseApp ??= initializeApp(firebaseConfig)
  firebaseAuth ??= getAuth(firebaseApp)
  return firebaseAuth
}

function getFirebaseProjectId(): string {
  if (!hasFirebaseConfig()) {
    throw new Error('Configuration Firebase incomplete.')
  }

  return firebaseConfig.projectId
}

export async function getCurrentUserIdToken(): Promise<string | undefined> {
  const user = getFirebaseAuth().currentUser
  return user ? user.getIdToken() : undefined
}

function getAdminEmailFromPhone(normalizedPhone: string): string {
  const emailDomain = import.meta.env.VITE_ADMIN_AUTH_EMAIL_DOMAIN
  if (!emailDomain) {
    throw new Error('Domaine email admin Firebase manquant.')
  }

  const phoneDigits = normalizedPhone.replace(/\D/g, '')
  return `admin-${phoneDigits}@${emailDomain}`
}

function errorDetails(error: unknown): { code?: string; message: string } {
  return {
    code: typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined,
    message: error instanceof Error ? error.message : String(error),
  }
}

function logAdminAccessError(stage: AdminAccessStage, details: Record<string, unknown>) {
  console.error('[admin-access]', { stage, ...details })
}

function firestoreRestUrl(path: string, updateMask?: string[]): string {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${getFirebaseProjectId()}/databases/(default)/documents/${path}`,
  )
  for (const fieldPath of updateMask ?? []) {
    url.searchParams.append('updateMask.fieldPaths', fieldPath)
  }
  return url.toString()
}

function encodeFirestoreValue(value: FirestorePrimitive): FirestoreRestValue {
  if (value === null) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  return { stringValue: value }
}

function encodeFirestoreFields(data: FirestoreData): Record<string, FirestoreRestValue> {
  return Object.fromEntries(
    Object.entries(data)
      .filter((entry): entry is [string, FirestorePrimitive] => entry[1] !== undefined)
      .map(([key, value]) => [key, encodeFirestoreValue(value)]),
  )
}

function decodeFirestoreValue(value: FirestoreRestValue): FirestorePrimitive | undefined {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  return undefined
}

function decodeFirestoreFields(fields: FirestoreRestDocument['fields']): FirestoreData {
  return Object.fromEntries(
    Object.entries(fields ?? {})
      .map(([key, value]) => [key, decodeFirestoreValue(value)])
      .filter((entry): entry is [string, FirestorePrimitive] => entry[1] !== undefined),
  )
}

async function parseFirestoreRestError(response: Response): Promise<FirestoreRestError> {
  const fallbackCode = `http-${response.status}`
  try {
    const body = await response.json() as { error?: { status?: string; message?: string } }
    return new FirestoreRestError(
      body.error?.status?.toLowerCase() ?? fallbackCode,
      body.error?.message ?? response.statusText,
      response.status,
    )
  } catch {
    return new FirestoreRestError(fallbackCode, response.statusText, response.status)
  }
}

async function firestoreRestFetch(
  path: string,
  options: {
    idToken?: string
    method?: 'GET' | 'PATCH' | 'DELETE'
    data?: FirestoreData
    updateMask?: string[]
    searchParams?: Record<string, string>
  } = {},
): Promise<Response> {
  const headers = new Headers()
  if (options.idToken) headers.set('Authorization', `Bearer ${options.idToken}`)
  if (options.data) headers.set('Content-Type', 'application/json')

  const url = new URL(firestoreRestUrl(path, options.updateMask))
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, value)
  }

  return fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.data ? JSON.stringify({ fields: encodeFirestoreFields(options.data) }) : undefined,
  })
}

export async function getFirestoreRestDocument(
  path: string,
  idToken?: string,
): Promise<FirestoreData | null> {
  const response = await firestoreRestFetch(path, { idToken })
  if (response.status === 404) return null
  if (!response.ok) throw await parseFirestoreRestError(response)
  const document = await response.json() as FirestoreRestDocument
  return decodeFirestoreFields(document.fields)
}

export async function listFirestoreRestDocuments(
  collectionPath: string,
  idToken?: string,
): Promise<Array<{ id: string; data: FirestoreData }>> {
  const documents: Array<{ id: string; data: FirestoreData }> = []
  let pageToken: string | undefined

  do {
    const response = await firestoreRestFetch(collectionPath, {
      idToken,
      searchParams: {
        pageSize: '1000',
        ...(pageToken ? { pageToken } : {}),
      },
    })
    if (!response.ok) throw await parseFirestoreRestError(response)

    const body = await response.json() as {
      documents?: FirestoreRestDocument[]
      nextPageToken?: string
    }
    documents.push(
      ...(body.documents ?? []).map((document) => ({
        id: document.name?.split('/').pop() ?? '',
        data: decodeFirestoreFields(document.fields),
      })),
    )
    pageToken = body.nextPageToken
  } while (pageToken)

  return documents
}

export async function patchFirestoreRestDocument(
  path: string,
  data: FirestoreData,
  options: { idToken?: string; updateMask?: string[] } = {},
): Promise<void> {
  const response = await firestoreRestFetch(path, {
    idToken: options.idToken,
    method: 'PATCH',
    data,
    updateMask: options.updateMask,
  })
  if (!response.ok) throw await parseFirestoreRestError(response)
}

export async function deleteFirestoreRestDocument(path: string, idToken?: string): Promise<void> {
  const response = await firestoreRestFetch(path, { idToken, method: 'DELETE' })
  if (!response.ok) throw await parseFirestoreRestError(response)
}

export async function signInAdmin(normalizedPhone: string, password: string): Promise<AdminProfile> {
  const auth = getFirebaseAuth()
  const email = getAdminEmailFromPhone(normalizedPhone)
  let credential: Awaited<ReturnType<typeof signInWithEmailAndPassword>>
  let idToken: string

  try {
    credential = await signInWithEmailAndPassword(auth, email, password)
    idToken = await credential.user.getIdToken()
  } catch (error) {
    logAdminAccessError('auth', errorDetails(error))
    throw new AdminAccessError('auth', 'Authentification admin impossible.', { cause: error })
  }

  let adminData: FirestoreData | null
  try {
    adminData = await getFirestoreRestDocument(`admins/${credential.user.uid}`, idToken)
  } catch (error) {
    logAdminAccessError('admin-read', {
      ...errorDetails(error),
      uid: credential.user.uid,
    })
    await signOut(auth)
    throw new AdminAccessError('admin-read', 'Lecture du profil admin impossible.', { cause: error })
  }

  if (!adminData || adminData.phone !== normalizedPhone || adminData.isActive !== true) {
    logAdminAccessError('admin-validation', {
      uid: credential.user.uid,
      adminExists: Boolean(adminData),
      adminPhoneMatches: adminData?.phone === normalizedPhone,
      adminIsActive: adminData?.isActive,
    })
    await signOut(auth)
    throw new AdminAccessError('admin-validation', 'Compte admin non autorise.')
  }

  return {
    uid: credential.user.uid,
    phone: normalizedPhone,
  }
}
