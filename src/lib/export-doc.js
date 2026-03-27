import { marked } from 'marked'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function dateSuffix() {
  return new Date().toISOString().split('T')[0]
}

export function exportMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `${filename}_${dateSuffix()}.md`)
}

export function exportMergeHTML(markdown, filename) {
  const body = marked.parse(markdown)
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${filename}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1e293b; background: #fff; line-height: 1.8;
  max-width: 900px; margin: 0 auto; padding: 40px 32px;
}
h1 { font-size: 24px; font-weight: 700; margin: 0 0 24px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
h2 { font-size: 18px; font-weight: 700; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
h3 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; }
h4 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
p { margin: 8px 0; font-size: 14px; }
ul, ol { margin: 8px 0; padding-left: 24px; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; }
td { padding: 8px 10px; border: 1px solid #e5e7eb; }
tr:nth-child(even) { background: #f8fafc; }
code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
pre code { background: none; padding: 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>${body}
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af">
由 Harry的验收助手 · 文档整合功能 生成 · ${new Date().toLocaleString('zh-CN')}
</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `${filename}_${dateSuffix()}.html`)
}

export async function exportWord(markdown, filename) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  const lines = markdown.split('\n')
  const children = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('#### ')) {
      children.push(new Paragraph({ text: trimmed.replace(/^#### /, ''), heading: HeadingLevel.HEADING_4 }))
    } else if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({ text: trimmed.replace(/^### /, ''), heading: HeadingLevel.HEADING_3 }))
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({ text: trimmed.replace(/^## /, ''), heading: HeadingLevel.HEADING_2 }))
    } else if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({ text: trimmed.replace(/^# /, ''), heading: HeadingLevel.HEADING_1 }))
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(new Paragraph({
        children: [new TextRun(trimmed.replace(/^[-*] /, ''))],
        bullet: { level: 0 },
      }))
    } else if (trimmed.startsWith('|') && !trimmed.match(/^\|[-:\s|]+\|$/)) {
      const cells = trimmed.split('|').filter(c => c.trim() !== '').map(c => c.trim())
      if (cells.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun(cells.join(' | '))],
        }))
      }
    } else {
      const runs = []
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/)
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
        } else if (part) {
          runs.push(new TextRun(part))
        }
      }
      children.push(new Paragraph({ children: runs }))
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const buf = await Packer.toBlob(doc)
  downloadBlob(buf, `${filename}_${dateSuffix()}.docx`)
}
