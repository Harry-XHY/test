/**
 * 从文件名中提取版本号
 * 支持: v1, v2.0, V1.0, ver1, version2, _v3_, -v4-
 */
export function extractVersion(filename) {
  const match = filename.match(/[vV](?:er(?:sion)?\s*)?(\d+(?:\.\d+)?)/i)
  return match ? parseFloat(match[1]) : null
}

/**
 * 从文件名中提取日期
 * 支持: 2026-03-27, 20260327, 2026.03.27
 */
export function extractDate(filename) {
  let match = filename.match(/(\d{4})[-.](\d{2})[-.](\d{2})/)
  if (match) return new Date(match[1], match[2] - 1, match[3])

  match = filename.match(/(\d{4})(\d{2})(\d{2})/)
  if (match) {
    const d = new Date(match[1], match[2] - 1, match[3])
    if (d.getFullYear() > 2000 && d.getFullYear() < 2100) return d
  }

  return null
}

/**
 * 对文件列表按版本号(优先)或日期排序
 */
export function sortByVersion(files) {
  return files
    .map((f, idx) => {
      const version = extractVersion(f.name)
      const date = extractDate(f.name)
      const sortKey = version != null
        ? version
        : date
          ? date.getTime() / 1e12
          : 1000 + idx
      return { ...f, version, date, sortKey }
    })
    .sort((a, b) => a.sortKey - b.sortKey)
}
