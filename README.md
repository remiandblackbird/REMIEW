# Remiew by Cactus — Label Review (本地独立版)

这是从 Claude Artifact 原型迁移出来的**本地可运行版本**。视觉设计、页面结构、交互行为都和原型保持一致；目前用**本地模拟数据（mock data）**代替真实的 AI 分析，还没有接入 Anthropic API。

## 这是什么技术做的

纯 **HTML + CSS + 原生 JavaScript**，没有用 React / TypeScript / Tailwind，也不需要任何构建工具（webpack/vite 等）。

## 为什么原来的代码不能直接在本地打开

原型里有 5 处代码直接在浏览器里请求：
```
fetch("https://api.anthropic.com/v1/messages", ...)
```
这个请求**没有带 API key**——之所以在 Claude Artifact 页面里能用，是因为 Artifact 的运行环境会代你拦截并转发这个请求、自动注入你的账号授权。离开 Artifact 环境后，这个请求会因为跨域限制（CORS）和缺少认证直接失败。而且就算加上 key，也不应该写在前端 JS 里，任何打开网页的人都能在浏览器里看到并盗用。

## 现在做了什么

把 5 处 AI 调用全部替换成本地模拟逻辑（在 `public/js/mock-api.js` 里），保留了原来的交互效果（loading 动画、逐步显示结果等），但结果是本地规则生成的示例数据，不是真的 AI 分析。原来的 5 段系统提示词（prompt）完整保留在根目录的 `prompts.reference.js`，以后接入真实 API 时可以直接用。

## 项目结构

```
REMIEW/
├── server.js              本地静态文件服务器（零依赖，只用 Node 内置模块）
├── package.json            "npm start" 的入口
├── prompts.reference.js    原始 5 段 AI 提示词，仅作参考，不会被网页加载
├── README.md
└── public/
    ├── index.html           页面结构
    ├── styles.css            全部样式
    └── js/
        ├── mock-api.js       本地模拟 AI 返回结果（唯一需要改成真实 API 调用的地方）
        ├── chat.js            右侧 "Ask Remiew" 聊天面板
        ├── nav.js             左侧模块切换
        ├── label-review.js    模块一：标签审查
        ├── nip-calculator.js  模块二：NIP 计算器 + 成分声明生成
        └── claims-review.js   模块三：宣称审查
```

## 如何启动

前置要求：电脑装了 [Node.js](https://nodejs.org/)（装最新的 LTS 版本就行，不需要额外装任何包）。

1. 打开终端，进入项目目录
   ```
   cd REMIEW
   ```
2. 启动本地服务器
   ```
   npm start
   ```
   或者不用 npm，直接：
   ```
   node server.js
   ```
3. 看到终端里显示 `Remiew prototype running at http://localhost:3000` 后，在浏览器打开
   ```
   http://localhost:3000
   ```

不想装 Node 也可以用 Python 内置的服务器（多数电脑自带 Python）：
```
cd REMIEW/public
python3 -m http.server 3000
```
然后同样访问 `http://localhost:3000`。

## 如何测试

三个模块都可以独立点开测试，全部走的是本地模拟数据，不需要联网也能跑（Google 字体除外，需要联网才能加载指定字体，没有网络时会退回浏览器默认字体，不影响功能）：

- **Label Review**：拖一张图片进去（随便什么图都行，本地版不会真的识别图片内容），选好分类/市场，点 "Run review"，会看到和原来一样的处理动画，最后出一份示例审查报告，可以下载成 txt。
- **NIP Calculator**：手动加几行成分（填个名称、用量、营养值），或者拖一个文件到上方虚线框里试试"自动识别"效果（本地版会根据文件名猜一些参考数值，不是真的读取文件内容）；填好总重量和份量后点 "Calculate NIP" 看营养标签；再点 "Generate ingredient declaration" 看成分声明列表（本地版按关键词判断过敏原和添加剂类别名）。
- **Claims Review**：输入一句宣称文案（比如 "low fat"、"supports immunity"、"Product of Australia"、"organic"），点 "Check this claim"，本地版会按关键词规则给出示例判定结果。
- **右侧 Ask Remiew 聊天**：输入问题（比如 "what counts as a mandatory allergen"），会有预设的示例回复；其他问题会提示这是本地演示模式。

打开浏览器控制台（F12 → Console）能看到每次调用本地模拟函数时打印的 `[Remiew mock] ...` 提示，方便确认现在跑的是模拟数据而不是真的 AI。

## 以后接入真实 Anthropic API 时该怎么做

**不要**把 API key 直接写进 `public/js/` 里的任何文件——前端代码任何人都能在浏览器里看到源码，key 会被盗用。正确做法：

1. 单独写一个小后端（比如用 Node.js + Express，或任何你熟悉的语言），把 API key 存在后端的环境变量里
2. 后端提供几个接口，比如 `POST /api/review-label`、`POST /api/check-claim` 等，由后端去调用 `https://api.anthropic.com/v1/messages`（可以直接照抄 `prompts.reference.js` 里保存的原始 prompt）
3. 把 `public/js/mock-api.js` 里对应的函数改成 `fetch('/api/review-label', {...})` 这样调用你自己的后端接口，而不是直接调用 Anthropic
4. 前端其余代码（`chat.js`、`label-review.js` 等）完全不用改，因为它们已经只依赖 `RemiewMockAPI.xxx()` 返回的数据格式

这样做的好处是：API key 只存在于服务器环境变量里，永远不会出现在浏览器能看到的任何代码中。
