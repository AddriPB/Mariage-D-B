# Politique donnees privees

Ce repo ne doit contenir aucune donnee reelle du mariage.

Tout fichier contenant telephones, noms, RSVP, exports, photos, invitation finale, QR code final, credentials ou secrets doit rester local et ignore par Git.

Fichiers explicitement reserves aux exemples :

- `.env.example`
- `.env.local.example`
- `guests.example.csv`

Tout autre fichier de donnees doit etre considere prive par defaut et place dans `private/`, `data/private/` ou `exports/`, tous ignores par `.gitignore`.

