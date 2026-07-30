import type { ElementOrToolType } from "@excalidraw/excalidraw/types";

import { getElementCapabilities } from "./elementCapabilities";

export const hasBackground = (type: ElementOrToolType) =>
  getElementCapabilities(type).hasBackground;

export const hasStrokeColor = (type: ElementOrToolType) =>
  getElementCapabilities(type).hasStrokeColor;

export const hasStrokeWidth = (type: ElementOrToolType) =>
  getElementCapabilities(type).hasStrokeWidth;

export const hasStrokeStyle = (type: ElementOrToolType) =>
  getElementCapabilities(type).hasStrokeStyle;

export const hasFreedrawMode = (type: ElementOrToolType) => type === "freedraw";

export const canChangeRoundness = (type: ElementOrToolType) =>
  getElementCapabilities(type).canChangeRoundness;

export const toolIsArrow = (type: ElementOrToolType) => type === "arrow";

export const canHaveArrowheads = (type: ElementOrToolType) =>
  getElementCapabilities(type).canHaveArrowheads;
