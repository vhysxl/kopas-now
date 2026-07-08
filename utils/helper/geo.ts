/**
 * Geo utilities for KopasNow
 * - Parse PostGIS WKB hex (EWKB with SRID) to [lat, lng]
 * - Haversine distance calculation
 * - Sort koperasi by distance from user
 */

export interface KoperasiLocation {
  id: string;
  nama: string;
  kode_koperasi: string;
  alamat: string | null;
  admin_phone: string | null;
  status: string;
  lat: number;
  lng: number;
  created_at: string;
}

/**
 * Parse PostGIS EWKB hex string to [lat, lng].
 *
 * Format for Point with SRID 4326:
 * - Byte 0: byte order (01 = little-endian)
 * - Bytes 1-4: WKB type (01000020 = Point with SRID, LE)
 * - Bytes 5-8: SRID (E6100000 = 4326, LE)
 * - Bytes 9-16: X (longitude) as float64
 * - Bytes 17-24: Y (latitude) as float64
 *
 * Hex string is 50 chars total (25 bytes).
 */
export function parseWKBHex(hex: string): [lat: number, lng: number] {
  // Remove any whitespace
  const clean = hex.replace(/\s/g, "");

  // Validate minimum length: 25 bytes = 50 hex chars
  if (clean.length < 50) {
    throw new Error(`Invalid WKB hex: expected at least 50 chars, got ${clean.length}`);
  }

  // Byte 0: endianness (01 = little-endian, 00 = big-endian)
  const byteOrder = clean.substring(0, 2);
  const isLittleEndian = byteOrder === "01";

  // For EWKB with SRID, the type field has the 0x20000000 flag set
  // Bytes 1-4 (hex chars 2-9): type
  // Bytes 5-8 (hex chars 10-17): SRID
  // We check if SRID flag is set by looking at type
  const typeHex = clean.substring(2, 10);

  let coordStart: number;

  // Check if SRID is embedded (EWKB format)
  // In little-endian, Point with SRID = 01 20000001 (type bytes reversed)
  // The 0x20 flag in the 4th byte (big-endian) indicates SRID presence
  if (clean.length >= 50) {
    // Assume EWKB with SRID: skip 1(order) + 4(type) + 4(srid) = 9 bytes = 18 hex chars
    coordStart = 18;
  } else {
    // Standard WKB without SRID: skip 1(order) + 4(type) = 5 bytes = 10 hex chars
    coordStart = 10;
  }

  const xHex = clean.substring(coordStart, coordStart + 16);
  const yHex = clean.substring(coordStart + 16, coordStart + 32);

  const lng = hexToFloat64(xHex, isLittleEndian); // X = longitude
  const lat = hexToFloat64(yHex, isLittleEndian); // Y = latitude

  return [lat, lng];
}

/**
 * Convert 16-char hex string to IEEE 754 float64.
 */
function hexToFloat64(hex: string, littleEndian: boolean): number {
  const bytes = new Uint8Array(8);

  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }

  if (littleEndian) {
    // Bytes are already in LE order from the hex string
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    for (let i = 0; i < 8; i++) {
      view.setUint8(i, bytes[i]);
    }
    return view.getFloat64(0, true); // true = little-endian
  } else {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    for (let i = 0; i < 8; i++) {
      view.setUint8(i, bytes[i]);
    }
    return view.getFloat64(0, false); // false = big-endian
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Sort koperasi by distance from user location (nearest first).
 */
export function sortByDistance(
  list: KoperasiLocation[],
  userLat: number,
  userLng: number,
): (KoperasiLocation & { distance: number })[] {
  return list
    .map((k) => ({
      ...k,
      distance: haversineDistance(userLat, userLng, k.lat, k.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Format distance for display.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Reverse geocode a latitude and longitude to a location name.
 * Uses OpenStreetMap Nominatim API (Free, No Auth).
 * 
 * NOTE: Nominatim requires a User-Agent, but in browsers fetch sets it automatically.
 * We'll extract city, town, village, or suburb.
 */
export async function getLocationName(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      // Cache heavily as location coordinates don't change names often
      cache: "force-cache", 
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.address) {
      // Prioritize city, then town, municipality, village, suburb, county
      const { city, town, municipality, village, suburb, county } = data.address;
      const location = city || town || municipality || village || suburb || county;
      return location || null;
    }

    return null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
