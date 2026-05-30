// Procedurally-built low-res pixel world map (equirectangular) + helpers.
// Continents are approximated as elliptical blobs so the asset is deterministic
// and easy to tweak — refine the CONTINENTS list to adjust shapes.

export const GRID_W = 128;
export const GRID_H = 64;

// [centerLng, centerLat, radiusLng, radiusLat]
const CONTINENTS: [number, number, number, number][] = [
  [-100, 45, 34, 22], // North America
  [-88, 14, 12, 9], // Central America
  [-45, 72, 13, 9], // Greenland
  [-60, -20, 15, 26], // South America
  [12, 50, 18, 13], // Europe
  [20, 5, 22, 30], // Africa
  [95, 50, 56, 26], // Asia
  [78, 22, 11, 13], // India
  [115, 2, 17, 11], // SE Asia / Indonesia
  [134, -25, 15, 11], // Australia
];

const inBlob = (lng: number, lat: number): boolean =>
  CONTINENTS.some(([cl, ca, rl, ra]) => {
    const dl = (lng - cl) / rl;
    const da = (lat - ca) / ra;
    return dl * dl + da * da <= 1;
  });

export const buildLandGrid = (): boolean[] => {
  const grid: boolean[] = new Array(GRID_W * GRID_H).fill(false);
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const lng = (gx / GRID_W) * 360 - 180;
      const lat = 90 - (gy / GRID_H) * 180;
      grid[gy * GRID_W + gx] = inBlob(lng, lat) || lat < -62; // + Antarctica band
    }
  }
  return grid;
};

// Equirectangular projection into a [0..w] x [0..h] box.
export const project = (
  lng: number,
  lat: number,
  w: number,
  h: number,
): { x: number; y: number } => ({
  x: ((lng + 180) / 360) * w,
  y: ((90 - lat) / 180) * h,
});

export type VisitPoint = {
  lat: number;
  lng: number;
  city: string;
  country: string;
  count: number;
};

// Shown only when the backend isn't configured yet (clearly flagged as demo).
export const SAMPLE_POINTS: VisitPoint[] = [
  { city: 'Chicago', country: 'US', lat: 41, lng: -88, count: 7 },
  { city: 'San Francisco', country: 'US', lat: 38, lng: -122, count: 5 },
  { city: 'London', country: 'GB', lat: 52, lng: 0, count: 4 },
  { city: 'Berlin', country: 'DE', lat: 52, lng: 13, count: 3 },
  { city: 'Beijing', country: 'CN', lat: 40, lng: 116, count: 6 },
  { city: 'Tokyo', country: 'JP', lat: 36, lng: 140, count: 3 },
  { city: 'Sydney', country: 'AU', lat: -34, lng: 151, count: 2 },
  { city: 'São Paulo', country: 'BR', lat: -23, lng: -46, count: 2 },
];
