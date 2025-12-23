export type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Eye Aspect Ratio (EAR)
 * (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
export function calculateEAR(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  p5: Point,
  p6: Point
) {
  const vertical1 = distance(p2, p6);
  const vertical2 = distance(p3, p5);
  const horizontal = distance(p1, p4);

  return (vertical1 + vertical2) / (2 * horizontal);
}
