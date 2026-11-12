"use client";
import { useState } from "react";
import type { BlockInput, BlockType } from "@/lib/content/blocks";
import { RichTextEditor } from "@/components/features/cms/rich-text-editor";
const labels: Record<BlockType,string>={rich_text:"Texto",image:"Imagen",video:"Video",document:"Documento",checklist:"Checklist",divider:"Separador",callout:"Aviso"};
type Resource={id:string;title:string;mime_type:string};
type EditableBlock=BlockInput & {clientId:string};
export function BlockComposer({initial,resources,onDirty}:{initial:BlockInput[];resources:Resource[];onDirty?:()=>void}) {
 const [blocks,setBlocks]=useState<EditableBlock[]>(()=>initial.map(block=>({...block,clientId:crypto.randomUUID()})));
 const change=(index:number,key:string,value:string)=>{onDirty?.();setBlocks(current=>current.map((b,i)=>i===index?{...b,content:{...b.content,[key]:value}}:b));};
 const add=(type:BlockType)=>{onDirty?.();setBlocks(current=>[...current,{type,content:{},position:current.length,clientId:crypto.randomUUID()}]);};
 const remove=(index:number)=>{onDirty?.();setBlocks(current=>current.filter((_,i)=>i!==index));};
 const move=(index:number,delta:number)=>{onDirty?.();setBlocks(current=>{const next=[...current];const target=index+delta;if(target<0||target>=next.length)return current;[next[index],next[target]]=[next[target],next[index]];return next;});};
 return <section className="block-composer"><h2>Bloques de contenido</h2><input type="hidden" name="blocks_json" value={JSON.stringify(blocks.map((b,position)=>({type:b.type,content:b.content,position})))}/>{blocks.map((b,i)=><fieldset className="block-editor" key={b.clientId}><legend>{i+1}. {labels[b.type]}</legend><div className="block-controls"><button type="button" onClick={()=>move(i,-1)} disabled={i===0} aria-label={`Subir bloque ${i+1}`}>↑</button><button type="button" onClick={()=>move(i,1)} disabled={i===blocks.length-1} aria-label={`Bajar bloque ${i+1}`}>↓</button><button type="button" onClick={()=>remove(i)} aria-label={`Quitar bloque ${i+1}`}>Quitar</button></div>
 {b.type==="rich_text"&&<div><span>Texto</span><RichTextEditor value={b.content.doc??b.content.text??""} onChange={value=>change(i,"doc",value)}/></div>}
 {b.type==="video"&&<label>Enlace de YouTube o Vimeo<input type="url" value={b.content.url??""} onChange={e=>change(i,"url",e.target.value)} placeholder="https://youtu.be/..."/></label>}
 {(b.type==="image"||b.type==="document")&&<><label>Recurso<select value={b.content.resourceId??""} onChange={e=>change(i,"resourceId",e.target.value)}><option value="">Seleccionar…</option>{resources.filter(r=>b.type==="image"?r.mime_type.startsWith("image/"):r.mime_type==="application/pdf").map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>{b.type==="image"&&<label>Texto alternativo<input value={b.content.alt??""} onChange={e=>change(i,"alt",e.target.value)}/></label>}</>}
 {b.type==="checklist"&&<><label>Título<input value={b.content.title??""} onChange={e=>change(i,"title",e.target.value)}/></label><label>Una actividad por línea<textarea value={b.content.items??""} onChange={e=>change(i,"items",e.target.value)} rows={5}/></label></>}
 {b.type==="callout"&&<><label>Aviso<textarea value={b.content.text??""} onChange={e=>change(i,"text",e.target.value)} rows={3}/></label><label>Estilo<select value={b.content.variant??"neutral"} onChange={e=>change(i,"variant",e.target.value)}><option value="neutral">Neutral</option><option value="info">Informativo</option><option value="warning">Advertencia</option></select></label></>}
 </fieldset>)}<div className="block-add">{(Object.keys(labels) as BlockType[]).map(type=><button type="button" key={type} onClick={()=>add(type)}>+ {labels[type]}</button>)}</div></section>;
}
