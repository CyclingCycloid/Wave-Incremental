const fs=require('fs'),vm=require('vm');
function makeEl(){const el={classList:{_s:new Set(),toggle(c,f){f===undefined?(this._s.has(c)?this._s.delete(c):this._s.add(c)):(f?this._s.add(c):this._s.delete(c));return!!f;},add(c){this._s.add(c);},remove(c){this._s.delete(c);},contains(c){return this._s.has(c);}},children:[],style:{},_text:'',_attrs:{},remove(){},set textContent(v){this._t=v;},get textContent(){return this._t;},get innerHTML(){return this._h||'';},set innerHTML(v){this._h=v;},set value(v){this._v=v;},get value(){return this._v||'';},appendChild(c){this.children.push(c);return c;},append(...cs){this.children.push(...cs);},addEventListener(){},focus(){},select(){},click(){},setAttribute(k,v){this._attrs[k]=v;},getAttribute(k){return this._attrs[k];},querySelectorAll(){return [];},querySelector:(s)=>{const e=makeEl();if(s==='.tab.active')e.dataset={tab:'wave'};return e;},offsetWidth:760,getContext:()=>({clearRect(){},beginPath(){},arc(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},ellipse(){},set fillStyle(v){},get fillStyle(){return '#000';},set strokeStyle(v){},get strokeStyle(){return '#fff';},set lineWidth(v){},get lineWidth(){return 1;},set globalAlpha(v){},get globalAlpha(){return 1;},createRadialGradient:()=>({addColorStop(){}})})};return el;}
const store={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}};
const __els={};
const sb={__els,console,Date,Math,JSON,isFinite,isNaN,parseInt,parseFloat,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>0,requestAnimationFrame:()=>0,cancelAnimationFrame:()=>0,localStorage:store,document:{body:makeEl(),getElementById(id){if(!__els[id])__els[id]=makeEl();return __els[id];},querySelectorAll:()=>[],querySelector:(s)=>{const e=makeEl();if(s==='.tab.active')e.dataset={tab:'wave'};return e;},createElement:makeEl,addEventListener(){}},navigator:{clipboard:{writeText:async()=>{}}},confirm:()=>true,alert(){}};
sb.window=sb;sb.globalThis=sb;sb.window.addEventListener=()=>{};
vm.createContext(sb);vm.runInContext(fs.readFileSync('break_infinity.js','utf8'),sb);vm.runInContext(fs.readFileSync('game.js','utf8'),sb);
const ev=c=>vm.runInContext(c,sb);
ev('state.distortDone=["a","b","c","d","e","f","g","h"];');
ev('state.rulesBroken=true; state.phUnlocked=1; state.phOn=true; state.meta1=1;');
ev('setTotalSp(1e40); setPhononsLog(500); setULog(600); setL(1e-600); setU(1e600);');
ev('console.log("before distortActive=", JSON.stringify(state.distortActive));');
ev('enterDistort("simple")');
ev('console.log("after enterDistort distortActive=", JSON.stringify(state.distortActive), "phonons=", state.phonons)');
ev('tick()');
ev('console.log("after tick1 distortActive=", JSON.stringify(state.distortActive), "phonons=", state.phonons)');
