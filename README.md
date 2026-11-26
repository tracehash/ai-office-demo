# 31V 的 AI 团队 · 3D 办公室（演示版）
纯静态站点：index.html + style.css + app.js + bots.json（Three.js 0.160 走 jsDelivr CDN）。
- 名单与演示任务在 bots.json，加载失败时使用 app.js 内置名单。
- 状态为模拟数据（演示模式自动轮换），没有后端、没有密钥。
- 本地运行：python3 -m http.server 8787，然后打开 http://localhost:8787/
- serve_shot.py：Playwright 截图校验脚本（输出到 shots/）。

## v2 装修风格（参考高端办公室实景）
胡桃木工位与护墙板、胡桃木格栅吊顶、宝蓝地毯跑道、浅色水磨石地面、清水混凝土柱与墙、黑金花（Nero Marquina）大理石、焦糖皮沙发、奶油布克雷单椅、2700K 暖光（圆形背光灯盘、竖向灯带、白玻璃吊灯组）。
新增区域：前台·茶水间（琥珀玻璃前台）、图书角、禅意庭院、专注舱。全部为程序化小纹理与纯色材质。
