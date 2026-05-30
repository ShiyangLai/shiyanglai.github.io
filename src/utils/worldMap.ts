// Dot-matrix pixel world map. Continents/islands are defined as lng/lat
// coastline polygons (approximate real shapes) rasterized via point-in-polygon
// onto a high-res grid; the VisitorMap renders each land cell as a spaced
// square tile for the classic dotted-world look. Seas between landmasses are
// water automatically (union of polygons); fully-enclosed seas (Caspian, etc.)
// are not carved. Tweak LANDMASSES to refine shapes.

export const GRID_W = 192;
export const GRID_H = 96;

type Poly = [number, number][]; // [lng, lat] vertices, in order around the coast

const NORTH_AMERICA: Poly = [
  [-168, 66], [-166, 68], [-156, 71], [-140, 70], [-122, 70], [-100, 70],
  [-85, 69], [-80, 73], [-70, 67], [-64, 60], [-56, 53], [-53, 47], [-60, 47],
  [-67, 45], [-70, 43], [-70, 41], [-74, 40], [-76, 37], [-76, 35], [-81, 31],
  [-80, 27], [-80, 25], [-83, 29], [-90, 29], [-94, 29], [-97, 28], [-97, 26],
  [-95, 22], [-97, 20], [-105, 18], [-105, 23], [-110, 23], [-110, 27],
  [-114, 28], [-117, 32], [-121, 35], [-124, 40], [-124, 46], [-130, 54],
  [-135, 58], [-140, 60], [-150, 59], [-158, 56], [-162, 60], [-165, 63],
];
const GREENLAND: Poly = [
  [-45, 60], [-30, 60], [-20, 64], [-18, 70], [-22, 76], [-30, 82], [-45, 83],
  [-58, 80], [-55, 72], [-52, 66], [-48, 61],
];
const CUBA: Poly = [[-84, 22], [-80, 23], [-74, 20], [-78, 20], [-82, 21]];
const HISPANIOLA: Poly = [[-74, 19], [-68, 19], [-69, 18], [-72, 18]];
const CENTRAL_AMERICA: Poly = [
  [-92, 18], [-88, 17], [-83, 15], [-80, 9], [-77, 8], [-79, 11], [-83, 11],
  [-87, 13], [-91, 16],
];
const SOUTH_AMERICA: Poly = [
  [-78, 8], [-72, 11], [-62, 11], [-60, 8], [-50, 5], [-50, 0], [-44, -2],
  [-35, -5], [-35, -8], [-39, -13], [-41, -22], [-48, -25], [-48, -28],
  [-54, -34], [-58, -34], [-62, -40], [-66, -45], [-69, -50], [-70, -54],
  [-73, -50], [-74, -45], [-73, -37], [-71, -30], [-71, -24], [-70, -18],
  [-76, -14], [-79, -8], [-81, -5], [-80, -2], [-78, 2], [-78, 5],
];
const AFRICA: Poly = [
  [-17, 15], [-17, 21], [-12, 28], [-5, 32], [2, 34], [10, 33], [11, 37],
  [20, 33], [25, 32], [30, 31], [33, 31], [35, 28], [34, 22], [37, 18],
  [40, 15], [43, 11], [48, 8], [51, 12], [51, 5], [44, -2], [40, -8],
  [40, -15], [35, -22], [33, -26], [27, -34], [20, -35], [18, -33], [15, -26],
  [13, -18], [11, -8], [9, 0], [9, 4], [5, 5], [0, 6], [-7, 5], [-12, 8],
  [-16, 12],
];
const MADAGASCAR: Poly = [
  [44, -12], [49, -13], [50, -16], [48, -22], [45, -25], [43, -22], [44, -16],
];
const ARABIA: Poly = [
  [34, 29], [38, 30], [43, 30], [48, 30], [52, 25], [57, 25], [60, 22],
  [58, 18], [52, 14], [48, 13], [44, 12], [43, 15], [40, 20], [36, 24],
  [34, 28],
];
const EURASIA: Poly = [
  [-9, 43], [-9, 40], [-6, 37], [-2, 37], [-2, 43], [-1, 46], [-4, 48],
  [-2, 49], [1, 50], [4, 52], [8, 54], [8, 57], [5, 58], [5, 61], [8, 63],
  [12, 65], [15, 68], [20, 70], [26, 71], [30, 70], [40, 68], [50, 69],
  [60, 70], [70, 72], [80, 74], [100, 77], [115, 74], [130, 73], [140, 73],
  [150, 72], [160, 70], [170, 69], [178, 66], [170, 64], [162, 60], [160, 58],
  [155, 52], [142, 46], [135, 44], [131, 43], [129, 42], [129, 38], [126, 35],
  [126, 38], [123, 40], [121, 37], [120, 34], [121, 31], [118, 24], [110, 21],
  [108, 21], [106, 16], [106, 10], [104, 9], [100, 13], [100, 8], [98, 8],
  [98, 12], [97, 16], [94, 16], [91, 22], [87, 21], [84, 18], [80, 12],
  [78, 8], [73, 15], [70, 21], [67, 24], [62, 25], [60, 25], [58, 26],
  [56, 27], [50, 29], [48, 30], [44, 37], [40, 40], [36, 36], [30, 36],
  [28, 40], [26, 40], [23, 40], [20, 40], [19, 42], [16, 42], [18, 40],
  [15, 38], [12, 42], [10, 44], [7, 44], [3, 43], [-2, 36],
];
const BRITAIN: Poly = [
  [-5, 50], [-3, 53], [-5, 55], [-6, 58], [-3, 58], [-1, 54], [0, 53],
  [-1, 51], [-4, 50],
];
const IRELAND: Poly = [[-10, 52], [-6, 55], [-10, 55], [-10, 53]];
const ICELAND: Poly = [[-24, 65], [-14, 65], [-14, 66], [-22, 67]];
const SCANDINAVIA_TIP: Poly = [[18, 69], [24, 71], [28, 70], [22, 68]];
const JAPAN: Poly = [
  [130, 31], [132, 33], [135, 34], [138, 35], [141, 39], [142, 41], [140, 42],
  [143, 44], [141, 45], [138, 37], [135, 35], [131, 32],
];
const KAMCHATKA: Poly = [[156, 51], [162, 56], [163, 61], [160, 60], [157, 55]];
const SAKHALIN: Poly = [[142, 46], [143, 50], [141, 53], [141, 48]];
const SRI_LANKA: Poly = [[80, 6], [82, 7], [82, 9], [80, 9]];
const SUMATRA: Poly = [[95, 5], [100, 0], [104, -5], [100, -4], [96, 2]];
const JAVA: Poly = [[105, -6], [114, -8], [110, -8], [106, -7]];
const BORNEO: Poly = [[109, 2], [117, 1], [118, -3], [110, -4], [109, 0]];
const SULAWESI: Poly = [[119, 1], [123, 0], [125, -5], [120, -3], [120, 1]];
const NEW_GUINEA: Poly = [
  [131, -1], [141, -3], [150, -7], [143, -9], [134, -5],
];
const PHILIPPINES: Poly = [
  [120, 6], [122, 10], [124, 14], [121, 16], [120, 12], [121, 7],
];
const AUSTRALIA: Poly = [
  [114, -22], [114, -26], [116, -34], [120, -34], [123, -34], [129, -32],
  [134, -33], [138, -35], [140, -38], [144, -38], [147, -38], [150, -37],
  [153, -31], [153, -26], [148, -20], [146, -18], [143, -13], [141, -12],
  [137, -12], [136, -15], [131, -12], [129, -15], [126, -14], [122, -18],
];
const TASMANIA: Poly = [[145, -41], [148, -41], [148, -43], [145, -43]];
const NZ_NORTH: Poly = [[173, -35], [176, -38], [178, -40], [174, -41], [173, -37]];
const NZ_SOUTH: Poly = [[167, -44], [171, -42], [174, -46], [168, -47], [166, -45]];

const LANDMASSES: Poly[] = [
  NORTH_AMERICA, GREENLAND, CUBA, HISPANIOLA, CENTRAL_AMERICA, SOUTH_AMERICA,
  AFRICA, MADAGASCAR, ARABIA, EURASIA, BRITAIN, IRELAND, ICELAND,
  SCANDINAVIA_TIP, JAPAN, KAMCHATKA, SAKHALIN, SRI_LANKA, SUMATRA, JAVA,
  BORNEO, SULAWESI, NEW_GUINEA, PHILIPPINES, AUSTRALIA, TASMANIA, NZ_NORTH,
  NZ_SOUTH,
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
      grid[gy * GRID_W + gx] = LANDMASSES.some((p) => inPoly(lng, lat, p));
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
