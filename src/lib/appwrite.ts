import { Account, Client, Databases, ID, Permission, Query, Role, Storage } from 'appwrite'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string
export const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID as string
export const filesCollectionId = import.meta.env.VITE_APPWRITE_FILES_COLLECTION_ID as string
export const foldersCollectionId = import.meta.env.VITE_APPWRITE_FOLDERS_COLLECTION_ID as string
export const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID as string

export const configReady = Boolean(endpoint && projectId && databaseId && filesCollectionId && foldersCollectionId && bucketId)

export const client = new Client().setEndpoint(endpoint || 'https://cloud.appwrite.io/v1').setProject(projectId || 'missing-project')
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export { ID, Permission, Query, Role }

export type CloudFileRecord = {
  $id: string
  ownerId: string
  fileId: string
  folderId: string
  originalName: string
  mimeType: string
  size: number
  favorite: boolean
  createdAt: string
}

export type CloudFolder = {
  $id: string
  ownerId: string
  name: string
  parentId: string
  createdAt: string
}

export function userPermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}
