export type TriadPoint = { a: number; b: number; c: number; };

export type TriadConversionResult =
  | { ok: true; value: TriadPoint }
  | { ok: false; reason: "outside_triangle" | "invalid_vertices" };

export function isValidTriadPoint(point: TriadPoint, epsilon = 1e-6): boolean {
  return (
    point.a >= -epsilon &&
    point.b >= -epsilon &&
    point.c >= -epsilon &&
    Math.abs(point.a + point.b + point.c - 1) <= epsilon
  );
}

// In Cerne-app, triangle vertices are conventionally:
// Top: (50, 0), BottomLeft: (0, 100), BottomRight: (100, 100)
// a = Top, b = BottomLeft, c = BottomRight
const VERTICES = {
  a: { x: 50, y: 0 },
  b: { x: 0, y: 100 },
  c: { x: 100, y: 100 }
};

export function cartesianToBarycentric(point: { x: number; y: number }): TriadConversionResult {
  const { x, y } = point;
  const x1 = VERTICES.a.x, y1 = VERTICES.a.y;
  const x2 = VERTICES.b.x, y2 = VERTICES.b.y;
  const x3 = VERTICES.c.x, y3 = VERTICES.c.y;

  const det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  if (det === 0) {
    return { ok: false, reason: "invalid_vertices" };
  }

  let a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / det;
  let b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / det;
  let c = 1 - a - b;

  // Clamp tiny floating point errors
  const epsilon = 1e-6;
  if (a > -epsilon && a < 0) a = 0;
  if (b > -epsilon && b < 0) b = 0;
  if (c > -epsilon && c < 0) c = 0;

  if (a > 1 && a < 1 + epsilon) a = 1;
  if (b > 1 && b < 1 + epsilon) b = 1;
  if (c > 1 && c < 1 + epsilon) c = 1;

  const triad = { a, b, c };

  if (!isValidTriadPoint(triad, epsilon)) {
    return { ok: false, reason: "outside_triangle" };
  }

  // Normalize final components so they total exactly 1
  const sum = triad.a + triad.b + triad.c;
  return {
    ok: true,
    value: {
      a: triad.a / sum,
      b: triad.b / sum,
      c: triad.c / sum
    }
  };
}

export function barycentricToCartesian(triad: TriadPoint): { x: number; y: number } {
  return {
    x: triad.a * VERTICES.a.x + triad.b * VERTICES.b.x + triad.c * VERTICES.c.x,
    y: triad.a * VERTICES.a.y + triad.b * VERTICES.b.y + triad.c * VERTICES.c.y
  };
}
