import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

test('R1-2 Dialog restores focus when unmounted while open',()=>{
  const code=ts.transpileModule(readFileSync(new URL('../src/components/ui/Dialog.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const previous={focused:false,focus(){this.focused=true;}},doc={activeElement:previous},effects=[],refs=[];
  const React={createElement:(type,props,...children)=>{if(props?.ref)props.ref.current={querySelectorAll:()=>[],querySelector:()=>null,focus(){}};return {type,props:{...props,children}};},useRef(value){const ref={current:value};refs.push(ref);return ref;},useId:()=>':id:',useEffect(fn){effects.push(fn);}};
  const exports={};vm.runInNewContext(code,{exports,document:doc,window:{addEventListener(){},removeEventListener(){}},setTimeout:()=>1,clearTimeout(){},require:name=>name==='react'?React:{X:'X'}});
  exports.Dialog({isOpen:true,onClose(){},title:'Thanh toán'});
  const cleanups=effects.map(fn=>fn());cleanups.forEach(fn=>fn?.());
  assert.equal(previous.focused,true,'Unmount must restore focus to the opener');
});

test('R1-2 Dialog traps Tab and blocks Escape while closing is disabled',()=>{
  const code=ts.transpileModule(readFileSync(new URL('../src/components/ui/Dialog.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const opener={focus(){}},doc={activeElement:opener},effects=[],handlers={};let closed=0;
  const first={offsetParent:{},focus(){doc.activeElement=this;}},last={offsetParent:{},focus(){doc.activeElement=this;}};
  const container={querySelectorAll:()=>[first,last],querySelector:()=>null,contains:el=>el===first||el===last,focus(){doc.activeElement=this;}};
  const React={createElement:(type,props,...children)=>{if(props?.ref)props.ref.current=container;return {type,props:{...props,children}};},useRef:value=>({current:value}),useId:()=>':id:',useEffect:fn=>effects.push(fn)};
  const exports={};vm.runInNewContext(code,{exports,document:doc,window:{addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener(){}},setTimeout:fn=>{fn();return 1;},clearTimeout(){},require:name=>name==='react'?React:{X:'X'}});
  exports.Dialog({isOpen:true,disableClose:true,onClose(){closed++;},title:'Thanh toán'});const cleanups=effects.map(fn=>fn());
  assert.equal(doc.activeElement,first);let prevented=false;handlers.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(doc.activeElement,last);
  prevented=false;handlers.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(doc.activeElement,first);
  handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(closed,0);cleanups.forEach(fn=>fn?.());
});
