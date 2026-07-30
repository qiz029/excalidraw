import { pointFrom, lineSegment } from "@excalidraw/math";

import { ShapeCache } from "../src/shape";
import { getTrianglePoints, getHexagonPoints } from "../src/bounds";
import {
  deconstructTriangleElement,
  deconstructPolygonElement,
} from "../src/utils";
import { distanceToElement } from "../src/distance";
import { intersectElementWithLineSegment } from "../src/collision";
import { newElement } from "../src/newElement";

import type { ExcalidrawElement } from "../src/types";

const makeElement = (
  type: ExcalidrawElement["type"],
  roundness = false,
): ExcalidrawElement =>
  newElement({
    type: type as any,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    roundness: roundness ? { type: 3 } : null,
  }) as ExcalidrawElement;

describe("new shape generators smoke test", () => {
  it.each(["triangle", "database", "pipe", "cloud", "document"] as const)(
    "generates a non-empty shape for %s",
    (type) => {
      const element = makeElement(type);
      const shape = ShapeCache.generateElementShape(element as any, null);
      expect(shape).toBeTruthy();
      expect(shape!.sets.length).toBeGreaterThan(0);
      expect(shape!.sets[0].ops.length).toBeGreaterThan(0);
    },
  );

  it("generates rounded variants without crashing", () => {
    for (const type of [
      "triangle",
      "database",
      "pipe",
      "cloud",
      "document",
    ] as const) {
      const element = makeElement(type, true);
      const shape = ShapeCache.generateElementShape(element as any, null);
      expect(shape).toBeTruthy();
    }
  });

  it("triangle polygon path: deconstruct + collision + distance", () => {
    const element = makeElement("triangle") as any;
    const elementsMap = new Map([[element.id, element]]) as any;

    const [sides, corners] = deconstructTriangleElement(element);
    expect(sides.length).toBe(3);
    expect(corners.length).toBe(3);

    const [sides2] = deconstructPolygonElement(element);
    expect(sides2.length).toBe(3);

    // horizontal line through the middle should intersect twice
    const intersections = intersectElementWithLineSegment(
      element,
      elementsMap,
      lineSegment(pointFrom(-10, 60), pointFrom(110, 60)),
    );
    expect(intersections.length).toBe(2);

    // point far away has positive distance
    expect(
      distanceToElement(element, elementsMap, pointFrom(200, 200)),
    ).toBeGreaterThan(0);
  });

  it("bbox shapes fall back to rectanguloid collision/distance", () => {
    for (const type of ["database", "pipe", "cloud", "document"] as const) {
      const element = makeElement(type) as any;
      const elementsMap = new Map([[element.id, element]]) as any;

      const intersections = intersectElementWithLineSegment(
        element,
        elementsMap,
        lineSegment(pointFrom(-10, 50), pointFrom(110, 50)),
      );
      expect(intersections.length).toBe(2);
      expect(
        distanceToElement(element, elementsMap, pointFrom(200, 200)),
      ).toBeGreaterThan(0);
    }
  });

  it("triangle points are well formed", () => {
    const element = makeElement("triangle");
    const points = getTrianglePoints(element);
    expect(points.length).toBe(6);
    const hexPoints = getHexagonPoints(element);
    expect(hexPoints.length).toBe(12);
  });
});
