export function getFrequencyRange(fftSize, sampleRate) {
  const binSize = sampleRate / fftSize
  const minBin = Math.max(1, Math.floor(20 / binSize))
  const maxBin = Math.min(fftSize / 2 - 1, Math.floor(16000 / binSize))
  return { minBin, maxBin, binCount: maxBin - minBin + 1 }
}

export function computeWaveformPeaks(audioBuffer, samplesPerSecond = 10) {
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const duration = audioBuffer.duration
  const samples = Math.ceil(duration * samplesPerSecond)
  const samplesPerChunk = Math.floor(length / samples)

  const peaks = new Float32Array(samples * 2)

  const channelData = []
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c))
  }

  for (let i = 0; i < samples; i++) {
    const start = i * samplesPerChunk
    const end = Math.min(start + samplesPerChunk, length)

    let min = 0
    let max = 0

    for (let c = 0; c < numChannels; c++) {
      const data = channelData[c]
      for (let j = start; j < end; j++) {
        const v = data[j]
        if (v < min) min = v
        if (v > max) max = v
      }
    }

    peaks[i * 2] = min
    peaks[i * 2 + 1] = max
  }

  return {
    peaks: Array.from(peaks),
    samples,
    duration,
    samplesPerSecond
  }
}

export function createAudioManager() {
  let audioContext = null
  let analyser = null
  let gainNode = null
  let audioElement = null
  let sourceNode = null
  let currentTrack = null
  let onTimeUpdate = null
  let onEnded = null

  const setTimeUpdateCallback = (cb) => { onTimeUpdate = cb }
  const setEndedCallback = (cb) => { onEnded = cb }

  const init = (ctx) => {
    audioContext = ctx
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.8
    gainNode = audioContext.createGain()
    gainNode.gain.value = 1.0
    analyser.connect(gainNode)
    gainNode.connect(audioContext.destination)

    audioElement = new Audio()
    audioElement.crossOrigin = 'anonymous'
    audioElement.addEventListener('timeupdate', () => {
      if (onTimeUpdate) onTimeUpdate(audioElement.currentTime)
    })
    audioElement.addEventListener('ended', () => {
      if (onEnded) onEnded()
    })
  }

  const connectSource = () => {
    if (sourceNode) {
      try { sourceNode.disconnect() } catch (e) {}
      sourceNode = null
    }
    sourceNode = audioContext.createMediaElementSource(audioElement)
    sourceNode.connect(analyser)
  }

  const loadTrack = async (track) => {
    currentTrack = track
    audioElement.src = track.url
    await audioElement.load()
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    connectSource()
    return new Promise((resolve) => {
      const onMeta = () => {
        audioElement.removeEventListener('loadedmetadata', onMeta)
        resolve(audioElement.duration)
      }
      if (audioElement.duration && isFinite(audioElement.duration)) {
        resolve(audioElement.duration)
      } else {
        audioElement.addEventListener('loadedmetadata', onMeta)
      }
    })
  }

  const play = () => audioElement.play()
  const pause = () => audioElement.pause()
  const seek = (time) => { audioElement.currentTime = time }
  const setVolume = (v) => { gainNode.gain.value = v }
  const setFFTSize = (size) => { if (analyser) analyser.fftSize = size }

  const getFrequencyData = () => {
    if (!analyser) return null
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    return data
  }

  const getAnalyser = () => analyser
  const getAudioElement = () => audioElement
  const getCurrentTime = () => audioElement ? audioElement.currentTime : 0
  const getDuration = () => audioElement ? audioElement.duration : 0

  return {
    init,
    loadTrack,
    play,
    pause,
    seek,
    setVolume,
    setFFTSize,
    getFrequencyData,
    getAnalyser,
    getAudioElement,
    getCurrentTime,
    getDuration,
    setTimeUpdateCallback,
    setEndedCallback
  }
}
