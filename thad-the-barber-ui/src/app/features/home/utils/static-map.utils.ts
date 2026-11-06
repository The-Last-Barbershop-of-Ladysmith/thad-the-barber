/** The themed Static Maps image of an address with a copper pin; null until the key and map ID are set. */
export function toStaticMapUrl(
  addressLine: string,
  apiKey: string,
  mapId: string,
): string | null {
  if (!apiKey || !mapId) {
    return null;
  }
  const query: string = encodeURIComponent(addressLine);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${query}&zoom=15&size=640x480&scale=2`
    + `&map_id=${encodeURIComponent(mapId)}&markers=color:0xe8904a%7C${query}&key=${encodeURIComponent(apiKey)}`;
}
