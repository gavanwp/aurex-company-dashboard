// Public surface of modules/documents — enterprise document management (DMS).
// The ONLY entry point other modules / app routes may import from (R-A1/R-A6).

export {
  getDocumentsView,
  type DocumentsView,
  type FolderNode,
  type DocumentListItem,
} from './queries/get-documents'
export {
  getDocumentDetail,
  type DocumentDetail,
  type DocumentVersionRow,
  type DocumentTagRow,
  type DocumentActivityRow,
} from './queries/get-document-detail'
export {
  canViewDocuments,
  getDocumentsAbilities,
  type DocumentsAbilities,
} from './actions/documents-guards'
export {
  createFolder,
  renameFolder,
  deleteFolder,
  uploadDocument,
  renameDocument,
  moveDocument,
  archiveDocument,
  restoreDocument,
  deleteDocument,
  createDocumentVersion,
} from './actions/documents-actions'
