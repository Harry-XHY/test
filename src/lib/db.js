/**
 * IndexedDB 持久化存储层
 * 替代 localStorage，数据不会被普通清缓存清除
 */

const DB_NAME = 'acceptbot'
const DB_VERSION = 1
const STORE_DOCS = 'documents'
const STORE_VERIFICATIONS = 'verifications'
const STORE_SETTINGS = 'settings'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        db.createObjectStore(STORE_DOCS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_VERIFICATIONS)) {
        db.createObjectStore(STORE_VERIFICATIONS)
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName))
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Documents ──────────────────────────────────

export async function getAllDocs() {
  const store = await tx(STORE_DOCS)
  const docs = await reqToPromise(store.getAll())
  // 按创建时间倒序
  return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getDoc(id) {
  const store = await tx(STORE_DOCS)
  return reqToPromise(store.get(id))
}

export async function saveDoc(doc) {
  const store = await tx(STORE_DOCS, 'readwrite')
  return reqToPromise(store.put(doc))
}

export async function deleteDoc(id) {
  const store = await tx(STORE_DOCS, 'readwrite')
  await reqToPromise(store.delete(id))
  // 同时删除对应的验收状态
  const vStore = await tx(STORE_VERIFICATIONS, 'readwrite')
  await reqToPromise(vStore.delete(id))
}

// ── Verifications ──────────────────────────────

export async function getVerifications(docId) {
  if (!docId) return null
  const store = await tx(STORE_VERIFICATIONS)
  return reqToPromise(store.get(docId))
}

export async function saveVerifications(docId, data) {
  if (!docId) return
  const store = await tx(STORE_VERIFICATIONS, 'readwrite')
  return reqToPromise(store.put(data, docId))
}

// ── Settings ───────────────────────────────────

export async function getSetting(key) {
  const store = await tx(STORE_SETTINGS)
  return reqToPromise(store.get(key))
}

export async function setSetting(key, value) {
  const store = await tx(STORE_SETTINGS, 'readwrite')
  return reqToPromise(store.put(value, key))
}

export async function deleteSetting(key) {
  const store = await tx(STORE_SETTINGS, 'readwrite')
  return reqToPromise(store.delete(key))
}

export async function getAllSettings() {
  const store = await tx(STORE_SETTINGS)
  const keys = await reqToPromise(store.getAllKeys())
  const values = await reqToPromise(store.getAll())
  const result = {}
  keys.forEach((k, i) => { result[k] = values[i] })
  return result
}

// ── 数据导入 / 导出 ───────────────────────────

export async function exportAllData() {
  const docs = await getAllDocs()
  const settings = await getAllSettings()

  // 收集所有验收状态
  const verifications = {}
  for (const doc of docs) {
    const v = await getVerifications(doc.id)
    if (v) verifications[doc.id] = v
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    documents: docs,
    verifications,
    settings,
  }
}

export async function importAllData(data) {
  if (!data || !data.documents) throw new Error('无效的备份文件')

  // 导入文档
  for (const doc of data.documents) {
    await saveDoc(doc)
  }

  // 导入验收状态
  if (data.verifications) {
    for (const [docId, v] of Object.entries(data.verifications)) {
      await saveVerifications(docId, v)
    }
  }

  // 导入设置（不覆盖 API Key）
  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      if (key !== 'ai_api_key') {
        await setSetting(key, value)
      }
    }
  }
}

// ── localStorage 迁移 ──────────────────────────

export async function migrateFromLocalStorage() {
  const migrated = await getSetting('_migrated')
  if (migrated) return false

  // 迁移文档
  const docsStr = localStorage.getItem('documents')
  if (docsStr) {
    try {
      const docs = JSON.parse(docsStr)
      for (const doc of docs) {
        await saveDoc(doc)
      }
    } catch { /* ignore */ }
  }

  // 迁移验收状态
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('verifications_')) {
      const docId = key.replace('verifications_', '')
      try {
        const v = JSON.parse(localStorage.getItem(key))
        await saveVerifications(docId, v)
      } catch { /* ignore */ }
    }
  }

  // 迁移设置
  const settingKeys = ['ai_api_key', 'ai_provider']
  for (const key of settingKeys) {
    const val = localStorage.getItem(key)
    if (val) await setSetting(key, val)
  }

  await setSetting('_migrated', true)
  return true
}

// ── 清除所有数据 ───────────────────────────────

export async function clearAllData() {
  const db = await openDB()
  const stores = [STORE_DOCS, STORE_VERIFICATIONS, STORE_SETTINGS]
  const transaction = db.transaction(stores, 'readwrite')
  for (const name of stores) {
    transaction.objectStore(name).clear()
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
}

// ── 存储空间估算 ────────────────────────────────

export async function estimateStorageSize() {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    return { used: est.usage || 0, quota: est.quota || 0 }
  }
  // fallback: 粗估
  const data = await exportAllData()
  const size = new Blob([JSON.stringify(data)]).size
  return { used: size, quota: 0 }
}
