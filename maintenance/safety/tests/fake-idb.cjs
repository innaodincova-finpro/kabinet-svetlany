// Transactional memory double for IndexedDB boundary tests; does not emulate a browser.
function fakeIDB(){
 const databases=new Map();const control={failWrites:false};
 const api={open(name){const request={};queueMicrotask(()=>{const isNew=!databases.has(name);if(isNew)databases.set(name,new Map());const stores=databases.get(name);const db={objectStoreNames:{contains:n=>stores.has(n)},createObjectStore(n){stores.set(n,new Map())},close(){},transaction(n,mode){if(!stores.has(n))throw new Error('Missing store');const original=stores.get(n),staged=new Map(original),tx={error:null};let requests=[];
 const requestOp=(fn)=>{const rq={};requests.push([rq,fn]);return rq};
 tx.objectStore=()=>({get:k=>requestOp(()=>staged.get(k)),put:(v,k)=>requestOp(()=>{staged.set(k,v);return k}),delete:k=>requestOp(()=>staged.delete(k)),clear:()=>requestOp(()=>staged.clear())});
 queueMicrotask(()=>{if(mode==='readwrite'&&control.failWrites){tx.error=new Error('Simulated transaction abort');tx.onabort?.();return}for(const [r,fn]of requests){try{r.result=fn();r.onsuccess?.()}catch(e){r.error=e;r.onerror?.();tx.error=e;tx.onabort?.();return}}if(mode==='readwrite')stores.set(n,staged);queueMicrotask(()=>tx.oncomplete?.())});return tx}};
 request.result=db;if(isNew)request.onupgradeneeded?.();request.onsuccess?.();});return request},databases:async()=>[...databases.keys()].map(name=>({name}))};return {api,control,databases};
}
module.exports={fakeIDB};
