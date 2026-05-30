// Low-res "dot-matrix" pixel world map. Continents are defined as lng/lat
// polygons (approximate real coastlines) and rasterized onto a grid; the
// VisitorMap renders each land cell as a spaced square tile for the classic
// dotted-world look. Tweak COUNTRIES to refine shapes.

export const GRID_W = 144;
export const GRID_H = 72;

type Poly = [number, number][]; // [lng, lat] vertices

const NORTH_AMERICA: Poly = [
  [-168, 65], [-152, 70], [-125, 70], [-95, 72], [-75, 68], [-60, 63],
  [-54, 52], [-66, 45], [-72, 41], [-76, 36], [-81, 30], [-80, 25],
  [-89, 29], [-97, 26], [-106, 22], [-112, 28], [-122, 38], [-128, 48],
  [-138, 58],
];
const CENTRAL_AMERICA: Poly = [
  [-92, 18], [-86, 16], [-79, 9], [-77, 8], [-83, 11], [-88, 15], [-94, 16],
];
const GREENLAND: Poly = [
  [-45, 60], [-22, 68], [-18, 76], [-22, 82], [-45, 83], [-58, 76], [-55, 66],
];
const SOUTH_AMERICA: Poly = [
  [-78, 9], [-60, 11], [-50, 5], [-35, -5], [-38, -13], [-48, -25],
  [-55, -35], [-66, -45], [-71, -53], [-74, -44], [-71, -30], [-76, -16],
  [-81, -5], [-79, 3],
];
const AFRICA: Poly = [
  [-17, 21], [-5, 32], [11, 34], [25, 32], [33, 31], [35, 24], [43, 12],
  [51, 11], [44, -2], [40, -16], [27, -34], [18, -35], [13, -23], [9, 2],
  [5, 5], [-8, 4], [-14, 10], [-17, 15],
];
const MADAGASCAR: Poly = [
  [44, -13], [50, -16], [47, -25], [44, -22],
];
const ARABIA: Poly = [
  [34, 30], [42, 30], [48, 29], [57, 25], [59, 22], [52, 15], [45, 12],
  [40, 15], [36, 22],
];
const EURASIA: Poly = [
  [-9, 43], [-4, 48], [1, 50], [8, 54], [10, 58], [14, 65], [20, 70],
  [30, 71], [55, 70], [75, 73], [105, 77], [135, 73], [160, 70], [178, 67],
  [172, 62], [160, 60], [158, 53], [143, 46], [132, 43], [127, 40],
  [122, 31], [112, 22], [107, 18], [100, 12], [98, 8], [93, 16], [88, 22],
  [83, 18], [80, 9], [73, 18], [67, 24], [60, 25], [57, 26], [50, 29],
  [48, 30], [40, 37], [36, 36], [30, 40], [26, 40], [23, 38], [19, 40],
  [15, 44], [8, 44], [3, 43], [-2, 36], [-9, 37],
];
const UK: Poly = [
  [-6, 50], [-3, 53], [-5, 58], [-2, 57], [-1, 52], [-4, 50],
];
const JAPAN: Poly = [
  [130, 31], [136, 35], [141, 40], [143, 44], [140, 43], [136, 36], [131, 33],
];
const INDONESIA: Poly = [
  [95, 5], [105, 1], [118, -2], [132, -3], [141, -8], [120, -9], [104, -7],
  [97, -1],
];
const AUSTRALIA: Poly = [
  [114, -22], [122, -18], [130, -12], [137, -11], [143, -11], [147, -20],
  [150, -30], [150, -38], [140, -38], [131, -32], [123, -34], [115, -34],
  [113, -26],
];
const NEW_ZEALAND: Poly = [
  [172, -41], [174, -37], [177, -39], [174, -46], [170, -45],
];

const COUNTRIES: Poly[] = [
  NORTH_AMERICA, CENTRAL_AMERICA, GREENLAND, SOUTH_AMERICA, AFRICA,
  MADAGASCAR, ARABIA, EURASIA, UK, JAPAN, INDONESIA, AUSTRALIA, NEW_ZEALAND,
];

const inPoly = (lng: number, lat: number, poly: Poly): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
};

export const buildLandGrid = (): boolean[] => {
  const grid: boolean[] = new Array(GRID_W * GRID_H).fill(false);
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const lng = ((gx + 0.5) / GRID_W) * 360 - 180;
      const lat = 90 - ((gy + 0.5) / GRID_H) * 180;
      grid[gy * GRID_W + gx] = COUNTRIES.some((p) => inPoly(lng, lat, p));
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
