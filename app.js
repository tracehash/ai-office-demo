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
  ].map(([id,name,role,color,tasks],i)=>({id,name,role,color,tasks,director:i===0}))
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

const scene = new THREE.Scene();
const DAY_BG = new THREE.Color('#dfe9f2'), NIGHT_BG = new THREE.Color('#0f172a');
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
}
resize(); addEventListener('resize', resize);

const hemi = new THREE.HemisphereLight('#ffffff','#b9c4cf',1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6e8', 2.2);
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
function roomLabel(text,x,y,z){ const d=document.createElement('div'); roomEls[text]=d; d.className='room'; d.textContent=text; const o=new CSS2DObject(d); o.position.set(x,y,z); scene.add(o); }

// ---------- 地面与墙 ----------
const FX=20, FZ=13;
box(FX*2+0.6,0.5,FZ*2+0.6,'#c9b79c',0,-0.25,0); // 底座
const floor = box(FX*2,0.06,FZ*2,'#efe6d8',0,0.03,0);
// 区域地毯
box(9,0.04,9,'#d6e4f0',-15.5,0.08,-8.5);    // 总监室
box(9,0.04,9,'#e4dcef',15.5,0.08,-8.5);     // 会议室
box(9,0.04,10.5,'#dcefdc',-15.5,0.08,7.6);  // 休息区
box(9,0.04,10.5,'#f3e3cf',15.5,0.08,7.6);   // 茶水间
// 外墙（后、左）
box(FX*2,3.2,0.4,'#f7f3ec',0,1.6,-FZ-0.2);
box(0.4,3.2,FZ*2+0.4,'#f7f3ec',-FX-0.2,1.6,0);
// 墙上的窗
const winMat = new THREE.MeshStandardMaterial({color:'#bfe3ff', emissive:'#000000', roughness:0.3});
const windows=[];
for(const x of [-6,-1,4]){ const w = new THREE.Mesh(new THREE.BoxGeometry(3.2,1.6,0.08),winMat); w.position.set(x,1.9,-FZ+0.02); scene.add(w); windows.push(w); }
for(const z of [-1, 4]){ const w = new THREE.Mesh(new THREE.BoxGeometry(0.08,1.6,3),winMat); w.position.set(-FX+0.02,1.9,z); scene.add(w); }
// 玻璃隔断
const glass = M('#a8d8e8',{transparent:true,opacity:0.35,roughness:0.1});
function glassWall(w,d,x,z){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,2.2,d),glass); m.position.set(x,1.1,z); scene.add(m); box(w+0.02,0.12,d+0.02,'#7a8b99',x,2.2,z); box(w+0.02,0.1,d+0.02,'#7a8b99',x,0.05,z); }
glassWall(9,0.1,-15.5+1.5,-4); glassWall(0.1,9,-11,-8.5);   // 总监室（门在左侧）
glassWall(0.1,9,11,-8.5); glassWall(6,0.1,14,-4);            // 会议室（门在右侧）
// 低矮隔断
box(9,0.9,0.25,'#d9cbb5',-15.5,0.45,2.2);
box(9,0.9,0.25,'#d9cbb5',15.5,0.45,2.2);
box(0.25,0.9,4,'#d9cbb5',11,0.45,11);

roomLabel('总监室',-15.5,2.9,-4); roomLabel('会议室',15.5,1.2,-8.5); roomLabel('开放工位区',0,0.2,5.2);
roomLabel('休息区',-15.5,1.4,2.2); roomLabel('茶水间',14.5,0.3,7.2);

// ---------- 家具 ----------
const screens = [];
function desk(x,z,{w=1.8,top='#c8a27a',dir=false}={}){
  const g = new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  box(w,0.1,1,top,0,0.78,0,g);
  for(const sx of [-w/2+0.08,w/2-0.08]) for(const sz of [-0.42,0.42]) box(0.08,0.75,0.08,'#6b5b4b',sx,0.38,sz,g);
  // 显示器（朝向坐在后面的 Bot）
  box(0.1,0.35,0.1,'#374151',0,0.98,-0.05,g);
  const scrMat = new THREE.MeshStandardMaterial({color:'#111827', emissive:'#2f9e5b', emissiveIntensity:0.6});
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.95,0.55,0.06), scrMat); s.position.set(0,1.38,-0.08); s.castShadow=true; g.add(s);
  box(0.5,0.04,0.2,'#e5e7eb',0,0.85,-0.32,g); // 键盘
  if(dir){ box(0.3,0.25,0.3,'#16a34a',w/2-0.3,0.95,0.25,g); }
  else { cyl(0.12,0.1,0.22,pick(['#f87171','#60a5fa','#fbbf24','#34d399']),w/2-0.25,0.94,0.25,g,8); }
  // 椅子
  const c = new THREE.Group(); c.position.set(0,0,-0.95); g.add(c);
  box(0.7,0.1,0.65,'#4b5563',0,0.48,0,c); box(0.7,0.7,0.1,'#4b5563',0,0.85,-0.32,c); cyl(0.05,0.05,0.45,'#9ca3af',0,0.23,0,c,6);
  return {group:g, screen:scrMat};
}
// 总监室：大桌、书架、绿植
const dirDesk = desk(-15.5,-8.6,{w:2.6,top:'#8b5e3c',dir:true});
box(0.5,2.4,3,'#8b5e3c',-19.5,1.2,-9.5);
for(let i=0;i<4;i++) for(let j=0;j<3;j++) box(0.3,0.42,0.22,pick(['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6']),-19.25,0.35+i*0.55,-10.6+j*0.9+rand(-.1,.1));
function plant(x,z,s=1){ cyl(0.3*s,0.24*s,0.55*s,'#c2703d',x,0.28*s,z,scene,10); const f=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55*s,0),M('#3f9b4f',{flatShading:true})); f.position.set(x,0.95*s,z); f.castShadow=true; scene.add(f); const f2=f.clone(); f2.scale.setScalar(0.7); f2.position.y+=0.55*s; scene.add(f2); }
plant(-12,-12,1.1); plant(-19,-5,1);
// 会议室：长桌、椅子、行情大屏
box(5.2,0.12,2.4,'#f1f5f9',15.5,0.8,-7.8);
cyl(0.25,0.4,0.78,'#94a3b8',14,0.39,-7.8); cyl(0.25,0.4,0.78,'#94a3b8',17,0.39,-7.8);
for(const x of [13.5,15.5,17.5]) for(const z of [-9.6,-6]){ box(0.6,0.1,0.6,'#6366f1',x,0.48,z); box(0.6,0.55,0.1,'#6366f1',x,0.78,z+(z<-8?-0.3:0.3)); }
const btcCanvas = document.createElement('canvas'); btcCanvas.width=1024; btcCanvas.height=512;
const btcTex = new THREE.CanvasTexture(btcCanvas); btcTex.colorSpace = THREE.SRGBColorSpace; btcTex.anisotropy = 4;
box(6.6,3.4,0.15,'#111827',15.5,2.9,-12.85);
const btcScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.3,3.15), new THREE.MeshBasicMaterial({map:btcTex, toneMapped:false}));
btcScreen.position.set(15.5,2.9,-12.76); scene.add(btcScreen);
// 开放工位
const deskSlots=[]; const cols=[-8,-4.8,-1.6,1.6,4.8,8], rows=[-8.6,-3,2.6];
for(const z of rows) for(const x of cols) deskSlots.push({x,z});
plant(-9.3,-12,1); plant(9.3,-12,1); plant(9.3,4.5,0.9);
// 休息区：沙发、茶几、豆袋、地毯
const sofaC='#f59e0b';
box(4.6,0.5,1.2,sofaC,-15.5,0.35,10.6); box(4.6,0.9,0.35,sofaC,-15.5,0.75,11.25); box(0.35,0.7,1.2,sofaC,-17.95,0.6,10.6); box(0.35,0.7,1.2,sofaC,-13.05,0.6,10.6);
for(const x of [-16.8,-15.5,-14.2]) box(1.1,0.18,1.0,'#fbbf24',x,0.68,10.5);
box(2.2,0.1,1.1,'#ffffff',-15.5,0.5,8.1); cyl(0.08,0.08,0.45,'#9ca3af',-15.5,0.25,8.1,scene,6);
const rug=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,0.03,24),M('#fde68a')); rug.position.set(-15.5,0.11,8.6); rug.receiveShadow=true; scene.add(rug);
for(const [x,z,c] of [[-18.6,6,'#f472b6'],[-12.6,6.2,'#60a5fa']]){ const b=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,8),M(c)); b.scale.set(1,0.6,1); b.position.set(x,0.38,z); b.castShadow=true; scene.add(b); }
plant(-19.2,12.2,1.1);
// 茶水间：吧台、咖啡机、冰箱、绿植、标牌
box(6,1,1,'#ffffff',15.5,0.5,12.3); box(6.1,0.08,1.1,'#94a3b8',15.5,1.04,12.3);
box(0.7,0.8,0.6,'#1f2937',14,1.48,12.3); box(0.4,0.12,0.2,'#ef4444',14,1.6,11.98); cyl(0.12,0.1,0.18,'#ffffff',14,1.17,11.85,scene,10);
for(const x of [16.4,16.8,17.2]) cyl(0.09,0.08,0.18,pick(['#f87171','#38bdf8','#fde047']),x,1.17,12.2,scene,8);
box(1.1,2.2,1,'#e2e8f0',19.2,1.1,11.8);
for(const x of [13.8,15.5,17.2]){ cyl(0.35,0.35,0.08,'#ef4444',x,0.85,10.4,scene,14); cyl(0.05,0.05,0.8,'#9ca3af',x,0.4,10.4,scene,6); }
plant(12,12.2,1.2); plant(19.3,3.2,1);
const signCanvas=document.createElement('canvas'); signCanvas.width=512; signCanvas.height=160;
{ const c=signCanvas.getContext('2d'); c.fillStyle='#0c6a6e'; c.fillRect(0,0,512,160); c.strokeStyle='#fde68a'; c.lineWidth=8; c.strokeRect(10,10,492,140);
  c.fillStyle='#fff'; c.font='bold 64px "Noto Sans CJK SC","PingFang SC",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('31V 的 AI 团队',256,84); }
const signTex=new THREE.CanvasTexture(signCanvas); signTex.colorSpace=THREE.SRGBColorSpace;
box(0.12,2.4,0.12,'#6b7280',15.5,1.2,3.6);
const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1),new THREE.MeshBasicMaterial({map:signTex,toneMapped:false}));
sign.position.set(15.5,2.55,3.67); scene.add(sign);
const signBack=box(3.3,1.08,0.08,'#374151',15.5,2.55,3.6);

// 夜灯
const lamps=[]; const lampBulbMat=new THREE.MeshStandardMaterial({color:'#fff7d6',emissive:'#ffcf6b',emissiveIntensity:0});
for(const [x,z] of [[-15.5,-8.5],[15.5,-8],[-15.5,8],[15.5,8],[0,-3]]){
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8),lampBulbMat); b.position.set(x,3.6,z); scene.add(b);
  const l=new THREE.PointLight('#ffd58a',0,16,1.2); l.position.set(x,3.4,z); scene.add(l); lamps.push(l);
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
const loungeSpots=[[-17.2,10.4,true],[-13.8,10.4,true],[-18.6,7.4],[-12.6,7.8],[-17.6,4.6],[-13.4,4.8],[-15.5,10.4,true],[-19,10.5],[-12.3,10.6],[-15.5,6.2]];
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
  el.innerHTML=`<span class="st"></span><span class="nmtag">${def.name}<i>${def.role}</i></span>`;
  const lbl=new CSS2DObject(el); lbl.position.y=2.55; g.add(lbl);
  const bot={def,g,body,head,bulb,hit,el,seat,desk:deskObj,status:'working',task:pick(def.tasks),pos:new THREE.Vector3(seat.x,0,seat.z),path:[],place:'desk',spot:null,next:0,phase:Math.random()*6,doneAt:0};
  hit.userData.bot=bot;
  el.addEventListener('click',ev=>{ev.stopPropagation(); select(bot);});
  g.position.copy(bot.pos);
  hitMeshes.push(hit); bots.push(bot);
  return bot;
}

function setStatus(bot,st,task){
  bot.status=st; if(task) bot.task=task;
  if(st==='idle') bot.task='在休息区放松一下';
  const s=STATUS[st];
  const badge=bot.el.querySelector('.st'); badge.textContent=s.label; badge.style.background=s.color;
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
  bot.path=[a,new THREE.Vector3(CORRIDOR_X,0,a.z),new THREE.Vector3(CORRIDOR_X,0,4.2),new THREE.Vector3(-12,0,4.2),new THREE.Vector3(sx,0,sz)];
  bot.place='walking-lounge';
}
function goDesk(bot){
  const a=seatAisle(bot);
  const start=bot.place==='lounge'||bot.place==='walking-lounge';
  if(bot.spot!=null){ loungeTaken.delete(bot.spot); bot.spot=null; }
  bot.path= start ? [new THREE.Vector3(-12,0,4.2),new THREE.Vector3(CORRIDOR_X,0,4.2),new THREE.Vector3(CORRIDOR_X,0,a.z),a,new THREE.Vector3(bot.seat.x,0,bot.seat.z)] : [new THREE.Vector3(bot.seat.x,0,bot.seat.z)];
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
function select(b){ if(selected){ selected.el.classList.remove('sel'); liMap.get(selected)?.classList.remove('sel'); }
  selected=b; if(!b){ card.classList.add('hidden'); return; } b.el.classList.add('sel'); liMap.get(b)?.classList.add('sel'); showCard(b); }
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
  hemi.intensity=night?0.35:1.6; hemi.color.set(night?'#8aa0d6':'#ffffff');
  sun.intensity=night?0.35:2.2; sun.color.set(night?'#9db4ff':'#fff6e8');
  for(const l of lamps) l.intensity=night?22:0; lampBulbMat.emissiveIntensity=night?1.5:0;
  winMat.color.set(night?'#1e2a4a':'#bfe3ff'); winMat.emissive.set(night?'#24345e':'#000000');
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
      const targetRot = atLounge ? (sofa? Math.PI : Math.atan2(-15.5-b.pos.x, 8.2-b.pos.z)) : 0;
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
function animate(){
  const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
  controls.update(); updateBots(dt,t); updateConfetti(dt); updateDispatch(dt);
  renderer.render(scene,camera); labelRenderer.render(scene,camera);
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
  window.__officeReady=true;
})();
