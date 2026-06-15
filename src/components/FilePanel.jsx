import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import { generateId, formatTime } from '../utils/helpers'
import { computeFileHash, getWaveformCache, saveWaveformCache } from '../utils/db'
import { computeWaveformPeaks } from '../utils/audio'
import { parseLRC } from '../utils/lrc'

const AUDIO_EXT = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac']
const LRC_EXT = ['lrc', 'txt']

export default function FilePanel({ audioManager, onFilesReady }) {
  const dropRef = useRef(null)
  const fileInputRef = useRef(null)
  const lrcInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(null)

  const tracks = useStore(s => s.tracks)
  const currentTrackId = useStore(s => s.currentTrackId)
  const addTrack = useStore(s => s.addTrack)
  const removeTrack = useStore(s => s.removeTrack)
  const setCurrentTrack = useStore(s => s.setCurrentTrack)
  const audioContext = useStore(s => s.audioContext)
  const setWaveformData = useStore(s => s.setWaveformData)
  const setDuration = useStore(s => s.setDuration)

  const processFiles = async (files) => {
    const audioFiles = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return AUDIO_EXT.includes(ext)
    })
    const lrcFiles = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return LRC_EXT.includes(ext)
    })

    for (const file of audioFiles) {
      const id = generateId()
      const url = URL.createObjectURL(file)
      const hash = await computeFileHash(file)

      setLoading(id)

      let waveform = null
      let lyricsData = null

      try {
        waveform = await getWaveformCache(hash)
        if (!waveform && audioContext) {
          const reader = new FileReader()
          const arrayBuf = await new Promise((res, rej) => {
            reader.onerror = () => rej(reader.error)
            reader.onload = () => res(reader.result)
            reader.readAsArrayBuffer(file)
          })
          try {
            const audioBuf = await audioContext.decodeAudioData(arrayBuf.slice(0))
            waveform = computeWaveformPeaks(audioBuf, 10)
            await saveWaveformCache(hash, waveform)
          } catch (e) {
            console.warn('Decode audio for waveform failed:', e)
          }
        }
      } catch (e) {
        console.warn('Waveform cache error:', e)
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const matchedLrc = lrcFiles.find(l => {
        const lBase = l.name.replace(/\.[^/.]+$/, '')
        return lBase === baseName || baseName.startsWith(lBase) || lBase.startsWith(baseName)
      })
      if (matchedLrc) {
        try {
          const text = await matchedLrc.text()
          lyricsData = parseLRC(text)
        } catch (e) {
          console.warn('LRC parse error:', e)
        }
      }

      const track = {
        id,
        name: baseName,
        originalName: file.name,
        url,
        size: file.size,
        hash,
        duration: 0,
        lyrics: lyricsData
      }

      if (waveform) {
        setWaveformData(id, waveform)
      }

      addTrack(track)

      if (audioManager) {
        if (currentTrackId === null || tracks.length === 0) {
          try {
            const dur = await audioManager.loadTrack(track)
            track.duration = dur
            setDuration(dur)
          } catch (e) {
            console.warn('Load track failed:', e)
          }
        }
      }
    }

    setLoading(null)
    if (onFilesReady) onFilesReady()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleSwitchTrack = async (track) => {
    setCurrentTrack(track.id)
    if (audioManager) {
      try {
        const dur = await audioManager.loadTrack(track)
        setDuration(dur)
        audioManager.play()
        useStore.getState().setPlayState('playing')
      } catch (e) {
        console.warn('Switch track failed:', e)
      }
    }
  }

  const handleImportLrc = async (e) => {
    const file = e.target.files[0]
    if (!file || !currentTrackId) return
    try {
      const text = await file.text()
      const lyrics = parseLRC(text)
      const track = tracks.find(t => t.id === currentTrackId)
      if (track) {
        track.lyrics = lyrics
        useStore.setState({ tracks: [...tracks] })
      }
    } catch (e) {
      console.warn(e)
    }
    e.target.value = ''
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      gap: 12, padding: 16,
      background: 'rgba(20,20,30,0.6)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{
        fontSize: 15, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 18 }}>🎵</span>
        <span>曲目管理</span>
      </div>

      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#a855f7' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 8,
          padding: 20,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
        <div style={{ fontSize: 13, color: '#a1a1aa' }}>拖拽音频文件到此处</div>
        <div style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>支持 MP3 / FLAC / WAV / OGG</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp3,.flac,.wav,.ogg,.m4a,.aac,audio/*"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />
      <input
        ref={lrcInputRef}
        type="file"
        accept=".lrc,.txt"
        style={{ display: 'none' }}
        onChange={handleImportLrc}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1, padding: '8px 10px',
            background: 'rgba(168,85,247,0.15)',
            color: '#c4b5fd',
            border: '1px solid rgba(168,85,247,0.3)',
            borderRadius: 6, fontSize: 12, cursor: 'pointer'
          }}
        >
          + 添加音频
        </button>
        <button
          onClick={() => lrcInputRef.current?.click()}
          disabled={!currentTrackId}
          style={{
            padding: '8px 10px',
            background: currentTrackId ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
            color: currentTrackId ? '#67e8f9' : '#52525b',
            border: `1px solid ${currentTrackId ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 6, fontSize: 12, cursor: currentTrackId ? 'pointer' : 'not-allowed'
          }}
        >
          📝 歌词
        </button>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', display: 'flex',
        flexDirection: 'column', gap: 4,
        paddingRight: 4
      }}>
        <AnimatePresence initial={false}>
          {tracks.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => handleSwitchTrack(t)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: t.id === currentTrackId
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(6,182,212,0.2))'
                  : 'rgba(255,255,255,0.03)',
                border: t.id === currentTrackId
                  ? '1px solid rgba(168,85,247,0.4)'
                  : '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.15s'
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: t.id === currentTrackId
                  ? 'linear-gradient(135deg, #a855f7, #06b6d4)'
                  : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0
              }}>
                {loading === t.id ? '⏳' : (t.id === currentTrackId ? '▶' : '🎧')}
              </div>
              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: t.id === currentTrackId ? '#e4e4e7' : '#a1a1aa'
                }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                  {t.duration ? formatTime(t.duration) : (loading === t.id ? '加载中...' : `${(t.size / 1024 / 1024).toFixed(1)} MB`)}
                  {t.lyrics && <span style={{ marginLeft: 8, color: '#06b6d4' }}>📝</span>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeTrack(t.id); URL.revokeObjectURL(t.url) }}
                style={{
                  width: 24, height: 24,
                  background: 'transparent', border: 'none',
                  color: '#71717a', cursor: 'pointer',
                  fontSize: 14, borderRadius: 4
                }}
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {tracks.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center',
            color: '#52525b', fontSize: 12
          }}>
            暂无曲目
          </div>
        )}
      </div>
    </div>
  )
}
