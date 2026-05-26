import type { GuestStorage } from './guestStorage'

export function createFirestoreStorage(): GuestStorage {
  throw new Error(
    'Firestore n est pas configure dans le MVP local. Ajouter Firebase ici apres configuration .env locale.',
  )
}

