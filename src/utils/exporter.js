export async function startExport(canvas, audioStream, options) {
  const {
    width, height, filename, onFinished } = options

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
    if (onFinished) onFinished(null)
  }

  recorder.onerror = (e) => {
    cancelAnimationFrame(rafId)
    console.error('Recorder error:', e)
    if (onFinished) onFinished(e)
  }

  recorder.start(100)
  rafId = requestAnimationFrame(drawLoop)

  return {
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop()
        }
      } catch (err) { console.warn(err) }
    }
  }
}
