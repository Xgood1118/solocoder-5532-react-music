import { useEffect } from 'react'
import { useStore } from '../store'

export function useKeyboardShortcuts(audioManager) {
  const playState = useStore(s => s.playState)
  const setPlayState = useStore(s => s.setPlayState)
  const currentTime = useStore(s => s.currentTime)
  const setCurrentTime = useStore(s => s.setCurrentTime)
  const duration = useStore(s => s.duration)
  const setDuration = useStore(s => s.setDuration)
  const tracks = useStore(s => s.tracks)
  const currentTrackId = useStore(s => s.currentTrackId)
  const setCurrentTrack = useStore(s => s.setCurrentTrack)
  const isInitialized = useStore(s => s.isInitialized)

  useEffect(() => {
    const switchTrack = async (delta = 1) => {
      if (tracks.length === 0 || !audioManager) return
      const idx = tracks.findIndex(t => t.id === currentTrackId)
      if (idx < 0) return
      const nextIdx = (idx + delta + tracks.length) % tracks.length
      const t = tracks[nextIdx]
      setCurrentTrack(t.id)
      try {
        const d = await audioManager.loadTrack(t)
        setDuration(d)
        await audioManager.play()
        setPlayState('playing')
      } catch (err) { console.warn(err) }
    }

    const handler = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        if (!isInitialized) return
        if (!audioManager) return
        if (playState === 'playing') {
          audioManager.pause()
          setPlayState('paused')
        } else {
          try {
            await audioManager.play()
            setPlayState('playing')
          } catch (err) { console.warn(err) }
        }
        return
      }

      if (!audioManager || !isInitialized) return

      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          await switchTrack(-1)
        } else {
          const t = Math.max(0, currentTime - 5)
          audioManager.seek(t)
          setCurrentTime(t)
        }
        return
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault()
        if (e.ctrlKey || e.metaKey) {
          await switchTrack(1)
        } else {
          const t = Math.min(duration || 0, currentTime + 5)
          audioManager.seek(t)
          setCurrentTime(t)
        }
        return
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault()
        await switchTrack(-1)
        return
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault()
        await switchTrack(1)
        return
      }
    }

    window.addEventListener('keydown', handler, { passive: false })
    return () => window.removeEventListener('keydown', handler)
  }, [
    audioManager, isInitialized, playState,
    currentTime, duration, tracks, currentTrackId
  ])
}
