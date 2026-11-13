"use client";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Quote } from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import { safeExternalLink } from "@/lib/content/blocks";
export function RichTextEditor({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 let content: object | string = value;
 try { if(value.startsWith("{")) content=JSON.parse(value) as object; } catch { content=value; }
 const editor=useEditor({extensions:[StarterKit.configure({link:{openOnClick:false,autolink:false,linkOnPaste:false}})],content,immediatelyRender:false,onUpdate:({editor})=>onChange(JSON.stringify(editor.getJSON()))});
 const active=useEditorState({editor,selector:({editor:current})=>({bold:current?.isActive("bold"),italic:current?.isActive("italic"),h2:current?.isActive("heading",{level:2}),h3:current?.isActive("heading",{level:3}),bullet:current?.isActive("bulletList"),ordered:current?.isActive("orderedList"),quote:current?.isActive("blockquote")})});
 if(!editor)return <p>Cargando editor…</p>;
 return <div className="rich-editor"><div className="rich-toolbar" role="toolbar" aria-label="Formato de texto">
 <button type="button" title="Negrita" onClick={()=>editor.chain().focus().toggleBold().run()} aria-pressed={active?.bold} aria-label="Negrita"><Bold size={17}/></button>
 <button type="button" title="Cursiva" onClick={()=>editor.chain().focus().toggleItalic().run()} aria-pressed={active?.italic} aria-label="Cursiva"><Italic size={17}/></button>
 <button type="button" title="Encabezado" aria-label="Encabezado" aria-pressed={active?.h2} onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()}><Heading2 size={17}/></button>
 <button type="button" title="Subtítulo" aria-label="Subtítulo" aria-pressed={active?.h3} onClick={()=>editor.chain().focus().toggleHeading({level:3}).run()}><Heading3 size={17}/></button>
 <button type="button" title="Lista" aria-label="Lista" aria-pressed={active?.bullet} onClick={()=>editor.chain().focus().toggleBulletList().run()}><List size={17}/></button>
 <button type="button" title="Lista numerada" aria-label="Lista numerada" aria-pressed={active?.ordered} onClick={()=>editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17}/></button>
 <button type="button" title="Cita" aria-label="Cita" aria-pressed={active?.quote} onClick={()=>editor.chain().focus().toggleBlockquote().run()}><Quote size={17}/></button>
 <button type="button" onClick={()=>{const current=editor.getAttributes("link").href;const input=window.prompt("Enlace HTTPS",typeof current==="string"?current:"https://");if(input===null)return;if(input.trim()===""){editor.chain().focus().unsetLink().run();return;}const safe=safeExternalLink(input.trim());if(!safe){window.alert("Usa un enlace HTTPS válido.");return;}editor.chain().focus().extendMarkRange("link").setLink({href:safe}).run();}} aria-label="Insertar o editar enlace">Enlace</button>
 </div><EditorContent editor={editor}/></div>;
}
