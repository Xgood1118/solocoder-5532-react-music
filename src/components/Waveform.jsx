import { useEffect, useRef } from 'react'
import { useStore, COLOR_THEMES } from '../store'

export default function Waveform({ waveformData, onSeek }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const currentTime = useStore(s => s.currentTime)
  const duration = useStore(s => s.duration)
  const colorThemeIndex = useStore(s => s.colorThemeIndex)
  const hoverRef = useRef({ x: -1, active: false })
  const isExporting = useStore(s => s.isExporting)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !containerRef.current) return

    const resize = () => {
      const rect = containerRef.current.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      draw()
    }

    const draw = () => {
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width
      const h = canvas.height
      const theme = COLOR_THEMES[colorThemeIndex]

      ctx.fillStyle = '#0f0f17'
      ctx.fillRect(0, 0, w, h)

      if (!waveformData || !waveformData.peaks || waveformData.peaks.length === 0) {
        ctx.fillStyle = '#3f3f46'
        ctx.font = `${14 * dpr}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('正在生成波形...', w / 2, h / 2)
        return
      }

      const { peaks } = waveformData
      const midY = h / 2
      const totalPeaks = peaks.length / 2
      const peakWidth = w / totalPeaks

      ctx.fillStyle = '#27272a'
      for (let i = 0; i < totalPeaks; i++) {
        const min = peaks[i * 2]
        const max = peaks[i * 2 + 1]
        const x = i * peakWidth
        const yTop = midY - Math.abs(max) * midY * 0.9
        const yBot = midY + Math.abs(min) * midY * 0.9
        const barH = Math.max(dpr * 0.5, yBot - yTop)
        ctx.fillRect(x, yTop, Math.max(dpr, peakWidth - 0.5), barH)
      }

      if (duration > 0) {
        const progressX = (currentTime / duration) * w
        const progressGrad = ctx.createLinearGradient(0, 0, progressX, 0)
        progressGrad.addColorStop(0, theme.primary)
        progressGrad.addColorStop(0.5, theme.secondary)
        progressGrad.addColorStop(1, theme.accent)
        ctx.fillStyle = progressGrad
        for (let i = 0; i < totalPeaks; i++) {
          const x = i * peakWidth
          if (x > progressX) break
          const min = peaks[i * 2]
          const max = peaks[i * 2 + 1]
          const yTop = midY - Math.abs(max) * midY * 0.9
          const yBot = midY + Math.abs(min) * midY * 0.9
          const barH = Math.max(dpr * 0.5, yBot - yTop)
          const pw = Math.min(peakWidth - 0.5, progressX - x)
          if (pw > 0) ctx.fillRect(x, yTop, Math.max(dpr, pw), barH)
        }

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2 * dpr
        ctx.shadowColor = theme.primary
        ctx.shadowBlur = 8 * dpr
        ctx.beginPath()
        ctx.moveTo(progressX, 0)
        ctx.lineTo(progressX, h)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      if (hoverRef.current.active && !isExporting) {
        const hx = hoverRef.current.x
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(0, 0, hx, h)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = dpr
        ctx.setLineDash([4 * dpr, 4 * dpr])
        ctx.beginPath()
        ctx.moveTo(hx, 0)
        ctx.lineTo(hx, h)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [waveformData, currentTime, duration, colorThemeIndex, isExporting])

  const handleMove = (e) => {
    if (isExporting) return
    const rect = canvasRef.current.getBoundingClientRect()
    hoverRef.current.x = (e.clientX - rect.left) * (window.devicePixelRatio || 1)
    hoverRef.current.active = true
    const canvas = canvasRef.current
    canvas.width = canvas.width
  }

  const handleLeave = () => {
    hoverRef.current.active = false
    const canvas = canvasRef.current
    canvas.width = canvas.width
  }

  const handleClick = (e) => {
    if (isExporting || !onSeek || duration <= 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(duration, ratio * duration)))
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: isExporting ? 'default' : 'pointer',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#0f0f17'
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
