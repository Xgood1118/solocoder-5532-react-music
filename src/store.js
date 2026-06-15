import { create } from 'zustand'

export const VISUALIZATION_MODES = ['bars', 'wave', 'circle', 'particles']
export const FFT_SIZES = [512, 1024, 2048, 4096]
export const EXPORT_RESOLUTIONS = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '原生', width: 0, height: 0 }
]

export const COLOR_THEMES = [
  { name: '霓虹紫', primary: '#a855f7', secondary: '#ec4899', accent: '#3b82f6' },
  { name: '赛博蓝', primary: '#06b6d4', secondary: '#3b82f6', accent: '#8b5cf6' },
  { name: '极光绿', primary: '#10b981', secondary: '#06b6d4', accent: '#84cc16' },
  { name: '日落橙', primary: '#f97316', secondary: '#ef4444', accent: '#eab308' },
  { name: '樱花粉', primary: '#f472b6', secondary: '#c084fc', accent: '#fb923c' },
  { name: '深海蓝', primary: '#1e40af', secondary: '#7c3aed', accent: '#0ea5e9' }
]

export const useStore = create((set, get) => ({
  audioContext: null,
  setAudioContext: (ctx) => set({ audioContext: ctx }),

  isInitialized: false,
  setInitialized: (v) => set({ isInitialized: v }),

  tracks: [],
  currentTrackId: null,

  addTrack: (track) => set((state) => ({
    tracks: [...state.tracks, track],
    currentTrackId: state.currentTrackId || track.id
  })),

  removeTrack: (id) => set((state) => {
    const tracks = state.tracks.filter(t => t.id !== id)
    return {
      tracks,
      currentTrackId: state.currentTrackId === id
        ? (tracks[0]?.id || null)
        : state.currentTrackId
    }
  }),

  setCurrentTrack: (id) => set({ currentTrackId: id }),

  getCurrentTrack: () => {
    const state = get()
    return state.tracks.find(t => t.id === state.currentTrackId) || null
  },

  playState: 'paused',
  setPlayState: (s) => set({ playState: s }),

  currentTime: 0,
  setCurrentTime: (t) => set({ currentTime: t }),

  duration: 0,
  setDuration: (d) => set({ duration: d }),

  visualizationMode: 'bars',
  setVisualizationMode: (m) => set({ visualizationMode: m }),

  fftSize: 1024,
  setFFTSize: (s) => set({ fftSize: s }),

  sensitivity: 1.0,
  setSensitivity: (s) => set({ sensitivity: s }),

  colorThemeIndex: 0,
  setColorThemeIndex: (i) => set({ colorThemeIndex: i }),

  showLyrics: true,
  setShowLyrics: (v) => set({ showLyrics: v }),

  isExporting: false,
  setIsExporting: (v) => set({ isExporting: v }),

  exportProgress: 0,
  setExportProgress: (p) => set({ exportProgress: p }),

  exportResolution: 1,
  setExportResolution: (r) => set({ exportResolution: r }),

  volume: 1.0,
  setVolume: (v) => set({ volume: v }),

  waveformCache: {},
  setWaveformData: (trackId, data) => set((state) => ({
    waveformCache: { ...state.waveformCache, [trackId]: data }
  }))
}))
