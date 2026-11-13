"use client";
/* eslint-disable @next/next/no-img-element -- Private signed media previews bypass the shared optimizer cache. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, ListChecks, MessageSquare, MoreHorizontal, Plus, Trash2, Type } from "lucide-react";
import { safeVideoUrl, type BlockInput, type BlockType } from "@/lib/content/blocks";
import { ChecklistEditor } from "@/components/features/cms/checklist-editor";
import { RichTextEditor } from "@/components/features/cms/rich-text-editor";
import { DirectLessonUpload, type UploadedLessonFile } from "@/components/features/cms/direct-lesson-upload";
const labels: Record<BlockType,string>={rich_text:"Texto",image:"Imagen",video:"Video",document:"Documento",checklist:"Checklist",divider:"Separador",callout:"Aviso"};
type Resource={id:string;title:string;mime_type:string;previewUrl?:string};
type EditableBlock=BlockInput & {clientId:string};
export function BlockComposer({initial,resources,moduleId,lessonId,onBusyChange,onDirty,onChange}:{initial:BlockInput[];resources:Resource[];moduleId:string;lessonId:string;onBusyChange?:(busy:boolean)=>void;onDirty?:()=>void;onChange?:(blocks:BlockInput[])=>void}) {
 const [resourceOptions,setResourceOptions]=useState(resources);
 const [uploading,setUploading]=useState<Set<string>>(()=>new Set());
 const uploadState=useCallback((id:string,busy:boolean)=>setUploading(current=>{if(current.has(id)===busy)return current;const next=new Set(current);if(busy)next.add(id);else next.delete(id);return next;}),[]);
 useEffect(()=>{onBusyChange?.(uploading.size>0);},[uploading,onBusyChange]);
 const [blocks,setBlocks]=useState<EditableBlock[]>(()=>initial.map(block=>({...block,clientId:crypto.randomUUID()})));
 const blocksRef=useRef(blocks);
 const commit=(recipe:(current:EditableBlock[])=>EditableBlock[])=>{
  const next=recipe(blocksRef.current);
  blocksRef.current=next;
  setBlocks(next);
  onDirty?.();
  onChange?.(next.map((block,position)=>({type:block.type,content:block.content,position})));
 };
 const change=(index:number,key:string,value:string)=>commit(current=>current.map((b,i)=>i===index?{...b,content:{...b.content,[key]:value}}:b));
 const add=(type:BlockType)=>commit(current=>[...current,{type,content:type==="checklist"?{items:JSON.stringify([{id:crypto.randomUUID(),text:""}])}:{},position:current.length,clientId:crypto.randomUUID()}]);
 const remove=(index:number)=>commit(current=>current.filter((_,i)=>i!==index));
 const move=(index:number,delta:number)=>commit(current=>{const target=index+delta;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
 return <section className="block-composer visual-composer"><input type="hidden" name="blocks_json" value={JSON.stringify(blocks.map((b,position)=>({type:b.type,content:b.content,position})))}/>{!blocks.length?<p className="editor-note">Empieza con un texto o una actividad. Puedes agregar más contenido después.</p>:null}{blocks.map((b,i)=><section className="visual-block" key={b.clientId} aria-label={`${i+1}. ${labels[b.type]}`}><header className="visual-block-heading"><span>{labels[b.type]}</span><details className="visual-block-menu"><summary aria-label={`Opciones del bloque ${i+1}`}><MoreHorizontal size={18} aria-hidden="true" /></summary><div className="block-controls"><button type="button" onClick={()=>move(i,-1)} disabled={i===0||uploading.size>0}><ArrowUp size={15} aria-hidden="true" />Subir</button><button type="button" onClick={()=>move(i,1)} disabled={i===blocks.length-1||uploading.size>0}><ArrowDown size={15} aria-hidden="true" />Bajar</button><button type="button" disabled={uploading.size>0} onClick={()=>{if(window.confirm("¿Quitar este bloque de la lección?"))remove(i);}}><Trash2 size={15} aria-hidden="true" />Quitar</button></div></details></header>
 {b.type==="rich_text"&&<RichTextEditor value={b.content.doc??b.content.text??""} onChange={value=>change(i,"doc",value)}/>}
 {b.type==="video"&&<><label>Enlace de YouTube o Vimeo<input type="url" value={b.content.url??""} onChange={e=>change(i,"url",e.target.value)} placeholder="https://youtu.be/..."/></label>{safeVideoUrl(b.content.url??"")?<div className="video-frame"><iframe src={safeVideoUrl(b.content.url??"")??""} title={`Video del bloque ${i+1}`} allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>:null}</>}
 {b.type==="image"&&resourceOptions.find(resource=>resource.id===b.content.resourceId)?.previewUrl?<figure className="visual-image-preview"><img src={resourceOptions.find(resource=>resource.id===b.content.resourceId)?.previewUrl} alt={b.content.alt??""}/></figure>:null}
 {(b.type==="image"||b.type==="document")&&<><BlockUpload id={b.clientId} moduleId={moduleId} lessonId={lessonId} kind={b.type} existing={Boolean(b.content.resourceId)} disabled={uploading.size>0&&!uploading.has(b.clientId)} onBusy={uploadState} onUploaded={(resource)=>{setResourceOptions(current=>[...current,{id:resource.id,title:resource.title,mime_type:resource.mimeType,previewUrl:resource.previewUrl}]);commit(current=>current.map(block=>block.clientId===b.clientId?{...block,content:{...block.content,resourceId:resource.id}}:block));}} />{b.type==="document"&&b.content.resourceId?<p className="editor-note">{resourceOptions.find(resource=>resource.id===b.content.resourceId)?.title??"Documento adjunto"}</p>:null}{b.type==="image"&&b.content.resourceId?<details className="visual-image-options"><summary>Descripción de la imagen (opcional)</summary><label>Texto para personas que no pueden ver la imagen<input value={b.content.alt??""} onChange={e=>change(i,"alt",e.target.value)}/></label></details>:null}</>}
 {b.type==="checklist"&&<ChecklistEditor title={b.content.title??""} items={b.content.items??""} onTitle={value=>change(i,"title",value)} onItems={value=>change(i,"items",value)} />}
 {b.type==="callout"&&<><aside className={`callout callout-${["neutral","info","warning"].includes(b.content.variant)?b.content.variant:"neutral"}`}><textarea aria-label="Texto del aviso" placeholder="Escribe aquí tu aviso…" value={b.content.text??""} onChange={e=>change(i,"text",e.target.value)} rows={3}/></aside><details className="visual-image-options"><summary>Cambiar estilo</summary><label className="visual-style-control">Estilo del aviso<select value={b.content.variant??"neutral"} onChange={e=>change(i,"variant",e.target.value)}><option value="neutral">Neutral</option><option value="info">Informativo</option><option value="warning">Advertencia</option></select></label></details></>}
 {b.type==="divider"&&<hr/>}
 </section>)}<div className="visual-add"><span>Agregar contenido</span><div>{(["rich_text","callout","checklist","image"] as BlockType[]).map(type=>{const Icon=type==="rich_text"?Type:type==="callout"?MessageSquare:type==="checklist"?ListChecks:ImageIcon;return <button type="button" key={type} onClick={()=>add(type)}><Icon size={17} aria-hidden="true" />{labels[type]}</button>;})}<details><summary><Plus size={16} aria-hidden="true" />Más</summary><div>{(["video","document","divider"] as BlockType[]).map(type=><button type="button" key={type} onClick={()=>add(type)}>{labels[type]}</button>)}</div></details></div></div></section>;
}

function BlockUpload({id,moduleId,lessonId,kind,existing,disabled,onBusy,onUploaded}:{id:string;moduleId:string;lessonId:string;kind:"image"|"document";existing:boolean;disabled:boolean;onBusy:(id:string,busy:boolean)=>void;onUploaded:(resource:UploadedLessonFile)=>void}) {
 const handleBusy=useCallback((busy:boolean)=>onBusy(id,busy),[id,onBusy]);
 return <DirectLessonUpload moduleId={moduleId} lessonId={lessonId} kind={kind} imageTile={kind==="image"&&!existing} label={kind==="image"?(existing?"Cambiar imagen":"Subir imagen"):(existing?"Cambiar archivo":"Subir archivo")} disabled={disabled} onBusyChange={handleBusy} onUploaded={onUploaded}/>;
}
