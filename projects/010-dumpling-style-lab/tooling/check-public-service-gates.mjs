import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {hasLocalServices, ROOM_PUBLIC_SCOPE, RELAY_PUBLIC_SCOPE} from '../web/publication-runtime.js';
import {createFrontierRoom} from '../web/showcase-frontier-room.js';
import {createExchange, relayRequest} from '../web/showcase-exchange.js';
import {FrontierNode, installFrontierDouble} from './frontier-dom-double.mjs';
import {KineticsNode, installExchangeDouble} from './exchange-dom-double.mjs';

const web = fileURLToPath(new URL('../web/', import.meta.url));
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const route = [36,24,25,26,27,15,16,28,40,52,64,65,66,67,68,56,44,32,33,34,35,47];

for (const hostname of ['localhost', '127.0.0.1', '[::1]', '::1']) {
  check(`local hostname ${hostname} retains services`, hasLocalServices(hostname));
}
for (const hostname of ['yydshly.github.io', 'localhost.example', '127.0.0.1.example', '', undefined]) {
  // Pass null to verify an absent hostname independently of the global default.
  check(`nonlocal hostname ${hostname} refuses services`, !hasLocalServices(hostname ?? null));
}

installFrontierDouble(web);
location.hostname = 'yydshly.github.io';
location.href = 'https://yydshly.github.io/0930_codex_project/projects/010-dumpling-style-lab/showcase.html?play=assembly';
sessionStorage.setItem('dumpling-frontier-room-session-v1-qa', JSON.stringify({room: 'ABC234', token: 'private-old-token', name: '旅人'}));
let roomRequests = 0;
globalThis.fetch = async () => { roomRequests++; throw new Error('Unexpected room request'); };
const publicRoomHost = new FrontierNode();
const publicRoom = await createFrontierRoom({host: publicRoomHost, saved: {room:'ABC234',token:'old-save-token'}});
publicRoom.onStart();
const publicExtra = publicRoomHost.afterNodes[0].querySelector('.frontier-extra');
const roomButtons = publicExtra.querySelectorAll('[data-command]');
check('public room controls all disabled after start', roomButtons.every(b => b.disabled));
for (const b of roomButtons) b.onclick?.(); // Also exercise the command guard directly.
for (let i = 0; i < 100; i++) publicRoom.tick(.08);
publicRoom.setActive(false); publicRoom.setActive(true); publicRoom.draw();
await settle();
check('public room with restored session emits zero loopback requests', roomRequests === 0);
check('public room does not invent participants or a new victory', publicRoom.getState().view === null && !publicRoom.getState().won);
check('public room scope is visible in shell and room log', publicRoom.getStatus().message === ROOM_PUBLIC_SCOPE && publicExtra.querySelector('.frontier-chat').textContent === ROOM_PUBLIC_SCOPE);
publicRoom.dispose();

installFrontierDouble(web);
let localRoomAction = '';
globalThis.fetch = async (url, options) => {
  check('local room still calls its original loopback endpoint', String(url) === 'http://127.0.0.1:8963/room');
  localRoomAction = JSON.parse(options.body).action;
  return {ok:true,json:async()=>({token:'test-token',view:{room:'ABC234',self:'p1',host:'p1',players:[{id:'p1',name:'旅人',station:'meeting',alive:true}],phase:'lobby',alive:true,role:null,tasks:[],patterns:{},progress:0,goal:0,log:[]}})};
};
const localRoomHost = new FrontierNode(), localRoom = await createFrontierRoom({host:localRoomHost});
localRoom.onStart();
localRoomHost.afterNodes[0].querySelector('.frontier-extra').querySelectorAll('[data-command]').find(b => b.dataset.command === 'create').click();
await settle();
check('local room create flow remains available', localRoomAction === 'create' && localRoom.getState().room === 'ABC234');
localRoom.dispose();

installExchangeDouble(web);
globalThis.location = {hostname:'yydshly.github.io',search:'',href:'https://yydshly.github.io/0930_codex_project/projects/010-dumpling-style-lab/showcase.html?play=postway'};
const assetFetch = globalThis.fetch;
let relayRequests = 0;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('http')) { relayRequests++; throw new Error('Unexpected relay request'); }
  return assetFetch(url, options);
};
await assert.rejects(relayRequest('read', {}), new RegExp(RELAY_PUBLIC_SCOPE));
const publicCourierHost = new KineticsNode(), publicCourier = await createExchange({host:publicCourierHost,id:'postway'});
publicCourier.onStart();
for (const tile of route.slice(1)) publicCourier.command('route', tile);
check('public courier retains actual adjacent route editing', publicCourier.getState().route.length === route.length);
publicCourier.command('undo');
check('public courier undo removes an actual segment', publicCourier.getState().route.length === route.length - 1);
publicCourier.command('route', route.at(-1));
for (const command of ['publish','receive','refresh','copy']) check(`public courier ${command} guarded`, publicCourier.command(command) === false);
const publicPanel = publicCourierHost.afterNodes.find(n => n.classes.has('exchange-controls'));
check('public relay-dependent controls disabled', publicPanel.buttons.filter(b => ['publish','receive','refresh','copy'].includes(b.dataset.command)).every(b => b.disabled));
publicCourier.draw();
check('public courier remains unpublished and incomplete', publicCourier.getState().outgoing === null && !publicCourier.getState().won);
publicCourier.dispose();

for (const saved of [
  {role:'carrier',receiveCode:'ABC234',carrierKey:'b'.repeat(48)},
  {role:'author',route,ownerKey:'a'.repeat(48),outgoing:{code:'ABC234'}}
]) {
  const g = await createExchange({host:new KineticsNode(),id:'postway',saved});
  g.onStart(); for (let i = 0; i < 100; i++) g.tick(.1);
  g.setActive(false); g.setActive(true); await settle();
  check(`public restored ${saved.role} emits no automatic relay request`, relayRequests === 0);
  check(`public restored ${saved.role} remains unverified`, !g.getState().online && !g.getState().won && g.getState().incoming === null);
  g.dispose();
}
check('all public relay paths emit zero loopback requests', relayRequests === 0);

let injectedCalls = 0;
const injected = await createExchange({host:new KineticsNode(),id:'postway',saved:{role:'carrier',receiveCode:'ABC234',carrierKey:'b'.repeat(48)},relayRequest:async()=>{injectedCalls++;return {code:'ABC234',route,step:0,status:'claimed'};}});
injected.onStart(); await settle();
check('explicit injected relay still works on public hostname for isolated tests', injectedCalls === 1 && injected.getState().incoming?.route.length === route.length);
injected.dispose();

location.hostname = '127.0.0.1';
let directRelayAction = '';
globalThis.fetch = async (url, options) => { check('local relay retains original endpoint', String(url) === 'http://127.0.0.1:8971/relay'); directRelayAction = JSON.parse(options.body).action; return {ok:true,json:async()=>({status:'waiting'})}; };
await relayRequest('publish', {route});
check('local default relay remains callable', directRelayAction === 'publish');

console.log(JSON.stringify({passed:true,count:checks.length,checks,scope:'Production frontend factories through existing DOM/Skia adapters; no browser CSS acceptance or remote room backend.'},null,2));
