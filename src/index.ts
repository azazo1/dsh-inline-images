/**
 * dsh-inline-images host: 对话显示图片.
 *  - 图片回环路由 /plugins/dsh-inline-images/image?t=<token>&p=<path> (与 Web 页面同源).
 *  - token 首次生成后持久化到凭证存储 (INLINE_IMAGE_TOKEN), 重启后历史消息中的图片 URL 仍然有效.
 *  - llm/stream 包装: 把助手消息文本中的本地图片路径改写为该 URL, 产品 MarkdownText 在消息正文内渲染图片.
 *  - InlineImagesRuntime: Typert Remote 服务 (getConfig / setConfig, 控制正文图片最大尺寸).
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-credentials'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  IMAGE_FORMATS,
  INLINE_MANIFEST,
  PLUGIN_NAME,
  ROUTE_PATH,
  type SetConfigArgs,
} from './shared.ts'

export const name = PLUGIN_NAME
export const inject = ['llm', 'fs', 'webServer']

const REF_MAX_WIDTH = 'INLINE_IMAGE_MAX_WIDTH'
const REF_MAX_HEIGHT = 'INLINE_IMAGE_MAX_HEIGHT'
const REF_TOKEN = 'INLINE_IMAGE_TOKEN'

function mediaTypeFor(path: string): string | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.avif')) return 'image/avif'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  return null
}

/** Remote service: 正文图片最大尺寸配置. TypertRemoteService 构造时已经 provide(serviceKey). */
export class InlineImagesRuntime extends TypertRemoteService {
  private readonly credentials: Context['credentials'] | undefined

  constructor(ctx: Context) {
    super(ctx, 'inlineImages')
    this.credentials = ctx.get('credentials')
  }

  async getConfig() {
    const read = async (ref: string, fallback: number): Promise<number> => {
      if (this.credentials === undefined) return fallback
      try {
        const resolved = await this.credentials.resolve(ref as never)
        if (resolved === undefined) return fallback
        const value = Number(resolved.value)
        return Number.isFinite(value) && value >= 64 ? Math.round(value) : fallback
      } catch {
        return fallback
      }
    }
    return {
      maxWidth: await read(REF_MAX_WIDTH, 640),
      maxHeight: await read(REF_MAX_HEIGHT, 420),
      formats: [...IMAGE_FORMATS],
    }
  }

  async setConfig(args: SetConfigArgs) {
    if (this.credentials === undefined) throw new Error('凭证服务不可用, 无法保存配置')
    if (typeof args.maxWidth === 'number') {
      const value = Math.round(args.maxWidth)
      if (!(value >= 64 && value <= 2400)) throw new Error('宽度需在 64-2400 之间')
      await this.credentials.set(REF_MAX_WIDTH as never, String(value))
    }
    if (typeof args.maxHeight === 'number') {
      const value = Math.round(args.maxHeight)
      if (!(value >= 64 && value <= 2400)) throw new Error('高度需在 64-2400 之间')
      await this.credentials.set(REF_MAX_HEIGHT as never, String(value))
    }
    return this.getConfig()
  }
}

const BARE_STOP = "\\s'\"<>\\[\\]\u3001\uFF0C\u3002\uFF1B;`"
const PLACEHOLDER_SEGMENT = /^(路径|示例|占位|本地路径|某某|xx|xxx)$/i
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i

function normalizeCandidate(raw: string): string {
  let value = raw.trim()
  value = value.replace(/^['"`\[(\s]+/, '')
  value = value.replace(/['"`]+$/, '')
  value = value.replace(/[\]}>]+$/, '')
  value = value.replace(/[;,，。、.]+$/, '')
  return value.trim()
}

function acceptable(path: string): boolean {
  if (path.length < 3) return false
  if (/^(https?:|data:|file:|mailto:)/i.test(path)) return false
  if (!IMAGE_EXT_RE.test(path)) return false
  if (!/^([A-Za-z]:[\\/]|\\\\|\/)/.test(path)) return false
  if (path.split(/[\\/]/).some(segment => PLACEHOLDER_SEGMENT.test(segment))) return false
  return true
}

function scanImagePathRanges(text: string): Array<{ path: string; rawStart: number; rawEnd: number }> {
  const found: Array<{ path: string; rawStart: number; rawEnd: number }> = []
  const seen = new Set<string>()
  const push = (raw: string, start: number, end: number) => {
    const path = normalizeCandidate(raw)
    if (!acceptable(path)) return
    if (seen.has(path)) return
    seen.add(path)
    found.push({ path, rawStart: start, rawEnd: end })
  }
  const mdRe = /!?\[[^\]]*\]\(\s*([^)\s][^)]*?)\s*\)/g
  let match: RegExpExecArray | null
  while ((match = mdRe.exec(text)) !== null) {
    const inner = match[1].trim()
    const quote = inner[0]
    const path = quote === '"' || quote === "'"
      ? (inner.indexOf(quote, 1) !== -1 ? inner.slice(1, inner.indexOf(quote, 1)) : inner)
      : inner
    push(path, match.index, match.index + match[0].length)
  }
  const bareRe = new RegExp('(?:[A-Za-z]:[\\\\/][^' + BARE_STOP + ']+|\\\\[^\\\\\\s]+[\\\\/][^' + BARE_STOP + ']+|\\/[^' + BARE_STOP + ']+)', 'g')
  while ((match = bareRe.exec(text)) !== null) {
    const path = normalizeCandidate(match[0])
    if (!acceptable(path)) continue
    let start = match.index
    let end = match.index + match[0].length
    if (text[start - 1] === '`' && text[end] === '`') {
      start -= 1
      end += 1
    }
    if (seen.has(path)) continue
    seen.add(path)
    found.push({ path, rawStart: start, rawEnd: end })
  }
  return found
}

type TypertRegistry = { register(contribution: unknown): () => void | Promise<void> }
type ConnectionHandle = { requestRejection(request: { headers: unknown }): 401 | 403 | undefined }

export function apply(ctx: Context): void {
  const logger = ctx.logger(PLUGIN_NAME)
  const fs = ctx.get('fs')
  const attachments = ctx.get('attachments')
  const webServer = ctx.get('webServer')
  const llm = ctx.get('llm')
  const credentials = ctx.get('credentials')
  const connection = ctx.get('connection') as ConnectionHandle | undefined
  const typert = ctx.get('typert') as TypertRegistry | undefined

  let token: string | undefined
  let tokenPromise: Promise<string> | undefined
  const getToken = (): Promise<string> => {
    if (tokenPromise === undefined) {
      tokenPromise = (async () => {
        if (credentials !== undefined) {
          try {
            const resolved = await credentials.resolve(REF_TOKEN as never)
            const stored = typeof resolved?.value === 'string' ? resolved.value.trim() : ''
            if (/^[A-Za-z0-9]{16,128}$/.test(stored)) {
              token = stored
              return stored
            }
          } catch {
            /* 读取失败则重新生成 */
          }
        }
        const fresh = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        token = fresh
        if (credentials !== undefined) {
          try { await credentials.set(REF_TOKEN as never, fresh) } catch {
            /* 保存失败则本次会话内仍可用 */
          }
        }
        return fresh
      })()
    }
    return tokenPromise
  }

  new InlineImagesRuntime(ctx)
  if (typert !== undefined) typert.register(INLINE_MANIFEST)

  ctx.effect(() => webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      async handler(req: any, res: any) {
        try {
          if (connection !== undefined) {
            const rejection = connection.requestRejection(req)
            if (rejection !== undefined) {
              res.writeHead(rejection)
              res.end()
              return
            }
          }
          const raw = String(req.url ?? '')
          const at = raw.indexOf('?')
          const query: Record<string, string> = {}
          if (at !== -1) {
            for (const pair of raw.slice(at + 1).split('&')) {
              const eq = pair.indexOf('=')
              if (eq === -1) continue
              try { query[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' ')) } catch { /* skip */ }
            }
          }
          if (!query.p) {
            res.writeHead(400); res.end('bad request'); return
          }
          if (query.t !== await getToken()) {
            res.writeHead(400); res.end('bad request'); return
          }
          const mediaType = mediaTypeFor(query.p)
          if (mediaType === null) {
            res.writeHead(400); res.end('not an image path'); return
          }
          let maxBytes = 20 * 1024 * 1024
          if (attachments !== undefined) {
            try { maxBytes = attachments.imageLimits.maxImageBytes } catch { /* keep default */ }
          }
          const target = await fs.resolve(query.p)
          const bytes = await fs.readBytes(target, undefined, maxBytes)
          res.writeHead(200, { 'Content-Type': mediaType, 'Cache-Control': 'private, max-age=60' })
          res.end(bytes)
        } catch {
          try { res.writeHead(404); res.end('not found') } catch { /* dropped */ }
        }
      },
    }), 'dsh-inline-images: image route')

  void getToken()
  ctx.on('llm/stream', (options: any, next: any) => {
    if (options?.purpose) return next()
    return rewriteStream(next, webServer.port, getToken, fs, logger)
  })
  logger.info('已挂载图片回环路由与 llm/stream 改写')
}

async function* rewriteStream(
  next: any,
  port: number,
  getToken: () => Promise<string>,
  fs: Context['fs'],
  logger: { error(message: string, extra?: unknown): void },
) {
  const seenPaths = new Set<string>()
  for await (const chunk of next()) {
    if (chunk?.type === 'block-end' && chunk.block?.type === 'text' && typeof chunk.block.text === 'string') {
      try {
        const text = chunk.block.text
        const ranges = scanImagePathRanges(text)
        if (ranges.length > 0 && fs !== undefined) {
          let rewritten = text
          let changed = false
          const todo: Array<{ range: { path: string; rawStart: number; rawEnd: number }; url: string }> = []
          for (const range of ranges) {
            if (seenPaths.has(range.path)) continue
            seenPaths.add(range.path)
            try {
              const target = await fs.resolve(range.path)
              const info = await fs.stat(target)
              if (info === undefined || info.type !== 'file') continue
            } catch {
              continue
            }
            todo.push({
              range,
              url: 'http://127.0.0.1:' + port + ROUTE_PATH + '?t=' + await getToken() + '&p=' + encodeURIComponent(range.path),
            })
          }
          todo.sort((a, b) => b.range.rawStart - a.range.rawStart)
          for (const { range, url } of todo) {
            const before = rewritten
            rewritten = rewritten.slice(0, range.rawStart) + '![](' + url + ')' + rewritten.slice(range.rawEnd)
            if (rewritten !== before) changed = true
          }
          if (changed) {
            yield { ...chunk, block: { ...chunk.block, text: rewritten } }
            continue
          }
        }
      } catch (error) {
        logger.error('图片路径改写失败', error)
      }
    }
    yield chunk
  }
}
