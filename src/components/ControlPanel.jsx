import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, VISUALIZATION_MODES, FFT_SIZES, COLOR_THEMES, EXPORT_RESOLUTIONS } from '../store'
import { startExport } from '../utils/exporter'

const MODE_LABELS = {
  bars: { name: '柱状频谱', icon: '📊' },
  wave: { name: '对称波浪', icon: '🌊' },
  circle: { name: '圆形辐射', icon: '🔮' },
  particles: { name: '粒子飞溅', icon: '✨' }
}

export default function ControlPanel() {
  const visualizationMode = useStore(s => s.visualizationMode)
  const setVisualizationMode = useStore(s => s.setVisualizationMode)
  const fftSize = useStore(s => s.fftSize)
  const setFFTSize = useStore(s => s.setFFTSize)
  const sensitivity = useStore(s => s.sensitivity)
  const setSensitivity = useStore(s => s.setSensitivity)
  const colorThemeIndex = useStore(s => s.colorThemeIndex)
  const setColorThemeIndex = useStore(s => s.setColorThemeIndex)
  const showLyrics = useStore(s => s.showLyrics)
  const setShowLyrics = useStore(s => s.setShowLyrics)
  const isExporting = useStore(s => s.isExporting)
  const setIsExporting = useStore(s => s.setIsExporting)
  const exportProgress = useStore(s => s.exportProgress)
  const setExportProgress = useStore(s => s.setExportProgress)
  const exportResolution = useStore(s => s.exportResolution)
  const setExportResolution = useStore(s => s.setExportResolution)
  const currentTrack = useStore(s => s.getCurrentTrack())
  const duration = useStore(s => s.duration)
  const currentTime = useStore(s => s.currentTime)
  const audioManager = useStore(s => s.audioManager)

  const [exportTimer, setExportTimer] = useState(null)
  const [exportCancelFn, setExportCancelFn] = useState(null)

  const clearExportState = () => {
    if (exportTimer) {
      clearInterval(exportTimer)
      setExportTimer(null)
    }
    setIsExporting(false)
    setExportProgress(0)
    setExportCancelFn(null)
  }

  const handleExport = async () => {
    const canvas = document.querySelector('#visualizer-container canvas')
    if (!canvas) {
      alert('可视化画布未就绪')
      return
    }
    if (!audioManager) {
      alert('音频管理器未初始化')
      return
    }
    const audioStream = audioManager.getAudioStream()
    const res = EXPORT_RESOLUTIONS[exportResolution]
    setIsExporting(true)
    setExportProgress(0)

    try {
      const startTime = Date.now()
      const result = startExport(canvas, audioStream, {
        width: res.width,
        height: res.height,
        filename: currentTrack ? `${currentTrack.name}_visualizer.webm` : undefined,
        onFinished: (err) => {
          clearExportState()
          if (err) {
            alert('导出失败：' + err.message)
          }
        }
      })
      setExportCancelFn(() => result.cancel)

      const timer = setInterval(() => {
        if (duration > 0) {
          const curTime = useStore.getState().currentTime
          const prog = Math.min(99, (curTime / duration) * 100)
          setExportProgress(prog)
        } else {
          const elapsed = (Date.now() - startTime) / 1000
          setExportProgress(Math.min(99, (elapsed / 300) * 100))
        }
      }, 200)
      setExportTimer(timer)
    } catch (e) {
      console.error(e)
      alert('导出失败：' + e.message)
      clearExportState()
    }
  }

  const handleCancelExport = () => {
    if (exportCancelFn) {
      try { exportCancelFn() } catch (e) {}
    }
    clearExportState()
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      gap: 16, padding: 16,
      background: 'rgba(20,20,30,0.6)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'auto'
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span>控制面板</span>
      </div>

      <Section title="可视化模式">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {VISUALIZATION_MODES.map(m => {
            const info = MODE_LABELS[m]
            const active = visualizationMode === m
            return (
              <button
                key={m}
                onClick={() => setVisualizationMode(m)}
                style={{
                  padding: '10px 8px',
                  background: active
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.25))'
                    : 'rgba(255,255,255,0.03)',
                  border: active
                    ? '1px solid rgba(168,85,247,0.5)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: active ? '#f4f4f5' : '#a1a1aa',
                  fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                  justifyContent: 'center'
                }}
              >
                <span>{info.icon}</span>
                <span>{info.name}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={`FFT 大小: ${fftSize}`}>
        <div style={{ display: 'flex', gap: 4 }}>
          {FFT_SIZES.map(s => (
            <button
              key={s}
              onClick={() => setFFTSize(s)}
              style={{
                flex: 1,
                padding: '6px 4px',
                background: fftSize === s ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                border: fftSize === s
                  ? '1px solid rgba(168,85,247,0.4)'
                  : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer',
                color: fftSize === s ? '#e4e4e7' : '#71717a'
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#52525b', marginTop: 6 }}>
          越大精度越高，反应越慢
        </div>
      </Section>

      <Section title={`灵敏度: ${sensitivity.toFixed(2)}x`}>
        <input
          type="range"
          min="0.3"
          max="3"
          step="0.05"
          value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </Section>

      <Section title="颜色主题">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {COLOR_THEMES.map((t, i) => (
            <button
              key={i}
              onClick={() => setColorThemeIndex(i)}
              style={{
                padding: '10px 6px',
                background: `linear-gradient(135deg, ${t.primary}33, ${t.secondary}33, ${t.accent}33)`,
                border: colorThemeIndex === i
                  ? '2px solid #ffffff'
                  : `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 10,
                color: '#e4e4e7'
              }}
            >
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.primary }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.secondary }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent }} />
              </div>
              {t.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="歌词显示">
        <button
          onClick={() => setShowLyrics(!showLyrics)}
          style={{
            width: '100%',
            padding: '10px',
            background: showLyrics ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
            border: showLyrics
              ? '1px solid rgba(16,185,129,0.4)'
              : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            color: showLyrics ? '#6ee7b7' : '#a1a1aa'
          }}
        >
          {showLyrics ? '✅ 歌词已开启' : '⭕ 歌词已关闭'}
        </button>
      </Section>

      <Section title="导出视频">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 6 }}>分辨率</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {EXPORT_RESOLUTIONS.map((r, i) => (
              <button
                key={i}
                onClick={() => setExportResolution(i)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  background: exportResolution === i ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                  border: exportResolution === i
                    ? '1px solid rgba(168,85,247,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  color: exportResolution === i ? '#e4e4e7' : '#71717a'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {isExporting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 10, overflow: 'hidden' }}
            >
              <div style={{
                height: 8, borderRadius: 4,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden', marginBottom: 6
              }}>
                <motion.div
                  animate={{ width: `${exportProgress}%` }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #a855f7, #06b6d4)'
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: '#a1a1aa', textAlign: 'center' }}>
                导出中 {exportProgress.toFixed(1)}%
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isExporting ? (
          <button
            onClick={handleCancelExport}
            style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⏹ 取消导出
          </button>
        ) : (
          <button
            onClick={handleExport}
            disabled={!currentTrack}
            style={{
              width: '100%', padding: '12px',
              background: currentTrack
                ? 'linear-gradient(135deg, #a855f7, #06b6d4)'
                : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: 8,
              color: currentTrack ? '#fff' : '#52525b',
              fontSize: 13, fontWeight: 600,
              cursor: currentTrack ? 'pointer' : 'not-allowed',
              boxShadow: currentTrack
                ? '0 4px 20px rgba(168,85,247,0.3)'
                : 'none'
            }}
          >
            🎬 导出 WebM 视频
          </button>
        )}
        <div style={{ fontSize: 10, color: '#52525b', marginTop: 6, textAlign: 'center' }}>
          浏览器原生录制，无需 ffmpeg
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11, color: '#71717a',
        marginBottom: 8, letterSpacing: 0.3,
        textTransform: 'uppercase'
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
