# Remiew by Cactus — Label Review (本地独立版)

这是从 Claude Artifact 原型迁移出来的**本地可运行版本**，现在已经接入了**真实的 Anthropic API**，通过一个小后端来调用，API key 只存在服务器端，不会出现在浏览器能看到的任何代码里。视觉设计、页面结构、交互行为都和原型保持一致。

## 这是什么技术做的

前端：纯 **HTML + CSS + 原生 JavaScript**，没有用 React / TypeScript / Tailwind。
后端：**Node.js + Express**，负责保管 API key、调用 Anthropic API、把结果转发给前端。

## 项目结构

```
REMIEW/
├── server.js                本地服务器入口：起 Express，挂载 /api 路由，托管 public/ 静态文件
├── server/
│   ├── prompts.js             5 个功能各自的 system prompt（原样保留自最初的 Artifact 原型）
│   ├── anthropicClient.js     封装 Anthropic SDK 调用（读取 .env 里的 key、模型名、effort）
│   ├── routes.js               5 个 POST 接口，收到请求后决定调真实 API 还是本地 mock
│   └── mock.js                  没配置 API key 时的本地模拟逻辑（保留原来的效果，方便离线试用）
├── package.json
├── .env.example              环境变量模板，复制成 .env 并填入你的 key
├── .gitignore                 .env 和 node_modules 不会被提交
└── public/
    ├── index.html              页面结构
    ├── styles.css               全部样式
    └── js/
        ├── api.js                前端调用后端 /api/... 接口的封装（不直接联系 Anthropic）
        ├── chat.js                右侧 "Ask Remiew" 聊天面板
        ├── nav.js                 左侧模块切换
        ├── label-review.js        模块一：标签审查
        ├── nip-calculator.js      模块二：NIP 计算器 + 成分声明生成
        └── claims-review.js       模块三：宣称审查
```

## 如何启动

前置要求：电脑装了 [Node.js](https://nodejs.org/)（装最新的 LTS 版本即可）。

1. 打开终端，进入项目目录并安装依赖（只需做一次）
   ```
   cd REMIEW
   npm install
   ```
2. 配置你的 API key
   ```
   cp .env.example .env
   ```
   打开 `.env`，把 `ANTHROPIC_API_KEY=` 后面填上你的 key（在 https://console.anthropic.com/settings/keys 获取），保存。
   **如果暂时不想填 key 也没关系** —— 不填的话后端会自动退回本地模拟数据，其它功能照常能跑，只是分析结果不是真的 AI 生成的。
3. 启动服务器
   ```
   npm start
   ```
4. 终端会打印当前是哪种模式：
   ```
   AI mode: LIVE (model: claude-opus-5)      ← 已配置 key，真实调用 Anthropic
   AI mode: MOCK (no ANTHROPIC_API_KEY set)   ← 没配置 key，走本地模拟
   ```
5. 浏览器打开 `http://localhost:3000`

## 如何测试

三个模块和右侧聊天都可以直接点开测试：

- **Label Review**：拖一张图片进去，选好分类/市场，点 "Run review"。真实模式下会真的把图片发给 Claude 分析并返回审查报告；没配 key 时返回一份示例报告。
- **NIP Calculator**：手动加成分行，或拖一个规格表/NIP 图片、PDF 到虚线框里让 AI 自动识别营养数值；填好总重量和份量后点 "Calculate NIP"；再点 "Generate ingredient declaration" 生成成分声明（真实模式下由 AI 判断过敏原和添加剂类别名/编号）。
- **Claims Review**：输入宣称文案（如 "low fat"、"supports immunity"、"Product of Australia"），点 "Check this claim" 看判定结果。
- **右侧 Ask Remiew 聊天**：可以直接问关于澳洲食品标签法规的问题。

打开浏览器控制台（F12 → Console）通常不会看到报错；如果某个功能报错（比如"Couldn't complete the review"），先看终端里 `npm start` 的日志，后端会打印具体的错误信息（比如 API key 无效、额度用完等）。

## 关于费用和模型

后端默认使用 `claude-opus-5` 模型，每次点击"Run review"、"Calculate NIP" 后的声明生成、"Check this claim"、或发一条聊天消息，都会产生一次真实的 API 调用和费用（具体单价见 https://claude.com/pricing ）。如果想用更便宜更快的模型做日常测试，编辑 `.env`，取消这一行的注释并改成你想要的模型：
```
CLAUDE_MODEL=claude-sonnet-5
```
（也可以用 `claude-haiku-4-5`，最便宜最快，但分析质量会打折扣。）

## API key 安全性

`.env` 文件已经在 `.gitignore` 里，正常操作不会被提交到 git / 推送到 GitHub。**永远不要**把 `.env` 文件或里面的 key 粘贴到聊天记录、issue、PR 描述里。前端代码（`public/js/`）完全不接触 key —— 它只会调用同源的 `/api/...` 接口，key 的调用全部发生在 `server/` 目录下的服务器代码里。

## 目前还是"预览级"的地方（供你决定要不要继续打磨）

- 没有用户账号/登录系统 —— 任何能访问这台电脑（或这个局域网地址）的人都能使用
- 没有部署到公网 —— 只能在本机 `localhost` 访问，别人给不了链接
- 没有数据库 —— 每次刷新页面，NIP 计算结果、成分声明等都会丢失，不会保存历史记录
- 没有自动化测试

这些都不影响你现在自己试用和验证效果，但如果目标是给别人用的正式产品，这些是接下来会遇到的下一批问题，可以按需要再逐步做。
