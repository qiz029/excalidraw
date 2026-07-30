import {
  DEFAULT_ADAPTIVE_RADIUS,
  DEFAULT_PROPORTIONAL_RADIUS,
  invariant,
  LINE_CONFIRM_THRESHOLD,
  ROUNDNESS,
} from "@excalidraw/common";

import {
  bezierEquation,
  curve,
  curveCatmullRomCubicApproxPoints,
  curveOffsetPoints,
  lineSegment,
  lineSegmentIntersectionPoints,
  pointDistance,
  pointFrom,
  pointFromArray,
  pointFromVector,
  pointRotateRads,
  pointTranslate,
  rectangle,
  vectorFromPoint,
  vectorNormalize,
  vectorScale,
  type GlobalPoint,
} from "@excalidraw/math";

import type { Curve, LineSegment, LocalPoint } from "@excalidraw/math";

import type {
  AppState,
  NormalizedZoomValue,
  Zoom,
} from "@excalidraw/excalidraw/types";

import {
  elementCenterPoint,
  getDiamondPoints,
  getHexagonPoints,
  getTrianglePoints,
} from "./bounds";

import { generateLinearCollisionShape } from "./shape";

import { hitElementItself, isPointInElement } from "./collision";
import { LinearElementEditor } from "./linearElementEditor";
import { isRectangularElement } from "./typeChecks";
import { maxBindingDistance_simple } from "./binding";

import {
  getGlobalFixedPointForBindableElement,
  normalizeFixedPoint,
} from "./binding";

import type {
  ElementsMap,
  ExcalidrawArrowElement,
  ExcalidrawBindableElement,
  ExcalidrawDiamondElement,
  ExcalidrawElement,
  ExcalidrawFreeDrawElement,
  ExcalidrawHexagonElement,
  ExcalidrawLinearElement,
  ExcalidrawRectanguloidElement,
  ExcalidrawTriangleElement,
} from "./types";

type ElementShape = [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]];

const ElementShapesCache = new WeakMap<
  ExcalidrawElement,
  { version: ExcalidrawElement["version"]; shapes: Map<number, ElementShape> }
>();

const getElementShapesCacheEntry = <T extends ExcalidrawElement>(
  element: T,
  offset: number,
): ElementShape | undefined => {
  const record = ElementShapesCache.get(element);

  if (!record) {
    return undefined;
  }

  const { version, shapes } = record;

  if (version !== element.version) {
    ElementShapesCache.delete(element);
    return undefined;
  }

  return shapes.get(offset);
};

const setElementShapesCacheEntry = <T extends ExcalidrawElement>(
  element: T,
  shape: ElementShape,
  offset: number,
) => {
  const record = ElementShapesCache.get(element);

  if (!record) {
    ElementShapesCache.set(element, {
      version: element.version,
      shapes: new Map([[offset, shape]]),
    });

    return;
  }

  const { version, shapes } = record;

  if (version !== element.version) {
    ElementShapesCache.set(element, {
      version: element.version,
      shapes: new Map([[offset, shape]]),
    });

    return;
  }

  shapes.set(offset, shape);
};

/**
 * Returns the **rotated** components of freedraw, line or arrow elements.
 *
 * @param element The linear element to deconstruct
 * @returns The rotated in components.
 */
export function deconstructLinearOrFreeDrawElement(
  element: ExcalidrawLinearElement | ExcalidrawFreeDrawElement,
  elementsMap: ElementsMap,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] {
  const cachedShape = getElementShapesCacheEntry(element, 0);

  if (cachedShape) {
    return cachedShape;
  }

  const ops = generateLinearCollisionShape(element, elementsMap);
  const lines = [];
  const curves = [];

  for (let idx = 0; idx < ops.length; idx += 1) {
    const op = ops[idx];
    const prevPoint =
      ops[idx - 1] && pointFromArray<LocalPoint>(ops[idx - 1].data.slice(-2));
    switch (op.op) {
      case "move":
        continue;
      case "lineTo":
        if (!prevPoint) {
          throw new Error("prevPoint is undefined");
        }

        lines.push(
          lineSegment<GlobalPoint>(
            pointFrom<GlobalPoint>(
              element.x + prevPoint[0],
              element.y + prevPoint[1],
            ),
            pointFrom<GlobalPoint>(
              element.x + op.data[0],
              element.y + op.data[1],
            ),
          ),
        );
        continue;
      case "bcurveTo":
        if (!prevPoint) {
          throw new Error("prevPoint is undefined");
        }

        curves.push(
          curve<GlobalPoint>(
            pointFrom<GlobalPoint>(
              element.x + prevPoint[0],
              element.y + prevPoint[1],
            ),
            pointFrom<GlobalPoint>(
              element.x + op.data[0],
              element.y + op.data[1],
            ),
            pointFrom<GlobalPoint>(
              element.x + op.data[2],
              element.y + op.data[3],
            ),
            pointFrom<GlobalPoint>(
              element.x + op.data[4],
              element.y + op.data[5],
            ),
          ),
        );
        continue;
      default: {
        console.error("Unknown op type", op.op);
      }
    }
  }

  const shape = [lines, curves] as ElementShape;
  setElementShapesCacheEntry(element, shape, 0);

  return shape;
}

/**
 * Get the building components of a rectanguloid element in the form of
 * line segments and curves **unrotated**.
 *
 * @param element Target rectanguloid element
 * @param offset Optional offset to expand the rectanguloid shape
 * @returns Tuple of **unrotated** line segments (0) and curves (1)
 */
export function deconstructRectanguloidElement(
  element: ExcalidrawRectanguloidElement,
  offset: number = 0,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] {
  const cachedShape = getElementShapesCacheEntry(element, offset);

  if (cachedShape) {
    return cachedShape;
  }

  let radius = getCornerRadius(
    Math.min(element.width, element.height),
    element,
  );

  if (radius === 0) {
    radius = 0.01;
  }

  const r = rectangle(
    pointFrom(element.x, element.y),
    pointFrom(element.x + element.width, element.y + element.height),
  );

  const top = lineSegment<GlobalPoint>(
    pointFrom<GlobalPoint>(r[0][0] + radius, r[0][1]),
    pointFrom<GlobalPoint>(r[1][0] - radius, r[0][1]),
  );
  const right = lineSegment<GlobalPoint>(
    pointFrom<GlobalPoint>(r[1][0], r[0][1] + radius),
    pointFrom<GlobalPoint>(r[1][0], r[1][1] - radius),
  );
  const bottom = lineSegment<GlobalPoint>(
    pointFrom<GlobalPoint>(r[0][0] + radius, r[1][1]),
    pointFrom<GlobalPoint>(r[1][0] - radius, r[1][1]),
  );
  const left = lineSegment<GlobalPoint>(
    pointFrom<GlobalPoint>(r[0][0], r[1][1] - radius),
    pointFrom<GlobalPoint>(r[0][0], r[0][1] + radius),
  );

  const baseCorners = [
    curve(
      left[1],
      pointFrom<GlobalPoint>(
        left[1][0] + (2 / 3) * (r[0][0] - left[1][0]),
        left[1][1] + (2 / 3) * (r[0][1] - left[1][1]),
      ),
      pointFrom<GlobalPoint>(
        top[0][0] + (2 / 3) * (r[0][0] - top[0][0]),
        top[0][1] + (2 / 3) * (r[0][1] - top[0][1]),
      ),
      top[0],
    ), // TOP LEFT
    curve(
      top[1],
      pointFrom<GlobalPoint>(
        top[1][0] + (2 / 3) * (r[1][0] - top[1][0]),
        top[1][1] + (2 / 3) * (r[0][1] - top[1][1]),
      ),
      pointFrom<GlobalPoint>(
        right[0][0] + (2 / 3) * (r[1][0] - right[0][0]),
        right[0][1] + (2 / 3) * (r[0][1] - right[0][1]),
      ),
      right[0],
    ), // TOP RIGHT
    curve(
      right[1],
      pointFrom<GlobalPoint>(
        right[1][0] + (2 / 3) * (r[1][0] - right[1][0]),
        right[1][1] + (2 / 3) * (r[1][1] - right[1][1]),
      ),
      pointFrom<GlobalPoint>(
        bottom[1][0] + (2 / 3) * (r[1][0] - bottom[1][0]),
        bottom[1][1] + (2 / 3) * (r[1][1] - bottom[1][1]),
      ),
      bottom[1],
    ), // BOTTOM RIGHT
    curve(
      bottom[0],
      pointFrom<GlobalPoint>(
        bottom[0][0] + (2 / 3) * (r[0][0] - bottom[0][0]),
        bottom[0][1] + (2 / 3) * (r[1][1] - bottom[0][1]),
      ),
      pointFrom<GlobalPoint>(
        left[0][0] + (2 / 3) * (r[0][0] - left[0][0]),
        left[0][1] + (2 / 3) * (r[1][1] - left[0][1]),
      ),
      left[0],
    ), // BOTTOM LEFT
  ];

  const corners =
    offset > 0
      ? baseCorners.map(
          (corner) =>
            curveCatmullRomCubicApproxPoints(
              curveOffsetPoints(corner, offset),
            )!,
        )
      : [
          [baseCorners[0]],
          [baseCorners[1]],
          [baseCorners[2]],
          [baseCorners[3]],
        ];

  const sides = [
    lineSegment<GlobalPoint>(
      corners[0][corners[0].length - 1][3],
      corners[1][0][0],
    ),
    lineSegment<GlobalPoint>(
      corners[1][corners[1].length - 1][3],
      corners[2][0][0],
    ),
    lineSegment<GlobalPoint>(
      corners[2][corners[2].length - 1][3],
      corners[3][0][0],
    ),
    lineSegment<GlobalPoint>(
      corners[3][corners[3].length - 1][3],
      corners[0][0][0],
    ),
  ];
  const shape = [sides, corners.flat()] as ElementShape;

  setElementShapesCacheEntry(element, shape, offset);

  return shape;
}

export function getDiamondBaseCorners(
  element: ExcalidrawDiamondElement,
  offset: number = 0,
): Curve<GlobalPoint>[] {
  const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
    getDiamondPoints(element);
  const verticalRadius = element.roundness
    ? getCornerRadius(Math.abs(topX - leftX), element)
    : (topX - leftX) * 0.01;
  const horizontalRadius = element.roundness
    ? getCornerRadius(Math.abs(rightY - topY), element)
    : (rightY - topY) * 0.01;

  const [top, right, bottom, left]: GlobalPoint[] = [
    pointFrom(element.x + topX, element.y + topY),
    pointFrom(element.x + rightX, element.y + rightY),
    pointFrom(element.x + bottomX, element.y + bottomY),
    pointFrom(element.x + leftX, element.y + leftY),
  ];

  return [
    curve(
      pointFrom<GlobalPoint>(
        right[0] - verticalRadius,
        right[1] - horizontalRadius,
      ),
      right,
      right,
      pointFrom<GlobalPoint>(
        right[0] - verticalRadius,
        right[1] + horizontalRadius,
      ),
    ), // RIGHT
    curve(
      pointFrom<GlobalPoint>(
        bottom[0] + verticalRadius,
        bottom[1] - horizontalRadius,
      ),
      bottom,
      bottom,
      pointFrom<GlobalPoint>(
        bottom[0] - verticalRadius,
        bottom[1] - horizontalRadius,
      ),
    ), // BOTTOM
    curve(
      pointFrom<GlobalPoint>(
        left[0] + verticalRadius,
        left[1] + horizontalRadius,
      ),
      left,
      left,
      pointFrom<GlobalPoint>(
        left[0] + verticalRadius,
        left[1] - horizontalRadius,
      ),
    ), // LEFT
    curve(
      pointFrom<GlobalPoint>(
        top[0] - verticalRadius,
        top[1] + horizontalRadius,
      ),
      top,
      top,
      pointFrom<GlobalPoint>(
        top[0] + verticalRadius,
        top[1] + horizontalRadius,
      ),
    ), // TOP
  ];
}

/**
 * Get the **unrotated** building components of a diamond element
 * in the form of line segments and curves as a tuple, in this order.
 *
 * @param element The element to deconstruct
 * @param offset An optional offset
 * @returns Tuple of line **unrotated** segments (0) and curves (1)
 */
export function deconstructDiamondElement(
  element: ExcalidrawDiamondElement,
  offset: number = 0,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] {
  const cachedShape = getElementShapesCacheEntry(element, offset);

  if (cachedShape) {
    return cachedShape;
  }

  const baseCorners = getDiamondBaseCorners(element, offset);

  const corners =
    offset > 0
      ? baseCorners.map(
          (corner) =>
            curveCatmullRomCubicApproxPoints(
              curveOffsetPoints(corner, offset),
            )!,
        )
      : [
          [baseCorners[0]],
          [baseCorners[1]],
          [baseCorners[2]],
          [baseCorners[3]],
        ];

  const sides = [
    lineSegment<GlobalPoint>(
      corners[0][corners[0].length - 1][3],
      corners[1][0][0],
    ),
    lineSegment<GlobalPoint>(
      corners[1][corners[1].length - 1][3],
      corners[2][0][0],
    ),
    lineSegment<GlobalPoint>(
      corners[2][corners[2].length - 1][3],
      corners[3][0][0],
    ),
    lineSegment<GlobalPoint>(
      corners[3][corners[3].length - 1][3],
      corners[0][0][0],
    ),
  ];

  const shape = [sides, corners.flat()] as ElementShape;

  setElementShapesCacheEntry(element, shape, offset);

  return shape;
}

/**
 * Returns a point on the segment `from` -> `to` at given distance from `from`.
 */
const pointAlongSegment = (
  from: GlobalPoint,
  to: GlobalPoint,
  distance: number,
): GlobalPoint => {
  const length = pointDistance(from, to) || 1;
  const t = distance / length;
  return pointFrom(
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  );
};

/**
 * Corner radius for a polygon vertex whose shortest adjacent edge is
 * `minEdgeLength` long. Falls back to a tiny epsilon radius for non-rounded
 * polygons (so sides don't degenerate), mirroring the diamond behavior.
 */
export const getPolygonCornerRadius = (
  minEdgeLength: number,
  element: ExcalidrawElement,
): number => {
  if (element.roundness) {
    return Math.min(
      getCornerRadius(minEdgeLength / 2, element),
      minEdgeLength / 2,
    );
  }
  return minEdgeLength * 0.01;
};

/**
 * Get the **unrotated** corner curves of a polygon element from its flat
 * vertex list (element-local `[x0, y0, x1, y1, ...]`), one curve per vertex,
 * ordered like the input vertices.
 *
 * @param element The polygon element
 * @param points Flat vertex list in element-local coordinates
 * @returns Corner curves in vertex order
 */
const getPolygonBaseCorners = (
  element: ExcalidrawElement,
  points: readonly number[],
): Curve<GlobalPoint>[] => {
  const vertices: GlobalPoint[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    vertices.push(pointFrom(element.x + points[i], element.y + points[i + 1]));
  }

  const count = vertices.length;
  return vertices.map((vertex, index) => {
    const prev = vertices[(index - 1 + count) % count];
    const next = vertices[(index + 1) % count];
    const minEdgeLength = Math.min(
      pointDistance(prev, vertex),
      pointDistance(vertex, next),
    );
    const radius = getPolygonCornerRadius(minEdgeLength, element);

    return curve(
      pointAlongSegment(vertex, prev, radius),
      vertex,
      vertex,
      pointAlongSegment(vertex, next, radius),
    );
  });
};

/**
 * Get the **unrotated** building components of a polygon element from its
 * flat vertex list, in the form of line segments and curves as a tuple.
 *
 * @param element The element to deconstruct
 * @param points Flat vertex list in element-local coordinates
 * @param offset An optional offset
 * @returns Tuple of line **unrotated** segments (0) and curves (1)
 */
const deconstructPolygonFromPoints = (
  element: ExcalidrawElement,
  points: readonly number[],
  offset: number = 0,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] => {
  const cachedShape = getElementShapesCacheEntry(element, offset);

  if (cachedShape) {
    return cachedShape;
  }

  const baseCorners = getPolygonBaseCorners(element, points);

  const corners =
    offset > 0
      ? baseCorners.map(
          (corner) =>
            curveCatmullRomCubicApproxPoints(
              curveOffsetPoints(corner, offset),
            )!,
        )
      : baseCorners.map((corner) => [corner]);

  const sides = corners.map((corner, index) => {
    const nextCorner = corners[(index + 1) % corners.length];
    return lineSegment<GlobalPoint>(
      corner[corner.length - 1][3],
      nextCorner[0][0],
    );
  });

  const shape = [sides, corners.flat()] as ElementShape;

  setElementShapesCacheEntry(element, shape, offset);

  return shape;
};

/**
 * Get the **unrotated** corner curves of a hexagon element, one curve per
 * vertex, ordered clockwise starting from the top vertex.
 *
 * @param element The hexagon element
 * @returns Corner curves in clockwise order
 */
export function getHexagonBaseCorners(
  element: ExcalidrawHexagonElement,
): Curve<GlobalPoint>[] {
  return getPolygonBaseCorners(element, getHexagonPoints(element));
}

/**
 * Get the **unrotated** building components of a hexagon element
 * in the form of line segments and curves as a tuple, in this order.
 *
 * @param element The element to deconstruct
 * @param offset An optional offset
 * @returns Tuple of line **unrotated** segments (0) and curves (1)
 */
export function deconstructHexagonElement(
  element: ExcalidrawHexagonElement,
  offset: number = 0,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] {
  return deconstructPolygonFromPoints(
    element,
    getHexagonPoints(element),
    offset,
  );
}

/**
 * Get the **unrotated** building components of a triangle element
 * in the form of line segments and curves as a tuple, in this order.
 *
 * @param element The element to deconstruct
 * @param offset An optional offset
 * @returns Tuple of line **unrotated** segments (0) and curves (1)
 */
export function deconstructTriangleElement(
  element: ExcalidrawTriangleElement,
  offset: number = 0,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] {
  return deconstructPolygonFromPoints(
    element,
    getTrianglePoints(element),
    offset,
  );
}

/**
 * Deconstructs a polygonal element (diamond/hexagon/triangle) into line
 * segments and corner curves. See `deconstructDiamondElement`.
 */
export function deconstructPolygonElement(
  element:
    | ExcalidrawDiamondElement
    | ExcalidrawHexagonElement
    | ExcalidrawTriangleElement,
  offset: number = 0,
): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]] {
  switch (element.type) {
    case "diamond":
      return deconstructDiamondElement(element, offset);
    case "hexagon":
      return deconstructHexagonElement(element, offset);
    case "triangle":
      return deconstructTriangleElement(element, offset);
  }
}

// Checks if the first and last point are close enough
// to be considered a loop
export const isPathALoop = (
  points: ExcalidrawLinearElement["points"],
  /** supply if you want the loop detection to account for current zoom */
  zoomValue: Zoom["value"] = 1 as NormalizedZoomValue,
): boolean => {
  if (points.length >= 3) {
    const [first, last] = [points[0], points[points.length - 1]];
    const distance = pointDistance(first, last);

    // Adjusting LINE_CONFIRM_THRESHOLD to current zoom so that when zoomed in
    // really close we make the threshold smaller, and vice versa.
    return distance <= LINE_CONFIRM_THRESHOLD / zoomValue;
  }
  return false;
};

export const getCornerRadius = (x: number, element: ExcalidrawElement) => {
  if (
    element.roundness?.type === ROUNDNESS.PROPORTIONAL_RADIUS ||
    element.roundness?.type === ROUNDNESS.LEGACY
  ) {
    return x * DEFAULT_PROPORTIONAL_RADIUS;
  }

  if (element.roundness?.type === ROUNDNESS.ADAPTIVE_RADIUS) {
    const fixedRadiusSize = element.roundness?.value ?? DEFAULT_ADAPTIVE_RADIUS;

    const CUTOFF_SIZE = fixedRadiusSize / DEFAULT_PROPORTIONAL_RADIUS;

    if (x <= CUTOFF_SIZE) {
      return x * DEFAULT_PROPORTIONAL_RADIUS;
    }

    return fixedRadiusSize;
  }

  return 0;
};

const getDiagonalsForBindableElement = (
  element: ExcalidrawElement,
  elementsMap: ElementsMap,
) => {
  // for rectangles, shrink the diagonals a bit because there's something
  // going on with the focus points around the corners. Ask Mark for details.
  const OFFSET_PX = element.type === "rectangle" ? 15 : 0;
  const shrinkSegment = (seg: LineSegment<GlobalPoint>) => {
    const v = vectorNormalize(vectorFromPoint(seg[1], seg[0]));
    const offset = vectorScale(v, OFFSET_PX);
    return lineSegment<GlobalPoint>(
      pointTranslate(seg[0], offset),
      pointTranslate(seg[1], vectorScale(offset, -1)),
    );
  };

  const center = elementCenterPoint(element, elementsMap);
  const diagonalOne = shrinkSegment(
    isRectangularElement(element)
      ? lineSegment<GlobalPoint>(
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x, element.y),
            center,
            element.angle,
          ),
          pointRotateRads(
            pointFrom<GlobalPoint>(
              element.x + element.width,
              element.y + element.height,
            ),
            center,
            element.angle,
          ),
        )
      : lineSegment<GlobalPoint>(
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x + element.width / 2, element.y),
            center,
            element.angle,
          ),
          pointRotateRads(
            pointFrom<GlobalPoint>(
              element.x + element.width / 2,
              element.y + element.height,
            ),
            center,
            element.angle,
          ),
        ),
  );
  const diagonalTwo = shrinkSegment(
    isRectangularElement(element)
      ? lineSegment<GlobalPoint>(
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x + element.width, element.y),
            center,
            element.angle,
          ),
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x, element.y + element.height),
            center,
            element.angle,
          ),
        )
      : lineSegment<GlobalPoint>(
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x, element.y + element.height / 2),
            center,
            element.angle,
          ),
          pointRotateRads(
            pointFrom<GlobalPoint>(
              element.x + element.width,
              element.y + element.height / 2,
            ),
            center,
            element.angle,
          ),
        ),
  );

  return [diagonalOne, diagonalTwo];
};

export const getSnapOutlineMidPoint = (
  point: GlobalPoint,
  element: ExcalidrawBindableElement,
  elementsMap: ElementsMap,
  zoom: AppState["zoom"],
) => {
  const center = elementCenterPoint(element, elementsMap);
  const sideMidpoints =
    element.type === "diamond"
      ? getDiamondBaseCorners(element).map((curve) => {
          const point = bezierEquation(curve, 0.5);
          const rotatedPoint = pointRotateRads(point, center, element.angle);

          return pointFrom<GlobalPoint>(rotatedPoint[0], rotatedPoint[1]);
        })
      : [
          // RIGHT midpoint
          pointRotateRads(
            pointFrom<GlobalPoint>(
              element.x + element.width,
              element.y + element.height / 2,
            ),
            center,
            element.angle,
          ),
          // BOTTOM midpoint
          pointRotateRads(
            pointFrom<GlobalPoint>(
              element.x + element.width / 2,
              element.y + element.height,
            ),
            center,
            element.angle,
          ),
          // LEFT midpoint
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x, element.y + element.height / 2),
            center,
            element.angle,
          ),
          // TOP midpoint
          pointRotateRads(
            pointFrom<GlobalPoint>(element.x + element.width / 2, element.y),
            center,
            element.angle,
          ),
        ];
  const candidate = sideMidpoints.find(
    (midpoint) =>
      pointDistance(point, midpoint) <=
        maxBindingDistance_simple(zoom) + element.strokeWidth / 2 &&
      !hitElementItself({
        point,
        element,
        threshold: 0,
        elementsMap,
        overrideShouldTestInside: true,
      }),
  );

  return candidate;
};

export const projectFixedPointOntoDiagonal = (
  arrow: ExcalidrawArrowElement,
  point: GlobalPoint,
  element: ExcalidrawBindableElement,
  startOrEnd: "start" | "end",
  elementsMap: ElementsMap,
  zoom: AppState["zoom"],
  isMidpointSnappingEnabled: boolean = true,
): GlobalPoint | null => {
  invariant(arrow.points.length >= 2, "Arrow must have at least two points");
  if (arrow.width < 3 && arrow.height < 3) {
    return null;
  }

  if (isMidpointSnappingEnabled) {
    const sideMidPoint = getSnapOutlineMidPoint(
      point,
      element,
      elementsMap,
      zoom,
    );
    if (sideMidPoint) {
      return sideMidPoint;
    }
  }

  // Do the projection onto the diagonals (or center lines
  // for non-rectangular shapes)
  const [diagonalOne, diagonalTwo] = getDiagonalsForBindableElement(
    element,
    elementsMap,
  );

  // To avoid working with stale arrow state, we use the opposite focus point
  // of the current endpoint, which will always be unchanged during moving of
  // the endpoint. This is only needed when the arrow has only two points.
  let a = LinearElementEditor.getPointAtIndexGlobalCoordinates(
    arrow,
    startOrEnd === "start" ? 1 : arrow.points.length - 2,
    elementsMap,
  );
  if (arrow.points.length === 2) {
    const otherBinding =
      startOrEnd === "start" ? arrow.endBinding : arrow.startBinding;
    const otherBindable =
      otherBinding &&
      (elementsMap.get(otherBinding.elementId) as
        | ExcalidrawBindableElement
        | undefined);
    const otherFocusPoint =
      otherBinding &&
      otherBindable &&
      getGlobalFixedPointForBindableElement(
        normalizeFixedPoint(otherBinding.fixedPoint),
        otherBindable,
        elementsMap,
      );
    if (otherFocusPoint) {
      a = otherFocusPoint;
    }
  }

  const b = pointFromVector<GlobalPoint>(
    vectorScale(
      vectorFromPoint(point, a),
      2 * pointDistance(a, point) +
        Math.max(
          pointDistance(diagonalOne[0], diagonalOne[1]),
          pointDistance(diagonalTwo[0], diagonalTwo[1]),
        ),
    ),
    a,
  );
  const intersector = lineSegment<GlobalPoint>(b, a);
  const p1 = lineSegmentIntersectionPoints(diagonalOne, intersector);
  const p2 = lineSegmentIntersectionPoints(diagonalTwo, intersector);
  const d1 = p1 && pointDistance(a, p1);
  const d2 = p2 && pointDistance(a, p2);

  let projection = null;
  if (d1 != null && d2 != null) {
    projection = d1 < d2 ? p1 : p2;
  } else {
    projection = p1 || p2 || null;
  }

  if (projection && isPointInElement(projection, element, elementsMap)) {
    return projection;
  }

  return null;
};
