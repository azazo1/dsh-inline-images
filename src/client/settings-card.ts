/**
 * 插件页里 dsh-inline-images 卡片的配置页.
 *
 * 表单是 profile 条目 volatile Config 的投影: 草稿只留在本页, 保存才写回 profile 的 patch 层.
 * 页面只在 Host 真的组合了本条目的期间注册 (configForms.whileServed).
 */
import { formLabels, type InlineImagesLocaleKey } from './locales.ts'

/** 配置字段名, 与 Host Config 的 volatile 键一致. */
export const WIDTH_FIELD = 'maxWidth'
/** 配置字段名, 与 Host Config 的 volatile 键一致. */
export const HEIGHT_FIELD = 'maxHeight'

/** 数字字段的展示态, 与共享 SettingsValueField 的受控面一致. */
export interface SettingsFieldState {
  /** 控件渲染的草稿文本. */
  readonly text: string
  /** 保存后该字段是否留下 user 层条目. */
  readonly overridden: boolean
  /** 草稿是否不是该字段接受的取值, 为真时阻止保存. */
  readonly invalid: boolean
}

/** 组件读到的表单快照. */
export interface SettingsCardState {
  /** 条目是否已被服务; 为假时卡片不渲染. */
  readonly available: boolean
  /** Host 文档是否接受写入. */
  readonly writable: boolean
  /** 是否有尚未保存的编辑. */
  readonly dirty: boolean
  /** 是否有非法草稿. */
  readonly invalid: boolean
  /** 保存是否在途. */
  readonly saving: boolean
  /** 上次保存是否没有按草稿落地. */
  readonly failed: boolean
  /** 最大宽度字段. */
  readonly maxWidth: SettingsFieldState
  /** 最大高度字段. */
  readonly maxHeight: SettingsFieldState
}

/** 控制器通过 slot 注册注入给组件的面. */
export interface SettingsCardFace {
  /** 组件用它读快照的 hook. */
  readonly hooks: { readonly inlineImagesCard: unknown }
  /** 暂存某字段的草稿. */
  edit(field: string, text: string): void
  /** 暂存清空某字段, 保存后回落到组合层. */
  resetField(field: string): void
  /** 落盘全部草稿. */
  save(): void
  /** 丢弃全部草稿. */
  discard(): void
}

/**
 * 官方 SettingsFormModel 的构造器形状.
 * 本仓库不解析宿主包类型, 真实实现由 client factory 从 module loader 注入.
 */
export type SettingsFormModelLike = new (scope: unknown, specs: readonly unknown[]) => {
  bind(projection: () => unknown): unknown
  shell(): unknown
  field(name: string): SettingsFieldState
  actions(): Omit<SettingsCardFace, 'hooks'>
  dispose(): void
}

/** 官方 settingsNumberField 的形状. */
export type SettingsNumberFieldLike = (field: string) => unknown

/** 正文图片尺寸的暂存表单. */
export class InlineImagesSettingsCard {
  private readonly form: ReturnType<SettingsFormModelLike>
  private readonly store: unknown

  /**
   * @param scope - 本插件 profile 条目的共享配置表单 (ctx.configForms.get).
   * @param SettingsFormModel - 官方表单模型构造器.
   * @param settingsNumberField - 官方整数字段描述.
   */
  constructor(scope: unknown, SettingsFormModel: SettingsFormModelLike, settingsNumberField: SettingsNumberFieldLike) {
    this.form = new SettingsFormModel(scope, [settingsNumberField(WIDTH_FIELD), settingsNumberField(HEIGHT_FIELD)])
    this.store = this.form.bind(() => this.projection())
  }

  /**
   * 构造 slot 注册要注入的面.
   * @returns 快照 hook 与表单动作.
   */
  inject(): SettingsCardFace {
    return { hooks: { inlineImagesCard: this.store }, ...this.form.actions() }
  }

  /** 释放对配置表单的订阅. */
  dispose(): void {
    this.form.dispose()
  }

  private projection(): SettingsCardState {
    return {
      ...(this.form.shell() as Omit<SettingsCardState, 'maxWidth' | 'maxHeight'>),
      maxWidth: this.form.field(WIDTH_FIELD),
      maxHeight: this.form.field(HEIGHT_FIELD),
    }
  }
}

/** 组件用到的 React 与共享控件, 由 client factory 注入. */
export interface SettingsCardUi {
  /** module loader 提供的 react. */
  React: { createElement: (...args: unknown[]) => unknown }
  /** 官方整页表单框架. */
  SettingsForm: (...args: unknown[]) => unknown
  /** 官方单字段控件. */
  SettingsValueField: (...args: unknown[]) => unknown
}

/** 组件 props 里本插件读取的字段. */
export interface SettingsCardProps extends SettingsCardFace {
  /** 页面问的视图: summary 给一行简介, page 给完整表单. */
  readonly view: 'summary' | 'page'
  /** 本插件字典的读取函数. */
  readonly t: (key: InlineImagesLocaleKey) => string
  /** 按 selector 读表单快照的 hook. */
  readonly useInlineImagesCard: <S>(selector: (state: SettingsCardState) => S) => S
}

/**
 * 造出插件页卡片组件.
 * @param ui - React 与共享控件.
 * @returns 卡片组件.
 */
export function createSettingsCard(ui: SettingsCardUi): (props: SettingsCardProps) => unknown {
  const { React, SettingsForm, SettingsValueField } = ui
  /** createElement 短写: client bundle 不编译 JSX. */
  const el = (type: unknown, props: unknown, ...children: unknown[]): unknown =>
    React.createElement.apply(null, [type, props].concat(children) as unknown[])

  return function SettingsCard(props: SettingsCardProps): unknown {
    const { t } = props
    const state = props.useInlineImagesCard(snapshot => snapshot)
    if (props.view === 'summary') return t('description')
    const disabled = !state.writable

    const field = (
      id: string,
      label: string,
      hint: string,
      fieldState: SettingsFieldState,
      fieldName: string,
    ): unknown => el(SettingsValueField, {
      id,
      label,
      hint,
      numeric: true,
      disabled,
      overriddenLabel: t('overridden'),
      resetLabel: t('reset'),
      invalidLabel: t('invalidNumber'),
      ...fieldState,
      onEdit: (text: string) => { props.edit(fieldName, text) },
      onReset: () => { props.resetField(fieldName) },
    })

    return el(
      SettingsForm,
      { labels: formLabels(t), state, onSave: props.save, onDiscard: props.discard },
      el('p', { style: { margin: 0, opacity: 0.75, lineHeight: 1.6 } }, t('intro')),
      field('plugin-config-inline-images-width', t('maxWidth'), t('maxWidthHint'), state.maxWidth, WIDTH_FIELD),
      field('plugin-config-inline-images-height', t('maxHeight'), t('maxHeightHint'), state.maxHeight, HEIGHT_FIELD),
    )
  }
}
