export function parseLRC(text) {
  const lines = text.split(/\r?\n/)
  const result = []
  const meta = {}

  for (const line of lines) {
    const metaMatch = line.match(/\[([a-z]+):([^\]]*)\]/i)
    if (metaMatch && !/^\d+:\d+/.test(metaMatch[1])) {
      meta[metaMatch[1].toLowerCase()] = metaMatch[2].trim()
      continue
    }

    const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g
    const timestamps = []
    let match
    const tempLine = line
    while ((match = timeRegex.exec(tempLine)) !== null) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0
      timestamps.push(minutes * 60 + seconds + milliseconds / 1000)
    }

    if (timestamps.length === 0) continue

    const content = line.replace(/\[[^\]]*\]/g, '').trim()
    if (!content) continue

    for (const time of timestamps) {
      result.push({ time, content })
    }
  }

  result.sort((a, b) => a.time - b.time)

  for (let i = 0; i < result.length; i++) {
    result[i].index = i
  }

  return { lines: result, meta }
}

export function findActiveLine(lines, currentTime) {
  if (!lines || lines.length === 0) return -1
  if (currentTime < lines[0].time) return -1
  if (currentTime >= lines[lines.length - 1].time) return lines.length - 1

  let lo = 0
  let hi = lines.length - 1
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (lines[mid].time <= currentTime) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return lo
}
