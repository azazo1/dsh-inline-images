/** dsh-inline-images 插件页配置卡片与灯箱的文案. */
import { SIZE_MAX, SIZE_MIN } from '../shared.ts'

/** 本插件字典的命名空间, 与包名一致. */
export const NS = 'dsh-inline-images'

/** 本插件用到的文案键. */
export type InlineImagesLocaleKey =
  | 'title' | 'description' | 'intro'
  | 'maxWidth' | 'maxWidthHint' | 'maxHeight' | 'maxHeightHint'
  | 'overridden' | 'reset' | 'readOnly' | 'unavailable'
  | 'save' | 'saving' | 'saveFailed' | 'invalidNumber'
  | 'closeLightbox'

/** English copy. */
export const en: Record<InlineImagesLocaleKey, string> = {
  title: 'Inline images',
  description: 'Render ![path](path) references in replies as images.',
  intro: 'Image references written as ![path](path) (absolute, or relative to the session working directory) render as images while the conversation text stays untouched. Click an image to zoom in. Formats: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico.',
  maxWidth: 'Maximum width (px)',
  maxWidthHint: 'How wide an inline image may render.',
  maxHeight: 'Maximum height (px)',
  maxHeightHint: 'How tall an inline image may render.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
  save: 'Save',
  saving: 'Saving...',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a number between ' + SIZE_MIN + ' and ' + SIZE_MAX + ', or leave blank to use the default.',
  closeLightbox: 'Close (Esc)',
}

/** Simplified Chinese copy. */
export const zh: Record<InlineImagesLocaleKey, string> = {
  title: '内联图片',
  description: '把回复里的 ![路径](路径) 引用渲染成图片.',
  intro: 'LLM 回复中写出的 ![路径](路径) 形式图片引用 (支持绝对路径或相对会话工作目录的相对路径) 会在前端渲染成图片, 会话内容保持原样. 可在此调整正文图片的最大显示尺寸; 点击正文图片可放大查看原图. 支持格式: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico.',
  maxWidth: '最大宽度 (px)',
  maxWidthHint: '正文内联图片最多渲染多宽.',
  maxHeight: '最大高度 (px)',
  maxHeightHint: '正文内联图片最多渲染多高.',
  overridden: '已覆盖',
  reset: '恢复默认',
  readOnly: '本部署的设置为只读.',
  unavailable: '该插件当前未加载, 暂时无法配置.',
  save: '保存',
  saving: '保存中...',
  saveFailed: '本部署没有接受这些值, 已保留供你修改.',
  invalidNumber: '请填 ' + SIZE_MIN + ' 到 ' + SIZE_MAX + ' 之间的数字; 留空表示使用默认值.',
  closeLightbox: '关闭 (Esc)',
}

/**
 * 表单框架要的文案, 从本插件字典取.
 * @param t - 本插件字典的读取函数.
 * @returns 共享设置表单渲染的标签.
 */
export function formLabels(t: (key: InlineImagesLocaleKey) => string): {
  unavailable: string
  readOnly: string
  saveFailed: string
  save: string
  saving: string
} {
  return {
    unavailable: t('unavailable'),
    readOnly: t('readOnly'),
    saveFailed: t('saveFailed'),
    save: t('save'),
    saving: t('saving'),
  }
}
