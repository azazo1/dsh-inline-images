/**
 * dsh-inline-images host: 对话显示图片.
 *  - 图片回环路由 /plugins/dsh-inline-images/image?t=<token>&p=<绝对路径> (与 Web 页面同源).
 *  - token 首次生成后持久化到凭证存储 (INLINE_IMAGE_TOKEN), 重启后历史图片 URL 仍然有效.
 *  - 不改写模型输出: 会话日志只保存模型原始的 ![路径](路径) 文本, 零污染.
 *  - InlineImagesRuntime.resolveImage: 供前端把 MarkdownText 降级文本替换为授权 URL;
 *    相对路径按调用方传入的会话工作目录解析.
 *  - systemPrompt section: 指引模型用 ![路径](路径) 附图.
 *  - InlineImagesRuntime: Typert Remote 服务 (getConfig / setConfig / resolveImage).
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
  type ResolveImageArgs,
  type ResolveImageResult,
  type SetConfigArgs,
} from './shared.ts'

export const name = PLUGIN_NAME
export const inject = ['fs', 'webServer']

const REF_MAX_WIDTH = 'INLINE_IMAGE_MAX_WIDTH'
const REF_MAX_HEIGHT = 'INLINE_IMAGE_MAX_HEIGHT'
const REF_TOKEN = 'INLINE_IMAGE_TOKEN'

const PROMPT_SECTION_NAME = 'plugin:dsh-inline-images'
const INLINE_IMAGES_PROMPT = 'Inline images in Web chat: to let the user preview a local image file (png/jpg/jpeg/webp/gif/svg/avif/bmp/ico), write the same image path twice as a Markdown image in the reply text, like ![path](path) — the alt text must be the path itself, because the preview is recovered from the visible text. Use an absolute path or a path relative to the session working directory, and only reference image files you have confirmed exist. A bare path in plain text stays plain text. Usually you want to show user a local image when you have created it, or you have created an pdf and demostrate its page(s).'

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

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i
const ABSOLUTE_PATH_RE = /^([A-Za-z]:[\\/]|\\\\|\/)/
const URL_LIKE_RE = /^(https?:|data:|file:|blob:|mailto:)/i
const PLACEHOLDER_SEGMENT = /^(路径|示例|占位|本地路径|某某|xx|xxx)$/i

/** 前端候选校验: 图片后缀 + 非 URL + 非占位段 + 非 glob. 路径可为绝对或相对. */
export function isImageCandidatePath(path: string): boolean {
  if (path.length < 3) return false
  if (URL_LIKE_RE.test(path)) return false
  if (/[*?[\]]/.test(path)) return false
  if (!IMAGE_EXT_RE.test(path)) return false
  if (path.split(/[\\/]/).some(segment => PLACEHOLDER_SEGMENT.test(segment))) return false
  return true
}

/** Remote service: 尺寸配置与图片 URL 授权. TypertRemoteService 构造时已经 provide(serviceKey). */
export class InlineImagesRuntime extends TypertRemoteService {
  private readonly credentials: Context['credentials'] | undefined
  private readonly fs: Context['fs'] | undefined
  private readonly webServer: { port: number } | undefined
  private tokenPromise: Promise<string> | undefined
  /** apply 注入, 与图片路由共用同一 getToken, 避免 credentials 未注入时签发失败. */
  tokenSource: () => Promise<string> = async () => {
    throw new Error('token source unset')
  }

  constructor(ctx: Context) {
    super(ctx, 'inlineImages')
    this.credentials = ctx.get('credentials')
    this.fs = ctx.get('fs')
    this.webServer = ctx.get('webServer')
  }

  /** 取回环 token (惰性初始化, 与 apply 内共享凭证存储). */
  ensureToken(resolve: (ref: never) => Promise<{ value?: unknown } | undefined>, set: (ref: never, value: string) => Promise<void>): Promise<string> {
    if (this.tokenPromise === undefined) {
      this.tokenPromise = (async () => {
        try {
          const resolved = await resolve(REF_TOKEN as never)
          const stored = typeof resolved?.value === 'string' ? resolved.value.trim() : ''
          if (/^[A-Za-z0-9]{16,128}$/.test(stored)) return stored
        } catch {
          /* 读取失败则重新生成 */
        }
        const fresh = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        try { await set(REF_TOKEN as never, fresh) } catch {
          /* 保存失败则本次会话内仍可用 */
        }
        return fresh
      })()
    }
    return this.tokenPromise
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

  /**
   * 前端授权入口: 校验路径指向真实存在的图片文件, 返回同源回环 URL.
   * 相对路径按 args.cwd (发起会话的工作目录) 解析; 不存在或非法时返回空对象.
   */
  async resolveImage(input: ResolveImageArgs): Promise<ResolveImageResult> {
    const args = unwrapResolveArgs(input)
    const fs = (this.ctx.get?.('fs') as Context['fs'] | undefined) ?? this.fs
    const webServer = (this.ctx.get?.('webServer') as { port: number } | undefined) ?? this.webServer
    if (fs === undefined || webServer === undefined) return {}
    const raw = typeof args.path === 'string' ? args.path.trim() : ''
    if (!isImageCandidatePath(raw)) return {}
    const cwd = typeof args.cwd === 'string' && args.cwd.trim() !== '' ? args.cwd.trim() : undefined
    if (!ABSOLUTE_PATH_RE.test(raw) && cwd === undefined) return {}
    try {
      const target = await fs.resolve(raw, cwd === undefined ? undefined : { cwd })
      const info = await fs.stat(target)
      if (info === undefined || info.type !== 'file') return {}
      const token = await this.tokenSource()
      return {
        url: 'http://127.0.0.1:' + webServer.port + ROUTE_PATH + '?t=' + token + '&p=' + encodeURIComponent(target.displayPath),
      }
    } catch {
      return {}
    }
  }
}

function unwrapResolveArgs(input: ResolveImageArgs | { args?: ResolveImageArgs }): ResolveImageArgs {
  if (input !== null && typeof input === 'object' && 'path' in input && typeof (input as ResolveImageArgs).path === 'string') {
    return input as ResolveImageArgs
  }
  const nested = (input as { args?: ResolveImageArgs }).args
  if (nested !== undefined && typeof nested.path === 'string') return nested
  return { path: '' }
}

type ConnectionHandle = { requestRejection(request: { headers: unknown }): 401 | 403 | undefined }
type TypertRegistry = { register(contribution: unknown): () => void | Promise<void> }
type SystemPromptRegistry = {
  getSectionOrder?(name: string): number
  section(section: { name: string; order: number; text: string }): () => void
}

export function apply(ctx: Context): void {
  const logger = ctx.logger(PLUGIN_NAME)
  const fs = ctx.get('fs')
  const attachments = ctx.get('attachments')
  const webServer = ctx.get('webServer')
  const credentials = ctx.get('credentials')
  const connection = ctx.get('connection') as ConnectionHandle | undefined
  const typert = ctx.get('typert') as TypertRegistry | undefined
  const systemPrompt = ctx.get('systemPrompt') as SystemPromptRegistry | undefined

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

  const runtime = new InlineImagesRuntime(ctx)
  runtime.tokenSource = getToken
  if (typert !== undefined) typert.register(INLINE_MANIFEST)
  // 路由与 resolveImage 共用同一 token 来源: runtime 的惰性初始化落在凭证存储中.
  runtime.ensureToken(
    ref => (credentials === undefined ? Promise.resolve(undefined) : credentials.resolve(ref)),
    (ref, value) => (credentials === undefined ? Promise.resolve() : credentials.set(ref, value)),
  ).then(fresh => {
    if (token === undefined) {
      token = fresh
      tokenPromise = Promise.resolve(fresh)
    }
  }).catch(() => { /* getToken 兜底 */ })

  if (systemPrompt !== undefined) {
    const order = systemPrompt.getSectionOrder?.('DELIVERABLE_FILE_REFERENCES') ?? 9000
    ctx.effect(() => systemPrompt.section({
      name: PROMPT_SECTION_NAME,
      order,
      text: INLINE_IMAGES_PROMPT,
    }), 'dsh-inline-images: prompt section')
  }

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
  logger.info('已挂载图片回环路由, resolveImage 授权端点' + (systemPrompt !== undefined ? '与系统提示词指引' : ''))
}
