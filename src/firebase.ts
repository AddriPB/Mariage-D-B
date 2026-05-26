import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth'
import { doc, getDoc, initializeFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firestore: Firestore | null = null

type AdminAccessStage = 'auth' | 'admin-read' | 'admin-validation'

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

export function getFirebaseFirestore(): Firestore {
  if (!hasFirebaseConfig()) {
    throw new Error('Configuration Firebase incomplete.')
  }

  firebaseApp ??= initializeApp(firebaseConfig)
  firestore ??= initializeFirestore(firebaseApp, {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  })
  return firestore
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

export async function signInAdmin(normalizedPhone: string, password: string): Promise<AdminProfile> {
  const auth = getFirebaseAuth()
  const email = getAdminEmailFromPhone(normalizedPhone)
  let credential: Awaited<ReturnType<typeof signInWithEmailAndPassword>>

  try {
    credential = await signInWithEmailAndPassword(auth, email, password)
    await credential.user.getIdToken()
  } catch (error) {
    logAdminAccessError('auth', errorDetails(error))
    throw new AdminAccessError('auth', 'Authentification admin impossible.', { cause: error })
  }

  let adminSnapshot: Awaited<ReturnType<typeof getDoc>>
  try {
    adminSnapshot = await getDoc(doc(getFirebaseFirestore(), 'admins', credential.user.uid))
  } catch (error) {
    logAdminAccessError('admin-read', {
      ...errorDetails(error),
      uid: credential.user.uid,
    })
    await signOut(auth)
    throw new AdminAccessError('admin-read', 'Lecture du profil admin impossible.', { cause: error })
  }

  const adminData = adminSnapshot.data() as { phone?: string; isActive?: boolean } | undefined

  if (!adminSnapshot.exists() || adminData?.phone !== normalizedPhone || adminData?.isActive !== true) {
    logAdminAccessError('admin-validation', {
      uid: credential.user.uid,
      adminExists: adminSnapshot.exists(),
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
