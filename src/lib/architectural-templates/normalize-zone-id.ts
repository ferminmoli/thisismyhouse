/** Normaliza IDs de zona para matching (mayúsculas, sin acentos). */
export function normalizeZoneId(id: string): string {
  return id
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function zoneIdMatchesAccepted(
  zoneId: string,
  acceptedRoomIds: string[],
): boolean {
  const n = normalizeZoneId(zoneId);
  return acceptedRoomIds.some((a) => normalizeZoneId(a) === n);
}
