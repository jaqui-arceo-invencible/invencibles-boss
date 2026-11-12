/* eslint-disable @next/next/no-img-element -- Private signed URLs should not pass through a shared image optimizer cache. */
import { safeVideoUrl, type BlockType } from "@/lib/content/blocks";
import { RichTextView } from "@/components/features/cms/rich-text-view";
import { ChecklistBlock } from "@/components/features/learning/checklist-block";
import { checklistItems } from "@/lib/learning/progress";

type Block = { id: string; type: BlockType; content: Record<string, string> };

export function ContentRenderer({ blocks, resourceUrls, lessonId, completedItemIds = [] }: { blocks: Block[]; resourceUrls: Record<string, string>; lessonId?: string; completedItemIds?: string[] }) {
  return <div className="lesson-content">{blocks.map((block) => {
    const content = block.content;
    const url = resourceUrls[content.resourceId] ?? "";
    switch (block.type) {
      case "rich_text":
        return <div className="lesson-block" key={block.id}><RichTextView value={content.doc ?? content.text ?? ""} /></div>;
      case "image":
        return <figure className="lesson-block" key={block.id}>{url ? <img src={url} alt={content.alt ?? ""} loading="lazy" /> : null}{content.caption ? <figcaption>{content.caption}</figcaption> : null}</figure>;
      case "video": {
        const embed = safeVideoUrl(content.url ?? "");
        return embed ? <div className="lesson-block video-frame" key={block.id}><iframe src={embed} title={content.title ?? "Video de la lección"} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : null;
      }
      case "document":
        return <p className="lesson-block" key={block.id}>{url ? <a href={url} target="_blank" rel="noreferrer">Ver o descargar PDF</a> : null}</p>;
      case "checklist": {
        const items = checklistItems(content.items ?? "");
        if (lessonId) return <ChecklistBlock key={block.id} lessonId={lessonId} blockId={block.id} title={content.title ?? ""} items={items} completedItemIds={completedItemIds} />;
        return <section className="lesson-block" key={block.id}>{content.title ? <h2>{content.title}</h2> : null}<ul>{items.map((item) => <li key={item.id}>{item.text}</li>)}</ul></section>;
      }
      case "divider":
        return <hr className="lesson-block" key={block.id} />;
      case "callout":
        return <aside className={`lesson-block callout callout-${["neutral", "info", "warning"].includes(content.variant) ? content.variant : "neutral"}`} key={block.id}>{content.text}</aside>;
      default:
        return null;
    }
  })}</div>;
}
