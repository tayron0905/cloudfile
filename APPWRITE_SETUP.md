# Appwrite einrichten

CloudFile verwendet dein Appwrite-Projekt mit der Project-ID `6b047c94000730aa95f5`.

## 1. Projekt und Web-Plattform

1. Öffne https://appwrite.io/console/project-6b047c94000730aa95f5
2. Öffne **Overview / Settings** und prüfe, dass die Project-ID `6b047c94000730aa95f5` lautet.
3. Unter **Platforms** eine neue **Web App** anlegen.
4. Als Hostnames deine lokale Entwicklungsadresse `localhost` und später deine GitHub-Pages-Domain eintragen. Für Pages ist das normalerweise `<github-user>.github.io`.

## 2. Datenbank und Collections

Unter **Databases** eine Datenbank anlegen. Verwende als Datenbank-ID `cloudfile` (oder trage deine tatsächlich erzeugte ID in `.env` ein).

Erstelle die Collection `file_metadata` mit diesen Attributen:

| Attribut | Typ | Größe | Pflicht |
|---|---|---:|---|
| ownerId | varchar | 36 | ja |
| fileId | varchar | 36 | ja |
| folderId | varchar | 36 | nein |
| originalName | varchar | 255 | ja |
| mimeType | varchar | 255 | ja |
| size | integer | – | ja |
| favorite | boolean | – | ja |
| createdAt | datetime | – | ja |

Erstelle einen Index für `ownerId` (Key, ASC). Optional zusätzlich einen kombinierten Index für `ownerId` und `createdAt`.

Erstelle die Collection `folders` mit diesen Attributen:

| Attribut | Typ | Größe | Pflicht |
|---|---|---:|---|
| ownerId | varchar | 36 | ja |
| name | varchar | 80 | ja |
| parentId | varchar | 36 | nein |
| createdAt | datetime | – | ja |

Erstelle einen Index für `ownerId` (Key, ASC).

Aktiviere für beide Collections **Document Security**. Die App setzt bei jedem Dokument Lese-, Änderungs- und Löschrechte nur für den jeweiligen eingeloggten Benutzer.

## 3. Storage Bucket

Unter **Storage** einen Bucket erstellen:
- Bucket-ID: `cloudfile-files`
- Name: `CloudFile Dateien`
- File Security: aktiviert
- Erlaube die Dateitypen, die du speichern möchtest (für einen ersten Test kannst du alle Dateitypen zulassen).
- Setze ein Upload-Limit passend zu deinem Appwrite-Tarif.

Die App vergibt beim Upload Datei-Rechte ausschließlich an den Besitzer.

## 4. Lokale Konfiguration

```bash
cp .env.example .env
npm install
npm run dev
```

Öffne `http://localhost:5173`.

Passe in `.env` die Endpoint-Region an deinen Appwrite-Server an. Verwende exakt den Endpoint aus Appwrite **Settings / API / Endpoint**. Der Beispielwert in `.env.example` ist nur ein Beispiel.

## 5. Appwrite-Attribute und IDs prüfen

Die IDs in `.env.example` sind gewünschte IDs. Appwrite erlaubt beim Erstellen einer Ressource eine eigene ID, sofern du diese im Dialog manuell einträgst. Falls du andere IDs gewählt hast, trage sie exakt in `.env` ein.

## Sicherheitshinweise

- Niemals einen Appwrite API-Key im Browser oder in `.env` mit `VITE_`-Präfix speichern.
- Die Project-ID und der öffentliche Endpoint sind für Web-SDKs vorgesehen; Zugriff wird über Appwrite Auth und Ressourcen-Berechtigungen kontrolliert.
- Aktiviere Document Security und File Security. Ohne diese Einstellungen kann die Trennung der Benutzer unzureichend sein.
- Dieses MVP löscht Dateien dauerhaft; ein Papierkorb und echte Freigabelinks sind noch nicht implementiert.
- Der angezeigte Speicherverbrauch summiert die Dateien des angemeldeten Benutzers. Ein Tariflimit muss separat serverseitig durchgesetzt werden.
