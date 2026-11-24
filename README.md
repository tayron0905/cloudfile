# CloudFile ☁️

CloudFile ist eine moderne, responsive Cloud-Dateiverwaltung mit React, TypeScript, Vite und Appwrite.

## Funktionen

- Registrierung, Login und Logout mit Appwrite Auth
- Datei-Upload in Appwrite Storage
- Dateimetadaten in Appwrite Databases
- Eigene Ordner erstellen und löschen (nur leere Ordner)
- Suche, Favoriten und zuletzt hinzugefügte Dateien
- Dateien herunterladen und dauerhaft löschen
- Benutzerbezogene Berechtigungen auf Dokumenten und Dateien
- GitHub Actions für CI, Build und GitHub-Pages-Deployment

## Schnellstart

```bash
cp .env.example .env
npm install
npm run dev
```

Vor dem Start Appwrite anhand von [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) konfigurieren.

## Umgebungsvariablen

Siehe `.env.example`. Alle Variablen werden als Vite-Client-Konfiguration ausgeliefert und dürfen daher **keine Geheimnisse** enthalten. Insbesondere niemals API-Keys mit `VITE_`-Präfix eintragen.

## Build und Qualität

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## GitHub Pages

1. Repository auf GitHub erstellen und den Inhalt dieses Projekts auf den Branch `main` pushen.
2. In **Settings → Pages → Build and deployment** die Quelle **GitHub Actions** auswählen.
3. Unter **Settings → Secrets and variables → Actions → Variables** die sechs `VITE_APPWRITE_*`-Variablen aus `.env.example` als Repository Variables eintragen.
4. In Appwrite unter **Platforms** die GitHub-Pages-Domain als Web-Plattform hinzufügen.
5. Der Workflow `.github/workflows/deploy-pages.yml` baut und veröffentlicht die App bei jedem Push auf `main`.

## Appwrite

Die Anwendung nutzt:
- Account API für Authentifizierung
- Databases API für Datei-Metadaten und Ordner
- Storage API für Datei-Binärdaten

Die benötigten Datenbank-Collections, Attribute, Indizes, Berechtigungen und den Storage-Bucket beschreibt [APPWRITE_SETUP.md](./APPWRITE_SETUP.md).

## Umfang / bekannte Grenzen

Dies ist ein funktionsfähiges MVP als Grundlage. Freigabelinks, Papierkorb, serverseitige Quoten, Vorschau für alle Dateitypen, verschachtelte Ordnernavigation und große Datei-Uploads mit Chunk-/Resume-Handling sind noch nicht enthalten. Derzeit werden maximal 100 Dokumente je Liste geladen.
