# Invitation RSVP mariage

Application privee d invitation et de suivi RSVP.

Ce depot ne doit contenir aucune donnee reelle du mariage, aucun secret, aucun export et aucun fichier de production prive.

## Developpement

```bash
npm install
npm run dev
```

Commandes de controle :

```bash
npm run lint
npm run test
npm run build
```

## Configuration

Les fichiers `.env*` reels ne doivent pas etre commites. Utiliser les fichiers `.example` comme modele.

Variables attendues :

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ADMIN_AUTH_EMAIL_DOMAIN=
```

## Confidentialite

Ne jamais commiter :

- numeros, noms, emails ou liste d invites reels ;
- RSVP, exports, sauvegardes ou donnees Firestore ;
- photos, invitation finale ou QR code final ;
- mots de passe, fichiers `.env` reels, service accounts ou credentials.

Les chemins sensibles sont ignores dans `.gitignore`.
