import { useEffect, useRef } from 'react'
import { useStore, COLOR_THEMES } from '../store'
import { drawBars, drawWave, drawCircle, drawParticles, resetParticles } from '../utils/visualizers'

export default function VisualizerCanvas() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rafRef = useRef(0)
  const modeRef = useRef('bars')

  const mode = useStore(s => s.visualizationMode)
  const fftSize = useStore(s => s.fftSize)
  const sensitivity = useStore(s => s.sensitivity)
  const colorThemeIndex = useStore(s => s.colorThemeIndex)
  const playState = useStore(s => s.playState)
  const isExporting = useStore(s => s.isExporting)
  const audioManager = useStore(s => s.audioManager)

  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    resetParticles()
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    const sampleRate = 44100

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      const theme = COLOR_THEMES[colorThemeIndex] || COLOR_THEMES[0]

      let freqData = null
      let analyser = null
      if (audioManager) {
        freqData = audioManager.getFrequencyData()
        analyser = audioManager.getAnalyser()
      }

      if (!freqData || freqData.length === 0) {
        ctx.fillStyle = '#0a0a0f'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#3f3f46'
        ctx.textAlign = 'center'
        ctx.font = '16px sans-serif'
        ctx.fillText('拖入音频文件开始体验', w / 2, h / 2)
        rafRef.current = requestAnimationFrame(render)
        return
      }

      const currentMode = modeRef.current
      const drawOpts = [ctx, { width: w, height: h }, freqData, analyser, theme, sensitivity, sampleRate]

      switch (currentMode) {
        case 'bars': drawBars(...drawOpts); break
        case 'wave': drawWave(...drawOpts); break
        case 'circle': drawCircle(...drawOpts); break
        case 'particles': drawParticles(...drawOpts); break
        default: drawBars(...drawOpts)
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [audioManager, sensitivity, colorThemeIndex, fftSize])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}
