// Minimal DOM model for handler unit tests. This is not a browser or layout engine.
const vm=require('node:vm');const fs=require('node:fs');const {webcrypto}=require('node:crypto');const {fakeIDB}=require('./fake-idb.cjs');
function boot(html){
 let roots=[];
 class Node{
 constructor(tag='div',text=''){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.attrs={};this.events={};this.dataset={};this.style={setProperty(){},removeProperty(){}};this._text=text;this._value=undefined;this.open=false;this.className='';this.classList={add:(...s)=>this.className=[...new Set([...this.className.split(' '),...s])].join(' '),remove:(...s)=>this.className=this.className.split(' ').filter(x=>!s.includes(x)).join(' '),contains:s=>this.className.split(' ').includes(s),toggle:(s,b)=>{const on=b??!this.classList.contains(s);if(on)this.classList.add(s);else this.classList.remove(s);return on}};}
 append(...kids){for(let k of kids.flat()){if(k===null||k===undefined)continue;if(!(k instanceof Node))k=new Node('#text',String(k));this.children.push(k);k.parentNode=this}}
 prepend(...kids){const prior=this.children;this.children=[];this.append(...kids,...prior)}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
 set textContent(s){this._text=String(s);this.children=[]}
 set innerHTML(s){this.textContent=s}get innerHTML(){return this.textContent}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=String(v);if(k==='id')this.id=v;if(k==='value')this._value=String(v);if(k==='type')this.type=v;if(k==='checked')this.checked=true;if(k==='selected')this.selected=true;if(k==='disabled')this.disabled=true;}
 getAttribute(k){return this.attrs[k]??null}
 removeAttribute(k){delete this.attrs[k]}
 get value(){if(this._value!==undefined)return this._value;if(this.tagName==='SELECT'){return (this.children.find(x=>x.selected)||this.children[0])?.value||''}if(this.tagName==='OPTION')return this._text;return ''}
 set value(s){this._value=String(s)}
 addEventListener(k,fn,o={}){(this.events[k]??=[]).push({fn,once:o.once})}
 removeEventListener(k,fn){this.events[k]=(this.events[k]||[]).filter(x=>x.fn!==fn)}
 dispatchEvent(e){e.target??=this;e.preventDefault??=()=>{e.defaultPrevented=true};for(const h of [...(this.events[e.type]||[])]){h.fn(e);if(h.once)this.removeEventListener(e.type,h.fn)}if(this['on'+e.type])this['on'+e.type](e);if(e.bubbles&&this.parentNode)this.parentNode.dispatchEvent(e);return !e.defaultPrevented}
 click(){this.dispatchEvent({type:'click',bubbles:true})}focus(){doc.activeElement=this}select(){}setSelectionRange(){}
 close(){this.open=false;this.dispatchEvent({type:'close'})}showModal(){this.open=true}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this)}
 contains(n){return this===n||this.children.some(x=>x.contains(n))}
 matches(sel){sel=sel.trim();if(sel==='*')return true;if(sel.startsWith('#'))return this.id===sel.slice(1);if(sel.startsWith('.'))return this.classList.contains(sel.slice(1));const m=sel.match(/^([a-z]+)?(?:\[([\w-]+)(?:="?([^\]"]+)"?)?\])?$/i);if(!m)return false;return (!m[1]||this.tagName===m[1].toUpperCase())&&(!m[2]||(m[2]==='open'?this.open:m[3]!==undefined?this.getAttribute(m[2])===m[3]:this.getAttribute(m[2])!==null))}
 all(){return this.children.flatMap(x=>[x,...x.all()])}
 querySelectorAll(sel){return this.all().filter(n=>sel.split(',').some(s=>{const parts=s.trim().split(/\s+/);if(!n.matches(parts.pop()))return false;let par=n.parentNode;while(parts.length){const last=parts.pop();while(par&&!par.matches(last))par=par.parentNode;if(!par)return false;par=par.parentNode}return true}))}
 querySelector(s){return this.querySelectorAll(s)[0]||null}
 closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null}
 }
 const doc=new Node('document');doc.documentElement=new Node('html');doc.head=new Node('head');doc.body=new Node('body');doc.append(doc.documentElement);doc.documentElement.append(doc.head,doc.body);doc.createElement=t=>new Node(t);doc.getElementById=id=>doc.querySelector('#'+id);doc.visibilityState='visible';
 for(const id of ['nav','view','brandSub','menuBtn','backBtn','undoBtn','themeBtn','saveState','toast']){let n=new Node('div');n.id=id;doc.body.append(n)}
 for(const id of ['lessonDlg','formDlg','pickDlg','askDlg','planDlg']){const n=new Node('dialog');n.id=id;doc.body.append(n)}
 const rail=new Node('nav');rail.className='rail';doc.body.append(rail);
 const foot=new Node('div');foot.className='rail-foot';rail.append(foot);const save=new Node('div');save.className='save';save.append(new Node('i'));foot.append(save);
 let failPrimary=false; let raw={};const storage={getItem:k=>Object.hasOwn(raw,k)?raw[k]:null,setItem:(k,v)=>{if(failPrimary && k==='tochka-resheniya-v2')throw Error('quota');raw[k]=String(v)},removeItem:k=>delete raw[k],key:i=>Object.keys(raw)[i]??null,get length(){return Object.keys(raw).length}};
 const proxy=new Proxy(storage,{ownKeys:()=>Object.keys(raw),getOwnPropertyDescriptor:(t,k)=>({enumerable:true,configurable:true})});
 const win=new Node('window');Object.assign(win,{localStorage:proxy,matchMedia:()=>({matches:false}),scrollTo(){}});win.window=win;
 const idb=fakeIDB();
 const context={failStorage:v=>{failPrimary=v},indexedDB:idb.api,HTMLDialogElement:Node,document:doc,window:win,localStorage:proxy,location:{pathname:'/kabinet-svetlany/index.html',protocol:'https:',hostname:'test.invalid',href:'https://test.invalid/kabinet-svetlany/index.html'},navigator:{},AbortController,AbortSignal,crypto:webcrypto,console,URL,Blob,Uint8Array,TextEncoder,TextDecoder,btoa,atob,Date,Math,JSON,Map,Set,Promise,Error,Number,String,Object,Array,Event:class{constructor(type,options={}){this.type=type;Object.assign(this,options)}},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},queueMicrotask,requestAnimationFrame:()=>0,cancelAnimationFrame(){},performance:{now:()=>0}};
 const source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).find(x=>x.includes('const PROGRAMME'));
 const names=['seed','safePrepare','safeBundle','safeBackupBlob','safeSameFile','safeDecode','safeInstall','safeTx','safeHistory','safeRestoreAuto','safeRecoveryList','autoTx','safeWriteHandle','safeSummary','load','persist','viewHelp','viewToday','viewPeople','viewSchedule','viewMethod','viewMaterials','viewMoney','viewReports','save','backupNow','putFile','getFile','autoSaveNow','autoSaveSoon','autoOff'];
 names.push('undo','editMaterial','prevHomework','passedTopics','homeworkFor','homeworkCheckFor','homeworkSolutionView','homeworkSolutionEditor','openLessonCard','reportBlocks');
 const expose=`window.testAPI={${names.join(',')},getState:()=>S,setState:d=>{S=d;lastSnap=JSON.stringify(S);dataUnreadable=false;readOnlyTab=false},setFileReader:fn=>testFileReader=fn,getFlags:()=>({dataUnreadable,readOnlyTab,safeBusy,autoFailed,safeStatus,safeLastSnapshot}),setAuto:h=>{autoHandle=h;autoOn=true;autoFailed=false;safeLastSnapshot=null},setFlags:f=>{if('readOnlyTab'in f)readOnlyTab=f.readOnlyTab;if('dataUnreadable'in f)dataUnreadable=f.dataUnreadable},setStorageFailure:failStorage,getRaw:()=>localStorage.getItem(KEY),putRaw:v=>localStorage.setItem(KEY,v)};`;
 // Replace only file IO boundaries with in-memory test doubles, not business algorithms.
 let testSource=source.replace("const getFile = id => fileTx('readonly', st => st.get(id));","let testFileReader=null; const getFile=id=>testFileReader?testFileReader(id):fileTx('readonly',st=>st.get(id));");
 testSource=testSource.slice(0,testSource.lastIndexOf('})();'))+expose+testSource.slice(testSource.lastIndexOf('})();'));
 const ctx=vm.createContext(context);vm.runInContext(testSource,ctx,{timeout:10000});
 return {api:win.testAPI,doc,win,raw,ctx,idb};
}
module.exports={boot};
if(require.main===module){try{const b=boot(fs.readFileSync('repair/index.html','utf8'));console.log('APP BOOT OK',b.api.getState().students.length);console.log(b.doc.querySelector('#view').textContent.slice(0,600))}catch(e){console.error(e);process.exitCode=1}}
