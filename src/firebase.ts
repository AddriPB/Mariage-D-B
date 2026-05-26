import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth'
import { doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore'

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

export function hasFirebaseConfig(): boolean {
  return Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0)
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
  firestore ??= getFirestore(firebaseApp)
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

export async function signInAdmin(normalizedPhone: string, password: string): Promise<void> {
  const auth = getFirebaseAuth()
  const credential = await signInWithEmailAndPassword(auth, getAdminEmailFromPhone(normalizedPhone), password)
  const adminSnapshot = await getDoc(doc(getFirebaseFirestore(), 'admins', credential.user.uid))
  const adminData = adminSnapshot.data()

  if (!adminSnapshot.exists() || adminData?.phone !== normalizedPhone || adminData?.isActive !== true) {
    await signOut(auth)
    throw new Error('Compte admin non autorise.')
  }
}
