"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { safeExternalLink } from "@/lib/content/blocks";
export function RichTextEditor({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 let content: object | string = value;
 try { if(value.startsWith("{")) content=JSON.parse(value) as object; } catch { content=value; }
 const editor=useEditor({extensions:[StarterKit.configure({link:{openOnClick:false,autolink:false,linkOnPaste:false}})],content,immediatelyRender:false,onUpdate:({editor})=>onChange(JSON.stringify(editor.getJSON()))});
 if(!editor)return <p>Cargando editor…</p>;
 return <div className="rich-editor"><div className="rich-toolbar" role="toolbar" aria-label="Formato de texto">
 <button type="button" onClick={()=>editor.chain().focus().toggleBold().run()} aria-label="Negrita"><b>B</b></button>
 <button type="button" onClick={()=>editor.chain().focus().toggleItalic().run()} aria-label="Cursiva"><i>I</i></button>
 <button type="button" onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()}>H2</button>
 <button type="button" onClick={()=>editor.chain().focus().toggleHeading({level:3}).run()}>H3</button>
 <button type="button" onClick={()=>editor.chain().focus().toggleBulletList().run()}>• Lista</button>
 <button type="button" onClick={()=>editor.chain().focus().toggleOrderedList().run()}>1. Lista</button>
 <button type="button" onClick={()=>editor.chain().focus().toggleBlockquote().run()}>Cita</button>
 <button type="button" onClick={()=>{const current=editor.getAttributes("link").href;const input=window.prompt("Enlace HTTPS",typeof current==="string"?current:"https://");if(input===null)return;if(input.trim()===""){editor.chain().focus().unsetLink().run();return;}const safe=safeExternalLink(input.trim());if(!safe){window.alert("Usa un enlace HTTPS válido.");return;}editor.chain().focus().extendMarkRange("link").setLink({href:safe}).run();}} aria-label="Insertar o editar enlace">Enlace</button>
 </div><EditorContent editor={editor}/></div>;
}
