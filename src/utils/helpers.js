export function decodeAudioFile(audioContext, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
        resolve(audioBuffer)
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
