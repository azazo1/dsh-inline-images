import type { ResolveImageArgs } from '../shared.ts'

type ResolveImageFn = (args: ResolveImageArgs) => Promise<unknown>

type SessionListSnap = {
  current?: string
  byId?: Record<string, { cwd?: string; parentId?: string }>
}

type SessionsLike = {
  list?: { getSnapshot(): SessionListSnap }
}

/** Remote 端点解析: unwrap RemoteResult 包装, 失败返回 undefined. */
export function unwrapRemote<T>(result: unknown): T | undefined {
  if (result && typeof result === 'object' && 'ok' in (result as Record<string, unknown>)) {
    const typed = result as { ok: boolean; value?: T; error?: { message?: string } }
    return typed.ok === true ? typed.value : undefined
  }
  return result as T
}

/** 从 client sessions store 取当前会话 cwd, 子会话沿 parentId 向上找. */
export function sessionCwdOf(sessions: SessionsLike | undefined): string | undefined {
  const snap = sessions?.list?.getSnapshot?.()
  if (snap === undefined) return undefined
  let id = snap.current
  for (let hop = 0; id !== undefined && hop < 8; hop += 1) {
    const info = snap.byId?.[id]
    if (info?.cwd) return info.cwd
    id = info?.parentId
  }
  return undefined
}

/** 调用已注入的 resolveImage 换取授权回环 URL. */
export async function requestImageUrl(resolveImage: ResolveImageFn | undefined, path: string, cwd: string | undefined): Promise<string | undefined> {
  if (resolveImage === undefined) return undefined
  try {
    const result = await resolveImage({ path, cwd })
    const value = unwrapRemote<{ url?: string }>(result)
    return value?.url
  } catch {
    return undefined
  }
}
