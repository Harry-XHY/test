// Minimal SSE diagnostic endpoint. Writes one event and closes immediately.
// If this works in the user's Chrome but stock-ai doesn't, the difference is
// in handler runtime / response timing. If this also fails, something at the
// browser/OS layer is blocking all text/event-stream on localhost.
export default function handler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(': ' + ' '.repeat(2048) + '\n\n')
  res.write('event: hello\ndata: {"msg":"ok"}\n\n')
  res.write('event: done\ndata: {}\n\n')
  res.end()
}
