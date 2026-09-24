(() => {
  // src/shared.ts
  var PLUGIN_NAME = "dsh-inline-images";
  var ROUTE_PATH = "/plugins/dsh-inline-images/image";
  var DEFAULT_MAX_WIDTH = 640;
  var DEFAULT_MAX_HEIGHT = 420;
  var SIZE_MIN = 64;
  var SIZE_MAX = 2400;
  function parseResolveImageArgs(value) {
    if (typeof value !== "object" || value === null) throw new Error("resolveImage args \u5FC5\u987B\u662F\u5BF9\u8C61");
    const record = value;
    if (typeof record.path !== "string" || record.path.trim() === "") throw new Error("path \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
    if (record.cwd !== void 0 && typeof record.cwd !== "string") throw new Error("cwd \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return { path: record.path, ...record.cwd === void 0 ? {} : { cwd: record.cwd } };
  }
  function strictCodec(typeSymbol, parse) {
    const schema = { parse };
    return { mode: "strict", typeSymbol, create: () => schema };
  }
  var resolveImageArgsCodec = strictCodec("dsh-inline-images#ResolveImageArgs", parseResolveImageArgs);
  var resolveImageResultCodec = strictCodec("dsh-inline-images#ResolveImageResult", (value) => {
    if (typeof value !== "object" || value === null) throw new Error("result \u5FC5\u987B\u662F\u5BF9\u8C61");
    const record = value;
    if (record.url !== void 0 && typeof record.url !== "string") throw new Error("url \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return { ...record.url === void 0 ? {} : { url: record.url } };
  });
  var INLINE_INVOCATIONS = [
    {
      id: "dsh-inline-images#inlineImages/resolveImage",
      service: "inlineImages",
      namespace: "inlineImages",
      method: "resolveImage",
      invocation: { kind: "direct" },
      parameters: [{
        name: "args",
        wire: "args",
        source: "json",
        codec: resolveImageArgsCodec
      }],
      result: resolveImageResultCodec
    }
  ];
  var INLINE_REMOTE_CONTRIBUTION = {
    package: PLUGIN_NAME,
    descriptors: INLINE_INVOCATIONS
  };

  // src/client/locales.ts
  var NS = "dsh-inline-images";
  var en = {
    title: "Inline images",
    description: "Render ![path](path) references in replies as images.",
    intro: "Image references written as ![path](path) (absolute, or relative to the session working directory) render as images while the conversation text stays untouched. Click an image to zoom in. Formats: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico.",
    maxWidth: "Maximum width (px)",
    maxWidthHint: "How wide an inline image may render.",
    maxHeight: "Maximum height (px)",
    maxHeightHint: "How tall an inline image may render.",
    overridden: "Overridden",
    reset: "Reset to default",
    readOnly: "This deployment stores settings read-only.",
    unavailable: "This plugin is not loaded, so it cannot be configured right now.",
    save: "Save",
    saving: "Saving...",
    saveFailed: "The deployment did not accept these values; they were left for you to correct.",
    invalidNumber: "Enter a number between " + SIZE_MIN + " and " + SIZE_MAX + ", or leave blank to use the default.",
    closeLightbox: "Close (Esc)"
  };
  var zh = {
    title: "\u5185\u8054\u56FE\u7247",
    description: "\u628A\u56DE\u590D\u91CC\u7684 ![\u8DEF\u5F84](\u8DEF\u5F84) \u5F15\u7528\u6E32\u67D3\u6210\u56FE\u7247.",
    intro: "LLM \u56DE\u590D\u4E2D\u5199\u51FA\u7684 ![\u8DEF\u5F84](\u8DEF\u5F84) \u5F62\u5F0F\u56FE\u7247\u5F15\u7528 (\u652F\u6301\u7EDD\u5BF9\u8DEF\u5F84\u6216\u76F8\u5BF9\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55\u7684\u76F8\u5BF9\u8DEF\u5F84) \u4F1A\u5728\u524D\u7AEF\u6E32\u67D3\u6210\u56FE\u7247, \u4F1A\u8BDD\u5185\u5BB9\u4FDD\u6301\u539F\u6837. \u53EF\u5728\u6B64\u8C03\u6574\u6B63\u6587\u56FE\u7247\u7684\u6700\u5927\u663E\u793A\u5C3A\u5BF8; \u70B9\u51FB\u6B63\u6587\u56FE\u7247\u53EF\u653E\u5927\u67E5\u770B\u539F\u56FE. \u652F\u6301\u683C\u5F0F: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico.",
    maxWidth: "\u6700\u5927\u5BBD\u5EA6 (px)",
    maxWidthHint: "\u6B63\u6587\u5185\u8054\u56FE\u7247\u6700\u591A\u6E32\u67D3\u591A\u5BBD.",
    maxHeight: "\u6700\u5927\u9AD8\u5EA6 (px)",
    maxHeightHint: "\u6B63\u6587\u5185\u8054\u56FE\u7247\u6700\u591A\u6E32\u67D3\u591A\u9AD8.",
    overridden: "\u5DF2\u8986\u76D6",
    reset: "\u6062\u590D\u9ED8\u8BA4",
    readOnly: "\u672C\u90E8\u7F72\u7684\u8BBE\u7F6E\u4E3A\u53EA\u8BFB.",
    unavailable: "\u8BE5\u63D2\u4EF6\u5F53\u524D\u672A\u52A0\u8F7D, \u6682\u65F6\u65E0\u6CD5\u914D\u7F6E.",
    save: "\u4FDD\u5B58",
    saving: "\u4FDD\u5B58\u4E2D...",
    saveFailed: "\u672C\u90E8\u7F72\u6CA1\u6709\u63A5\u53D7\u8FD9\u4E9B\u503C, \u5DF2\u4FDD\u7559\u4F9B\u4F60\u4FEE\u6539.",
    invalidNumber: "\u8BF7\u586B " + SIZE_MIN + " \u5230 " + SIZE_MAX + " \u4E4B\u95F4\u7684\u6570\u5B57; \u7559\u7A7A\u8868\u793A\u4F7F\u7528\u9ED8\u8BA4\u503C.",
    closeLightbox: "\u5173\u95ED (Esc)"
  };
  function formLabels(t) {
    return {
      unavailable: t("unavailable"),
      readOnly: t("readOnly"),
      saveFailed: t("saveFailed"),
      save: t("save"),
      saving: t("saving")
    };
  }

  // src/client/settings-card.ts
  var WIDTH_FIELD = "maxWidth";
  var HEIGHT_FIELD = "maxHeight";
  var InlineImagesSettingsCard = class {
    form;
    store;
    /**
     * @param scope - 本插件 profile 条目的共享配置表单 (ctx.configForms.get).
     * @param SettingsFormModel - 官方表单模型构造器.
     * @param settingsNumberField - 官方整数字段描述.
     */
    constructor(scope, SettingsFormModel, settingsNumberField) {
      this.form = new SettingsFormModel(scope, [settingsNumberField(WIDTH_FIELD), settingsNumberField(HEIGHT_FIELD)]);
      this.store = this.form.bind(() => this.projection());
    }
    /**
     * 构造 slot 注册要注入的面.
     * @returns 快照 hook 与表单动作.
     */
    inject() {
      return { hooks: { inlineImagesCard: this.store }, ...this.form.actions() };
    }
    /** 释放对配置表单的订阅. */
    dispose() {
      this.form.dispose();
    }
    projection() {
      return {
        ...this.form.shell(),
        maxWidth: this.form.field(WIDTH_FIELD),
        maxHeight: this.form.field(HEIGHT_FIELD)
      };
    }
  };
  function createSettingsCard(ui) {
    const { React, SettingsForm, SettingsValueField } = ui;
    const el = (type, props, ...children) => React.createElement.apply(null, [type, props].concat(children));
    return function SettingsCard(props) {
      const { t } = props;
      const state = props.useInlineImagesCard((snapshot) => snapshot);
      if (props.view === "summary") return t("description");
      const disabled = !state.writable;
      const field = (id, label, hint, fieldState, fieldName) => el(SettingsValueField, {
        id,
        label,
        hint,
        numeric: true,
        disabled,
        overriddenLabel: t("overridden"),
        resetLabel: t("reset"),
        invalidLabel: t("invalidNumber"),
        ...fieldState,
        onEdit: (text) => {
          props.edit(fieldName, text);
        },
        onReset: () => {
          props.resetField(fieldName);
        }
      });
      return el(
        SettingsForm,
        { labels: formLabels(t), state, onSave: props.save, onDiscard: props.discard },
        el("p", { style: { margin: 0, opacity: 0.75, lineHeight: 1.6 } }, t("intro")),
        field("plugin-config-inline-images-width", t("maxWidth"), t("maxWidthHint"), state.maxWidth, WIDTH_FIELD),
        field("plugin-config-inline-images-height", t("maxHeight"), t("maxHeightHint"), state.maxHeight, HEIGHT_FIELD)
      );
    };
  }

  // src/client/remote.ts
  function unwrapRemote(result) {
    if (result && typeof result === "object" && "ok" in result) {
      const typed = result;
      return typed.ok === true ? typed.value : void 0;
    }
    return result;
  }
  function sessionCwdOf(sessions) {
    const snap = sessions?.list?.getSnapshot?.();
    if (snap === void 0) return void 0;
    let id = snap.current;
    for (let hop = 0; id !== void 0 && hop < 8; hop += 1) {
      const info = snap.byId?.[id];
      if (info?.cwd) return info.cwd;
      id = info?.parentId;
    }
    return void 0;
  }
  async function requestImageUrl(resolveImage, path, cwd) {
    if (resolveImage === void 0) return void 0;
    try {
      const result = await resolveImage({ path, cwd });
      const value = unwrapRemote(result);
      return value?.url;
    } catch {
      return void 0;
    }
  }

  // src/client/detect.ts
  function findDegradedImageSpans(root) {
    const spans = root.querySelectorAll("span");
    const found = [];
    for (const span of spans) {
      if (span.children.length !== 0) continue;
      const text = span.textContent?.trim() ?? "";
      if (!isCandidateText(text)) continue;
      found.push(span);
    }
    return found;
  }
  function isCandidateText(text) {
    if (text.length < 3 || text.length > 1024) return false;
    if (/(^|[^\\])\s/.test(text)) return false;
    if (/^https?:/i.test(text)) return false;
    if (/[*?[\]]/.test(text)) return false;
    if (text.includes(ROUTE_PATH)) return false;
    return /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(text);
  }
  var IMG_FLAG = "data-" + PLUGIN_NAME + "-img";
  function pathTextOf(span) {
    return (span.textContent ?? "").trim();
  }

  // src/client/span-replacer.ts
  var SpanReplacer = class {
    resolveImage;
    getCwd;
    replaceSpan;
    pending = /* @__PURE__ */ new Set();
    inflight = /* @__PURE__ */ new Set();
    constructor(resolveImage, getCwd, replaceSpan) {
      this.resolveImage = resolveImage;
      this.getCwd = getCwd;
      this.replaceSpan = replaceSpan;
    }
    /** 扫描 root 下的降级 span 并异步替换; 已处理/进行中的 span 自动跳过. */
    scan(root) {
      const spans = findDegradedImageSpans(root);
      for (const span of spans) {
        if (this.pending.has(span) || span.getAttribute(IMG_FLAG) !== null) continue;
        const path = pathTextOf(span);
        if (path === "" || this.inflight.has(path)) continue;
        this.pending.add(span);
        void this.resolveOne(span, path);
      }
    }
    async resolveOne(span, path) {
      this.inflight.add(path);
      try {
        const url = await requestImageUrl(this.resolveImage, path, this.getCwd());
        this.pending.delete(span);
        if (url === void 0 || !span.isConnected) return;
        this.replaceSpan(span, url, path);
      } finally {
        this.inflight.delete(path);
      }
    }
  };

  // src/client/index.ts
  window.__ModuleLoader__.load({
    id: PLUGIN_NAME,
    factory: (req) => {
      const React = req("react");
      const primitives = req("@deepseek-ai/dsh-client-ui-primitives");
      const SettingsCard = createSettingsCard({
        React,
        SettingsForm: primitives.SettingsForm,
        SettingsValueField: primitives.SettingsValueField
      });
      function el(type, props, ...children) {
        return React.createElement.apply(null, [type, props].concat(children));
      }
      const lightboxStore = {
        listeners: /* @__PURE__ */ new Set(),
        current: null,
        open(src, name) {
          this.current = { src, name };
          for (const fn of [...this.listeners]) {
            try {
              fn();
            } catch {
            }
          }
        },
        close() {
          this.current = null;
          for (const fn of [...this.listeners]) {
            try {
              fn();
            } catch {
            }
          }
        },
        subscribe(fn) {
          this.listeners.add(fn);
          return () => {
            this.listeners.delete(fn);
          };
        }
      };
      function useStore(s) {
        const [value, setValue] = React.useState(s.get());
        React.useEffect(() => s.subscribe(() => setValue(s.get())), []);
        return value;
      }
      let lightboxCloseLabel = "\u5173\u95ED (Esc)";
      function ImageLightbox() {
        const current = useStore({ subscribe: lightboxStore.subscribe.bind(lightboxStore), get: () => lightboxStore.current });
        if (current === null) return null;
        return el(
          "div",
          {
            style: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "zoom-out" },
            onClick: () => lightboxStore.close()
          },
          el("img", { src: current.src, alt: current.name, style: { maxWidth: "92vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 6 }, onClick: (e) => e.stopPropagation() }),
          el("div", { style: { color: "#fff", fontSize: 13, opacity: 0.9 } }, current.name),
          el("button", { style: { padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(128,128,128,0.5)", background: "transparent", color: "#fff", cursor: "pointer" }, onClick: (e) => {
            e.stopPropagation();
            lightboxStore.close();
          } }, lightboxCloseLabel)
        );
      }
      let styleTag = null;
      function applyImageSizes(maxWidth, maxHeight) {
        if (typeof document === "undefined") return;
        if (styleTag === null) {
          const tag = document.createElement("style");
          tag.dataset.pluginCss = PLUGIN_NAME;
          document.head.appendChild(tag);
          styleTag = tag;
        }
        styleTag.textContent = 'img[src*="' + ROUTE_PATH + '"] { max-width: ' + maxWidth + "px !important; max-height: " + maxHeight + "px !important; object-fit: contain; border-radius: 8px; }";
      }
      function makeSpanToImage(openLightbox) {
        return (span, url, path) => {
          if (typeof document === "undefined") return;
          const img = document.createElement("img");
          img.src = url;
          img.alt = path;
          img.loading = "lazy";
          img.decoding = "async";
          img.referrerPolicy = "no-referrer";
          img.dataset.inlineImage = PLUGIN_NAME;
          img.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openLightbox(url, path);
          });
          span.replaceWith(img);
        };
      }
      function setupSettings(scope) {
        scope.slots.inject("shell.overlay", () => scope.slots.register(
          { name: "shell.overlay", id: "inline-images-lightbox", order: 100, label: "\u56FE\u7247\u706F\u7BB1" },
          () => React.createElement(ImageLightbox, null)
        ));
        const t = scope.locale.bind(NS);
        lightboxCloseLabel = t("closeLightbox");
        scope.effect(() => scope.locale.register(NS, { zh, en }), "dsh-inline-images: dictionaries");
        const card = new InlineImagesSettingsCard(
          scope.configForms.get(PLUGIN_NAME),
          primitives.SettingsFormModel,
          primitives.settingsNumberField
        );
        scope.effect(() => () => {
          card.dispose();
        }, "dsh-inline-images: settings form");
        scope.effect(() => scope.configForms.whileServed([PLUGIN_NAME], () => scope.slots.inject(
          "plugins.bundle.config",
          () => scope.slots.register({
            name: "plugins.bundle.config",
            key: PLUGIN_NAME,
            locale: NS,
            inject: () => card.inject()
          }, SettingsCard)
        )), "dsh-inline-images: plugins page card");
        const applyFromForm = () => {
          const value = scope.configForms.get(PLUGIN_NAME).getSnapshot().value ?? {};
          applyImageSizes(
            typeof value.maxWidth === "number" ? value.maxWidth : DEFAULT_MAX_WIDTH,
            typeof value.maxHeight === "number" ? value.maxHeight : DEFAULT_MAX_HEIGHT
          );
        };
        applyFromForm();
        scope.effect(() => scope.configForms.get(PLUGIN_NAME).subscribe(applyFromForm), "dsh-inline-images: image sizes");
      }
      function applyMounted(scope, sessions, inlineImages) {
        if (typeof document === "undefined") return;
        const replacer = new SpanReplacer(
          (args) => inlineImages.resolveImage(args),
          () => sessionCwdOf(sessions),
          makeSpanToImage((src, name) => lightboxStore.open(src, name))
        );
        const scanAll = (root) => {
          replacer.scan(root);
        };
        scanAll(document.body);
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) scanAll(node);
              else if (node.nodeType === Node.TEXT_NODE && node.parentElement !== null) scanAll(node.parentElement);
            }
            if (mutation.type === "characterData" && mutation.target.parentElement !== null) scanAll(mutation.target.parentElement);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        const onKey = (event) => {
          if (event.key === "Escape") lightboxStore.close();
        };
        document.addEventListener("keydown", onKey, true);
        scope.effect(() => () => {
          observer.disconnect();
          document.removeEventListener("keydown", onKey, true);
          if (styleTag !== null && styleTag.parentNode !== null) styleTag.parentNode.removeChild(styleTag);
        });
      }
      async function apply(ctx) {
        setupSettings(ctx);
        await ctx.remote.$mount(INLINE_REMOTE_CONTRIBUTION);
        const inlineImages = typeof ctx.get === "function" ? ctx.get("remote.inlineImages") : void 0;
        if (inlineImages === void 0 || typeof inlineImages.resolveImage !== "function") return;
        applyMounted(ctx, ctx.sessions, inlineImages);
      }
      return {
        name: PLUGIN_NAME,
        inject: ["slots", "remote", "sessions", "locale", "configForms"],
        apply
      };
    }
  });
})();
//# sourceMappingURL=client.js.map
