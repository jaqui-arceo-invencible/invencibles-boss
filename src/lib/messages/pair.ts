export function orderParticipants(left: string, right: string) {
  const first = left.trim().toLowerCase();
  const second = right.trim().toLowerCase();
  if (!first || !second || first === second) return null;
  return first < second ? { low: first, high: second } : { low: second, high: first };
}

export function shouldNotify(actorId: string, recipientId: string) {
  return actorId.length > 0 && recipientId.length > 0 && actorId !== recipientId;
}

export function announcementOnceKey(recipientId: string, postId: string) {
  return `${recipientId}:${postId}`;
}
