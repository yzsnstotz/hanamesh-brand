import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
const option=process.argv.indexOf('--consumer');
assert.ok(option>=0 && process.argv[option+1],'PACKAGE_CONSUMER_REQUIRED: pass --consumer with an isolated installed consumer');
const root=resolve(process.argv[option+1]);
const {chromium}=createRequire(resolve(root,'package.json'))('playwright-core');
const assets='node_modules/@deepseek-ai/dsh-web-frontend/dist/assets';
const index=(await readdir(resolve(root,assets))).find(p=>/^index-.*\.js$/.test(p));
const server=createServer(async(req,res)=>{
 try { const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+'/')) throw Error('outside consumer');
 res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.css'?'text/css':'application/octet-stream');
 res.end(await readFile(path)); } catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/probe.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="root"></div></body></html>'}));
 await page.goto(origin+'/probe.html');
 await page.evaluate(()=>{
  window.__DSH_BOOT__={rev:'brand-isolated-api-probe',entries:[],batches:[]};
  window.__ModuleLoader__={create(options){window.apiSeeds=options.staticModules;throw Error('BRAND_API_SEED_CAPTURE');}};
 });
 await page.addScriptTag({url:origin+'/'+assets+'/'+index,type:'module'});
 await page.waitForFunction(()=>window.apiSeeds);
 console.log('actual shared seed exports', await page.evaluate(()=>Object.keys(window.apiSeeds)));
 await page.evaluate(()=>{
  window.apiQueue=[];
  window.__ModuleLoader__={mode:'queue',pendingQueue:window.apiQueue,load(row){window.apiQueue.push(row);}};
 });
 await page.addScriptTag({url:origin+'/node_modules/@deepseek-ai/dsh-client-modules/lib/client.js'});
 const peers=['dsh-client-ui-renderer','dsh-client-ui-sidebar','dsh-client-ui-conversation','dsh-client-locale','dsh-client-ui-theme'];
 for(const name of peers)await page.addScriptTag({url:origin+'/node_modules/@deepseek-ai/'+name+'/lib/client.js'});
 const brand=JSON.parse(await readFile(resolve(root,'node_modules/hanamesh-brand/package.json'),'utf8'));
 await page.addScriptTag({url:origin+'/node_modules/hanamesh-brand/'+brand.exports['./client'].default});
 const registered=await page.evaluate(()=>window.apiQueue.some(row=>row.id==='hanamesh-brand'));
 console.log('brand bundle registered', registered, 'script errors',errors);
 assert.ok(registered,'published ./client must register an actual DSH client factory');
 const result=await page.evaluate(async()=>{
  const bootstrapIndex=window.apiQueue.findIndex(r=>r.id==='@deepseek-ai/dsh-client-modules');
  const [bootstrap]=window.apiQueue.splice(bootstrapIndex,1);
  const exported=bootstrap.factory(spec=>{throw Error('unexpected bootstrap external '+spec);});
  const modules=exported.createClientModuleSystem(window.__ModuleLoader__,{id:bootstrap.id,exports:exported},{
   boot:{rev:'isolated-package-api',entries:[],batches:[]},staticModules:window.apiSeeds,
   loadBundle:url=>{throw Error('unregistered actual package bundle '+url);},
  });
  const providerNames=['dsh-client-ui-renderer','dsh-client-ui-sidebar','dsh-client-ui-conversation','dsh-client-locale','dsh-client-ui-theme'];
  const providers=await Promise.all(providerNames.map(n=>modules.import('@deepseek-ai/'+n)));
  if(providers.some(p=>typeof p.apply!=='function'))throw Error('provider export mismatch');
  const [{SlotRegistry},,,{LocaleRuntime},{ThemeRuntime}]=providers;
  const brand=await modules.import('hanamesh-brand');
  const {Context}=window.apiSeeds['@deepseek-ai/cordis'];
  const ctx=new Context();await ctx.plugin(SlotRegistry).await();
  const locale=new LocaleRuntime(ctx);locale.setLocale('en');
  const subscribers=new Set();let value={preference:'light',fontSize:14};
  // FIXTURE: isolated settings scope, with no persistence, host server or credentials.
  const scope={getSnapshot:()=>({value}),subscribe:fn=>{subscribers.add(fn);return()=>subscribers.delete(fn);},set(){throw Error('brand must not write preference');}};
  const theme=new ThemeRuntime(ctx,scope);ctx.provide('locale',locale);ctx.provide('theme',theme);
  const otherColor=theme.overrideTokens('other-plugin',{'--dsw-alias-state-business-primary':{light:'#112233',dark:'#445566'}});
  const otherDict=locale.register('conversation',{en:{'hero.headline':'Into the Unknown'},zh:{'hero.headline':'探索未知'}});
  const keys=['sidebar.brand.mark','sidebar.brand.name','conversation.hero.brand.mark'];
  const fiber=ctx.plugin(brand);await fiber.await();
  if(keys.some(k=>ctx.slots.entries(k).length!==0))throw Error('brand registered before declaration');
  // FIXTURE: declaration owner uses the three publicly declared provider slot shapes.
  const declare=()=>ctx.slots.register({name:'root',children:Object.fromEntries(keys.map(k=>[k,{kind:'single',scope:'root'}]))},()=>null);
  let shell=declare();
  const entries=keys.map(key=>({key,entries:ctx.slots.entriesOfSlot(key).map(e=>({options:e.options,child:e.component({size:34}).props.children}))}));
  const activeColor=theme.getTheme().active.tokens['--dsw-alias-state-business-primary'];
  const english=locale.bind('hanamesh.brand')('hero.headline');locale.setLocale('zh');
  const chinese=locale.bind('hanamesh.brand')('hero.headline');
  value={preference:'dark',fontSize:14};subscribers.forEach(fn=>fn());
  const darkColor=theme.getTheme().active.tokens['--dsw-alias-state-business-primary'];
  shell();if(keys.some(k=>ctx.slots.entries(k).length!==0))throw Error('collapse leaked brand');
  shell=declare();if(keys.some(k=>ctx.slots.entries(k).length!==1))throw Error('redeclaration lost brand');
  await fiber.dispose();await fiber.dispose();
  const remaining=keys.map(key=>ctx.slots.entries(key).length);
  const restored=theme.getTheme().active.tokens['--dsw-alias-state-business-primary'];
  const removedDictionary=locale.bind('hanamesh.brand')('hero.headline');
  const originalHeadline=locale.bind('conversation')('hero.headline');
  shell();shell=declare();const afterUnload=keys.map(k=>ctx.slots.entries(k).length);
  otherColor();otherDict();shell();await ctx.fiber.dispose();
  return {reactVersion:window.apiSeeds.react.version,providerExports:providerNames,entries,activeColor,darkColor,english,chinese,remaining,restored,removedDictionary,originalHeadline,afterUnload,remainingSettingsSubscribers:subscribers.size};
 });
 console.log(JSON.stringify(result,null,2));
 assert.deepEqual(result.remaining,[0,0,0]);assert.equal(result.activeColor,'#7059e8');assert.equal(result.english,'HanaMesh, connect your creations');assert.equal(result.restored,'#445566');
 assert.equal(result.darkColor,'#a99aff');assert.equal(result.chinese,'HanaMesh，让创造相连');
 assert.equal(result.removedDictionary,'hero.headline');assert.equal(result.originalHeadline,'探索未知');
 assert.deepEqual(result.afterUnload,[0,0,0]);assert.equal(result.remainingSettingsSubscribers,0);
 assert.deepEqual(result.entries.map(e=>e.entries.map(x=>x.child)),[['H'],['HanaMesh'],['H']]);
 assert.equal(errors.length,0);assert.equal(result.reactVersion,'18.3.1');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
