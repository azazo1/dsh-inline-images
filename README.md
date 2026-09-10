# dsh-inline-images 对话内联图片

让 DeepSeek Harness 的对话**直接显示本地图片**: LLM 回复中输出 `![路径](路径)` 形式的图片引用 (截图, 生成图等), 会在**消息正文里**渲染成图片 -- 不再只是一串看不到的路径文本.

兼容 DSH `0.1.2-rc.1` (Web Client 使用 `window.__ModuleLoader__.load` 注册).

![示例](assets/screenshots/demo.png)

## 功能

- **零上下文污染**: 插件不改写模型的任何输出, 会话日志里保存的就是模型原始文本 (无 token, 无端口 URL); 渲染替换全部发生在浏览器前端.
- **消息正文内联渲染**: 模型按系统提示词指引输出 `![路径](路径)`; 产品 MarkdownText 会把非 http(s) 目标降级为纯文本 span, 前端扫描该 span, 经 Host 授权 (`resolveImage`) 后替换为同源回环 `<img>`.
- **多工作目录**: 相对路径按发起会话的工作目录解析, 不同 workspace 的会话互不串扰.
- **支持 9 种格式**: png / jpg / jpeg / webp / gif / svg / avif / bmp / ico.
- **点击放大灯箱**: 点击正文图片 -> 全屏大图; 点背景或按 Esc 关闭.
- **可调尺寸**: 设置 -> 内联图片, 调整正文图片最大宽/高 (64-2400 px, 默认 640x420), 写入 Host settings 命名空间 `dsh-inline-images`, 重启后仍有效.
- **历史图存活**: 访问 token 首次生成后持久化到凭证存储 (`INLINE_IMAGE_TOKEN`), dsh 重启后历史消息中的内联图片仍可正常显示 (日志中只有路径, URL 按需重新解析).
- **安静降级**: 不存在的路径, 示例/占位路径 (路径, xx, ... 等) 保持纯文本, 不影响对话.

## 构建与安装

```sh
just install
just build
dsh plugin --profile web add ./dsh-inline-images
```

修改 Client bundle 或 `dsh.client` 声明后需要重启 `dsh web`, 然后硬刷新浏览器.

安装后可确认:

- 设置 -> 插件列表中本插件为 Enabled.
- 浏览器控制台没有 `loaded without registering "dsh-inline-images"`.
- 设置 -> 内联图片 页面可打开, 点击正文图片可放大.

## 工作原理

1. **Host**: 注册系统提示词 section, 指引模型附图时输出 `![绝对路径或相对路径](同一个路径)`; 挂载图片回环路由 (Connection 门禁 + token 校验).
2. **模型**: 在回复正文中写 `![/abs/a.png](/abs/a.png)` 这样的 Markdown 图片; 因为目标不是 http(s), 产品 MarkdownText 将其降级为纯文本 span.
3. **前端**: Client bundle 用 MutationObserver 扫描该降级 span (纯文本 + 图片后缀启发式), 调用 Host `resolveImage` -- 相对路径按会话 cwd 解析, `fs.stat` 确认文件存在后签发带 token 的回环 URL -- 把 span 替换为 `<img>`.
4. **安全**: 会话日志无授权信息; URL 仅在前端内存中; token 持久化于凭证存储, 路由仍受 Connection Host/Origin 与 Cookie 门禁保护.

## 许可证

MIT
