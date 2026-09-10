/**
 * Host / Client 共享的包名, 路由, 图片格式和 Remote 描述符.
 * codec 只依赖 schema.parse, 不引入 zod, 避免 Client bundle 打进额外运行时.
 */

export const PLUGIN_NAME = 'dsh-inline-images'
export const ROUTE_PATH = '/plugins/dsh-inline-images/image'
export const IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico'] as const

/** Host settings 命名空间, 与插件名一致. */
export const SETTINGS_NAMESPACE = PLUGIN_NAME
export const DEFAULT_MAX_WIDTH = 640
export const DEFAULT_MAX_HEIGHT = 420
export const SIZE_MIN = 64
export const SIZE_MAX = 2400

export type InlineConfig = {
  maxWidth: number
  maxHeight: number
  formats: string[]
}

/**
 * 校验并四舍五入到允许的像素范围.
 * @param value - 用户输入.
 * @param label - 错误文案中的字段名.
 */
export function clampImageSize(value: number, label: string): number {
  const rounded = Math.round(value)
  if (!(rounded >= SIZE_MIN && rounded <= SIZE_MAX)) {
    throw new Error(label + ' 需在 ' + SIZE_MIN + '-' + SIZE_MAX + ' 之间')
  }
  return rounded
}

export type SetConfigArgs = {
  maxWidth?: number
  maxHeight?: number
}

export type ResolveImageArgs = {
  path: string
  cwd?: string
}

export type ResolveImageResult = {
  url?: string
}

function asFiniteNumber(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) throw new Error(label + ' 必须是有限数字')
  return n
}

function parseConfig(value: unknown): InlineConfig {
  if (typeof value !== 'object' || value === null) throw new Error('config 必须是对象')
  const record = value as Record<string, unknown>
  const formats = Array.isArray(record.formats)
    ? record.formats.filter((item): item is string => typeof item === 'string')
    : [...IMAGE_FORMATS]
  return {
    maxWidth: asFiniteNumber(record.maxWidth, 'maxWidth'),
    maxHeight: asFiniteNumber(record.maxHeight, 'maxHeight'),
    formats,
  }
}

function parseSetConfigArgs(value: unknown): SetConfigArgs {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null) throw new Error('setConfig args 必须是对象')
  const record = value as Record<string, unknown>
  const out: SetConfigArgs = {}
  if (record.maxWidth !== undefined) out.maxWidth = asFiniteNumber(record.maxWidth, 'maxWidth')
  if (record.maxHeight !== undefined) out.maxHeight = asFiniteNumber(record.maxHeight, 'maxHeight')
  return out
}

function parseResolveImageArgs(value: unknown): ResolveImageArgs {
  if (typeof value !== 'object' || value === null) throw new Error('resolveImage args 必须是对象')
  const record = value as Record<string, unknown>
  if (typeof record.path !== 'string' || record.path.trim() === '') throw new Error('path 必须是非空字符串')
  if (record.cwd !== undefined && typeof record.cwd !== 'string') throw new Error('cwd 必须是字符串')
  return { path: record.path, ...record.cwd === undefined ? {} : { cwd: record.cwd } }
}

function strictCodec(typeSymbol: string, parse: (value: unknown) => unknown) {
  return { mode: 'strict' as const, typeSymbol, schema: { parse } }
}

const configCodec = strictCodec('dsh-inline-images#Config', parseConfig)
const setConfigArgsCodec = strictCodec('dsh-inline-images#SetConfigArgs', parseSetConfigArgs)
const resolveImageArgsCodec = strictCodec('dsh-inline-images#ResolveImageArgs', parseResolveImageArgs)
const resolveImageResultCodec = strictCodec('dsh-inline-images#ResolveImageResult', (value) => {
  if (typeof value !== 'object' || value === null) throw new Error('result 必须是对象')
  const record = value as Record<string, unknown>
  if (record.url !== undefined && typeof record.url !== 'string') throw new Error('url 必须是字符串')
  return { ...record.url === undefined ? {} : { url: record.url } }
})

/** Host ctx.typert.register 与 Client ctx.remote.$mount 共用的调用描述符. */
export const INLINE_INVOCATIONS = [
  {
    id: 'dsh-inline-images#inlineImages/getConfig',
    service: 'inlineImages',
    namespace: 'inlineImages',
    method: 'getConfig',
    invocation: { kind: 'direct' as const },
    parameters: [],
    result: configCodec,
  },
  {
    id: 'dsh-inline-images#inlineImages/setConfig',
    service: 'inlineImages',
    namespace: 'inlineImages',
    method: 'setConfig',
    invocation: { kind: 'direct' as const },
    parameters: [{
      name: 'args',
      wire: 'args',
      source: 'json' as const,
      codec: setConfigArgsCodec,
    }],
    result: configCodec,
  },
  {
    id: 'dsh-inline-images#inlineImages/resolveImage',
    service: 'inlineImages',
    namespace: 'inlineImages',
    method: 'resolveImage',
    invocation: { kind: 'direct' as const },
    parameters: [{
      name: 'args',
      wire: 'args',
      source: 'json' as const,
      codec: resolveImageArgsCodec,
    }],
    result: resolveImageResultCodec,
  },
]

export const INLINE_REMOTE_CONTRIBUTION = {
  package: PLUGIN_NAME,
  descriptors: INLINE_INVOCATIONS,
}

export const INLINE_MANIFEST = {
  package: PLUGIN_NAME,
  face: 'host' as const,
  schemas: [],
  model: {
    services: [{
      key: 'inlineImages',
      exportName: 'InlineImagesRuntime',
      description: '对话内联图片的尺寸配置端点.',
      tags: [],
      members: [
        { kind: 'method' as const, name: 'getConfig', signature: 'getConfig(): Promise<Config>' },
        { kind: 'method' as const, name: 'setConfig', signature: 'setConfig(args: SetConfigArgs): Promise<Config>' },
        { kind: 'method' as const, name: 'resolveImage', signature: 'resolveImage(args: ResolveImageArgs): Promise<ResolveImageResult>' },
      ],
      types: [],
    }],
    events: [],
    objects: [],
  },
  invocations: INLINE_INVOCATIONS,
}
