# Contexte projet

## Contexte metier

Application web locale pour un mariage precis : invitation numerique, RSVP ferme par telephone, dashboard admin pour le suivi et la gestion de la liste invites.

Le projet est volontairement one-shot. Si un autre mariage existe plus tard, le repo sera clone et adapte manuellement.

## Decisions produit validees

- React + Vite + TypeScript.
- Mobile-first.
- MVP local exploitable sans secrets Firebase.
- Persistance locale via `localStorage`.
- Donnees demo fictives uniquement.
- Les vrais contenus et donnees restent hors repo.
- Admins fixes en pratique, sans permissions fines ni console de gestion avancee.
- Dans le MVP local, un admin est un invite `isAdmin: true`.
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
2. Si telephone admin : demande mot de passe.
3. Si mot de passe correct : dashboard.
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
- `src/storage/guestStorage.ts` contient l implementation `localStorage`.
- `src/storage/firestoreStorage.todo.ts` reserve le branchement futur Firestore.
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
- Pas de deploiement.
- Pas de GitHub push.

## Prochaine etape possible

1. Tester le MVP local avec les donnees fictives.
2. Ajuster les textes dans `weddingContent.ts`.
3. Ajouter des vrais invites uniquement via un fichier local ignore ou via dashboard local.
4. Brancher Firestore plus tard si le besoin est confirme.
5. Durcir l authentification avant toute exposition hors machine locale.
