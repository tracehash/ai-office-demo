# 31V 的 AI 团队 · 3D 办公室（演示版）
纯静态站点：index.html + style.css + app.js + bots.json（Three.js 0.160 走 jsDelivr CDN）。
- 名单与演示任务在 bots.json，加载失败时使用 app.js 内置名单。
- 状态为模拟数据（演示模式自动轮换），没有后端、没有密钥。
- 本地运行：python3 -m http.server 8787，然后打开 http://localhost:8787/
- serve_shot.py：Playwright 截图校验脚本（输出到 shots/）。

## v2 装修风格（参考高端办公室实景）
胡桃木工位与护墙板、胡桃木格栅吊顶、宝蓝地毯跑道、浅色水磨石地面、清水混凝土柱与墙、黑金花（Nero Marquina）大理石、焦糖皮沙发、奶油布克雷单椅、2700K 暖光（圆形背光灯盘、竖向灯带、白玻璃吊灯组）。
新增区域：前台·茶水间（琥珀玻璃前台）、图书角、禅意庭院、专注舱。全部为程序化小纹理与纯色材质。

## v3
- 开放工位区与总监室：满铺宝蓝地毯；去掉工位上方胡桃木格栅吊顶、全部柱子、禅意庭院（改为阅读角）。
- 总监室背墙：律所合伙人式落地胡桃木书墙（InstancedMesh 书本 + 地球仪、花瓶、相框、雕塑、黄铜台灯、层板暖光）。
- Bot 标签：屏幕空间防重叠布局（逐帧计算，近处优先，冲突时上移/侧移并画引导线），默认只显示简称+状态点，放大或选中时显示状态与角色。bots.json 新增 short 字段。

## v4 · 中央公园景观窗
- 开放工位区背后的两段外墙（后墙 x∈[-11,11]，左墙 z∈[-4.2,2.2]）改为落地玻璃幕墙：青铜色细竖梃、胡桃木窗台、半透明微反光玻璃。
- 窗外为纽约中央公园高空实景照片（同一张图在两面墙上取不同裁切），夜间整体压暗偏蓝，并在照片中楼宇位置自动撒上暖色窗灯（避开公园绿地与天空）。

### 图片来源与许可
- 文件：`assets/centralpark.jpg`（由原图裁去上部天空，缩放至 1600×471，JPEG 约 110 KB，轻微提高饱和度）
- 原图：“Central Park from the Top of the Rock 2”，作者 Tony Hisgett（Birmingham, UK），摄于 2010-06-01
- 来源：https://commons.wikimedia.org/wiki/File:Central_Park_from_the_Top_of_the_Rock_2_(4693129360).jpg （原始 Flickr：https://www.flickr.com/photos/hisgett/4693129360/）
- 许可：CC BY 2.0 — https://creativecommons.org/licenses/by/2.0/ （已修改：裁切、缩放、调色）。页面页脚亦有署名链接。
