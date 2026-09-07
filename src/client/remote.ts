import type { ResolveImageArgs } from '../shared.ts'

type RemoteLike = {
  inlineImages?: {
    resolveImage?(args: ResolveImageArgs): Promise<{ ok: true; value: { url?: string } } | { ok: false; error?: { message?: string } }>
    getConfig?(): Promise<unknown>
  }
}

/** Remote 端点解析: unwrap RemoteResult 包装, 失败返回 undefined. */
export function unwrapRemote<T>(result: unknown): T | undefined {
  if (result && typeof result === 'object' && 'ok' in (result as Record<string, unknown>)) {
    const typed = result as { ok: boolean; value?: T; error?: { message?: string } }
    return typed.ok === true ? typed.value : undefined
  }
  return result as T
}

/** 当前会话工作目录解析: chat owner / session store 中均有 cwd 暴露, 这里做防御式读取. */
export function resolveCwdHint(element: Element): string | undefined {
  const root = element.closest('[data-chat-anchor-key]')
  const workspace = root?.closest('[data-workspace-cwd]')
  const cwd = workspace?.getAttribute('data-workspace-cwd')
  return cwd === null || cwd === '' ? undefined : cwd
}

/** 调用 remote resolveImage 换取授权回环 URL. */
export async function requestImageUrl(remote: RemoteLike | undefined, path: string, cwd: string | undefined): Promise<string | undefined> {
  const endpoint = remote?.inlineImages?.resolveImage
  if (endpoint === undefined) return undefined
  try {
    const result = await endpoint({ path, cwd })
    if (result && typeof result === 'object' && 'ok' in result) {
      if (result.ok !== true) return undefined
      return (result as { value?: { url?: string } }).value?.url
    }
    return (result as { url?: string } | undefined)?.url
  } catch {
    return undefined
  }
}
