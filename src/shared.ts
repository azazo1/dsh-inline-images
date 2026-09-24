/**
 * Host / Client 共享的包名, 路由, 图片格式和 Remote 描述符.
 * 宽高不在这里: 它是 profile 条目 Config 的 volatile 字段, 由 Settings 表单投影.
 * codec 只依赖 schema.parse, 不引入 zod, 避免 Client bundle 打进额外运行时.
 */

export const PLUGIN_NAME = 'dsh-inline-images'
export const ROUTE_PATH = '/plugins/dsh-inline-images/image'
export const IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico'] as const

export const DEFAULT_MAX_WIDTH = 640
export const DEFAULT_MAX_HEIGHT = 420
export const SIZE_MIN = 64
export const SIZE_MAX = 2400

export type ResolveImageArgs = {
  path: string
  cwd?: string
}

export type ResolveImageResult = {
  url?: string
}

function parseResolveImageArgs(value: unknown): ResolveImageArgs {
  if (typeof value !== 'object' || value === null) throw new Error('resolveImage args 必须是对象')
  const record = value as Record<string, unknown>
  if (typeof record.path !== 'string' || record.path.trim() === '') throw new Error('path 必须是非空字符串')
  if (record.cwd !== undefined && typeof record.cwd !== 'string') throw new Error('cwd 必须是字符串')
  return { path: record.path, ...record.cwd === undefined ? {} : { cwd: record.cwd } }
}

function strictCodec(typeSymbol: string, parse: (value: unknown) => unknown) {
  const schema = { parse }
  return { mode: 'strict' as const, typeSymbol, create: () => schema }
}

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
      description: '对话内联图片的授权端点.',
      tags: [],
      members: [
        { kind: 'method' as const, name: 'resolveImage', signature: 'resolveImage(args: ResolveImageArgs): Promise<ResolveImageResult>' },
      ],
      types: [],
    }],
    events: [],
    objects: [],
  },
  invocations: INLINE_INVOCATIONS,
}
