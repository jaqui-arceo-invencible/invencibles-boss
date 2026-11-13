import { communityTextParts } from "@/lib/community/text";

export function CommunityText({ text }: { text: string }) {
  return <p className="community-body">{communityTextParts(text).map((part, index) => part.kind === "link"
    ? <a key={`${part.value}-${index}`} href={part.value} rel="noreferrer noopener">{part.value}</a>
    : <span key={`${index}-${part.value.slice(0, 12)}`}>{part.value}</span>)}</p>;
}
