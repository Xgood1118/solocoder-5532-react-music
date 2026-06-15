import { useRef } from 'react'
import { useStore } from '../store'
import { formatTime } from '../utils/helpers'

export default function BottomBar({ audioManager }) {
  const progressRef = useRef(null)
  const currentTrack = useStore(s => s.getCurrentTrack())
  const playState = useStore(s => s.playState)
  const setPlayState = useStore(s => s.setPlayState)
  const currentTime = useStore(s => s.currentTime)
  const setCurrentTime = useStore(s => s.setCurrentTime)
  const duration = useStore(s => s.duration)
  const setDuration = useStore(s => s.setDuration)
  const volume = useStore(s => s.volume)
  const setVolume = useStore(s => s.setVolume)
  const tracks = useStore(s => s.tracks)
  const currentTrackId = useStore(s => s.currentTrackId)
  const setCurrentTrack = useStore(s => s.setCurrentTrack)

  const nextTrack = async (delta = 1) => {
    if (tracks.length === 0 || !audioManager) return
    const idx = tracks.findIndex(t => t.id === currentTrackId)
    const nextIdx = (idx + delta + tracks.length) % tracks.length
    const t = tracks[nextIdx]
    setCurrentTrack(t.id)
    try {
      const d = await audioManager.loadTrack(t)
      setDuration(d)
      audioManager.play()
      setPlayState('playing')
    } catch (e) {
      console.warn(e)
    }
  }

  const togglePlay = async () => {
    if (!audioManager || !currentTrack) return
    if (playState === 'playing') {
      audioManager.pause()
      setPlayState('paused')
    } else {
      try {
        await audioManager.play()
        setPlayState('playing')
      } catch (e) {
        console.warn(e)
      }
    }
  }

  const handleProgressClick = (e) => {
    if (!audioManager || duration <= 0) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const t = Math.max(0, Math.min(duration, ratio * duration))
    audioManager.seek(t)
    setCurrentTime(t)
  }

  const skip = (seconds) => {
    if (!audioManager || duration <= 0) return
    const t = Math.max(0, Math.min(duration, currentTime + seconds))
    audioManager.seek(t)
    setCurrentTime(t)
  }

  return (
    <div style={{
      width: '100%',
      padding: '12px 20px',
      background: 'rgba(15,15,25,0.95)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }}>
      <div style={{
        minWidth: 240, maxWidth: 280,
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {currentTrack ? currentTrack.name : '未选择曲目'}
        </div>
        <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
          {currentTrack ? `🎵 ${currentTrack.originalName.slice(-10)}` : '拖拽音频文件开始'}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <button
          onClick={() => nextTrack(-1)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#a1a1aa', cursor: 'pointer',
            fontSize: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >⏮</button>
        <button
          onClick={() => skip(-5)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#a1a1aa', cursor: 'pointer',
            fontSize: 12
          }}
        >-5s</button>
        <button
          onClick={togglePlay}
          disabled={!currentTrack}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: currentTrack
              ? 'linear-gradient(135deg, #a855f7, #06b6d4)'
              : 'rgba(255,255,255,0.05)',
            border: 'none',
            color: currentTrack ? '#fff' : '#52525b',
            cursor: currentTrack ? 'pointer' : 'not-allowed',
            fontSize: 18, fontWeight: 700,
            boxShadow: currentTrack
              ? '0 4px 20px rgba(168,85,247,0.4)'
              : 'none'
          }}
        >
          {playState === 'playing' ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => skip(5)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#a1a1aa', cursor: 'pointer',
            fontSize: 12
          }}
        >+5s</button>
        <button
          onClick={() => nextTrack(1)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#a1a1aa', cursor: 'pointer',
            fontSize: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >⏭</button>
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ fontSize: 12, color: '#71717a', minWidth: 42, textAlign: 'right' }}>
          {formatTime(currentTime)}
        </div>
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          style={{
            flex: 1,
            height: 8,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 4,
            cursor: duration > 0 ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            height: '100%',
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
            background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
            borderRadius: 4
          }} />
        </div>
        <div style={{ fontSize: 12, color: '#71717a', minWidth: 42 }}>
          {formatTime(duration)}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        minWidth: 140
      }}>
        <span style={{ fontSize: 14 }}>🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            setVolume(v)
            if (audioManager) audioManager.setVolume(v)
          }}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  )
}
