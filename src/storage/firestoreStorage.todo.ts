import type { GuestStorage } from './guestStorage'

export function createFirestoreStorage(): GuestStorage {
  throw new Error(
    "Firestore n'est pas configuré dans le MVP local. Ajouter Firebase ici après configuration .env locale.",
  )
}
