export async function startExport(canvas, audioEl, options) {
  const {
    width, height, filename,
    onProgress, onStop
  } = options

  let targetCanvas = canvas
  let needsResize = false
  let origWidth = canvas.width
  let origHeight = canvas.height

  if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
    needsResize = true
    targetCanvas = document.createElement('canvas')
    targetCanvas.width = width
    targetCanvas.height = height
  }

  const tCtx = targetCanvas.getContext('2d')
  const canvasStream = targetCanvas.captureStream(60)

  let audioStream = null
  if (audioEl) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx()
      const source = audioCtx.createMediaElementSource(audioEl)
      const dest = audioCtx.createMediaStreamDestination()
      source.connect(dest)
      source.connect(audioCtx.destination)
      audioStream = dest.stream
    } catch (e) {
      console.warn('Audio stream capture failed:', e)
    }
  }

  const combinedStream = new MediaStream()
  canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t))
  if (audioStream) {
    audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t))
  }

  let mimeType = 'video/webm;codecs=vp9,opus'
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus'
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm'
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6000000
  })

  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  let rafId = null
  const drawLoop = () => {
    if (needsResize) {
      tCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetCanvas.width, targetCanvas.height)
    }
    rafId = requestAnimationFrame(drawLoop)
  }

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      cancelAnimationFrame(rafId)
      if (needsResize) {
        canvas.width = origWidth
        canvas.height = origHeight
      }
      const blob = new Blob(chunks, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `visualization_${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      if (onStop) onStop()
      resolve()
    }

    recorder.onerror = (e) => {
      cancelAnimationFrame(rafId)
      reject(e)
    }

    try {
      recorder.start(100)
      rafId = requestAnimationFrame(drawLoop)
      resolve({
        cancel: () => {
          if (recorder.state !== 'inactive') {
            recorder.stop()
          }
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}
