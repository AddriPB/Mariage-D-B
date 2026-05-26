# Contexte projet

## Contexte metier

Application web pour un mariage precis : invitation numerique, RSVP ferme par telephone, dashboard admin pour le suivi et la gestion de la liste invites.

Le projet est volontairement one-shot. Si un autre mariage existe plus tard, le repo sera clone et adapte manuellement.

## Decisions produit validees

- React + Vite + TypeScript.
- Mobile-first.
- MVP local exploitable sans secrets Firebase.
- En production, l acces invite et admin passe par Firebase/Firestore.
- Persistance locale via `localStorage` seulement en fallback dev sans config Firebase.
- Donnees demo fictives uniquement.
- Les vrais contenus et donnees restent hors repo.
- Admins fixes en pratique, sans permissions fines ni console de gestion avancee.
- En production, les admins sont des comptes Firebase Auth + documents `admins/{uid}`.
- Les fiches `isAdmin` sont exclues des statistiques RSVP et de la liste de suivi invite.

## Parcours invite

1. Saisie telephone.
2. Normalisation en `+33XXXXXXXXX`.
3. Si telephone inconnu : refus.
4. Si telephone connu actif non admin : ouverture du RSVP.
5. Marquage visite : `hasVisited`, `firstVisitedAt`, `lastVisitedAt`.
6. Validation RSVP avec nombre d adultes et presences civil/religieux/reception.
7. La reponse peut etre modifiee plus tard.

## Parcours admin

1. Saisie telephone.
2. Le telephone admin est transforme en email technique Firebase.
3. Si le mot de passe Firebase Auth est correct et que `admins/{uid}` existe avec le meme telephone et `isActive: true` : dashboard.
4. Sinon : message clair.
5. Le dashboard permet stats, filtres simples et CRUD invites/admins.

## Regles RSVP

- Champs : adultes, presence civil, presence religieux, presence reception.
- `adultes <= 20`.
- Validation cote UI et cote logique dans `src/utils/rsvp.ts`.
- Validation finale via bouton explicite `Valider ma reponse`.
- Message de succes indiquant que la reponse reste modifiable.

## Regles confidentialite

Interdiction de stocker dans le repo :

- vrais telephones ;
- vrais noms ;
- vrais statuts RSVP ;
- exports reels ;
- photos reelles ;
- invitation finale ;
- QR code final ;
- credentials ;
- vrai mot de passe admin ;
- `.env` reel.

`.gitignore` bloque les chemins et formats sensibles attendus.

## Architecture locale

- `src/App.tsx` orchestre les sessions invite/admin.
- `src/components/AccessScreen.tsx` gere l acces par telephone et mot de passe admin.
- `src/components/RsvpScreen.tsx` gere le formulaire RSVP.
- `src/components/AdminDashboard.tsx` gere stats, filtres, CRUD et import CSV.
- `src/storage/guestStorage.ts` choisit Firestore si la config Firebase est presente, sinon `localStorage`.
- `src/storage/firestoreStorage.ts` contient l implementation Firestore.
- `src/firebase.ts` initialise Firebase Auth/Firestore et gere le login admin.
- `src/utils/phone.ts` normalise les telephones.
- `src/utils/stats.ts` calcule les stats dashboard.
- `src/content/weddingContent.ts` centralise les placeholders mariage et accepte un override prive via `localStorage` ou `src/content/weddingContent.private.local.ts`.

## Modele de donnees

```ts
Guest {
  id: string;
  phone: string;
  normalizedPhone: string;
  displayName?: string;
  isAdmin?: boolean;
  isActive: boolean;
  hasVisited: boolean;
  firstVisitedAt?: string;
  lastVisitedAt?: string;
  hasValidated: boolean;
  validatedAt?: string;
  updatedAt?: string;
  updatedByAdmin?: boolean;
  updatedByPhone?: string;
  adultsCount: number;
  attendsCivil: boolean;
  attendsReligious: boolean;
  attendsReception: boolean;
}
```

## Decisions explicitement exclues

- Pas de SaaS.
- Pas de multi-mariage.
- Pas de systeme de roles complexe.
- Pas de creation invite depuis le parcours public.
- Pas de vrais secrets ou donnees reelles.
- Pas de noms reels hardcodes dans le code source.

## Import invites autorises

Process valide pour ajouter en masse des invites classiques autorises :

1. Source recommandee : CSV local, pas XLSX, pour limiter les erreurs de format et preserver les zeros initiaux.
2. Fichier source prive ignore par Git : `private/guests.csv`.
3. Format minimal attendu :

```csv
phone
06XXXXXXXX
07XXXXXXXX
```

4. Le CSV ne doit contenir que les telephones autorises. Ne jamais ajouter d admin via cet import.
5. L import doit passer par un script local Node utilisant un service account Firebase local ignore par Git.
6. Emplacement recommande du service account : `private/firebase-service-account.json`.
7. Le script doit valider chaque telephone : mobile FR uniquement, `06` ou `07` + 8 chiffres.
8. Le script doit normaliser en `+33XXXXXXXXX`.
9. Le document Firestore doit etre cree dans `guests/{telephoneSansPlus}`.
10. Champs par defaut a ecrire :

```js
{
  id: "336XXXXXXXX",
  phone: "+336XXXXXXXX",
  normalizedPhone: "+336XXXXXXXX",
  isAdmin: false,
  isActive: true,
  hasVisited: false,
  hasValidated: false,
  adultsCount: 0,
  attendsCivil: false,
  attendsReligious: false,
  attendsReception: false
}
```

11. Le script doit produire un rapport : importes, doublons, invalides, erreurs.
12. Les fichiers `private/guests.csv` et `private/firebase-service-account.json` ne doivent jamais etre commites.

## Prochaine etape possible

1. Creer le script local `npm run import:guests` pour importer `private/guests.csv` vers Firestore.
2. Importer les invites classiques autorises via CSV local.
3. Tester l acces invite sur les telephones de test Firestore.
4. Ajuster les textes dans `weddingContent.ts` ou via override prive local.
