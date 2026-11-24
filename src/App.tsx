mport { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity, ArrowDownToLine, Check, ChevronRight, Cloud, File,
  FileImage, FileText, Film, Folder, FolderPlus, HardDrive, Heart, LayoutDashboard,
  LogOut, Plus, Search, Settings, ShieldCheck, Trash2, UploadCloud,
  X, Menu, RefreshCw
} from 'lucide-react'
import {
  account, bucketId, configReady, databases, databaseId, filesCollectionId,
  foldersCollectionId, ID, Query, storage, userPermissions,
  type CloudFileRecord, type CloudFolder
} from './lib/appwrite'

type User = { $id: string; name: string; email: string }
type View = 'all' | 'recent' | 'favorites'
const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}
const fileIcon = (mime: string) => mime.startsWith('image/') ? FileImage : mime.startsWith('video/') ? Film : mime.includes('pdf') || mime.includes('text') ? FileText : File
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [files, setFiles] = useState<CloudFileRecord[]>([])
  const [folders, setFolders] = useState<CloudFolder[]>([])
  const [view, setView] = useState<View>('all')
  const [activeFolder, setActiveFolder] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [showFolder, setShowFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  const loadData = async (currentUser = user) => {
    if (!currentUser) return
    setBusy(true); setError('')
    try {
      const [fileDocs, folderDocs] = await Promise.all([
        databases.listDocuments(databaseId, filesCollectionId, [Query.equal('ownerId', currentUser.$id), Query.limit(100)]),
        databases.listDocuments(databaseId, foldersCollectionId, [Query.equal('ownerId', currentUser.$id), Query.limit(100)])
      ])
      setFiles(fileDocs.documents as unknown as CloudFileRecord[])
      setFolders(folderDocs.documents as unknown as CloudFolder[])
    } catch (e) { setError(`Daten konnten nicht geladen werden: ${messageOf(e)}. Prüfe Datenbank, Collections und Attribute in Appwrite.`) }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (!configReady) return
    account.get().then((u) => setUser({ $id: u.$id, name: u.name, email: u.email })).catch(() => setUser(null))
  }, [])
  useEffect(() => { if (user) void loadData(user) }, [user])

  const visibleFiles = useMemo(() => files.filter((f) => {
    const matchesView = view === 'favorites' ? f.favorite : view === 'recent' ? true : f.folderId === activeFolder
    const matchesSearch = f.originalName.toLowerCase().includes(search.toLowerCase())
    return matchesView && matchesSearch
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [files, view, activeFolder, search])

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  const currentFolder = folders.find((f) => f.$id === activeFolder)

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setAuthBusy(true); setError('')
    try {
      if (authMode === 'register') {
        await account.create(ID.unique(), email, password, displayName.trim() || email.split('@')[0])
      }
      await account.createEmailPasswordSession(email, password)
      const u = await account.get()
      setUser({ $id: u.$id, name: u.name, email: u.email })
    } catch (e) { setError(messageOf(e)) } finally { setAuthBusy(false) }
  }
  const signOut = async () => { try { await account.deleteSession('current') } finally { setUser(null); setFiles([]); setFolders([]) } }

  const uploadFiles = async (list: FileList | null) => {
    if (!list || !user) return
    setBusy(true); setError(''); setNotice('')
    for (const file of Array.from(list)) {
      let uploadedId = ''
      try {
        const uploaded = await storage.createFile(bucketId, ID.unique(), file, userPermissions(user.$id))
        uploadedId = uploaded.$id
        await databases.createDocument(databaseId, filesCollectionId, ID.unique(), {
          ownerId: user.$id, fileId: uploaded.$id, folderId: activeFolder || '',
          originalName: file.name, mimeType: file.type || 'application/octet-stream',
          size: file.size, favorite: false, createdAt: new Date().toISOString()
        }, userPermissions(user.$id))
      } catch (e) {
        if (uploadedId) { try { await storage.deleteFile(bucketId, uploadedId) } catch { /* cleanup best effort */ } }
        setError(`Upload von „${file.name}“ fehlgeschlagen: ${messageOf(e)}`)
        break
      }
    }
    await loadData(user); setBusy(false); setNotice('Upload abgeschlossen.')
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const createFolder = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !folderName.trim()) return
    setBusy(true); setError('')
    try {
      await databases.createDocument(databaseId, foldersCollectionId, ID.unique(), {
        ownerId: user.$id, name: folderName.trim(), parentId: activeFolder || '', createdAt: new Date().toISOString()
      }, userPermissions(user.$id))
      setFolderName(''); setShowFolder(false); await loadData(user); setNotice('Ordner erstellt.')
    } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }

  const toggleFavorite = async (file: CloudFileRecord) => {
    try {
      await databases.updateDocument(databaseId, filesCollectionId, file.$id, { favorite: !file.favorite })
      setFiles((old) => old.map((f) => f.$id === file.$id ? { ...f, favorite: !f.favorite } : f))
    } catch (e) { setError(messageOf(e)) }
  }
  const deleteFile = async (file: CloudFileRecord) => {
    if (!confirm(`„${file.originalName}“ wirklich dauerhaft löschen?`)) return
    try {
      await storage.deleteFile(bucketId, file.fileId)
      await databases.deleteDocument(databaseId, filesCollectionId, file.$id)
      setFiles((old) => old.filter((f) => f.$id !== file.$id)); setNotice('Datei gelöscht.')
    } catch (e) { setError(messageOf(e)) }
  }
  const downloadFile = (file: CloudFileRecord) => {
    const url = storage.getFileDownload(bucketId, file.fileId)
    const anchor = document.createElement('a'); anchor.href = url.toString(); anchor.download = file.originalName
    anchor.target = '_blank'; anchor.rel = 'noreferrer'; anchor.click()
  }
  const deleteFolder = async (folder: CloudFolder) => {
    if (files.some((f) => f.folderId === folder.$id) || folders.some((f) => f.parentId === folder.$id)) {
      setError('Der Ordner ist nicht leer. Verschiebe oder lösche zuerst seinen Inhalt.'); return
    }
    if (!confirm(`Ordner „${folder.name}“ löschen?`)) return
    try { await databases.deleteDocument(databaseId, foldersCollectionId, folder.$id); setFolders((old) => old.filter((f) => f.$id !== folder.$id)) }
    catch (e) { setError(messageOf(e)) }
  }

  if (!configReady) return <SetupScreen />
  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} onSubmit={signIn} busy={authBusy} error={error} />

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Cloud size={21}/></span><span>Cloud<span className="brand-light">File</span></span></div>
        <button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen"><X/></button>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list">
          <button className={`nav-item ${view === 'all' ? 'active' : ''}`} onClick={() => { setView('all'); setActiveFolder('') }}><LayoutDashboard size={18}/> Alle Dateien</button>
          <button className={`nav-item ${view === 'recent' ? 'active' : ''}`} onClick={() => setView('recent')}><Activity size={18}/> Zuletzt hinzugefügt</button>
          <button className={`nav-item ${view === 'favorites' ? 'active' : ''}`} onClick={() => setView('favorites')}><Heart size={18}/> Favoriten</button>
        </nav>
        <div className="side-label folder-label">ORDNER <button onClick={() => setShowFolder(true)} title="Ordner erstellen"><Plus size={15}/></button></div>
        <nav className="nav-list folder-list">
          {folders.filter(f => !f.parentId).map(folder => <button key={folder.$id} className={`nav-item ${activeFolder === folder.$id ? 'active' : ''}`} onClick={() => { setView('all'); setActiveFolder(folder.$id) }}><Folder size={17}/><span className="folder-name">{folder.name}</span><button className="folder-delete" onClick={(e) => { e.stopPropagation(); void deleteFolder(folder) }} aria-label="Ordner löschen"><X size={13}/></button></button>)}
          {folders.length === 0 && <div className="empty-side">Noch keine Ordner</div>}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage-card"><div className="storage-head"><HardDrive size={16}/><span>Speicher belegt</span></div><div className="storage-number">{formatBytes(totalBytes)} <span>genutzt</span></div><div className="storage-track"><div style={{ width: `${Math.min(totalBytes / (5 * 1024 ** 3) * 100, 100)}%` }}/></div><small>{files.length} Dateien gespeichert</small></div>
          <button className="nav-item" onClick={() => void signOut()}><LogOut size={18}/> Abmelden</button>
        </div>
      </aside>
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)}/>}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Menü öffnen"><Menu/></button>
          <div className="breadcrumb"><span>CloudFile</span><ChevronRight size={15}/><strong>{view === 'favorites' ? 'Favoriten' : view === 'recent' ? 'Zuletzt hinzugefügt' : currentFolder?.name || 'Meine Dateien'}</strong></div>
          <div className="top-actions"><div className="user-avatar">{(user.name || user.email).slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{user.name || 'CloudFile Nutzer'}</strong><span>{user.email}</span></div></div>
        </header>
        <section className="content">
          <div className="welcome-row"><div><div className="eyebrow">DEIN DIGITALER SPEICHER</div><h1>{view === 'favorites' ? 'Deine Favoriten' : view === 'recent' ? 'Zuletzt hinzugefügt' : 'Meine Dateien'}<span className="title-dot">.</span></h1><p>Alles an einem Ort. Sicher gespeichert und jederzeit verfügbar.</p></div><button className="primary-button" onClick={() => uploadRef.current?.click()}><UploadCloud size={18}/> Dateien hochladen</button><input ref={uploadRef} type="file" multiple hidden onChange={(e) => void uploadFiles(e.target.files)}/></div>
          {(error || notice) && <div className={`notice ${error ? 'notice-error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(''); setNotice('') }}><X size={16}/></button></div>}
          <div className="stats-grid"><Stat icon={<Folder/>} label="Dateien" value={String(files.length)} detail="In deinem Cloud-Speicher"/><Stat icon={<HardDrive/>} label="Speicher verwendet" value={formatBytes(totalBytes)} detail="Deine gespeicherten Daten"/><Stat icon={<Heart/>} label="Favoriten" value={String(files.filter(f => f.favorite).length)} detail="Schnell wiederfinden"/></div>
          <div className="toolbar"><div className="section-heading"><h2>{view === 'favorites' ? 'Favorisierte Dateien' : view === 'recent' ? 'Deine letzten Uploads' : 'Dateiübersicht'}</h2><span>{visibleFiles.length} Elemente</span></div><div className="toolbar-actions"><div className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dateien suchen..."/></div><button className="secondary-button" onClick={() => setShowFolder(true)}><FolderPlus size={17}/> Neuer Ordner</button><button className="icon-button refresh-button" onClick={() => void loadData()} title="Aktualisieren"><RefreshCw size={17}/></button></div></div>
          {view === 'all' && !activeFolder && <div className="folder-grid">{folders.filter(f => !f.parentId).map(folder => <div className="folder-tile" key={folder.$id} onDoubleClick={() => setActiveFolder(folder.$id)}><div className="folder-icon"><Folder size={22}/></div><div className="folder-info"><strong>{folder.name}</strong><span>{files.filter(f => f.folderId === folder.$id).length} Dateien</span></div><button className="icon-button tile-open" onClick={() => setActiveFolder(folder.$id)}><ChevronRight size={17}/></button></div>)}</div>}
          {busy && <div className="loading-line"><span/> Cloud-Daten werden synchronisiert …</div>}
          <div className="file-table">
            <div className="file-table-head"><span>Name</span><span>Größe</span><span>Hochgeladen</span><span>Aktionen</span></div>
            {visibleFiles.map(file => { const Icon = fileIcon(file.mimeType); return <div className="file-row" key={file.$id}><div className="file-name"><div className="file-type-icon"><Icon size={19}/></div><div><strong>{file.originalName}</strong><small>{file.mimeType || 'Datei'}</small></div></div><span className="file-size">{formatBytes(file.size)}</span><span className="file-date">{new Date(file.createdAt).toLocaleDateString('de-DE')}</span><div className="file-actions"><button className={`icon-button ${file.favorite ? 'is-favorite' : ''}`} title="Favorit" onClick={() => void toggleFavorite(file)}><Heart size={17} fill={file.favorite ? 'currentColor' : 'none'}/></button><button className="icon-button" title="Herunterladen" onClick={() => downloadFile(file)}><ArrowDownToLine size={17}/></button><button className="icon-button danger-hover" title="Löschen" onClick={() => void deleteFile(file)}><Trash2 size={17}/></button></div></div> })}
            {!visibleFiles.length && !busy && <div className="empty-state"><div className="empty-icon"><UploadCloud size={28}/></div><strong>{search ? 'Keine Treffer gefunden' : 'Hier ist noch Platz für deine Dateien'}</strong><p>{search ? 'Versuche einen anderen Suchbegriff.' : 'Lade deine erste Datei hoch oder erstelle einen Ordner.'}</p>{!search && <button className="primary-button" onClick={() => uploadRef.current?.click()}><Plus size={17}/> Erste Datei hochladen</button>}</div>}
          </div>
          <footer className="footer"><span>© 2026 CloudFile</span><span><ShieldCheck size={14}/> Deine Dateien gehören dir.</span></footer>
        </section>
      </main>
      {showFolder && <div className="modal-backdrop" onClick={() => setShowFolder(false)}><form className="modal" onSubmit={createFolder} onClick={e => e.stopPropagation()}><button type="button" className="modal-close icon-button" onClick={() => setShowFolder(false)}><X/></button><div className="modal-symbol"><FolderPlus/></div><h2>Neuen Ordner erstellen</h2><p>Organisiere deine Dateien in einem neuen Ordner.</p><input autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="z. B. Projekte, Fotos …" maxLength={80}/><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowFolder(false)}>Abbrechen</button><button className="primary-button" disabled={!folderName.trim() || busy}>Ordner erstellen</button></div></form></div>}
    </div>
  )
}

function Stat({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value}</strong><small>{detail}</small></div>
}
function SetupScreen() {
  return <div className="auth-page"><div className="auth-card setup-card"><div className="brand auth-brand"><span className="brand-mark"><Cloud/></span>Cloud<span className="brand-light">File</span></div><div className="auth-badge"><Settings size={15}/> EINMALIGE EINRICHTUNG</div><h1>Appwrite verbinden</h1><p>Lege im Projektordner eine <code>.env</code>-Datei an und trage deine Appwrite-Konfiguration ein.</p><pre>{`VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1\nVITE_APPWRITE_PROJECT_ID=6b047c94000730aa95f5\nVITE_APPWRITE_DATABASE_ID=cloudfile\nVITE_APPWRITE_FILES_COLLECTION_ID=file_metadata\nVITE_APPWRITE_FOLDERS_COLLECTION_ID=folders\nVITE_APPWRITE_BUCKET_ID=cloudfile-files`}</pre><p className="muted">Die IDs für Datenbank, Collections und Bucket müssen in Appwrite einmalig angelegt werden. Eine Schritt-für-Schritt-Anleitung liegt in <strong>APPWRITE_SETUP.md</strong>.</p></div></div>
}
function AuthScreen({ mode, setMode, email, setEmail, password, setPassword, displayName, setDisplayName, onSubmit, busy, error }: {
  mode: 'login' | 'register'; setMode: (v: 'login' | 'register') => void; email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void; displayName: string; setDisplayName: (v: string) => void;
  onSubmit: (e: FormEvent) => void; busy: boolean; error: string
}) {
  return <div className="auth-page"><div className="auth-card"><div className="brand auth-brand"><span className="brand-mark"><Cloud size={21}/></span>Cloud<span className="brand-light">File</span></div><div className="auth-badge"><ShieldCheck size={15}/> DEIN PRIVATER CLOUD-SPEICHER</div><h1>{mode === 'login' ? 'Willkommen zurück.' : 'Dein Cloud-Konto.'}</h1><p>{mode === 'login' ? 'Melde dich an und greife auf deine Dateien zu.' : 'Erstelle dein Konto und speichere deine Dateien sicher.'}</p><form onSubmit={onSubmit} className="auth-form">{mode === 'register' && <label>Dein Name<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Max Mustermann" required/></label>}<label>E-Mail-Adresse<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.de" required/></label><label>Passwort<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" minLength={8} required/></label>{error && <div className="notice notice-error">{error}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Bitte warten …' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}<ChevronRight size={17}/></button></form><div className="auth-switch">{mode === 'login' ? 'Noch kein Konto?' : 'Du hast schon ein Konto?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Jetzt registrieren' : 'Zum Login'}</button></div><div className="auth-foot"><Check size={14}/> Verschlüsselte Verbindung zu Appwrite</div></div></div>
}
