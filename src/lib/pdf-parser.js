import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

const MAX_PAGES = 50
const MAX_SIZE_MB = 10

function getFileType(file) {
  const typeMap = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'text/csv': 'csv',
    'text/markdown': 'md',
    'text/plain': 'txt',
  }
  if (typeMap[file.type]) return typeMap[file.type]
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (['pdf', 'docx', 'xlsx', 'xls', 'csv', 'md', 'markdown', 'txt'].includes(ext)) return ext === 'markdown' ? 'md' : ext
  return null
}

export async function parseDocument(file) {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`文件大小超过 ${MAX_SIZE_MB}MB 限制`)
  }

  const fileType = getFileType(file)
  if (!fileType) {
    throw new Error('不支持的文件格式，请上传 PDF、DOCX、XLSX、CSV、MD 或 TXT 文件')
  }

  if (fileType === 'pdf') return parsePdf(file)
  if (fileType === 'docx') return parseDocx(file)
  if (['xlsx', 'xls', 'csv'].includes(fileType)) return parseSpreadsheet(file)
  if (['md', 'txt'].includes(fileType)) return parseTextFile(file)
}

async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`文件超过 ${MAX_PAGES} 页限制，请拆分后上传`)
  }

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => item.str).join(' ')
    fullText += `\n--- 第 ${i} 页 ---\n${pageText}`
  }

  return { text: fullText.trim(), pageCount: pdf.numPages }
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = result.value

  if (!text || text.trim().length === 0) {
    throw new Error('DOCX 文件内容为空，请检查文件')
  }

  const estimatedPages = Math.max(1, Math.ceil(text.length / 500))
  return { text: text.trim(), pageCount: estimatedPages }
}

async function parseSpreadsheet(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  let fullText = ''
  let totalRows = 0

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (data.length === 0) continue

    fullText += `\n--- 工作表: ${sheetName} ---\n`

    // 第一行作为表头
    const headers = data[0]
    fullText += `表头: ${headers.join(' | ')}\n\n`

    // 数据行转为可读文本
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      // 跳过空行
      if (row.every((cell) => cell === '' || cell === null || cell === undefined)) continue

      const rowText = headers
        .map((h, j) => (row[j] !== '' && row[j] != null ? `${h}: ${row[j]}` : null))
        .filter(Boolean)
        .join(', ')

      if (rowText) {
        fullText += `${rowText}\n`
        totalRows++
      }
    }
  }

  if (totalRows === 0) {
    throw new Error('表格文件内容为空，请检查文件')
  }

  return {
    text: fullText.trim(),
    pageCount: Math.max(1, Math.ceil(totalRows / 30)), // 每页约 30 行
  }
}

async function parseTextFile(file) {
  const text = await file.text()
  if (!text || text.trim().length === 0) {
    throw new Error('文件内容为空，请检查文件')
  }
  const estimatedPages = Math.max(1, Math.ceil(text.length / 500))
  return { text: text.trim(), pageCount: estimatedPages }
}

export { parsePdf }
