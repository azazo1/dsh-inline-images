/** Client 端 Context 的最小结构类型 (宿主实际类型由 module loader 运行时提供). */
export type Context = {
  remote: any
  slots: {
    inject(slot: string, register: () => unknown): void
    register(declaration: Record<string, unknown>, component: unknown): unknown
  }
  effect(fn: () => () => void, label?: string): unknown
  logger?(target: string): { info(message: string): void; warn(message: string): void; error(message: string): void }
}
