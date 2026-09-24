/** Client 端 Context 的最小结构类型 (宿主实际类型由 module loader 运行时提供). */
export type Context = {
  remote: any
  slots: {
    inject(slot: string, register: () => unknown): void
    register(declaration: Record<string, unknown>, component: unknown): unknown
  }
  effect(fn: () => () => void, label?: string): unknown
  /** 本插件字典的注册与读取 (官方 client-locale 提供的面). */
  locale: {
    register(ns: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): () => void
    bind(ns: string): (key: string) => string
  }
  /** profile 条目配置表单的读写面 (官方 client-ui-settings 提供的面). */
  configForms: {
    get(namespace: string): {
      getSnapshot(): { status: string; value?: Record<string, unknown>; writable?: boolean; revision?: number }
      subscribe(listener: () => void): () => void
    }
    whileServed(namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void): () => void
  }
  inject?(deps: string[], fn: (ctx: Context) => void): Promise<unknown> & { dispose?: () => void | Promise<void> }
  get?(name: string): unknown
  sessions?: {
    list?: {
      getSnapshot(): {
        current?: string
        byId?: Record<string, { cwd?: string; parentId?: string }>
      }
    }
  }
  logger?(target: string): { info(message: string): void; warn(message: string): void; error(message: string): void }
}
