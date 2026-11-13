/* eslint-disable @next/next/no-img-element -- Private signed avatar URLs should not pass through a shared image optimizer cache. */

export function PersonAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt="" className="community-avatar" />;
  const initial = name.trim().slice(0, 1).toLocaleUpperCase() || "I";
  return <span className="community-avatar community-avatar-fallback" aria-hidden="true">{initial}</span>;
}
