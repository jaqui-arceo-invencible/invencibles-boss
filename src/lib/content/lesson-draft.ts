import type { BlockInput } from "./blocks";

// An empty media slot is an editing affordance, not lesson content.
// Nonempty invalid identifiers/URLs remain for normal server validation.
export function prepareDraftBlocks(blocks: BlockInput[]): BlockInput[] {
  return blocks.filter((block) => {
    if (block.type === "image" || block.type === "document") return Boolean(block.content.resourceId?.trim());
    if (block.type === "video") return Boolean(block.content.url?.trim());
    return true;
  }).map((block, position) => ({ ...block, position }));
}
