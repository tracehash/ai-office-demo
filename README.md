# 31V 的 AI 团队 · 3D 办公室（演示版）
纯静态站点：index.html + style.css + app.js + bots.json（Three.js 0.160 走 jsDelivr CDN）。
- 名单与演示任务在 bots.json，加载失败时使用 app.js 内置名单。
- 状态为模拟数据（演示模式自动轮换），没有后端、没有密钥。
- 本地运行：python3 -m http.server 8787，然后打开 http://localhost:8787/
- serve_shot.py：Playwright 截图校验脚本（输出到 shots/）。
