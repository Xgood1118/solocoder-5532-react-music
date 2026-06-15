const DB_NAME = 'music_visualizer_db'
const DB_VERSION = 1
const STORE_WAVEFORM = 'waveform_cache'
const STORE_LRC = 'lrc_cache'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_WAVEFORM)) {
        db.createObjectStore(STORE_WAVEFORM, { keyPath: 'hash' })
      }
      if (!db.objectStoreNames.contains(STORE_LRC)) {
        db.createObjectStore(STORE_LRC, { keyPath: 'hash' })
      }
    }
  })
  return dbPromise
}

export async function getWaveformCache(hash) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAVEFORM, 'readonly')
    const store = tx.objectStore(STORE_WAVEFORM)
    const req = store.get(hash)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result ? req.result.data : null)
  })
}

export async function saveWaveformCache(hash, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAVEFORM, 'readwrite')
    const store = tx.objectStore(STORE_WAVEFORM)
    const req = store.put({ hash, data, timestamp: Date.now() })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function getLrcCache(hash) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LRC, 'readonly')
    const store = tx.objectStore(STORE_LRC)
    const req = store.get(hash)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result ? req.result.data : null)
  })
}

export async function saveLrcCache(hash, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LRC, 'readwrite')
    const store = tx.objectStore(STORE_LRC)
    const req = store.put({ hash, data, timestamp: Date.now() })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function computeFileHash(file) {
  const sliceSize = 1024 * 1024
  const chunks = []
  for (let start = 0; start < Math.min(file.size, sliceSize * 5); start += sliceSize) {
    const blob = file.slice(start, Math.min(start + sliceSize, file.size))
    const buf = await blob.arrayBuffer()
    chunks.push(new Uint8Array(buf))
  }
  let hash = 0
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 100) {
      hash = ((hash << 5) - hash + chunk[i]) | 0
    }
  }
  return `${file.name}_${file.size}_${hash}`
}
