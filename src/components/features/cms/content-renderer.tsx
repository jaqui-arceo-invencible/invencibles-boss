/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import { safeVideoUrl, type BlockType } from "@/lib/content/blocks";
import { RichTextView } from "@/components/features/cms/rich-text-view";
type Block={id:string;type:BlockType;content:Record<string,string>};
export function ContentRenderer({blocks,resourceUrls}:{blocks:Block[];resourceUrls:Record<string,string>}) {
 return <div className="lesson-content">{blocks.map(block=>{const c=block.content;const url=resourceUrls[c.resourceId]??"";
  switch(block.type){
   case "rich_text":return <div className="lesson-block" key={block.id}><RichTextView value={c.doc??c.text??""}/></div>;
   case "image":return <figure className="lesson-block" key={block.id}>{url&&<img src={url} alt={c.alt??""} loading="lazy"/>}{c.caption&&<figcaption>{c.caption}</figcaption>}</figure>;
   case "video":{const embed=safeVideoUrl(c.url??"");return embed?<div className="lesson-block video-frame" key={block.id}><iframe src={embed} title={c.title??"Video de la lección"} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>:null;}
   case "document":return <p className="lesson-block" key={block.id}>{url&&<a href={url} target="_blank" rel="noreferrer">Ver o descargar PDF ↗</a>}</p>;
   case "checklist":return <section className="lesson-block" key={block.id}><h2>{c.title}</h2><ul>{(c.items??"").split("\n").filter(Boolean).map((item,i)=><li key={i}>□ {item}</li>)}</ul></section>;
   case "divider":return <hr className="lesson-block" key={block.id}/>;
   case "callout":return <aside className={`lesson-block callout callout-${["neutral","info","warning"].includes(c.variant)?c.variant:"neutral"}`} key={block.id}>{c.text}</aside>;
  }
 })}</div>;
}
