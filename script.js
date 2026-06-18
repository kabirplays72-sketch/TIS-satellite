/* ══ THEME ══ */
function toggleTheme(){
  const h=document.documentElement;
  const dark=h.getAttribute('data-theme')==='dark';
  h.setAttribute('data-theme',dark?'light':'dark');
  updateSceneBg();
}

/* ══ STATE ══ */
let altOffset=0,rawAlt=0;
let compassOffset=0,intYaw=0,lastYaw=null;
let mapMarker,mapLine;
const pathCoords=[];
let pktCount=0,demoInterval=null;
let lastPktTime=null,pktTimes=[];
const stats={mxT:null,miT:null,mxA:null,miA:null,mxR:null,mxP:null,mxPr:null,miPr:null};

function resetStats(){
  Object.keys(stats).forEach(k=>stats[k]=null);
  ['st-mxt','st-mit','st-mxa','st-mia','st-mxr','st-mxp','st-mxpr'].forEach(id=>{
    document.getElementById(id).textContent='—';
  });
  logM('sys','Session stats reset.');
}

/* ══ 3D 1U MODEL — camera pulled back more ══ */
const cont=document.getElementById('csat');
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(38,1,0.1,1000);
const ren=new THREE.WebGLRenderer({antialias:true,alpha:true});
ren.setPixelRatio(window.devicePixelRatio);
cont.appendChild(ren.domElement);

function resizeRenderer(){
  ren.setSize(cont.clientWidth,cont.clientHeight);
  cam.aspect=cont.clientWidth/cont.clientHeight;
  cam.updateProjectionMatrix();
}
resizeRenderer();
new ResizeObserver(resizeRenderer).observe(cont);

function updateSceneBg(){
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  scene.background=new THREE.Color(dark?0x080d14:0xd4dce8);
}
updateSceneBg();

scene.add(new THREE.AmbientLight(0xffffff,0.5));
const dl=new THREE.DirectionalLight(0x99bbff,1.1);dl.position.set(3,5,4);scene.add(dl);
const fl=new THREE.DirectionalLight(0xffffff,0.25);fl.position.set(-3,-2,-2);scene.add(fl);

/* ── Main 1U body: rectangular box 1.5w x 1.8h x 1.0d ── */
const bodyG=new THREE.BoxGeometry(1.5,1.8,1.0);
const bodyM=[
  new THREE.MeshPhongMaterial({color:0x2d3f52,shininess:90}),
  new THREE.MeshPhongMaterial({color:0x253344,shininess:90}),
  new THREE.MeshPhongMaterial({color:0x1a2a3a,shininess:60}),
  new THREE.MeshPhongMaterial({color:0x1a2a3a,shininess:60}),
  new THREE.MeshPhongMaterial({color:0x1e3a5f,shininess:90}),
  new THREE.MeshPhongMaterial({color:0x1a3050,shininess:90}),
];
const cube=new THREE.Mesh(bodyG,bodyM);
scene.add(cube);
cube.add(new THREE.LineSegments(
  new THREE.EdgesGeometry(bodyG),
  new THREE.LineBasicMaterial({color:0x4488cc,linewidth:1})
));

/* ── Top solar panel array: 3 rectangular cells ── */
(function(){
  const panelY=0.91;
  [-0.44,0,0.44].forEach((ox,i)=>{
    const pg=new THREE.BoxGeometry(0.38,0.04,0.28);
    const pm=new THREE.Mesh(pg,new THREE.MeshPhongMaterial({color:0x0d47a1,shininess:200,specular:0x4488ff}));
    pm.position.set(ox,panelY,0);cube.add(pm);
    // cell grid lines
    const eg=new THREE.LineSegments(new THREE.EdgesGeometry(pg),new THREE.LineBasicMaterial({color:0x58a6ff}));
    eg.position.set(ox,panelY,0);cube.add(eg);
    // horizontal dividers on face
    for(let r=1;r<3;r++){
      const lp=new THREE.PlaneGeometry(0.36,0.003);
      const lm=new THREE.Mesh(lp,new THREE.MeshBasicMaterial({color:0x58a6ff}));
      lm.rotation.x=-Math.PI/2;
      lm.position.set(ox,panelY+0.022,(r-1.5)*0.09);
      cube.add(lm);
    }
  });
})();

/* ── Bottom solar panel: single large rect ── */
(function(){
  const pg=new THREE.BoxGeometry(1.3,0.04,0.85);
  const pm=new THREE.Mesh(pg,new THREE.MeshPhongMaterial({color:0x0d47a1,shininess:180,specular:0x4488ff}));
  pm.position.set(0,-0.92,0);cube.add(pm);
  const el=new THREE.LineSegments(new THREE.EdgesGeometry(pg),new THREE.LineBasicMaterial({color:0x58a6ff}));el.position.copy(pm.position);cube.add(el);
})();

/* ── Side PCB board (right face) ── */
(function(){
  const bg=new THREE.BoxGeometry(0.04,1.5,0.8);
  const bm=new THREE.Mesh(bg,new THREE.MeshPhongMaterial({color:0x1b5e20,shininess:120}));
  bm.position.set(0.77,0,0);cube.add(bm);
  const el2=new THREE.LineSegments(new THREE.EdgesGeometry(bg),new THREE.LineBasicMaterial({color:0x66bb6a}));el2.position.copy(bm.position);cube.add(el2);
  // component rectangles on PCB
  [[0.2,0.1],[0.12,0.07],[0.08,0.08]].forEach(([w,h],i)=>{
    const cg=new THREE.BoxGeometry(0.01,w,h);
    const cm=new THREE.Mesh(cg,new THREE.MeshPhongMaterial({color:[0xf57f17,0x880e4f,0x1565c0][i],shininess:150}));
    cm.position.set(0.79,[0.3,-0.1,-0.4][i],[0.1,0,-0.1][i]);cube.add(cm);
  });
})();

/* ── Antenna: thin tall rect rod on top ── */
(function(){
  const ag=new THREE.BoxGeometry(0.06,0.55,0.06);
  const am=new THREE.Mesh(ag,new THREE.MeshPhongMaterial({color:0x90a4ae,shininess:200,specular:0xffffff}));
  am.position.set(0.5,1.19,0);cube.add(am);
  // Antenna tip sphere replaced with small cube cap
  const capG=new THREE.BoxGeometry(0.12,0.06,0.12);
  const cap=new THREE.Mesh(capG,new THREE.MeshPhongMaterial({color:0xffd54f,shininess:200}));
  cap.position.set(0.5,1.47,0);cube.add(cap);
})();

/* ── Camera module: small square on front face ── */
(function(){
  const cg=new THREE.BoxGeometry(0.18,0.18,0.06);
  const cm=new THREE.Mesh(cg,new THREE.MeshPhongMaterial({color:0x111111,shininess:300,specular:0xaaaaaa}));
  cm.position.set(-0.3,0.5,0.53);cube.add(cm);
  const lensg=new THREE.BoxGeometry(0.1,0.1,0.04);
  const lens=new THREE.Mesh(lensg,new THREE.MeshPhongMaterial({color:0x0d47a1,shininess:400,specular:0x88aaff}));
  lens.position.set(-0.3,0.5,0.56);cube.add(lens);
})();

/* ── GPS module: flat square on top ── */
(function(){
  const gg=new THREE.BoxGeometry(0.28,0.06,0.28);
  const gm=new THREE.Mesh(gg,new THREE.MeshPhongMaterial({color:0x37474f,shininess:80}));
  gm.position.set(-0.4,0.94,0.2);cube.add(gm);
  const el3=new THREE.LineSegments(new THREE.EdgesGeometry(gg),new THREE.LineBasicMaterial({color:0x80cbc4}));el3.position.copy(gm.position);cube.add(el3);
})();

/* ── Indian flag texture on front face (top-centre) ── */
(function(){
  const c=document.createElement('canvas');c.width=128;c.height=84;
  const cx=c.getContext('2d');
  cx.clearRect(0,0,128,84);
  // Flag bands: saffron, white, green
  cx.fillStyle='#FF9933';cx.fillRect(0,0,128,28);
  cx.fillStyle='#FFFFFF';cx.fillRect(0,28,128,28);
  cx.fillStyle='#138808';cx.fillRect(0,56,128,28);
  // Ashoka Chakra (blue circle with 24 spokes)
  const fx=64,fy=42,fr=11;
  cx.strokeStyle='#000080';cx.lineWidth=1.5;
  cx.beginPath();cx.arc(fx,fy,fr,0,Math.PI*2);cx.stroke();
  for(let i=0;i<24;i++){
    const a=i*Math.PI*2/24;
    cx.beginPath();
    cx.moveTo(fx+Math.cos(a)*2,fy+Math.sin(a)*2);
    cx.lineTo(fx+Math.cos(a)*fr,fy+Math.sin(a)*fr);
    cx.stroke();
  }
  const flagTex=new THREE.CanvasTexture(c);
  const flag=new THREE.Mesh(
    new THREE.PlaneGeometry(0.55,0.36),
    new THREE.MeshBasicMaterial({map:flagTex,transparent:true,depthWrite:false,side:THREE.DoubleSide})
  );
  flag.position.set(0,0.42,0.712);// top-centre of front face
  cube.add(flag);
})();

/* ── "SkyNode" label on front face, below flag ── */
(function(){
  const c=document.createElement('canvas');c.width=256;c.height=56;
  const cx=c.getContext('2d');
  cx.clearRect(0,0,256,56);
  cx.font='bold 26px Inter,system-ui,sans-serif';
  cx.textAlign='left';cx.textBaseline='middle';
  // Measure "Sky" to position "Node" right after it
  const skyW=cx.measureText('Sky').width;
  const totalW=cx.measureText('SkyNode').width;
  const startX=(256-totalW)/2;
  cx.fillStyle='#58a6ff'; // blue for "Sky"
  cx.fillText('Sky',startX,28);
  cx.fillStyle='rgba(255,255,255,0.9)'; // white for "Node"
  cx.fillText('Node',startX+skyW,28);
  const tex=new THREE.CanvasTexture(c);
  const lbl=new THREE.Mesh(
    new THREE.PlaneGeometry(1.1,.28),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide})
  );
  lbl.position.set(0,0.08,0.712);// just below flag
  cube.add(lbl);
})();

/* ── Face name labels (FRONT/BACK/LEFT/RIGHT/TOP/BOT) ── */
function makeFaceLabel(text,pos,rotY,rotX){
  const c=document.createElement('canvas');c.width=128;c.height=40;
  const cx=c.getContext('2d');
  cx.clearRect(0,0,128,40);
  cx.font='bold 20px Inter,system-ui,sans-serif';
  cx.textAlign='center';cx.textBaseline='middle';
  cx.fillStyle='rgba(180,210,255,0.85)';
  cx.fillText(text,64,20);
  const tex=new THREE.CanvasTexture(c);
  const m=new THREE.Mesh(
    new THREE.PlaneGeometry(0.6,.18),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide})
  );
  m.position.set(...pos);
  if(rotY!==0)m.rotation.y=rotY;
  if(rotX!==0)m.rotation.x=rotX;
  cube.add(m);
}
[
  ['FRONT', [0,-0.42, 0.712],  0,           0],
  ['BACK',  [0,-0.42,-0.712],  Math.PI,     0],
  ['LEFT',  [-0.712,-0.42,0],  -Math.PI/2,  0],
  ['RIGHT', [0.712,-0.42,0],    Math.PI/2,  0],
  ['TOP',   [0, 0.81, 0],       0,          -Math.PI/2],
  ['BOT',   [0,-0.81, 0],       0,           Math.PI/2],
].forEach(([text,pos,rotY,rotX])=>makeFaceLabel(text,pos,rotY,rotX));

/* camera position: pulled back to show full cube with margins */
cam.position.set(2.8,2.0,4.8);cam.lookAt(0,0.1,0);
(function loop(){requestAnimationFrame(loop);ren.render(scene,cam);})();


/* ══ MAP ══ */
const map=L.map('map').setView([28.46,77.03],4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OSM'}).addTo(map);

/* ══ COMPASS ══ */
// Build degree ticks (every 5°, longer every 45°)
(function buildDialTicks(){
  const g=document.getElementById('dial-ticks');
  const cx=100,cy=100,r=86;
  for(let i=0;i<360;i+=5){
    const a=(i-90)*Math.PI/180;
    const isCard=(i%45===0);
    const len=isCard?12:6;
    const sw=isCard?1.5:0.8;
    const col=isCard?'var(--muted)':'var(--border)';
    const x1=cx+Math.cos(a)*(r-len);const y1=cy+Math.sin(a)*(r-len);
    const x2=cx+Math.cos(a)*r;      const y2=cy+Math.sin(a)*r;
    const ln=document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1',x1);ln.setAttribute('y1',y1);
    ln.setAttribute('x2',x2);ln.setAttribute('y2',y2);
    ln.setAttribute('stroke',col);ln.setAttribute('stroke-width',sw);
    g.appendChild(ln);
  }
})();

function resetCompass(){compassOffset=intYaw;logM('sys','Heading zeroed.');}

// Zero yaw: captures current integrated yaw as the new zero for heading
let yawOffset=0;
function zeroYaw(){
  yawOffset=intYaw;
  compassOffset=intYaw;
  logM('sys','Yaw zeroed — MPU6050 heading calibrated.');
}

function setCompass(deg){
  const d=((deg%360)+360)%360;
  const needle=document.getElementById('comp-needle');
  needle.style.transform=`rotate(${d}deg)`;
  document.getElementById('cdeg-svg').textContent=Math.round(d)+'°';
  const dirs=['N','NE','E','SE','S','SW','W','NW'];
  document.getElementById('cdir-svg').textContent=dirs[Math.round(d/45)%8];
}

/* ══ GAUGES ══ */
function setGauge(id,val,mn,mx){
  const pct=Math.max(0,Math.min(100,((val-mn)/(mx-mn))*100));
  const el=document.getElementById('bar-'+id);
  if(el)el.style.width=pct+'%';
}

/* ══ LED + GNG (hidden elements keep JS alive) ══ */
const gngSeen={imu:false,temp:false,pres:false,alt:false,gps:false,hdg:false};
function setGng(id,state){
  // Update hidden badge
  const el=document.getElementById('gng-'+id);
  if(el)el.textContent=state;
  // Update header LED
  const led=document.getElementById('led-'+id);
  if(led){
    led.className='sensor-led'+(state==='go'?' active':'');
  }
  const allGo=Object.values(gngSeen).every(v=>v);
  const overall=document.getElementById('gng-all');
  if(overall)overall.textContent=allGo?'GO':'WAIT';
}

/* ══ PACKET RATE ══ */
setInterval(()=>{
  if(lastPktTime){
    const age=((Date.now()-lastPktTime)/1000).toFixed(1);
    document.getElementById('st-age').textContent=age+'s';
    document.getElementById('st-age').style.color=age>3?'var(--red)':age>1?'var(--orange)':'var(--green)';
  }
  const now=Date.now();
  pktTimes=pktTimes.filter(t=>now-t<1000);
  document.getElementById('st-rate').textContent=pktTimes.length+' pkt/s';
},500);

/* ══ DASHBOARD UPDATE ══ */
function updateDashboard(d){
  pktCount++;lastPktTime=Date.now();pktTimes.push(lastPktTime);
  document.getElementById('st-pkt').textContent=pktCount;

  if(!isNaN(d.roll)&&!isNaN(d.pitch)&&!isNaN(d.yaw)){
    const r=+d.roll.toFixed(1),p=+d.pitch.toFixed(1),y=+d.yaw.toFixed(1);
    cube.rotation.x=d.pitch*Math.PI/180;
    cube.rotation.y=d.yaw*Math.PI/180;
    cube.rotation.z=d.roll*Math.PI/180;
    document.getElementById('vr').textContent=r+'°';
    document.getElementById('vp').textContent=p+'°';
    document.getElementById('vy').textContent=y+'°';
    document.getElementById('ob-r').textContent=r;
    document.getElementById('ob-p').textContent=p;
    document.getElementById('ob-y').textContent=y;
    if(lastYaw!==null){let delta=y-lastYaw;if(delta>180)delta-=360;if(delta<-180)delta+=360;intYaw+=delta;}
    lastYaw=y;
    const hdg=((intYaw-compassOffset)%360+360)%360;
    setCompass(hdg);
    if(!gngSeen.hdg){gngSeen.hdg=true;setGng('hdg','go');}
    const vr2=document.getElementById('vr2');if(vr2)vr2.textContent=r+'°';
    const vp2=document.getElementById('vp2');if(vp2)vp2.textContent=p+'°';
    const vy2=document.getElementById('vy2');if(vy2)vy2.textContent=y+'°';
    if(!gngSeen.imu){gngSeen.imu=true;setGng('imu','go');}
    if(stats.mxR===null||Math.abs(r)>Math.abs(stats.mxR)){stats.mxR=r;document.getElementById('st-mxr').textContent=r+'°';}
    if(stats.mxP===null||Math.abs(p)>Math.abs(stats.mxP)){stats.mxP=p;document.getElementById('st-mxp').textContent=p+'°';}
  }

  if(!isNaN(d.temp)){
    const t=+d.temp.toFixed(1);
    document.getElementById('g-temp').textContent=t;
    setGauge('temp',t,-20,80);
    if(!gngSeen.temp){gngSeen.temp=true;setGng('temp','go');}
    if(stats.mxT===null||t>stats.mxT){stats.mxT=t;document.getElementById('st-mxt').textContent=t+'°C';document.getElementById('mx-temp').textContent=t;}
    if(stats.miT===null||t<stats.miT){stats.miT=t;document.getElementById('st-mit').textContent=t+'°C';document.getElementById('mn-temp').textContent=t;}
  }

  if(!isNaN(d.press)){
    const p=+d.press.toFixed(1);
    document.getElementById('g-press').textContent=p;
    setGauge('pres',p,900,1100);
    if(!gngSeen.pres){gngSeen.pres=true;setGng('pres','go');}
    if(stats.mxPr===null||p>stats.mxPr){stats.mxPr=p;document.getElementById('st-mxpr').textContent=p+'hPa';document.getElementById('mx-press').textContent=p;}
    if(stats.miPr===null||p<stats.miPr){stats.miPr=p;document.getElementById('mn-press').textContent=p;}
  }

  if(!isNaN(d.alt)){
    rawAlt=d.alt;const a=+(rawAlt-altOffset).toFixed(1);
    document.getElementById('g-alt').textContent=a;
    setGauge('alt',a,-50,5000);
    if(!gngSeen.alt){gngSeen.alt=true;setGng('alt','go');}
    if(stats.mxA===null||a>stats.mxA){stats.mxA=a;document.getElementById('st-mxa').textContent=a+'m';document.getElementById('mx-alt').textContent=a;}
    if(stats.miA===null||a<stats.miA){stats.miA=a;document.getElementById('st-mia').textContent=a+'m';document.getElementById('mn-alt').textContent=a;}
  }

  if(!isNaN(d.lat)&&!isNaN(d.lon)&&d.lat!==0&&d.lon!==0){
    const ll=[d.lat,d.lon];
    pathCoords.push(ll);
    document.getElementById('gps-lat').textContent=d.lat.toFixed(5);
    document.getElementById('gps-lon').textContent=d.lon.toFixed(5);
    if(!mapMarker){
      mapMarker=L.circleMarker(ll,{radius:7,color:'#58a6ff',fillColor:'#58a6ff',fillOpacity:1}).addTo(map);
      mapLine=L.polyline(pathCoords,{color:'#3fb950',weight:2,opacity:.7}).addTo(map);
      map.setView(ll,15);
    }else{mapMarker.setLatLng(ll);mapLine.setLatLngs(pathCoords);}
    if(!gngSeen.gps){gngSeen.gps=true;setGng('gps','go');}
  }
}

function calibrateAltitude(){altOffset=rawAlt;logM('sys','Alt zeroed @ '+rawAlt.toFixed(2)+'m');}

/* ══ LOG (capped) ══ */
const MAX_LOG=150;
function logM(type,msg){
  const b=document.getElementById('tlog');
  const t=new Date().toLocaleTimeString();
  const cls=type==='err'?'le':type==='sys'?'ls':'';
  const span=document.createElement('span');
  span.innerHTML=`<span class="lt">[${t}]</span> <span class="${cls}">${msg}</span>\n`;
  b.appendChild(span);
  while(b.children.length>MAX_LOG)b.removeChild(b.firstChild);
  b.scrollTop=b.scrollHeight;
}
function clearLog(){document.getElementById('tlog').innerHTML='';}

function setStatus(msg,state){
  const el=document.getElementById('sbadge');
  el.textContent=msg;el.className=state==='ok'?'ok':state==='err'?'err':'';
}
function setConnBtn(id){
  ['btn-serial','btn-wifi','btn-ble'].forEach(b=>document.getElementById(b).classList.remove('on','live'));
  if(id){document.getElementById(id).classList.add('on','live');}
}

/* ══ CONNECTIONS ══ */
async function connectSerial(){
  if(!('serial' in navigator)){alert('Web Serial not supported. Use Chrome or Edge.');return;}
  try{
    const port=await navigator.serial.requestPort();
    await port.open({baudRate:115200});
    setStatus('USB Connected','ok');setConnBtn('btn-serial');
    logM('sys','USB Serial @ 115200 baud.');
    const dec=new TextDecoderStream();port.readable.pipeTo(dec.writable);
    const rdr=dec.readable.getReader();let buf='';
    while(true){const{value,done}=await rdr.read();if(done){rdr.releaseLock();break;}
      buf+=value;const lines=buf.split('\n');buf=lines.pop();
      lines.forEach(l=>{if(l.trim())processIncomingData(l.trim());});
    }
  }catch(e){logM('err','Serial: '+e);setStatus('Disconnected','err');setConnBtn(null);}
}

function connectWiFi(){
  const url=prompt('WebSocket URL:','ws://192.168.4.1:81');if(!url)return;
  const ws=new WebSocket(url);
  ws.onopen=()=>{setStatus('Wi-Fi Connected','ok');setConnBtn('btn-wifi');logM('sys','WS: '+url);};
  ws.onmessage=e=>processIncomingData(e.data);
  ws.onerror=()=>{logM('err','WS error');setStatus('WS Error','err');};
  ws.onclose=()=>{setStatus('Disconnected','');setConnBtn(null);logM('sys','WS closed.');};
}

async function connectBLE(){
  if(!('bluetooth' in navigator)){alert('Web Bluetooth not supported. Use Chrome/Edge.');return;}
  const SVC='6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const RXC='6e400003-b5a3-f393-e0a9-e50e24dcca9e';
  try{
    logM('sys','Scanning BLE...');
    const dev=await navigator.bluetooth.requestDevice({filters:[{services:[SVC]}],optionalServices:[SVC]});
    const srv=await dev.gatt.connect();
    setStatus('BLE Connected','ok');setConnBtn('btn-ble');logM('sys','BLE: '+dev.name);
    const svc=await srv.getPrimaryService(SVC);
    const char=await svc.getCharacteristic(RXC);
    await char.startNotifications();
    const dec=new TextDecoder('utf-8');let buf='';
    char.addEventListener('characteristicvaluechanged',e=>{
      buf+=dec.decode(e.target.value);const lines=buf.split('\n');buf=lines.pop();
      lines.forEach(l=>{if(l.trim())processIncomingData(l.trim());});
    });
    dev.addEventListener('gattserverdisconnected',()=>{setStatus('Disconnected','');setConnBtn(null);logM('sys','BLE disconnected.');});
  }catch(e){logM('err','BLE: '+e);setStatus('BLE Failed','err');setConnBtn(null);}
}

/* ══ PARSER ══ */
function processIncomingData(raw){
  logM('',raw);
  try{
    const p={};
    raw.split(',').forEach(pair=>{
      const[k,v]=pair.split(':');
      if(k&&v!==undefined)p[k.trim()]=parseFloat(v.trim());
    });
    updateDashboard({roll:p.Roll,pitch:p.Pitch,yaw:p.Yaw,temp:p.Temp,press:p.Pres,alt:p.Alt,lat:p.Lat,lon:p.Lon});
  }catch(e){logM('err','Parse error: '+raw);}
}

/* ══ WEBCAM ══ */
let webcamStream=null;
async function toggleWebcam(){
  const btn=document.getElementById('btn-cam');
  const vid=document.getElementById('webcam-video');
  const ph=document.getElementById('webcam-placeholder');
  const snap=document.getElementById('btn-cam-snap');
  const status=document.getElementById('webcam-status');
  if(webcamStream){
    webcamStream.getTracks().forEach(t=>t.stop());
    webcamStream=null;
    vid.style.display='none';vid.srcObject=null;
    ph.style.display='flex';
    snap.style.display='none';
    btn.textContent='&#9654; Start';
    status.textContent='';
    logM('sys','Webcam stopped.');
    return;
  }
  try{
    status.textContent='Requesting camera...';
    webcamStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false});
    vid.srcObject=webcamStream;
    vid.style.display='block';
    ph.style.display='none';
    snap.style.display='inline-flex';
    btn.textContent='&#9646;&#9646; Stop';
    status.textContent='';
    logM('sys','Webcam live.');
  }catch(e){
    status.textContent='Camera error: '+e.message;
    logM('err','Webcam: '+e.message);
  }
}
function snapPhoto(){
  const vid=document.getElementById('webcam-video');
  const canvas=document.getElementById('webcam-snap');
  if(!webcamStream||vid.readyState<2)return;
  canvas.width=vid.videoWidth;canvas.height=vid.videoHeight;
  canvas.getContext('2d').drawImage(vid,0,0);
  const link=document.createElement('a');
  link.download='skynode-snap-'+Date.now()+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  logM('sys','Photo saved.');
}


/* ══ DEMO ══ */
function startDemo(){
  const btn=document.getElementById('btn-demo');
  if(demoInterval){clearInterval(demoInterval);demoInterval=null;btn.classList.remove('on');logM('sys','Demo stopped.');return;}
  btn.classList.add('on');logM('sys','Demo mode active — simulating 1U CubeSat.');
  let t=0;
  demoInterval=setInterval(()=>{
    t+=0.05;
    processIncomingData(
      `Roll:${(Math.sin(t)*45).toFixed(1)},Pitch:${(Math.cos(t*.7)*30).toFixed(1)},Yaw:${(t*15%360).toFixed(1)},`+
      `Temp:${(25+Math.sin(t*.3)*6).toFixed(1)},Pres:${(1013+Math.cos(t*.1)*5).toFixed(1)},`+
      `Alt:${(220+Math.sin(t*.5)*40).toFixed(1)},Lat:${(28.4595+t*.0001).toFixed(6)},Lon:${(77.0266+t*.00015).toFixed(6)}`
    );
  },200);
  setStatus('Demo Running','ok');
}