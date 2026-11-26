import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ---------- 数据（优先读取 bots.json，失败时使用内置名单） ----------
const FALLBACK = {
  title: '31V 的 AI 团队',
  statuses: {
    working:{label:'工作中',color:'#2f9e5b'}, thinking:{label:'思考中',color:'#7b5cd6'},
    browsing:{label:'浏览网页',color:'#2b7bd8'}, help:{label:'需要帮助',color:'#e0662f'},
    idle:{label:'空闲',color:'#8a94a0'}, done:{label:'已完成',color:'#e3a316'} },
  bots: [
    ['grok','Grok Bot','总监·调度','#1f2937',['分派今日任务','协调团队进度','汇总各组产出']],
    ['aiorg','AI落地顾问','AI与组织','#0ea5a4',['梳理AI落地路径','设计试点流程']],
    ['marshall','Marshall·幕僚长','工作推进','#2563eb',['跟进本周待办','整理会议纪要']],
    ['oakley','Oakley·首席助理','事务执行','#7c3aed',['安排日程提醒','整理文件目录']],
    ['herald','Herald·首席资讯官','资讯早报','#dc2626',['整理今日早报','筛选行业资讯']],
    ['social','社会活动','公关幕僚','#db2777',['准备活动发言稿','整理活动日程']],
    ['emba','EMBA教授','课程学习','#92400e',['讲解案例框架','梳理课程笔记']],
    ['feynman','费曼学习法','学习教练','#16a34a',['用大白话讲概念','出三道自测题']],
    ['damo','反思达摩','复盘反思','#ea580c',['复盘本周学习','提炼经验教训']],
    ['bugcheck','漏洞检查器','逻辑审查','#475569',['检查方案逻辑','列出反方观点']],
    ['health','健康专家','健康管理','#10b981',['制定运动计划','整理饮食建议']],
    ['urban','城市更新和交通规划师','城市交通','#0284c7',['研究公交线网','整理规划案例']],
    ['bus','道路客运行业','行业研究','#ca8a04',['整理行业动态','对比运营模式']],
    ['design','平面设计师','设计','#e11d48',['设计海报初稿','调整配色方案']],
    ['film','电影&写作','创作','#9333ea',['构思短文提纲','润色文章段落']],
    ['humanity','人文学科教授','人文','#a16207',['讲解历史脉络','整理读书笔记']],
    ['fashion','时尚穿搭','形象','#f472b6',['搭配本周造型','推荐配饰']],
    ['advisor','学习Advicor','学习规划','#4f46e5',['制定学习计划','安排复习节奏']],
  ].map(([id,name,role,color,tasks],i)=>({id,name,short:name.split('·')[0],role,color,tasks,director:i===0}))
};
async function loadData(){
  try{ const r = await fetch('bots.json',{cache:'no-store'}); if(!r.ok) throw 0; const j = await r.json(); if(!j.bots?.length) throw 0; return j; }
  catch(e){ return FALLBACK; }
}

const isMobile = matchMedia('(max-width:760px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = a=>a[Math.floor(Math.random()*a.length)];

// ---------- 场景 ----------
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style,{position:'absolute',top:'0',left:'0',pointerEvents:'none'});
container.appendChild(labelRenderer.domElement);
// Bot 标签层：屏幕空间防重叠布局 + 引导线
const leaderCv=document.createElement('canvas'); leaderCv.id='leaders'; container.appendChild(leaderCv);
const leaderCtx=leaderCv.getContext('2d');
const labelLayer=document.createElement('div'); labelLayer.id='labels'; container.appendChild(labelLayer);

const scene = new THREE.Scene();
const DAY_BG = new THREE.Color('#e9e1d3'), NIGHT_BG = new THREE.Color('#15100c');
scene.background = DAY_BG.clone();

const camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,500);
const CAM_WIDE = new THREE.Vector3(15, 34, 40), CAM_TALL = new THREE.Vector3(28, 50, 2.5);
let camMode = null;
camera.position.copy(CAM_WIDE);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
camera.lookAt(controls.target);
controls.enableDamping = true;
controls.minZoom = 0.7; controls.maxZoom = 4;
controls.maxPolarAngle = Math.PI*0.42; controls.minPolarAngle = Math.PI*0.12;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
function resize(){
  const w = innerWidth, h = innerHeight, narrow = w <= 760, tall = h > w*1.15;
  const mode = tall ? 'tall' : 'wide';
  if(mode !== camMode){ camMode = mode; camera.position.copy(controls.target).add(tall ? CAM_TALL : CAM_WIDE); camera.zoom = 1; camera.lookAt(controls.target); }
  // 计算场景在相机坐标下的范围，并放进“可用区域”（扣除顶栏、页脚、右侧面板）
  camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; const v=new THREE.Vector3();
  for(const X of [-20.6,20.6]) for(const Y of [0,3.6]) for(const Z of [-13.6,13.6]){ v.set(X,Y,Z).applyMatrix4(inv); x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y); }
  const padL = 12, padR = narrow ? 12 : 280, padT = narrow ? 100 : 64, padB = narrow ? 44 : 40;
  const aw = w-padL-padR, ah = h-padT-padB;
  let upp = Math.max((x1-x0)/aw, (y1-y0)/ah);      // 每像素对应的世界单位
  const cx = (x0+x1)/2, cy = (y0+y1)/2;
  const sx = padL + aw/2, sy = padT + ah/2;          // 可用区域中心（像素）
  camera.left = cx - sx*upp; camera.right = cx + (w-sx)*upp;
  camera.top = cy + sy*upp; camera.bottom = cy - (h-sy)*upp;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h); labelRenderer.setSize(w,h);
  const dpr=Math.min(devicePixelRatio,2); leaderCv.width=w*dpr; leaderCv.height=h*dpr; leaderCv.style.width=w+'px'; leaderCv.style.height=h+'px'; leaderCtx.setTransform(dpr,0,0,dpr,0,0);
}
resize(); addEventListener('resize', resize);

const hemi = new THREE.HemisphereLight('#fff3e2','#8f8070',1.45); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe6c4', 2.1);
sun.position.set(18,30,12); sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:22,bottom:-22,near:1,far:80});
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------- 材质工具 ----------
const matCache = {};
const M = (color, opts={}) => { const k = color+JSON.stringify(opts); return matCache[k] ||= new THREE.MeshStandardMaterial({color, roughness:0.85, metalness:0.0, ...opts}); };
function box(w,h,d,color,x,y,z,parent=scene,opts){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(color,opts)); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function cyl(rt,rb,h,color,x,y,z,parent=scene,seg=12){ const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), M(color)); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow=true; parent.add(m); return m; }
const roomEls={};
const roomList=[];
function roomLabel(text,x,y,z){ const d=document.createElement('div'); roomEls[text]=d; roomList.push({el:d,pos:new THREE.Vector3(x,y,z),w:0,h:0}); d.className='room'; d.textContent=text; const o=new CSS2DObject(d); o.position.set(x,y,z); scene.add(o); }

// ---------- 材质与程序化纹理（全部用小画布生成，手机友好） ----------
function canvasTex(size, draw, rx=1, ry=1){
  const c=document.createElement('canvas'); c.width=c.height=size; draw(c.getContext('2d'),size);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry); t.anisotropy=4; return t;
}
function speckle(ctx,s,bg,dots){ ctx.fillStyle=bg; ctx.fillRect(0,0,s,s); for(const [col,n,r0,r1] of dots){ ctx.fillStyle=col; for(let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(Math.random()*s,Math.random()*s,rand(r0,r1),0,Math.PI*2); ctx.fill(); } } }
function veins(ctx,s,bg,vein,n,alpha){ ctx.fillStyle=bg; ctx.fillRect(0,0,s,s); ctx.strokeStyle=vein; ctx.lineCap='round';
  for(let i=0;i<n;i++){ ctx.globalAlpha=rand(alpha*0.4,alpha); ctx.lineWidth=rand(0.6,2.4); ctx.beginPath(); let x=rand(-20,s), y=rand(-20,s); ctx.moveTo(x,y);
    for(let k=0;k<5;k++){ x+=rand(10,70); y+=rand(-30,60); ctx.quadraticCurveTo(x-rand(0,30),y-rand(-20,20),x,y); } ctx.stroke(); } ctx.globalAlpha=1; }
const TX = {
  terrazzo: canvasTex(256,(c,s)=>speckle(c,s,'#e4ded4',[['#c9c1b4',260,0.8,2.2],['#f7f4ee',160,0.8,2.4],['#9b958c',90,0.6,1.6],['#b86b4b',26,0.8,1.8],['#5a74b8',18,0.8,1.6]]),9,6),
  concrete: canvasTex(128,(c,s)=>speckle(c,s,'#9e9a94',[['#8f8b85',220,0.5,1.6],['#aeaaa4',200,0.5,1.8],['#85817b',30,1,2.5]]),6,1),
  nero: canvasTex(256,(c,s)=>veins(c,s,'#151515','#f2f2f2',14,0.85)),
  creamMarble: canvasTex(256,(c,s)=>veins(c,s,'#ebe5d6','#7f9a83',16,0.7)),
  walnut: canvasTex(128,(c,s)=>{ c.fillStyle='#5a3824'; c.fillRect(0,0,s,s); for(let i=0;i<46;i++){ c.strokeStyle=pick(['#4a2c1b','#6a4530','#3f2516']); c.globalAlpha=rand(0.25,0.6); c.lineWidth=rand(0.6,2); c.beginPath(); const y=rand(0,s); c.moveTo(0,y); c.bezierCurveTo(s*0.3,y+rand(-6,6),s*0.6,y+rand(-6,6),s,y+rand(-3,3)); c.stroke(); } c.globalAlpha=1; }),
};
const MAT = {
  terrazzo: new THREE.MeshStandardMaterial({map:TX.terrazzo, roughness:0.55}),
  concrete: new THREE.MeshStandardMaterial({map:TX.concrete, roughness:0.95}),
  nero: new THREE.MeshStandardMaterial({map:TX.nero, roughness:0.25, metalness:0.1}),
  creamMarble: new THREE.MeshStandardMaterial({map:TX.creamMarble, roughness:0.3}),
  walnut: new THREE.MeshStandardMaterial({map:TX.walnut, roughness:0.6}),
  walnutDark: new THREE.MeshStandardMaterial({map:TX.walnut, color:'#a88a78', roughness:0.55}),
  amberGlass: new THREE.MeshStandardMaterial({color:'#e0902f', emissive:'#c0661a', emissiveIntensity:0.25, transparent:true, opacity:0.78, roughness:0.15}),
  glass: new THREE.MeshStandardMaterial({color:'#cfe0e6', transparent:true, opacity:0.22, roughness:0.05}),
};
const C = { walnut:'#5a3824', walnutDark:'#3b2416', cream:'#efe7d8', boucle:'#f3ede2', caramel:'#a85f2a', caramelHi:'#bd7438', blue:'#2443a6', blueDeep:'#1b3184', rust:'#b4532a', black:'#1d1d1d', metal:'#2a2a2a', paleBlue:'#a9c4d6' };
function boxM(w,h,d,mat,x,y,z,parent=scene,shadow=true){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=shadow; m.receiveShadow=true; parent.add(m); return m; }
// 发光体（灯带/灯盘），昼夜切换时调节亮度
const glowMats=[];
function glowMat(color,day=0.7,nightI=2.2){ const m=new THREE.MeshStandardMaterial({color:'#fff6e6',emissive:color,emissiveIntensity:day}); m.userData={day,night:nightI}; glowMats.push(m); return m; }
const warmGlow = glowMat('#ffc98a',0.6,2.4);
function lightStrip(x,y,z,h,axis='z'){ const g=new THREE.Mesh(new THREE.BoxGeometry(axis==='z'?0.1:0.06,h,axis==='z'?0.06:0.1),warmGlow); g.position.set(x,y,z); scene.add(g); }
function ceilingDisc(x,z,r,sx=1,y=4.05){ const g=new THREE.Group(); g.position.set(x,y,z); g.scale.set(sx,1,1); scene.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r,0.07,8,40),glowMat('#ffbf73',0.45,2.8)); ring.material.color.set('#e8cfa8'); ring.rotation.x=Math.PI/2; g.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(r,40),new THREE.MeshBasicMaterial({color:'#ffe2b8',transparent:true,opacity:0.18,side:THREE.DoubleSide,depthWrite:false})); disc.rotation.x=Math.PI/2; g.add(disc); return g; }
function art(x,y,z,w,h,colors,face='z'){ // 带框挂画（抽象色块）
  const g=new THREE.Group(); g.position.set(x,y,z); if(face==='x') g.rotation.y=Math.PI/2; scene.add(g);
  boxM(w+0.12,h+0.12,0.06,M(C.black),0,0,0,g,false);
  const t=canvasTex(128,(c,s)=>{ c.fillStyle='#f1ebe0'; c.fillRect(0,0,s,s); colors.forEach((col,i)=>{ c.fillStyle=col; c.globalAlpha=0.9; c.beginPath(); c.arc(rand(25,103),rand(25,103),rand(14,34),0,Math.PI*2); c.fill(); }); c.globalAlpha=1; c.fillStyle='#1d1d1d'; c.fillRect(18,96,92,3); });
  const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:0.9})); p.position.z=0.035; g.add(p); return g; }

// ---------- 地面与墙 ----------
const FX=20, FZ=13;
boxM(FX*2+0.6,0.5,FZ*2+0.6,MAT.walnutDark,0,-0.25,0); // 底座（胡桃木）
const floor = boxM(FX*2,0.06,FZ*2,MAT.terrazzo,0,0.03,0);
// 宝蓝色地毯与走道
box(9,0.04,9,C.blue,-15.5,0.08,-8.5);                // 总监室：满铺宝蓝地毯
box(8,0.04,7.6,C.blueDeep,15.5,0.08,-8.2);            // 会议室：宝蓝地毯
box(21.4,0.04,18.0,'#1f4d3a',-0.25,0.08,-3.9);        // 开放工位区：整块深祖母绿地毯
// 混凝土外墙 + 胡桃木护墙板
// 外墙：开放工位区背后两段改为落地玻璃幕墙（见下方“东京塔景观窗”）
boxM(9,3.4,0.4,MAT.concrete,-15.5,1.7,-FZ-0.2); boxM(9,3.4,0.4,MAT.concrete,15.5,1.7,-FZ-0.2);
boxM(0.4,3.4,9.2,MAT.concrete,-FX-0.2,1.7,-8.8); boxM(0.4,3.4,11.0,MAT.concrete,-FX-0.2,1.7,7.7);
for(let z=2.6;z<=12.8;z+=0.42) boxM(0.08,2.2,0.3,MAT.walnut,-FX+0.05,1.15,z,scene,false); // 休息区木格栅墙
// 挂画与竖向灯带
art(-FX+0.16,2.2,7.6,2.4,1.3,['#2443a6','#e3c7a0','#b4532a'],'x');

// ---------- 东京塔景观窗（落地玻璃幕墙 + 窗外实景照片） ----------
// 照片：Tokyoship《Tokyo Minato Panorama》，CC BY-SA 3.0，经裁切/拼接/调色（见 README）
const viewMats=[]; let cityLightsMat=null;
{
  const loader=new THREE.TextureLoader();
  const base=loader.load('assets/tokyotower.jpg', t=>buildCityLights(t.image));
  base.colorSpace=THREE.SRGBColorSpace; base.anisotropy=4;
  const lightsCv=document.createElement('canvas'); lightsCv.width=1600; lightsCv.height=259;
  const lightsTex=new THREE.CanvasTexture(lightsCv); lightsTex.colorSpace=THREE.SRGBColorSpace;
  cityLightsMat=new THREE.MeshBasicMaterial({map:lightsTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  // 夜景：在照片里“楼宇”像素处撒暖色窗灯（避开天空与公园绿地）
  function buildCityLights(img){
    const W=lightsCv.width,H=lightsCv.height; const sc=document.createElement('canvas'); sc.width=W; sc.height=H; const sx=sc.getContext('2d'); sx.drawImage(img,0,0,W,H);
    const px=sx.getImageData(0,0,W,H).data; const c=lightsCv.getContext('2d'); c.clearRect(0,0,W,H);
    // 粗网格统计“绿地”比例：绿地（树林）所在格子不放灯；天空（上部/高亮）也不放
    const CS=12, GX=Math.ceil(W/CS), GY=Math.ceil(H/CS), green=new Float32Array(GX*GY);
    for(let y=0;y<H;y+=2) for(let x=0;x<W;x+=2){ const k=(y*W+x)*4; if(px[k+1]>px[k]+3 && px[k+1]>=px[k+2]) green[((y/CS)|0)*GX+((x/CS)|0)]+=4/(CS*CS); }
    const parkAt=(x,y)=>{ const gx=(x/CS)|0, gy=(y/CS)|0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const v=green[(gy+dy)*GX+gx+dx]; if(v>0.07) return true; } return false; };
    for(let i=0;i<6500;i++){ const x=Math.random()*W|0, y=(H*0.3+Math.random()*H*0.7)|0, k=(y*W+x)*4;
      const bright=(px[k]+px[k+1]+px[k+2])/3; if(bright>215 || parkAt(x,y)) continue;
      if(Math.abs(x-W*0.5012)<W*0.02 && y<H*0.76) continue;   // 塔身区域留给下面的塔灯
      c.fillStyle=pick(['rgba(255,196,120,','rgba(255,220,160,','rgba(255,170,90,','rgba(220,235,255,'])+rand(0.45,0.95)+')'; c.fillRect(x,y,rand(1,2.2),rand(1,1.8)); }
    // 远处天际线的暮色柔光
    const g=c.createLinearGradient(0,H*0.22,0,H*0.42); g.addColorStop(0,'rgba(255,140,70,0)'); g.addColorStop(1,'rgba(255,140,70,0.22)'); c.fillStyle=g; c.fillRect(0,H*0.22,W,H*0.2);
    // 东京塔夜间橙色灯光：按照片中塔的位置画发光轮廓（塔心 x≈0.501W，塔尖≈0.02H，塔脚≈0.74H）
    const cx=W*0.5012, P=(dx,fy)=>[cx+dx*W, fy*H];
    const half=[[0.0006,0.02],[0.0013,0.18],[0.0045,0.20],[0.0045,0.235],[0.0035,0.25],[0.004,0.47],[0.0068,0.49],[0.0068,0.51],[0.0058,0.53],[0.0062,0.61],[0.0095,0.67],[0.0155,0.74]];
    c.save(); c.beginPath();
    half.forEach(([dx,fy],i)=>{ const [x,y]=P(dx,fy); i?c.lineTo(x,y):c.moveTo(x,y); });
    [...half].reverse().forEach(([dx,fy])=>{ const [x,y]=P(-dx,fy); c.lineTo(x,y); }); c.closePath();
    const tg=c.createLinearGradient(0,H*0.02,0,H*0.74); tg.addColorStop(0,'rgba(255,235,190,1)'); tg.addColorStop(0.3,'rgba(255,170,70,1)'); tg.addColorStop(1,'rgba(255,110,30,1)');
    c.shadowColor='rgba(255,140,40,0.9)'; c.shadowBlur=20; c.fillStyle=tg; c.fill(); c.fill(); c.restore();
    // 塔周围的光晕
    const halo=c.createRadialGradient(cx,H*0.45,2,cx,H*0.45,H*0.45); halo.addColorStop(0,'rgba(255,140,50,0.35)'); halo.addColorStop(1,'rgba(255,140,50,0)'); c.fillStyle=halo; c.fillRect(cx-H*0.5,0,H,H);
    lightsTex.needsUpdate=true;
  }
  // 同一张照片，不同墙用不同裁切（u/v 偏移），避免拉伸
  function viewPlane(w,h,u0,u1,v0,v1){
    const geo=new THREE.PlaneGeometry(w,h); const uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++){ uv.setXY(i, u0+(u1-u0)*uv.getX(i), v0+(v1-v0)*uv.getY(i)); }
    const m=new THREE.MeshBasicMaterial({map:base,toneMapped:false}); viewMats.push(m);
    const g=new THREE.Group(); g.add(new THREE.Mesh(geo,m)); const l=new THREE.Mesh(geo,cityLightsMat); l.position.z=0.01; g.add(l); return g;
  }
  const IMG_AR=1600/259;
  // 后墙 x∈[-11,11]（22×3.4）
  { const w=22, h=3.5, vs=(1/IMG_AR)*(IMG_AR*h/w); // 竖向所占比例
    const vspan=(w/h)>IMG_AR ? IMG_AR/(w/h) : 1; const v0=(1-vspan)/2;   // 全幅横向，东京塔位于正中
    const p=viewPlane(w,h,0,1,v0,v0+vspan); p.position.set(0,h/2,-FZ-0.35); scene.add(p); }
  // 左墙 z∈[-4.2,2.2]（6.4×3.4），取公园居中的一段
  { const w=6.4, h=3.5, vspan=1, uspan=(w/h)*vspan/IMG_AR, uc=0.5012;   // 以东京塔为中心裁切
    const p=viewPlane(w,h,uc-uspan/2,uc+uspan/2,0,vspan); p.rotation.y=Math.PI/2; p.position.set(-FX-0.35,h/2,-1.0); scene.add(p); }
  // 玻璃、青铜色竖梃、胡桃木窗台、顶部横梁
  const glassM=new THREE.MeshStandardMaterial({color:'#c9dbe2',transparent:true,opacity:0.16,roughness:0.04,metalness:0.35,depthWrite:false});
  const bronze=M('#2e261e',{metalness:0.55,roughness:0.4});
  function curtain(len,alongX,cx,cz){
    const g=new THREE.Mesh(new THREE.BoxGeometry(alongX?len:0.03,3.4,alongX?0.03:len),glassM); g.position.set(cx,1.7,cz); g.renderOrder=2; scene.add(g);
    const n=Math.round(len/1.38); for(let i=0;i<=n;i++){ const t=-len/2+i*len/n; boxM(alongX?0.06:0.09,3.4,alongX?0.09:0.06,bronze,alongX?cx+t:cx,1.7,alongX?cz:cz+t,scene,false); }
    boxM(alongX?len:0.14,0.08,alongX?0.14:len,bronze,cx,3.38,cz,scene,false);
    boxM(alongX?len+0.04:0.34,0.12,alongX?0.34:len+0.04,MAT.walnut,alongX?cx:cx+0.08,0.08,alongX?cz+0.08:cz,scene,false);
  }
  curtain(22,true,0,-FZ-0.02);
  curtain(6.4,false,-FX-0.02,-1.0);
}
for(const z of [3,12.4]) lightStrip(-FX+0.12,1.6,z,2.4,'x');
// 玻璃隔断（黑色金属框）
function glassWall(w,d,x,z,h=2.4){ boxM(w,h,d,MAT.glass,x,h/2,z,scene,false); box(w+0.02,0.08,d+0.02,C.metal,x,h,z); box(w+0.02,0.08,d+0.02,C.metal,x,0.04,z);
  const n=Math.max(1,Math.round(Math.max(w,d)/1.8)); for(let i=0;i<=n;i++){ const t=-0.5+i/n; box(0.05,h,0.05,C.metal,x+(w>d?t*w:0),h/2,z+(w>d?0:t*d)); } }
glassWall(9,0.1,-14,-4); glassWall(0.1,9,-11,-8.5);   // 总监室（门在左侧）
glassWall(0.1,9,11,-8.5); glassWall(6,0.1,14,-4);     // 会议室（门在右侧）
// 休息区矮墙（胡桃木）
boxM(9,0.9,0.25,MAT.walnut,-15.5,0.45,2.2);

roomLabel('总监室',-15.5,0.2,-5.0); roomLabel('会议室',15.5,1.2,-8.5); roomLabel('开放工位区',0,0.2,5.6);
roomLabel('休息区',-15.5,1.4,2.2); roomLabel('前台 · 茶水间',15.5,0.2,8.9);
roomLabel('图书角',-3.2,0.2,12.5); roomLabel('专注舱',7,2.4,12.6);

// ---------- 家具 ----------
const screens = [];
function chair(parent,x,z,rotY=0,color=C.black,seatH=0.48){ const c=new THREE.Group(); c.position.set(x,0,z); c.rotation.y=rotY; parent.add(c);
  box(0.66,0.12,0.62,color,0,seatH,0,c); box(0.66,0.62,0.1,color,0,seatH+0.35,-0.3,c); cyl(0.04,0.04,seatH-0.06,'#3a3a3a',0,(seatH-0.06)/2,0,c,6); cyl(0.3,0.3,0.03,'#3a3a3a',0,0.02,0,c,10); return c; }
function desk(x,z,{w=1.8,dir=false}={}){
  const g = new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  boxM(w,0.08,1,dir?MAT.walnutDark:MAT.walnut,0,0.78,0,g);
  // 胡桃木抽屉柜 + 黑色金属侧腿
  const pw=0.48; boxM(pw,0.74,0.92,MAT.walnut,w/2-pw/2-0.02,0.37,0,g);
  for(const y of [0.2,0.42,0.62]) box(pw-0.1,0.02,0.02,'#c9a27e',w/2-pw/2-0.02,y,0.47,g);
  box(0.05,0.74,0.9,C.metal,-w/2+0.04,0.37,0,g);
  if(dir) boxM(pw,0.74,0.92,MAT.walnut,-w/2+pw/2+0.02,0.37,0,g);
  // 显示器（朝向坐在后面的 Bot）
  box(0.08,0.32,0.08,C.metal,0,0.98,-0.05,g);
  const scrMat = new THREE.MeshStandardMaterial({color:'#111111', emissive:'#2f9e5b', emissiveIntensity:0.6});
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.95,0.55,0.05), scrMat); s.position.set(0,1.36,-0.08); s.castShadow=true; g.add(s);
  box(0.5,0.03,0.18,'#d8d2c6',0,0.835,-0.32,g);
  if(dir){ cyl(0.11,0.09,0.3,'#e9e3d6',-w/2+0.45,0.97,0.25,g,10); box(0.35,0.06,0.25,C.caramel,0.15,0.85,0.25,g); }
  else cyl(0.1,0.08,0.18,pick(['#e9e3d6',C.rust,C.blue]),-w/2+0.3,0.91,0.28,g,8);
  chair(g,0,-0.95,0,dir?C.caramel:C.black);
  return {group:g, screen:scrMat};
}
// 书本：全部收集后用一个 InstancedMesh 绘制（手机友好）
const BOOK_COLS=['#7a1f1f','#8e2a22','#5e1717','#1d2b4f','#22336b','#1f4a32','#2d5a3c','#e9dfc8','#d9cdb2','#1a1a1a','#b08a3e','#6b3f22','#2443a6','#b4532a'];
const bookList=[];
function addBooks({run,from,to,y,front,back,maxH=0.5,stack=false}){
  const depthMax=Math.abs(front-back);
  if(stack){ // 横放一摞
    let yy=y+0.005; const n=3+Math.floor(Math.random()*4), len=Math.min(to-from,0.42);
    for(let k=0;k<n && yy<y+maxH;k++){ const t=rand(0.04,0.07), L=len*rand(0.75,1), D=Math.min(depthMax*0.85,rand(0.22,0.3));
      const c=(from+to)/2+rand(-0.02,0.02); bookList.push(run==='x'?[c,yy+t/2,(front+back)/2+ (front>back?1:-1)*(depthMax-D)/2 ,L,t,D]:[(front+back)/2+(front>back?1:-1)*(depthMax-D)/2,yy+t/2,c,D,t,L]); yy+=t; }
    return; }
  let p=from;
  while(p<to-0.04){ const t=rand(0.045,0.09); if(p+t>to) break; const h=Math.min(maxH,rand(0.6,1)*maxH), D=Math.min(depthMax*0.92,rand(0.24,0.34));
    const zc=front-(front>back?1:-1)*D/2;
    bookList.push(run==='x'?[p+t/2,y+h/2,zc,t,h,D]:[zc,y+h/2,p+t/2,D,h,t]);
    p+=t+(Math.random()<0.08?0.06:0.003); }
}
function flushBooks(){
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:0.75}),bookList.length);
  const d=new THREE.Object3D(); const col=new THREE.Color();
  bookList.forEach(([x,y,z,sx,sy,sz],i)=>{ d.position.set(x,y,z); d.scale.set(sx,sy,sz); d.updateMatrix(); im.setMatrixAt(i,d.matrix); im.setColorAt(i,col.set(pick(BOOK_COLS))); });
  im.castShadow=!isMobile; im.receiveShadow=true; scene.add(im); return im;
}
function plant(x,z,s=1){ cyl(0.28*s,0.22*s,0.6*s,'#2a2a2a',x,0.3*s,z,scene,10); const f=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55*s,0),M('#4f7a46',{flatShading:true})); f.position.set(x,1.0*s,z); f.castShadow=true; scene.add(f); const f2=f.clone(); f2.scale.setScalar(0.7); f2.position.y+=0.55*s; scene.add(f2); }
function loungeChair(x,z,rotY,color=C.boucle){ const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rotY; scene.add(g);
  const seat=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.5,0.42,14),M(color,{roughness:1})); seat.position.y=0.3; seat.castShadow=true; g.add(seat);
  const back=new THREE.Mesh(new THREE.CylinderGeometry(0.58,0.58,0.62,14,1,false,Math.PI*0.6,Math.PI*0.8),M(color,{roughness:1,side:THREE.DoubleSide})); back.position.y=0.72; back.scale.set(1,1,1); back.castShadow=true; g.add(back);
  return g; }
function roundTable(x,z,r,topMat,h=0.72){ const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.07,28),topMat); t.position.set(x,h,z); t.castShadow=true; t.receiveShadow=true; scene.add(t); cyl(0.07,0.07,h,C.walnutDark,x,h/2,z,scene,8); cyl(0.35,0.35,0.04,C.walnutDark,x,0.02,z,scene,14); }

// 总监室：深胡桃木大桌、奶油绿大理石背景墙、焦糖色主椅、两把奶油+胡桃木访客椅、圆形背光灯盘
boxM(0.08,3.2,8.4,MAT.walnut,-FX+0.06,1.65,-8.6,scene,false);
const dirDesk = desk(-15.5,-8.6,{w:2.8,dir:true});
for(const x of [-16.4,-14.6]){ const c=chair(scene,x,-6.9,Math.PI,C.cream,0.46); }
boxM(0.6,1.2,2.4,MAT.nero,-19.4,0.6,-6.4);             // 黑色大理石边柜
cyl(0.15,0.12,0.5,'#e9e3d6',-19.4,1.45,-6.0,scene,10);
plant(-11.75,-11.6,0.9);
ceilingDisc(-15.5,-6.6,1.3);
// 总监室背墙：律所合伙人式落地胡桃木书墙（书本用 InstancedMesh）
{
  const X0=-19.85, X1=-11.15, ZB=-12.82, ZF=-12.3, H=3.4, bays=8, bw=(X1-X0)/bays, zc=(ZB+ZF)/2, d=ZF-ZB;
  boxM(X1-X0,H,0.06,MAT.walnutDark,(X0+X1)/2,H/2,ZB+0.03,scene,false);
  for(let i=0;i<=bays;i++) boxM(0.07,H,d,MAT.walnut,X0+i*bw,H/2,zc,scene,false);
  const shelvesY=[0.8,1.45,2.1,2.75,3.37];
  for(const y of [0.04,...shelvesY]) boxM(X1-X0,0.06,d,MAT.walnut,(X0+X1)/2,y,zc,scene,false);
  boxM(X1-X0+0.1,0.14,d+0.08,MAT.walnutDark,(X0+X1)/2,H+0.05,zc+0.02,scene,false); // 顶部线脚
  for(let i=0;i<bays;i++){ const cx=X0+(i+0.5)*bw; boxM(bw-0.1,0.68,0.04,MAT.walnut,cx,0.42,ZF+0.01,scene,false); box(0.04,0.12,0.04,'#c9a24e',cx+(i%2?-1:1)*(bw/2-0.15),0.55,ZF+0.05); }
  for(const y of shelvesY.slice(1)) { const st=new THREE.Mesh(new THREE.BoxGeometry(X1-X0-0.1,0.025,0.04),warmGlow); st.position.set((X0+X1)/2,y-0.045,ZF-0.04); scene.add(st); } // 层板暖光灯带
  const rowsY=[0.83,1.48,2.13,2.78];
  const brass=M('#c9a24e',{metalness:0.65,roughness:0.3});
  const decor=(i,r,cx,y)=>{ const k=(i*4+r)%7;
    if(k===0){ const gl=new THREE.Mesh(new THREE.SphereGeometry(0.17,12,8),M('#3d6b8a',{roughness:0.5})); gl.position.set(cx,y+0.3,zc); scene.add(gl); const ring=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.012,4,20),brass); ring.position.copy(gl.position); ring.rotation.y=0.6; scene.add(ring); cyl(0.08,0.1,0.06,'#3b2416',cx,y+0.03,zc,scene,10); }
    else if(k===1){ const v=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(0.1,0.02),new THREE.Vector2(0.13,0.15),new THREE.Vector2(0.06,0.32),new THREE.Vector2(0.07,0.38)],10),M(pick(['#e9e3d6','#1d1d1d','#2443a6']),{roughness:0.3})); v.position.set(cx,y,zc); scene.add(v); }
    else if(k===2){ boxM(0.3,0.36,0.03,M('#1d1d1d'),cx,y+0.2,zc,scene,false); box(0.24,0.28,0.01,pick(['#d9c3a0','#b9c7d6','#c9b18f']),cx,y+0.2,zc+0.02); }
    else if(k===3){ const sc=new THREE.Mesh(new THREE.TorusKnotGeometry(0.09,0.03,40,6),brass); sc.position.set(cx,y+0.24,zc); scene.add(sc); box(0.18,0.1,0.18,'#1d1d1d',cx,y+0.05,zc); }
    else if(k===4){ cyl(0.015,0.015,0.34,'#c9a24e',cx,y+0.17,zc,scene,6); cyl(0.07,0.07,0.03,'#c9a24e',cx,y+0.015,zc,scene,10); const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.13,0.14,12,1,true),glowMat('#ffc982',0.5,2.4)); sh.position.set(cx,y+0.38,zc); scene.add(sh); }
    else if(k===5){ const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.13,0),M('#e9e3d6',{flatShading:true})); b.position.set(cx,y+0.2,zc); scene.add(b); box(0.16,0.07,0.16,'#5a3824',cx,y+0.035,zc); }
    else { const v=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,0.34,10),M('#1f4a32',{roughness:0.3})); v.position.set(cx,y+0.17,zc); scene.add(v); } };
  for(let i=0;i<bays;i++) for(let r=0;r<4;r++){
    const a=X0+i*bw+0.06, b=X0+(i+1)*bw-0.06, y=rowsY[r], seed=(i*5+r*3)%10;
    if(seed<5) addBooks({run:'x',from:a,to:b,y,front:ZF-0.02,back:ZB+0.08,maxH:0.56,stack:seed===2});
    else if(seed<8){ addBooks({run:'x',from:a,to:a+bw*0.55,y,front:ZF-0.02,back:ZB+0.08,maxH:0.56,stack:seed===6}); decor(i,r,a+bw*0.74,y); }
    else { addBooks({run:'x',from:a+0.02,to:a+0.32,y,front:ZF-0.02,back:ZB+0.08,stack:true,maxH:0.3}); decor(i,r,a+bw*0.62,y); }
  }
}
// 会议室：长胡桃木桌、深色椅、椭圆发光穹顶、黑色大理石电视墙
boxM(8.6,3.4,0.08,MAT.nero,15.5,1.7,-FZ+0.06,scene,false);
boxM(6,0.1,2.2,MAT.walnut,15.5,0.8,-7.8);
for(const x of [13.6,17.4]) boxM(0.5,0.75,1.4,MAT.walnutDark,x,0.38,-7.8);
for(const x of [13.2,14.75,16.25,17.8]) for(const [z,r] of [[-9.4,0],[-6.2,Math.PI]]) chair(scene,x,z,r,'#262626');
ceilingDisc(15.5,-7.8,1.6,1.9);
const btcCanvas = document.createElement('canvas'); btcCanvas.width=1024; btcCanvas.height=512;
const btcTex = new THREE.CanvasTexture(btcCanvas); btcTex.colorSpace = THREE.SRGBColorSpace; btcTex.anisotropy = 4;
box(6.6,3.4,0.15,'#0d0d0d',15.5,2.2,-12.75);
const btcScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.3,3.15), new THREE.MeshBasicMaterial({map:btcTex, toneMapped:false}));
btcScreen.position.set(15.5,2.2,-12.66); scene.add(btcScreen);
lightStrip(11.6,1.7,-FZ+0.12,3.0); lightStrip(19.4,1.7,-FZ+0.12,3.0);
// 开放工位
const deskSlots=[]; const cols=[-8,-4.8,-1.6,1.6,4.8,8], rows=[-8.6,-3,2.6];
for(const z of rows) for(const x of cols) deskSlots.push({x,z});
plant(9.4,-12,1); plant(9.4,4.9,0.9);
// 休息区：焦糖皮沙发、黑色大理石茶几、圆形宝蓝地毯（铁锈红圈）、奶油色布克雷单椅、白色玻璃吊灯组
const rugOuter=new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,0.03,40),M(C.rust)); rugOuter.position.set(-15.5,0.08,8.4); rugOuter.receiveShadow=true; scene.add(rugOuter);
const rugIn=new THREE.Mesh(new THREE.CylinderGeometry(3.15,3.15,0.035,40),M(C.blue)); rugIn.position.set(-15.5,0.09,8.4); rugIn.receiveShadow=true; scene.add(rugIn);
box(4.8,0.42,1.25,C.caramel,-15.5,0.33,10.6); box(4.8,0.85,0.35,C.caramel,-15.5,0.72,11.3); box(0.35,0.62,1.25,C.caramel,-18.05,0.55,10.6); box(0.35,0.62,1.25,C.caramel,-12.95,0.55,10.6);
for(const x of [-16.9,-15.5,-14.1]) box(1.3,0.16,1.05,C.caramelHi,x,0.62,10.55);
boxM(2.4,0.38,1.2,MAT.nero,-15.5,0.28,8.2);            // 黑色大理石茶几
boxM(0.6,0.5,0.6,MAT.nero,-18.3,0.25,11.2);            // 大理石边几
loungeChair(-18.6,8.2,Math.PI/2); loungeChair(-12.4,8.2,-Math.PI/2);
const pendantM=glowMat('#fff0d8',0.5,2.6);
for(const [dx,dz,y,r] of [[0,0,3.3,0.32],[0.6,0.3,3.6,0.26],[-0.55,0.35,3.5,0.28],[0.25,-0.5,3.75,0.22],[-0.3,-0.4,3.2,0.24]]){
  const p=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),pendantM); p.position.set(-15.5+dx,y,8.2+dz); scene.add(p);
  cyl(0.012,0.012,4.6-y,'#222222',-15.5+dx,y+(4.6-y)/2,8.2+dz,scene,4); }
plant(-19.2,12.3,1.1);
// 图书角：浅蓝书架、蓝色圆桌、四把奶油色单椅
{ const pb=M(C.paleBlue); boxM(0.06,2.36,5.2,pb,-9.57,1.18,9.8); for(const z of [7.2,12.4]) boxM(0.5,2.36,0.06,pb,-9.35,1.18,z); box(0.5,0.05,5.2,'#93b2c6',-9.35,0.12,9.8); box(0.5,0.05,5.2,'#93b2c6',-9.35,2.34,9.8); }
for(let i=0;i<4;i++) addBooks({run:'z', from:7.4, to:12.2, y:0.15+i*0.55, front:-9.1, back:-9.55, maxH:0.4});
for(let i=1;i<4;i++) box(0.5,0.04,5.2,'#93b2c6',-9.35,i*0.55+0.12,9.8);
roundTable(-5.8,9.8,0.85,M(C.blue,{roughness:0.5}));
for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) loungeChair(-5.8+Math.sin(a)*1.45,9.8+Math.cos(a)*1.45,a+Math.PI,C.boucle);
// 阅读角（原禅意庭院位置）：矮书柜、焦糖皮扶手椅、大理石边几、黄铜落地灯、奶油色地毯
box(4.4,0.035,4.0,'#e6dccb',0.8,0.075,10.7);
{ const pb=M(C.paleBlue); boxM(4.4,1.18,0.05,pb,0.8,0.59,8.15); for(const x of [-1.4,3.0]) boxM(0.05,1.18,0.45,pb,x,0.59,8.35); for(const y of [0.03,0.6,1.17]) box(4.4,0.04,0.45,'#93b2c6',0.8,y,8.35); }
addBooks({run:'x', from:-1.3, to:2.9, y:0.05, front:8.56, back:8.2, maxH:0.5});
addBooks({run:'x', from:-1.3, to:2.9, y:0.62, front:8.56, back:8.2, maxH:0.5});
loungeChair(-0.3,10.9,Math.PI/2+0.3,C.caramel); loungeChair(2.0,10.9,-Math.PI/2-0.3,C.caramel);
boxM(0.6,0.5,0.6,MAT.nero,0.85,0.25,11.6);
cyl(0.1,0.08,0.2,'#e9e3d6',0.85,0.6,11.6,scene,10);
{ const brass=M('#b58a3c',{metalness:0.6,roughness:0.35}); const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.7,6),brass); pole.position.set(2.8,0.85,12.2); scene.add(pole);
  const shade=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.3,14,1,true),glowMat('#ffcf8a',0.5,2.4)); shade.position.set(2.8,1.75,12.2); scene.add(shade); cyl(0.2,0.2,0.04,'#b58a3c',2.8,0.02,12.2,scene,12); }
// 专注舱：暖木墙 + 玻璃门
for(const bx of [5.3,8.6]){
  boxM(3.1,2.4,0.12,MAT.walnut,bx,1.2,8.0);                  // 木质后墙
  boxM(0.12,2.4,4.6,MAT.walnut,bx-1.55,1.2,10.3);            // 侧墙
  boxM(3.1,2.4,0.06,MAT.glass,bx,1.2,12.6,scene,false); box(3.12,0.06,0.08,C.metal,bx,2.4,12.6);
  box(3.2,0.12,0.14,C.walnutDark,bx,2.45,8.0); box(0.14,0.12,4.7,C.walnutDark,bx-1.55,2.45,10.3);
  box(1.6,0.06,0.7,C.walnut,bx,0.74,8.5); cyl(0.04,0.04,0.72,C.metal,bx,0.37,8.5,scene,6);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.45,12),M(C.caramel)); st.position.set(bx,0.23,9.4); scene.add(st);
  lightStrip(bx+1.2,1.3,8.1,2.0);
}
boxM(0.12,2.4,4.6,MAT.walnut,10.15,1.2,10.3);
// 前台 · 茶水间：奶油色墙 + “31V AI 团队”标识、琥珀色玻璃前台、咖啡吧、焦糖皮椅
boxM(8.4,2.8,0.3,M(C.cream),15.6,1.4,2.4);
lightStrip(11.9,1.4,2.58,2.4); lightStrip(19.3,1.4,2.58,2.4);
const signCanvas=document.createElement('canvas'); signCanvas.width=512; signCanvas.height=160;
{ const c=signCanvas.getContext('2d'); c.clearRect(0,0,512,160); c.fillStyle='#3b2416'; c.font='bold 70px "Noto Sans CJK SC","PingFang SC",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('31V AI 团队',256,72);
  c.fillStyle='#b88a4a'; c.fillRect(156,124,200,4); }
const signTex=new THREE.CanvasTexture(signCanvas); signTex.colorSpace=THREE.SRGBColorSpace;
const sign=new THREE.Mesh(new THREE.PlaneGeometry(4,1.25),new THREE.MeshBasicMaterial({map:signTex,transparent:true,toneMapped:false}));
sign.position.set(15.6,1.95,2.57); scene.add(sign);
boxM(4.6,1.05,1.0,MAT.amberGlass,15.6,0.53,5.4);         // 琥珀色玻璃前台
boxM(4.8,0.08,1.15,MAT.walnut,15.6,1.09,5.4);
box(4.4,0.1,0.8,C.walnutDark,15.6,0.75,4.2);             // 台内工作面
boxM(0.9,0.95,4.2,MAT.walnut,19.4,0.48,9.6);             // 咖啡吧柜
boxM(0.95,0.06,4.25,MAT.nero,19.4,0.98,9.6);
box(0.6,0.7,0.55,'#1d1d1d',19.4,1.36,8.4); box(0.12,0.1,0.35,C.rust,19.1,1.45,8.4); cyl(0.1,0.08,0.16,'#ffffff',19.0,1.09,8.4,scene,10);
for(const z of [9.6,10.0,10.4]) cyl(0.08,0.07,0.16,pick(['#efe7d8',C.rust,C.blue]),19.4,1.09,z,scene,8);
loungeChair(14,10.6,0,C.caramel); loungeChair(16.4,10.6,0,C.caramel);
boxM(0.6,0.55,0.6,MAT.nero,15.2,0.28,10.8);
plant(12,12.2,1.2); plant(19.3,12.4,1);
const signBack=sign;

flushBooks();
// 暖光灯（2700K），夜间点亮
const lamps=[]; const lampBulbMat=glowMat('#ffd29a',0.3,2.2);
for(const [x,z] of [[-15.5,-8.5],[15.5,-8],[-15.5,8.2],[15.5,7.5],[0,-6],[0,2],[-5,10],[7,10]]){
  const l=new THREE.PointLight('#ffb46b',0,15,1.2); l.position.set(x,3.6,z); scene.add(l); lamps.push(l);
}

// ---------- 行情屏 ----------
let btcState={price:null,time:null,prev:null};
function drawBTC(){
  const c=btcCanvas.getContext('2d'); const W=1024,H=512;
  const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b1730'); g.addColorStop(1,'#13294b'); c.fillStyle=g; c.fillRect(0,0,W,H);
  c.fillStyle='#f7931a'; c.beginPath(); c.arc(110,110,56,0,Math.PI*2); c.fill();
  c.fillStyle='#fff'; c.font='bold 72px sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('₿',110,114);
  c.textAlign='left'; c.font='bold 54px "Noto Sans CJK SC",sans-serif'; c.fillText('BTC / USD 实时行情',196,110);
  if(btcState.price){
    const up = btcState.prev==null || btcState.price>=btcState.prev;
    c.fillStyle= up ? '#4ade80' : '#f87171';
    c.font='bold 140px "Noto Sans",sans-serif';
    c.fillText('$'+btcState.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),70,290);
    c.fillStyle='#94a3b8'; c.font='36px "Noto Sans CJK SC",sans-serif';
    c.fillText('更新于 '+btcState.time+' · 每 30 秒刷新 · 数据来源 Coinbase',70,430);
  } else {
    c.fillStyle='#cbd5e1'; c.font='bold 96px "Noto Sans CJK SC",sans-serif'; c.fillText(btcState.time?'行情暂不可用':'行情加载中…',70,290);
    c.fillStyle='#94a3b8'; c.font='36px "Noto Sans CJK SC",sans-serif'; c.fillText('稍后自动重试 · 每 30 秒刷新',70,430);
  }
  btcTex.needsUpdate=true;
  if(roomEls['会议室']) roomEls['会议室'].textContent = btcState.price ? '会议室 · BTC $'+Math.round(btcState.price).toLocaleString('en-US') : (btcState.time ? '会议室 · 行情暂不可用' : '会议室');
}
async function fetchBTC(){
  const now = new Date().toLocaleTimeString('zh-CN',{hour12:false});
  try{
    const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),8000);
    const r=await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot',{signal:ctl.signal}); clearTimeout(t);
    const j=await r.json(); const p=parseFloat(j?.data?.amount); if(!isFinite(p)) throw 0;
    btcState={price:p,time:now,prev:btcState.price};
  }catch(e){ btcState={price:null,time:now,prev:btcState.price}; }
  drawBTC();
}
drawBTC(); fetchBTC(); setInterval(fetchBTC,30000);

// ---------- Bot ----------
let DATA, STATUS;
const bots=[]; const hitMeshes=[];
const loungeSpots=[[-17.2,10.45,true],[-13.8,10.45,true],[-18.7,5.6],[-12.3,5.6],[-15.5,5.4],[-17.6,3.5],[-13.4,3.5],[-19.3,10.0],[-11.8,11.6],[-15.5,12.5],[-7.6,7.9,false,'lib'],[-4.0,7.9,false,'lib'],[-7.4,11.9,false,'lib'],[-4.2,11.9,false,'lib']];
const loungeTaken=new Set();
const CORRIDOR_X=-10.2;

function makeBot(def, seat, deskObj){
  const g=new THREE.Group(); scene.add(g);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.42,0.55,4,12),M(def.color)); body.position.y=0.75; body.castShadow=true; g.add(body);
  const headC=new THREE.Color(def.color).lerp(new THREE.Color('#ffffff'),0.72);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.4,16,12),new THREE.MeshStandardMaterial({color:headC,roughness:0.6})); head.position.y=1.62; head.castShadow=true; g.add(head);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.2,0.1),M('#1f2937',{roughness:0.3})); visor.position.set(0,1.64,0.36); g.add(visor);
  const eyeM=new THREE.MeshBasicMaterial({color:'#7df9ff'});
  for(const sx of [-0.11,0.11]){ const e=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,6),eyeM); e.position.set(sx,1.65,0.42); g.add(e); }
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.3,6),M('#6b7280')); ant.position.y=2.12; g.add(ant);
  const bulbM=new THREE.MeshStandardMaterial({color:def.color,emissive:def.color,emissiveIntensity:0.8});
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,6),bulbM); bulb.position.y=2.3; g.add(bulb);
  if(def.director){ const crown=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.25,5),M('#fbbf24',{metalness:0.4,roughness:0.4})); crown.position.set(0.18,2.0,0); crown.rotation.z=-0.4; g.add(crown); }
  const hit=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,2.6,8),new THREE.MeshBasicMaterial({visible:false})); hit.position.y=1.2; g.add(hit);
  // 标签
  const el=document.createElement('div'); el.className='lbl'+(def.director?' dir':'');
  el.innerHTML=`<span class="sd"></span><span class="nm">${def.short||def.name.split('·')[0]}</span><span class="st"></span><i class="rl">${def.role}</i>`;
  labelLayer.appendChild(el);
  const bot={lw:0,lh:0,dirty:true,ox:0,oy:0,def,g,body,head,bulb,hit,el,seat,desk:deskObj,status:'working',task:pick(def.tasks),pos:new THREE.Vector3(seat.x,0,seat.z),path:[],place:'desk',spot:null,next:0,phase:Math.random()*6,doneAt:0};
  hit.userData.bot=bot;
  el.addEventListener('click',ev=>{ev.stopPropagation(); select(bot);});
  g.position.copy(bot.pos);
  hitMeshes.push(hit); bots.push(bot);
  return bot;
}

function def_title(b){ return `${b.def.name}（${b.def.role}）· ${STATUS[b.status].label}`; }
function setStatus(bot,st,task){
  bot.status=st; if(task) bot.task=task;
  if(st==='idle') bot.task='在休息区放松一下';
  const s=STATUS[st];
  const badge=bot.el.querySelector('.st'); badge.textContent=s.label; badge.style.background=s.color;
  bot.el.querySelector('.sd').style.background=s.color; bot.el.title=def_title(bot); bot.dirty=true;
  bot.desk.screen.emissive.set(st==='idle'?'#111827':s.color);
  bot.bulb.material.emissive.set(s.color);
  if(st==='done'){ confetti(bot.g.position.clone().add(new THREE.Vector3(0,2.2,0))); bot.doneAt=performance.now(); }
  // 走动：空闲去休息区，其他状态回工位
  if(st==='idle' && bot.place!=='lounge' && !bot.def.director) goLounge(bot);
  else if(st!=='idle' && bot.place!=='desk' && !bot.def.director) goDesk(bot);
  refreshList(bot); if(selected===bot) showCard(bot);
}
function seatAisle(bot){ return new THREE.Vector3(bot.seat.x,0,bot.seat.z-1.4); }
function goLounge(bot){
  let idx=loungeSpots.findIndex((_,i)=>!loungeTaken.has(i)); if(idx<0) return;
  loungeTaken.add(idx); bot.spot=idx; const [sx,sz]=loungeSpots[idx];
  const a=seatAisle(bot);
  const lib=loungeSpots[idx][3]==='lib';
  bot.path=[a,new THREE.Vector3(CORRIDOR_X,0,a.z),new THREE.Vector3(CORRIDOR_X,0,4.2),...(lib?[]:[new THREE.Vector3(-12,0,4.2)]),new THREE.Vector3(sx,0,sz)];
  bot.place='walking-lounge';
}
function goDesk(bot){
  const a=seatAisle(bot);
  const start=bot.place==='lounge'||bot.place==='walking-lounge';
  const lib=bot.spot!=null && loungeSpots[bot.spot][3]==='lib';
  if(bot.spot!=null){ loungeTaken.delete(bot.spot); bot.spot=null; }
  bot.path= start ? [...(lib?[]:[new THREE.Vector3(-12,0,4.2)]),new THREE.Vector3(CORRIDOR_X,0,4.2),new THREE.Vector3(CORRIDOR_X,0,a.z),a,new THREE.Vector3(bot.seat.x,0,bot.seat.z)] : [new THREE.Vector3(bot.seat.x,0,bot.seat.z)];
  bot.place='walking-desk';
}

// ---------- 彩带与调度特效 ----------
const CONF_MAX=600;
const confMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16,0.09),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),CONF_MAX);
confMesh.frustumCulled=false; scene.add(confMesh);
const confParts=[]; const dummy=new THREE.Object3D(); const confColors=['#ef4444','#f59e0b','#10b981','#3b82f6','#a855f7','#ec4899','#fde047'];
for(let i=0;i<CONF_MAX;i++){ confMesh.setColorAt(i,new THREE.Color(pick(confColors))); dummy.scale.setScalar(0); dummy.updateMatrix(); confMesh.setMatrixAt(i,dummy.matrix); }
let confCursor=0;
function confetti(p){
  const n=isMobile?40:70;
  for(let k=0;k<n;k++){ const i=confCursor++%CONF_MAX; confParts[i]={p:p.clone(),v:new THREE.Vector3(rand(-2.5,2.5),rand(3,6.5),rand(-2.5,2.5)),r:new THREE.Euler(rand(0,6),rand(0,6),0),w:rand(4,10),life:rand(1.8,2.6)}; }
}
function updateConfetti(dt){
  let any=false;
  for(let i=0;i<CONF_MAX;i++){ const c=confParts[i]; if(!c) continue; any=true;
    c.life-=dt; if(c.life<=0||c.p.y<0.05){ confParts[i]=null; dummy.scale.setScalar(0); dummy.updateMatrix(); confMesh.setMatrixAt(i,dummy.matrix); continue; }
    c.v.y-=7*dt; c.v.multiplyScalar(0.985); c.p.addScaledVector(c.v,dt); c.r.x+=c.w*dt; c.r.y+=c.w*0.7*dt;
    dummy.position.copy(c.p); dummy.rotation.copy(c.r); dummy.scale.setScalar(1); dummy.updateMatrix(); confMesh.setMatrixAt(i,dummy.matrix); }
  confMesh.instanceMatrix.needsUpdate=true;
  return any;
}
const dispatches=[];
const orbGeo=new THREE.SphereGeometry(0.22,12,8);
function dispatch(from,to,onArrive){
  const a=from.g.position.clone().setY(2.3), b=to.g.position.clone().setY(2.3);
  const mid=a.clone().lerp(b,0.5); mid.y+=5+a.distanceTo(b)*0.15;
  const curve=new THREE.QuadraticBezierCurve3(a,mid,b);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),new THREE.LineDashedMaterial({color:'#fbbf24',dashSize:0.4,gapSize:0.25,transparent:true,opacity:0.9}));
  line.computeLineDistances(); scene.add(line);
  const orb=new THREE.Mesh(orbGeo,new THREE.MeshBasicMaterial({color:'#fde047'})); scene.add(orb);
  const halo=new THREE.Mesh(orbGeo,new THREE.MeshBasicMaterial({color:'#fbbf24',transparent:true,opacity:0.35})); halo.scale.setScalar(2); orb.add(halo);
  dispatches.push({curve,line,orb,t:0,dur:1.3,onArrive,fade:0});
}
function updateDispatch(dt){
  for(let i=dispatches.length-1;i>=0;i--){ const d=dispatches[i];
    if(d.t<1){ d.t=Math.min(1,d.t+dt/d.dur); d.orb.position.copy(d.curve.getPoint(d.t)); if(d.t>=1){ d.onArrive?.(); scene.remove(d.orb); } }
    else { d.fade+=dt; d.line.material.opacity=Math.max(0,0.9-d.fade*1.2); if(d.fade>0.8){ scene.remove(d.line); d.line.geometry.dispose(); dispatches.splice(i,1);} }
  }
}

// ---------- 演示模式：状态自动轮换 ----------
let demoOn=true;
const NEXT={ working:[['done',3],['thinking',2],['browsing',2],['help',1],['working',1]],
  thinking:[['working',4],['browsing',2],['help',1]], browsing:[['working',3],['thinking',2],['done',1]],
  help:[['working',3],['thinking',1]], done:[['idle',4],['working',2]], idle:[['idle',2],['working',1]] };
function weighted(list){ const tot=list.reduce((s,[,w])=>s+w,0); let r=Math.random()*tot; for(const [k,w] of list){ if((r-=w)<=0) return k; } return list[0][0]; }
function demoTick(){
  if(!demoOn) return;
  const crew=bots.filter(b=>!b.def.director && !b.place.startsWith('walking'));
  const n=1+(Math.random()<0.5?1:0);
  for(let k=0;k<n;k++){ const b=pick(crew); if(!b) continue; let st=weighted(NEXT[b.status]); if(st===b.status) continue;
    if(st==='working' && (b.status==='idle'||b.status==='done')) { doDispatch(b); continue; }
    setStatus(b,st,(st==='working'||st==='thinking'||st==='browsing')?pick(b.def.tasks):null); }
}
function doDispatch(target){
  const g=bots.find(b=>b.def.director); if(!g||!target) return;
  const task=pick(target.def.tasks);
  setStatus(g,'working','分派：'+task+' → '+target.def.name.split('·')[0]);
  dispatch(g,target,()=>{ setStatus(target,'working',task); });
}
function directorTick(){
  if(!demoOn) return;
  const candidates=bots.filter(b=>!b.def.director&&(b.status==='idle'||b.status==='done'||b.status==='help')&&!b.place.startsWith('walking'));
  if(candidates.length) doDispatch(pick(candidates));
  else { const g=bots.find(b=>b.def.director); setStatus(g,pick(['thinking','browsing','working']),pick(g.def.tasks)); }
}

// ---------- 侧边栏与卡片 ----------
const listEl=document.getElementById('botList'); const liMap=new Map();
function buildList(){
  document.getElementById('legend').innerHTML=Object.values(STATUS).map(x=>`<span><i style="background:${x.color}"></i>${x.label}</span>`).join('');
  for(const b of bots){ const li=document.createElement('li');
    li.innerHTML=`<span class="dot" style="background:${b.def.color}"></span><span class="nm">${b.def.name}<small>${b.def.role}</small></span><span class="badge"></span>`;
    li.onclick=()=>{ select(b); if(isMobile) document.getElementById('panel').classList.remove('open'); }; listEl.appendChild(li); liMap.set(b,li); }
}
function refreshList(b){ const li=liMap.get(b); if(!li) return; const s=STATUS[b.status]; const bd=li.querySelector('.badge'); bd.textContent=s.label; bd.style.background=s.color; li.title=b.task; updateSummary(); }
function updateSummary(){ const busy=bots.filter(b=>['working','thinking','browsing'].includes(b.status)).length; document.getElementById('summary').textContent=`${bots.length} 位 · ${busy} 位忙碌`; }
let selected=null; const card=document.getElementById('card');
function showCard(b){ const s=STATUS[b.status];
  document.getElementById('cardDot').style.background=b.def.color; document.getElementById('cardName').textContent=b.def.name;
  document.getElementById('cardRole').textContent=b.def.role; const cs=document.getElementById('cardStatus'); cs.innerHTML=`<span class="badge" style="background:${s.color}">${s.label}</span>`;
  document.getElementById('cardTask').textContent=b.task; card.classList.remove('hidden'); }
function select(b){ if(selected){ selected.el.classList.remove('sel'); selected.dirty=true; liMap.get(selected)?.classList.remove('sel'); }
  selected=b; if(!b){ card.classList.add('hidden'); return; } b.el.classList.add('sel'); b.dirty=true; liMap.get(b)?.classList.add('sel'); showCard(b); }
document.getElementById('cardClose').onclick=()=>select(null);
const ray=new THREE.Raycaster(); const ptr=new THREE.Vector2(); let downAt=null;
renderer.domElement.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>8) return;
  ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ptr,camera);
  const h=ray.intersectObjects(hitMeshes,false)[0]; select(h?h.object.userData.bot:null);
});

// ---------- 控件 ----------
let night=false;
const btnDay=document.getElementById('btnDay'), btnDemo=document.getElementById('btnDemo');
function applyNight(){
  document.body.classList.toggle('night',night); btnDay.textContent=night?'☀️ 白天':'🌙 夜间';
  scene.background.copy(night?NIGHT_BG:DAY_BG);
  hemi.intensity=night?0.32:1.45; hemi.color.set(night?'#ffcf9e':'#fff3e2'); hemi.groundColor.set(night?'#3a2a1e':'#8f8070');
  sun.intensity=night?0.12:2.1; sun.color.set(night?'#ffcf9e':'#ffe6c4');
  for(const l of lamps) l.intensity=night?26:0;
  for(const m of glowMats) m.emissiveIntensity=night?m.userData.night:m.userData.day;
  for(const m of viewMats) m.color.set(night?'#5a6585':'#ffffff');   // 夜景：整体压暗偏蓝
  if(cityLightsMat) cityLightsMat.opacity=night?1:0;                   // 楼宇暖色窗灯
}
btnDay.onclick=()=>{night=!night; applyNight();};
btnDemo.onclick=()=>{demoOn=!demoOn; btnDemo.classList.toggle('on',demoOn); btnDemo.textContent=demoOn?'▶ 演示模式：开':'⏸ 演示模式：关';};
document.getElementById('btnList').onclick=()=>document.getElementById('panel').classList.toggle('open');

// ---------- 主循环 ----------
const clock=new THREE.Clock(); const tmp=new THREE.Vector3();
function updateBots(dt,t){
  for(const b of bots){
    if(b.path.length){
      const tgt=b.path[0]; tmp.copy(tgt).sub(b.pos); tmp.y=0; const d=tmp.length(); const step=3.2*dt;
      if(d<=step){ b.pos.copy(tgt); b.path.shift(); if(!b.path.length){ b.place=b.place==='walking-lounge'?'lounge':'desk'; } }
      else { tmp.normalize(); b.pos.addScaledVector(tmp,step); b.g.rotation.y=Math.atan2(tmp.x,tmp.z); }
      b.g.position.set(b.pos.x,Math.abs(Math.sin(t*10+b.phase))*0.12,b.pos.z);
      b.body.rotation.z=Math.sin(t*10+b.phase)*0.08;
    } else {
      const atLounge=b.place==='lounge'; const sofa=atLounge&&loungeSpots[b.spot]?.[2];
      const libS=atLounge&&loungeSpots[b.spot]?.[3]==='lib';
      const targetRot = atLounge ? (sofa? Math.PI : libS ? Math.atan2(-5.8-b.pos.x, 9.8-b.pos.z) : Math.atan2(-15.5-b.pos.x, 8.2-b.pos.z)) : 0;
      b.g.rotation.y += (targetRot-b.g.rotation.y)*Math.min(1,dt*6);
      b.body.rotation.z=0;
      let y=0; if(b.status==='working') y=Math.abs(Math.sin(t*6+b.phase))*0.05;
      else if(b.status==='thinking'){ b.head.rotation.z=Math.sin(t*1.5+b.phase)*0.2; }
      else if(b.status==='help') y=Math.abs(Math.sin(t*4+b.phase))*0.25;
      else if(b.status==='done') y=Math.max(0,Math.sin((performance.now()-b.doneAt)/120))*0.4*Math.max(0,1-(performance.now()-b.doneAt)/2000);
      if(b.status!=='thinking') b.head.rotation.z*=0.9;
      b.g.position.set(b.pos.x,(sofa?0.15:0)+y,b.pos.z);
    }
    b.bulb.material.emissiveIntensity=0.6+Math.sin(t*4+b.phase)*0.4;
  }
}
// ---------- 标签防重叠 ----------
const _v=new THREE.Vector3(); let detailMode=null;
function layoutLabels(){
  const W=innerWidth,H=innerHeight;
  const detail = camera.zoom>=1.7;
  if(detail!==detailMode){ detailMode=detail; labelLayer.classList.toggle('detail',detail); bots.forEach(b=>b.dirty=true); roomList.forEach(r=>r.w=0); }
  const placed=[];
  for(const r of roomList){ if(!r.w){ r.w=r.el.offsetWidth; r.h=r.el.offsetHeight; } _v.copy(r.pos).project(camera);
    const x=(_v.x+1)/2*W, y=(1-_v.y)/2*H; placed.push([x-r.w/2,y-r.h/2,x+r.w/2,y+r.h/2]); }
  const items=[];
  for(const b of bots){ if(b.dirty){ b.lw=b.el.offsetWidth; b.lh=b.el.offsetHeight; b.dirty=false; }
    _v.set(b.g.position.x,b.g.position.y+2.35,b.g.position.z).project(camera);
    items.push({b,ax:(_v.x+1)/2*W, ay:(1-_v.y)/2*H}); }
  // 选中的优先，其次离镜头近（屏幕靠下）的优先放置
  items.sort((p,q)=> (q.b===selected)-(p.b===selected) || q.ay-p.ay);
  const gap=2;
  const hit=(x0,y0,x1,y1)=>{ for(const r of placed) if(x0<r[2]+gap && x1>r[0]-gap && y0<r[3]+gap && y1>r[1]-gap) return true; return false; };
  for(const it of items){ const {b,ax,ay}=it, w=b.lw, h=b.lh;
    let best=null;
    const tryAt=(dx,dy)=>{ const x0=Math.min(Math.max(ax+dx-w/2,4),W-w-4), y1=ay+dy; return hit(x0,y1-h,x0+w,y1)?null:[x0+w/2-ax,dy]; };
    best=tryAt(0,0) || (b.hasT ? tryAt(b.tx,b.ty) : null);   // 先试原位，再试上一帧位置（避免来回跳动）
    if(!best) outer: for(let k=0;k<9;k++){ for(const dx of [0,-0.6*w,0.6*w,-1.15*w,1.15*w]){ if(k===0&&Math.abs(dx)>0.7*w) continue;
      const x0=Math.min(Math.max(ax+dx-w/2,4),W-w-4), y1=ay-k*(h+gap+1), y0=y1-h;
      if(!hit(x0,y0,x0+w,y1)){ best=[x0+w/2-ax,-k*(h+gap+1)]; break outer; } } }
    if(!best) best=[Math.min(Math.max(ax-w/2,4),W-w-4)+w/2-ax,0];
    it.tx=best[0]; it.ty=best[1]; b.tx=best[0]; b.ty=best[1]; b.hasT=true;
    placed.push([ax+it.tx-w/2, ay+it.ty-h, ax+it.tx+w/2, ay+it.ty]);
  }
  leaderCtx.clearRect(0,0,W,H);
  for(const it of items){ const b=it.b;
    // 目标位置已保证不重叠；上一帧位置优先，避免跳动
    b.ox=it.tx; b.oy=it.ty;
    const lx=it.ax+b.ox-b.lw/2, ly=it.ay+b.oy-b.lh;
    b.el.style.transform=`translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)`;
    b.el.style.zIndex = b===selected ? 1000 : Math.round(it.ay);
    if(Math.abs(b.ox)>3||Math.abs(b.oy)>3){
      const ex=it.ax+b.ox, ey=it.ay+b.oy;
      leaderCtx.strokeStyle= night?'rgba(243,201,141,.75)':'rgba(59,36,22,.6)'; leaderCtx.lineWidth=1;
      leaderCtx.beginPath(); leaderCtx.moveTo(it.ax,it.ay+6); leaderCtx.lineTo(ex,ey); leaderCtx.stroke();
      leaderCtx.fillStyle=leaderCtx.strokeStyle; leaderCtx.beginPath(); leaderCtx.arc(it.ax,it.ay+6,1.8,0,Math.PI*2); leaderCtx.fill();
    }
  }
}
function animate(){
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  controls.update(); updateBots(dt,t); updateConfetti(dt); updateDispatch(dt);
  renderer.render(scene,camera); labelRenderer.render(scene,camera); layoutLabels();
}

// ---------- 启动 ----------
(async function init(){
  DATA=await loadData(); STATUS=DATA.statuses||FALLBACK.statuses;
  if(DATA.title) document.getElementById('title').textContent=DATA.title;
  const dirDef=DATA.bots.find(b=>b.director)||DATA.bots[0];
  const crew=DATA.bots.filter(b=>b!==dirDef);
  makeBot(dirDef,{x:-15.5,z:-9.75},dirDesk);
  crew.slice(0,deskSlots.length).forEach((def,i)=>{ const s=deskSlots[i]; const dk=desk(s.x,s.z); makeBot(def,{x:s.x,z:s.z-1.15},dk); });
  buildList();
  const init=['working','working','thinking','browsing','working','thinking','working','browsing','help','working','done','thinking'];
  bots.forEach((b,i)=>setStatus(b, b.def.director?'working':(i%6===5?'idle':init[i%init.length]), pick(b.def.tasks)));
  // 空闲者直接放到休息区
  for(const b of bots) if(b.status==='idle'&&b.path.length){ const last=b.path[b.path.length-1]; b.pos.copy(last); b.path=[]; b.place='lounge'; }
  confParts.length=CONF_MAX; confParts.fill(null);
  setInterval(demoTick,2600); setInterval(directorTick,6500);
  setTimeout(directorTick,1500);
  renderer.setAnimationLoop(animate);
  setTimeout(()=>document.getElementById('loading').classList.add('gone'),200);
  window.__office={bots,setStatus,camera,controls,THREE};
  window.__officeReady=true;
})();
