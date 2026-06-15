import { getFrequencyRange } from './audio.js'

function getFilteredData(freqData, analyser, sampleRate) {
  const fftSize = analyser ? analyser.fftSize : 1024
  const { minBin, maxBin, binCount } = getFrequencyRange(fftSize, sampleRate || 44100)
  const result = new Uint8Array(binCount)
  for (let i = 0; i < binCount; i++) {
    result[i] = freqData[minBin + i] || 0
  }
  return result
}

function applySensitivity(value, sensitivity) {
  const v = (value / 255) * sensitivity
  return Math.min(1, v)
}

export function drawBars(ctx, canvas, freqData, analyser, theme, sensitivity, sampleRate) {
  const data = getFilteredData(freqData, analyser, sampleRate)
  const { width, height } = canvas
  const barCount = data.length
  const barWidth = width / barCount * 0.85
  const gap = width / barCount * 0.15

  const grad = ctx.createLinearGradient(0, height, 0, 0)
  grad.addColorStop(0, theme.primary)
  grad.addColorStop(0.5, theme.secondary)
  grad.addColorStop(1, theme.accent)

  ctx.fillStyle = 'rgba(10,10,15,1)'
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < barCount; i++) {
    const v = applySensitivity(data[i], sensitivity)
    const barHeight = v * height * 0.85
    const x = i * (barWidth + gap) + gap / 2
    const y = height - barHeight
    ctx.fillStyle = grad
    ctx.shadowColor = theme.primary
    ctx.shadowBlur = 10 * v
    ctx.fillRect(x, y, barWidth, barHeight)
  }
  ctx.shadowBlur = 0
}

export function drawWave(ctx, canvas, freqData, analyser, theme, sensitivity, sampleRate) {
  const data = getFilteredData(freqData, analyser, sampleRate)
  const { width, height } = canvas
  const midY = height / 2
  const half = Math.floor(data.length / 2)

  ctx.fillStyle = 'rgba(10,10,15,1)'
  ctx.fillRect(0, 0, width, height)

  ctx.lineWidth = 3
  ctx.shadowColor = theme.primary
  ctx.shadowBlur = 15

  const gradLeft = ctx.createLinearGradient(0, 0, width / 2, 0)
  gradLeft.addColorStop(0, theme.accent)
  gradLeft.addColorStop(1, theme.secondary)
  ctx.strokeStyle = gradLeft

  ctx.beginPath()
  ctx.moveTo(width / 2, midY)
  for (let i = 0; i < half; i++) {
    const t = i / half
    const x = width / 2 - t * (width / 2)
    const v = applySensitivity(data[i], sensitivity)
    const amp = v * height * 0.35
    const y = midY - amp * Math.sin(i * 0.3) + (Math.random() - 0.5) * amp * 0.1
    ctx.lineTo(x, y)
  }
  for (let i = half - 1; i >= 0; i--) {
    const t = i / half
    const x = width / 2 - t * (width / 2)
    const v = applySensitivity(data[i], sensitivity)
    const amp = v * height * 0.35
    const y = midY + amp * Math.sin(i * 0.3) + (Math.random() - 0.5) * amp * 0.1
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = `${theme.primary}33`
  ctx.fill()
  ctx.stroke()

  const gradRight = ctx.createLinearGradient(width / 2, 0, width, 0)
  gradRight.addColorStop(0, theme.secondary)
  gradRight.addColorStop(1, theme.primary)
  ctx.strokeStyle = gradRight

  ctx.beginPath()
  ctx.moveTo(width / 2, midY)
  for (let i = 0; i < half; i++) {
    const t = i / half
    const x = width / 2 + t * (width / 2)
    const v = applySensitivity(data[half + i] || data[half - 1], sensitivity)
    const amp = v * height * 0.35
    const y = midY - amp * Math.sin(i * 0.3) + (Math.random() - 0.5) * amp * 0.1
    ctx.lineTo(x, y)
  }
  for (let i = half - 1; i >= 0; i--) {
    const t = i / half
    const x = width / 2 + t * (width / 2)
    const v = applySensitivity(data[half + i] || data[half - 1], sensitivity)
    const amp = v * height * 0.35
    const y = midY + amp * Math.sin(i * 0.3) + (Math.random() - 0.5) * amp * 0.1
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = `${theme.secondary}33`
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
}

export function drawCircle(ctx, canvas, freqData, analyser, theme, sensitivity, sampleRate) {
  const data = getFilteredData(freqData, analyser, sampleRate)
  const { width, height } = canvas
  const cx = width / 2
  const cy = height / 2
  const baseRadius = Math.min(width, height) * 0.18

  ctx.fillStyle = 'rgba(10,10,15,1)'
  ctx.fillRect(0, 0, width, height)

  const barCount = data.length
  const angleStep = (Math.PI * 2) / barCount

  ctx.shadowColor = theme.primary
  ctx.shadowBlur = 20

  for (let ring = 0; ring < 3; ring++) {
    const ringOpacity = 1 - ring * 0.25
    const ringRadius = baseRadius + ring * 20
    for (let i = 0; i < barCount; i++) {
      const v = applySensitivity(data[i], sensitivity)
      if (v < 0.05) continue
      const angle = i * angleStep - Math.PI / 2
      const len = v * Math.min(width, height) * 0.28 * (1 - ring * 0.15)
      const x1 = cx + Math.cos(angle) * ringRadius
      const y1 = cy + Math.sin(angle) * ringRadius
      const x2 = cx + Math.cos(angle) * (ringRadius + len)
      const y2 = cy + Math.sin(angle) * (ringRadius + len)

      const grad = ctx.createLinearGradient(x1, y1, x2, y2)
      const t = i / barCount
      if (t < 0.33) {
        grad.addColorStop(0, theme.primary + Math.floor(ringOpacity * 255).toString(16).padStart(2, '0'))
        grad.addColorStop(1, theme.accent)
      } else if (t < 0.66) {
        grad.addColorStop(0, theme.secondary + Math.floor(ringOpacity * 255).toString(16).padStart(2, '0'))
        grad.addColorStop(1, theme.primary)
      } else {
        grad.addColorStop(0, theme.accent + Math.floor(ringOpacity * 255).toString(16).padStart(2, '0'))
        grad.addColorStop(1, theme.secondary)
      }
      ctx.strokeStyle = grad
      ctx.lineWidth = 2 + v * 3
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  const pulseSize = baseRadius * 0.5 + (applySensitivity(data.reduce((a, b) => a + b, 0) / data.length, sensitivity)) * baseRadius * 0.5
  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize)
  centerGrad.addColorStop(0, theme.primary)
  centerGrad.addColorStop(0.5, theme.secondary + 'aa')
  centerGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = centerGrad
  ctx.beginPath()
  ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0
}

const particlesPool = []
function getParticle() {
  return particlesPool.pop() || { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, hue: 0, size: 0 }
}
function releaseParticle(p) {
  if (particlesPool.length < 2000) particlesPool.push(p)
}

const activeParticles = []

export function drawParticles(ctx, canvas, freqData, analyser, theme, sensitivity, sampleRate) {
  const data = getFilteredData(freqData, analyser, sampleRate)
  const { width, height } = canvas

  ctx.fillStyle = 'rgba(10,10,15,0.2)'
  ctx.fillRect(0, 0, width, height)

  const binCount = data.length
  const groups = 48
  const binPerGroup = Math.floor(binCount / groups)
  const cx = width / 2
  const cy = height / 2

  for (let g = 0; g < groups; g++) {
    let sum = 0
    for (let j = 0; j < binPerGroup; j++) {
      sum += data[g * binPerGroup + j] || 0
    }
    const avg = sum / binPerGroup
    const v = applySensitivity(avg, sensitivity)
    if (v < 0.15) continue

    const angle = (g / groups) * Math.PI * 2
    const particleCount = Math.floor(v * 8)
    for (let k = 0; k < particleCount; k++) {
      const p = getParticle()
      const radius = Math.min(width, height) * 0.15
      p.x = cx + Math.cos(angle) * radius
      p.y = cy + Math.sin(angle) * radius
      const speed = 2 + v * 10
      const spread = (Math.random() - 0.5) * 0.5
      p.vx = Math.cos(angle + spread) * speed
      p.vy = Math.sin(angle + spread) * speed
      p.maxLife = 30 + Math.floor(Math.random() * 40)
      p.life = p.maxLife
      p.size = 1.5 + v * 4
      activeParticles.push(p)
    }
  }

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i]
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.98
    p.vy *= 0.98
    p.life--

    if (p.life <= 0 || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
      releaseParticle(p)
      activeParticles.splice(i, 1)
      continue
    }

    const lifeT = p.life / p.maxLife
    const alpha = Math.floor(lifeT * 255).toString(16).padStart(2, '0')
    const colorIdx = Math.floor((1 - lifeT) * 2.99)
    const colors = [theme.primary, theme.secondary, theme.accent]
    ctx.fillStyle = colors[colorIdx] + alpha
    ctx.shadowColor = colors[colorIdx]
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * lifeT, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

export function resetParticles() {
  activeParticles.length = 0
}
