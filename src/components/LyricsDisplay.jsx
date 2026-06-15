import { motion, AnimatePresence } from 'framer-motion'
import { useStore, COLOR_THEMES } from '../store'
import { findActiveLine } from '../utils/lrc'
import { useMemo } from 'react'

export default function LyricsDisplay() {
  const showLyrics = useStore(s => s.showLyrics)
  const currentTrack = useStore(s => s.getCurrentTrack())
  const currentTime = useStore(s => s.currentTime)
  const colorThemeIndex = useStore(s => s.colorThemeIndex)
  const theme = COLOR_THEMES[colorThemeIndex]

  const { prevLine, currentLine, nextLine } = useMemo(() => {
    if (!currentTrack?.lyrics?.lines) {
      return { prevLine: null, currentLine: null, nextLine: null }
    }
    const lines = currentTrack.lyrics.lines
    const idx = findActiveLine(lines, currentTime)
    return {
      prevLine: idx > 0 ? lines[idx - 1] : null,
      currentLine: idx >= 0 ? lines[idx] : null,
      nextLine: idx >= 0 && idx < lines.length - 1 ? lines[idx + 1] : null
    }
  }, [currentTrack, currentTime])

  if (!showLyrics || !currentTrack?.lyrics?.lines?.length) {
    return null
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 120,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80%',
      maxWidth: 800,
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <div style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.7) 30%, rgba(10,10,15,0.85) 50%, rgba(10,10,15,0.7) 70%, transparent 100%)',
        padding: '20px 40px',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={prevLine?.content || 'empty-prev'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.35, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              fontSize: 16,
              color: '#a1a1aa',
              lineHeight: 1.4,
              filter: 'blur(0.3px)',
              minHeight: 22
            }}
          >
            {prevLine?.content || ''}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentLine?.content || 'empty-cur'}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              textShadow: [
                `0 0 10px ${theme.primary}88`,
                `0 0 20px ${theme.secondary}66`,
                `0 0 10px ${theme.accent}88`
              ]
            }}
            exit={{ opacity: 0, scale: 1.02, y: -8 }}
            transition={{
              duration: 0.35,
              ease: 'easeOut',
              textShadow: {
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse'
              }
            }}
            style={{
              fontSize: 26,
              fontWeight: 700,
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.3,
              minHeight: 36,
              letterSpacing: 0.5
            }}
          >
            {currentLine?.content || '♪'}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={nextLine?.content || 'empty-next'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.35, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              fontSize: 16,
              color: '#a1a1aa',
              lineHeight: 1.4,
              filter: 'blur(0.3px)',
              minHeight: 22
            }}
          >
            {nextLine?.content || ''}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
