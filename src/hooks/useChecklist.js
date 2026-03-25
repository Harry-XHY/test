import { useState, useCallback, useRef, useEffect } from 'react'

// 持久化验收状态到 localStorage
function saveVerifications(docId, verifications) {
  if (!docId) return
  localStorage.setItem(`verifications_${docId}`, JSON.stringify(verifications))
}

function loadVerifications(docId) {
  if (!docId) return null
  const saved = localStorage.getItem(`verifications_${docId}`)
  return saved ? JSON.parse(saved) : null
}

export function useChecklist() {
  const [modules, setModules] = useState([])
  const [summary, setSummary] = useState({})
  const [verifications, setVerifications] = useState({})
  const docIdRef = useRef(null)

  // 验收状态变化时自动保存
  useEffect(() => {
    if (docIdRef.current && Object.keys(verifications).length > 0) {
      saveVerifications(docIdRef.current, verifications)
    }
  }, [verifications])

  const loadChecklist = useCallback((data, docId) => {
    docIdRef.current = docId || null
    setModules(data.modules || [])
    setSummary(data.summary || {})

    // 尝试恢复已保存的验收状态
    const saved = docId ? loadVerifications(docId) : null

    const initVerifications = {}
    for (const mod of data.modules || []) {
      for (const item of mod.items) {
        initVerifications[item.id] = saved?.[item.id] || { status: 'pending', note: '' }
      }
    }
    setVerifications(initVerifications)
  }, [])

  const addItem = (moduleIndex, item) => {
    setModules((prev) =>
      prev.map((mod, i) =>
        i === moduleIndex ? { ...mod, items: [...mod.items, item] } : mod
      )
    )
    setVerifications((prev) => ({
      ...prev,
      [item.id]: { status: 'pending', note: '' },
    }))
  }

  const removeItem = (moduleIndex, itemIndex) => {
    const removed = modules[moduleIndex].items[itemIndex]
    setModules((prev) =>
      prev.map((mod, i) =>
        i === moduleIndex
          ? { ...mod, items: mod.items.filter((_, j) => j !== itemIndex) }
          : mod
      )
    )
    setVerifications((prev) => {
      const next = { ...prev }
      delete next[removed.id]
      return next
    })
  }

  const updatePriority = (moduleIndex, itemIndex, priority) => {
    setModules((prev) =>
      prev.map((mod, i) =>
        i === moduleIndex
          ? {
              ...mod,
              items: mod.items.map((item, j) =>
                j === itemIndex ? { ...item, priority } : item
              ),
            }
          : mod
      )
    )
  }

  const setVerification = (itemId, status, note = '') => {
    setVerifications((prev) => ({
      ...prev,
      [itemId]: { status, note: note || prev[itemId]?.note || '' },
    }))
  }

  const setNote = (itemId, note) => {
    setVerifications((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], note },
    }))
  }

  const getStats = () => {
    const all = Object.values(verifications)
    return {
      total: all.length,
      pass: all.filter((v) => v.status === 'pass').length,
      fail: all.filter((v) => v.status === 'fail').length,
      skip: all.filter((v) => v.status === 'skip').length,
      pending: all.filter((v) => v.status === 'pending').length,
      verified: all.filter((v) => v.status !== 'pending').length,
    }
  }

  const getModuleStats = (mod) => {
    const items = mod.items.map((item) => verifications[item.id])
    const total = items.length
    const pass = items.filter((v) => v?.status === 'pass').length
    return {
      total,
      pass,
      fail: items.filter((v) => v?.status === 'fail').length,
      rate: total > 0 ? Math.round((pass / total) * 100) : 0,
    }
  }

  return {
    modules, summary, verifications,
    loadChecklist, addItem, removeItem, updatePriority,
    setVerification, setNote, getStats, getModuleStats,
  }
}
