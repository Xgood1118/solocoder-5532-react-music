import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from './store'
import { createAudioManager } from './utils/audio'
import FilePanel from './components/FilePanel'
import VisualizerCanvas from './components/VisualizerCanvas'
import ControlPanel from './components/ControlPanel'
import BottomBar from './components/BottomBar'
import Waveform from './components/Waveform'
import LyricsDisplay from './components/LyricsDisplay'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { getWaveformCache } from './utils/db'

export default function App() {
  const isInitialized = useStore(s => s.isInitialized)
  const setInitialized = useStore(s => s.setInitialized)
  const audioContext = useStore(s => s.audioContext)
  const setAudioContext = useStore(s => s.setAudioContext)
  const setAudioManager = useStore(s => s.setAudioManager)
  const setFFTSize = useStore(s => s.setFFTSize)
  const fftSize = useStore(s => s.fftSize)
  const setCurrentTime = useStore(s => s.setCurrentTime)
  const setDuration = useStore(s => s.setDuration)
  const setPlayState = useStore(s => s.setPlayState)
  const setWaveformData = useStore(s => s.setWaveformData)
  const waveformCache = useStore(s => s.waveformCache)
  const currentTrack = useStore(s => s.getCurrentTrack())
  const currentTrackId = useStore(s => s.currentTrackId)
  const tracks = useStore(s => s.tracks)
  const setCurrentTrack = useStore(s => s.setCurrentTrack)
  const volume = useStore(s => s.volume)
  const isExporting = useStore(s => s.isExporting)
  const [showStart, setShowStart] = useState(true)

  const audioManagerRef = useRef(null)

  useKeyboardShortcuts()

  useEffect(() => {
    if (isInitialized && audioManagerRef.current) {
      audioManagerRef.current.setFFTSize(fftSize)
    }
  }, [fftSize, isInitialized])

  useEffect(() => {
    if (isInitialized && audioManagerRef.current) {
      audioManagerRef.current.setVolume(volume)
    }
  }, [volume, isInitialized])

  const handleInitialize = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      setAudioContext(ctx)

      const manager = createAudioManager()
      manager.init(ctx)
      audioManagerRef.current = manager
      setAudioManager(manager)

      manager.setTimeUpdateCallback((t) => setCurrentTime(t))
      manager.setEndedCallback(async () => {
        setPlayState('paused')
        const state = useStore.getState()
        const curTracks = state.tracks
        const curId = state.currentTrackId
        if (curTracks.length > 1) {
          const idx = curTracks.findIndex(t => t.id === curId)
          const nextIdx = (idx + 1) % curTracks.length
          const t = curTracks[nextIdx]
          setCurrentTrack(t.id)
          try {
            const d = await manager.loadTrack(t)
            setDuration(d)
            await manager.play()
            setPlayState('playing')
          } catch (e) { console.warn(e) }
        }
      })

      setInitialized(true)
      setShowStart(false)
    } catch (e) {
      console.error('初始化失败:', e)
      alert('初始化 AudioContext 失败，请刷新重试')
    }
  }

  const ensureWaveform = async (track) => {
    if (waveformCache[track.id]) return
    try {
      const data = await getWaveformCache(track.hash)
      if (data) {
        setWaveformData(track.id, data)
      }
    } catch (e) {
      console.warn('波形加载失败', e)
    }
  }

  const handleSeek = (time) => {
    if (audioManagerRef.current) {
      audioManagerRef.current.seek(time)
      setCurrentTime(time)
    }
  }

  useEffect(() => {
    if (currentTrack) ensureWaveform(currentTrack)
  }, [currentTrackId])

  const waveformData = currentTrack ? waveformCache[currentTrack.id] : null

  const handleFilesReady = async () => {
    const state = useStore.getState()
    const track = state.tracks[0]
    if (track && audioManagerRef.current) {
      try {
        const d = await audioManagerRef.current.loadTrack(track)
        setDuration(d)
        track.duration = d
        useStore.setState({ tracks: [...state.tracks] })
      } catch (e) { console.warn(e) }
    }
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at top, #1a1033 0%, #0a0a0f 50%, #07070b 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <AnimatePresence>
        {showStart && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              zIndex: 1000,
              background: 'radial-gradient(ellipse at center, #1a1033 0%, #0a0a0f 60%, #000 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 24
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                filter: [
                  'drop-shadow(0 0 20px #a855f7)',
                  'drop-shadow(0 0 40px #06b6d4)',
                  'drop-shadow(0 0 20px #a855f7)'
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ fontSize: 80 }}
            >
              🎵
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ textAlign: 'center' }}
            >
              <h1 style={{
                fontSize: 36,
                fontWeight: 800,
                background: 'linear-gradient(90deg, #a855f7, #06b6d4, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 8
              }}>
                音乐可视化工具
              </h1>
              <p style={{ color: '#71717a', fontSize: 14 }}>
                拖拽音轨 · 实时频谱 · 歌词滚动 · 一键导出视频
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInitialize}
              style={{
                padding: '16px 48px',
                background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
                border: 'none',
                borderRadius: 999,
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 40px rgba(168,85,247,0.4)',
                letterSpacing: 1
              }}
            >
              ▶ 点击开始
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              style={{
                display: 'flex',
                gap: 32,
                marginTop: 16,
                color: '#52525b',
                fontSize: 12
              }}
            >
              <div>
                <kbd style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginRight: 6
                }}>Space</kbd>播放/暂停
              </div>
              <div>
                <kbd style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginRight: 6
                }}>←→</kbd>快退/快进 5s
              </div>
              <div>
                <kbd style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginRight: 6
                }}>↑↓</kbd>切换曲目
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        flex: 1,
        display: 'flex',
        gap: 12,
        padding: 12,
        minHeight: 0
      }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <FilePanel onFilesReady={handleFilesReady} />
        </div>

        <div
          id="visualizer-container"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
            position: 'relative'
          }}
        >
          <div style={{ height: 100, flexShrink: 0 }}>
            <Waveform
              waveformData={waveformData}
              onSeek={handleSeek}
            />
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <VisualizerCanvas />
            <LyricsDisplay />
          </div>
        </div>

        <div style={{ width: 280, flexShrink: 0 }}>
          <ControlPanel />
        </div>
      </div>

      <BottomBar />

      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
              borderRadius: 999,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              zIndex: 2000,
              boxShadow: '0 4px 20px rgba(168,85,247,0.5)',
              pointerEvents: 'none'
            }}
          >
            🎬 正在录制视频...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
