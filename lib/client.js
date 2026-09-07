(() => {
  // src/shared.ts
  var PLUGIN_NAME = "dsh-inline-images";
  var ROUTE_PATH = "/plugins/dsh-inline-images/image";
  var IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "bmp", "ico"];
  function asFiniteNumber(value, label) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) throw new Error(label + " \u5FC5\u987B\u662F\u6709\u9650\u6570\u5B57");
    return n;
  }
  function parseConfig(value) {
    if (typeof value !== "object" || value === null) throw new Error("config \u5FC5\u987B\u662F\u5BF9\u8C61");
    const record = value;
    const formats = Array.isArray(record.formats) ? record.formats.filter((item) => typeof item === "string") : [...IMAGE_FORMATS];
    return {
      maxWidth: asFiniteNumber(record.maxWidth, "maxWidth"),
      maxHeight: asFiniteNumber(record.maxHeight, "maxHeight"),
      formats
    };
  }
  function parseSetConfigArgs(value) {
    if (value === void 0) return {};
    if (typeof value !== "object" || value === null) throw new Error("setConfig args \u5FC5\u987B\u662F\u5BF9\u8C61");
    const record = value;
    const out = {};
    if (record.maxWidth !== void 0) out.maxWidth = asFiniteNumber(record.maxWidth, "maxWidth");
    if (record.maxHeight !== void 0) out.maxHeight = asFiniteNumber(record.maxHeight, "maxHeight");
    return out;
  }
  function parseResolveImageArgs(value) {
    if (typeof value !== "object" || value === null) throw new Error("resolveImage args \u5FC5\u987B\u662F\u5BF9\u8C61");
    const record = value;
    if (typeof record.path !== "string" || record.path.trim() === "") throw new Error("path \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
    if (record.cwd !== void 0 && typeof record.cwd !== "string") throw new Error("cwd \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return { path: record.path, ...record.cwd === void 0 ? {} : { cwd: record.cwd } };
  }
  function strictCodec(typeSymbol, parse) {
    return { mode: "strict", typeSymbol, schema: { parse } };
  }
  var configCodec = strictCodec("dsh-inline-images#Config", parseConfig);
  var setConfigArgsCodec = strictCodec("dsh-inline-images#SetConfigArgs", parseSetConfigArgs);
  var resolveImageArgsCodec = strictCodec("dsh-inline-images#ResolveImageArgs", parseResolveImageArgs);
  var resolveImageResultCodec = strictCodec("dsh-inline-images#ResolveImageResult", (value) => {
    if (typeof value !== "object" || value === null) throw new Error("result \u5FC5\u987B\u662F\u5BF9\u8C61");
    const record = value;
    if (record.url !== void 0 && typeof record.url !== "string") throw new Error("url \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return { ...record.url === void 0 ? {} : { url: record.url } };
  });
  var INLINE_INVOCATIONS = [
    {
      id: "dsh-inline-images#inlineImages/getConfig",
      service: "inlineImages",
      namespace: "inlineImages",
      method: "getConfig",
      invocation: { kind: "direct" },
      parameters: [],
      result: configCodec
    },
    {
      id: "dsh-inline-images#inlineImages/setConfig",
      service: "inlineImages",
      namespace: "inlineImages",
      method: "setConfig",
      invocation: { kind: "direct" },
      parameters: [{
        name: "args",
        wire: "args",
        source: "json",
        codec: setConfigArgsCodec
      }],
      result: configCodec
    },
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
          } }, "\u5173\u95ED (Esc)")
        );
      }
      function unwrapRemoteResult(result, fallbackMessage) {
        if (result && typeof result === "object" && "ok" in result) {
          if (result.ok === true) return result.value;
          const err = result.error;
          throw new Error(typeof err?.message === "string" ? err.message : fallbackMessage);
        }
        return result;
      }
      function InlineSettings(props) {
        const remote = props.ctx.remote;
        const [maxWidth, setMaxWidth] = React.useState(640);
        const [maxHeight, setMaxHeight] = React.useState(420);
        const [status, setStatus] = React.useState(null);
        React.useEffect(() => {
          let alive = true;
          if (remote?.inlineImages?.getConfig === void 0) {
            applyImageSizes(640, 420);
            return () => {
              alive = false;
            };
          }
          remote.inlineImages.getConfig().then((result) => {
            if (!alive) return;
            const cfg = unwrapRemoteResult(result, "\u8BFB\u53D6\u914D\u7F6E\u5931\u8D25");
            setMaxWidth(cfg.maxWidth ?? 640);
            setMaxHeight(cfg.maxHeight ?? 420);
            applyImageSizes(cfg.maxWidth ?? 640, cfg.maxHeight ?? 420);
          }).catch(() => {
            if (alive) applyImageSizes(640, 420);
          });
          return () => {
            alive = false;
          };
        }, [remote]);
        const save = () => {
          if (remote?.inlineImages?.setConfig === void 0) {
            setStatus({ kind: "err", text: "Remote \u7AEF\u70B9\u672A\u6302\u8F7D, \u65E0\u6CD5\u4FDD\u5B58" });
            return;
          }
          setStatus(null);
          remote.inlineImages.setConfig({ maxWidth: Number(maxWidth) || 640, maxHeight: Number(maxHeight) || 420 }).then((result) => {
            const cfg = unwrapRemoteResult(result, "\u4FDD\u5B58\u5931\u8D25");
            setMaxWidth(cfg.maxWidth);
            setMaxHeight(cfg.maxHeight);
            applyImageSizes(cfg.maxWidth, cfg.maxHeight);
            setStatus({ kind: "ok", text: "\u6B63\u6587\u56FE\u7247\u6700\u5927\u5C3A\u5BF8\u5DF2\u66F4\u65B0\u4E3A " + cfg.maxWidth + "x" + cfg.maxHeight });
          }).catch((err) => {
            setStatus({ kind: "err", text: "\u4FDD\u5B58\u5931\u8D25: " + String(err?.message ?? err) });
          });
        };
        const inputStyle = { width: 70, padding: "4px 8px", marginRight: 4 };
        const btnStyle = { padding: "6px 14px", cursor: "pointer" };
        return el(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 } },
          el(
            "div",
            { style: { fontSize: 12, opacity: 0.7, lineHeight: 1.5 } },
            "LLM \u56DE\u590D\u4E2D\u5199\u51FA\u7684 ![\u8DEF\u5F84](\u8DEF\u5F84) \u5F62\u5F0F\u56FE\u7247\u5F15\u7528 (\u652F\u6301\u7EDD\u5BF9\u8DEF\u5F84\u6216\u76F8\u5BF9\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55\u7684\u76F8\u5BF9\u8DEF\u5F84) \u4F1A\u5728\u524D\u7AEF\u6E32\u67D3\u6210\u56FE\u7247, \u4F1A\u8BDD\u5185\u5BB9\u4FDD\u6301\u539F\u6837. \u53EF\u5728\u6B64\u8C03\u6574\u6B63\u6587\u56FE\u7247\u7684\u6700\u5927\u663E\u793A\u5C3A\u5BF8; \u70B9\u51FB\u6B63\u6587\u56FE\u7247\u53EF\u653E\u5927\u67E5\u770B\u539F\u56FE. \u652F\u6301\u683C\u5F0F: png/jpg/jpeg/webp/gif/svg/avif/bmp/ico."
          ),
          el(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
            el("span", { style: { fontSize: 13 } }, "\u6B63\u6587\u56FE\u7247\u6700\u5927\u5C3A\u5BF8:"),
            el("input", { type: "number", min: 64, max: 2400, value: maxWidth, title: "\u5BBD\u5EA6 px", onChange: (e) => setMaxWidth(e.target.value), style: inputStyle }),
            el("span", null, "x"),
            el("input", { type: "number", min: 64, max: 2400, value: maxHeight, title: "\u9AD8\u5EA6 px", onChange: (e) => setMaxHeight(e.target.value), style: inputStyle }),
            el("button", { style: btnStyle, onClick: save }, "\u5E94\u7528"),
            status ? el("span", { style: { fontSize: 12, color: status.kind === "ok" ? "#2e9e5b" : "#d64545" } }, status.text) : null
          )
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
      function applyMounted(scope, sessions, inlineImages) {
        scope.slots.inject("shell.overlay", () => scope.slots.register(
          { name: "shell.overlay", id: "inline-images-lightbox", order: 100, label: "\u56FE\u7247\u706F\u7BB1" },
          () => React.createElement(ImageLightbox, null)
        ));
        scope.slots.inject("settings.section", () => scope.slots.register(
          { name: "settings.section", id: "inline-images", order: 35, label: "\u5185\u8054\u56FE\u7247" },
          (props) => React.createElement(InlineSettings, { ...props, ctx: { ...scope, remote: { inlineImages } } })
        ));
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
        await ctx.remote.$mount(INLINE_REMOTE_CONTRIBUTION);
        const inlineImages = typeof ctx.get === "function" ? ctx.get("remote.inlineImages") : void 0;
        if (inlineImages === void 0 || typeof inlineImages.resolveImage !== "function") return;
        applyMounted(ctx, ctx.sessions, inlineImages);
      }
      return {
        name: PLUGIN_NAME,
        inject: ["slots", "remote", "sessions"],
        apply
      };
    }
  });
})();
//# sourceMappingURL=client.js.map
