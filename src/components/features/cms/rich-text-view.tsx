import type { ReactNode } from "react";
import { safeExternalLink } from "@/lib/content/blocks";
type Node={type?:string;text?:string;attrs?:Record<string,unknown>;marks?:{type?:string;attrs?:Record<string,unknown>}[];content?:Node[]};
function renderNode(node:Node,key:number):ReactNode {
 if(node.type==="text") { let result:ReactNode=node.text??"";for(const mark of node.marks??[]){if(mark.type==="bold")result=<strong key={key}>{result}</strong>;if(mark.type==="italic")result=<em key={key}>{result}</em>;if(mark.type==="link"){const href=typeof mark.attrs?.href==="string"?safeExternalLink(mark.attrs.href):null;if(href)result=<a key={key} href={href} target="_blank" rel="noopener noreferrer">{result}</a>;}}return result; }
 const children=(node.content??[]).map(renderNode);
 switch(node.type){case "doc":return <div key={key}>{children}</div>;case "paragraph":return <p key={key}>{children}</p>;case "heading":return node.attrs?.level===2?<h2 key={key}>{children}</h2>:<h3 key={key}>{children}</h3>;case "bulletList":return <ul key={key}>{children}</ul>;case "orderedList":return <ol key={key}>{children}</ol>;case "listItem":return <li key={key}>{children}</li>;case "blockquote":return <blockquote key={key}>{children}</blockquote>;case "hardBreak":return <br key={key}/>;default:return <span key={key}>{children}</span>;}
}
function parseDocument(value:string):Node|null {try {const parsed:unknown=JSON.parse(value);return parsed&&typeof parsed==="object"&&"type" in parsed&&parsed.type==="doc"?parsed as Node:null;}catch{return null;}}
export function RichTextView({value}:{value:string}) {
 const parsed=parseDocument(value);
 if(parsed)return <div className="rich-content">{renderNode(parsed,0)}</div>;
 return <div className="rich-content">{value.split(/\n\n+/).map((p,i)=><p key={i}>{p}</p>)}</div>;
}
