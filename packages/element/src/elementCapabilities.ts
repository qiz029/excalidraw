/**
 * Per-element-type capability table.
 *
 * Single source of truth for "what can this element type do" questions that
 * are decidable from the element type alone (no element instance fields
 * needed). The predicate functions in `comparisons.ts` and `typeChecks.ts`
 * are thin wrappers over this table so that adding a new element type only
 * requires registering one row here.
 *
 * Types missing from the table get `DEFAULT_ELEMENT_CAPABILITIES`
 * (all `false`), which is the safe default.
 */
export interface ElementCapabilities {
  /** can have a background fill color */
  hasBackground: boolean;
  /** stroke color applies */
  hasStrokeColor: boolean;
  /** stroke width applies */
  hasStrokeWidth: boolean;
  /** stroke style (solid/dashed/dotted) applies */
  hasStrokeStyle: boolean;
  /** roundness can be toggled on/off */
  canChangeRoundness: boolean;
  /** supports arrowheads (linear elements) */
  canHaveArrowheads: boolean;
  /** arrows can bind to this element */
  isBindable: boolean;
  /** can host a bound text element */
  isTextBindableContainer: boolean;
  /** is a flowchart node shape (rectangle/diamond/ellipse family) */
  isFlowchartNode: boolean;
  /** roundness is computed proportionally to element size */
  usesProportionalRadius: boolean;
  /** roundness uses a fixed adaptive radius */
  usesAdaptiveRadius: boolean;
  /** can be added as a direct child of a frame */
  isEligibleFrameChild: boolean;
}

export const DEFAULT_ELEMENT_CAPABILITIES: ElementCapabilities = {
  hasBackground: false,
  hasStrokeColor: false,
  hasStrokeWidth: false,
  hasStrokeStyle: false,
  canChangeRoundness: false,
  canHaveArrowheads: false,
  isBindable: false,
  isTextBindableContainer: false,
  isFlowchartNode: false,
  usesProportionalRadius: false,
  usesAdaptiveRadius: false,
  isEligibleFrameChild: false,
};

const genericShapeCapabilities = {
  hasBackground: true,
  hasStrokeColor: true,
  hasStrokeWidth: true,
  hasStrokeStyle: true,
  canChangeRoundness: true,
  canHaveArrowheads: false,
  isBindable: true,
  isTextBindableContainer: true,
  isFlowchartNode: true,
  usesProportionalRadius: false,
  usesAdaptiveRadius: false,
  isEligibleFrameChild: true,
};

/**
 * Capability rows keyed by element type (and, for the style predicates, by
 * tool-only types such as `autoshape` which share those code paths).
 */
export const ELEMENT_CAPABILITIES: Record<string, ElementCapabilities> = {
  rectangle: {
    ...genericShapeCapabilities,
    usesAdaptiveRadius: true,
  },
  diamond: {
    ...genericShapeCapabilities,
    usesProportionalRadius: true,
  },
  hexagon: {
    ...genericShapeCapabilities,
    usesProportionalRadius: true,
  },
  triangle: {
    ...genericShapeCapabilities,
    usesProportionalRadius: true,
  },
  database: {
    ...genericShapeCapabilities,
    // cylinder generator doesn't support roundness
    canChangeRoundness: false,
  },
  pipe: {
    ...genericShapeCapabilities,
    // cylinder generator doesn't support roundness
    canChangeRoundness: false,
  },
  cloud: {
    ...genericShapeCapabilities,
    // cloud outline generator doesn't support roundness
    canChangeRoundness: false,
  },
  document: {
    ...genericShapeCapabilities,
    // wavy-bottom generator doesn't support roundness
    canChangeRoundness: false,
  },
  ellipse: {
    ...genericShapeCapabilities,
    // ellipse roundness cannot be changed
    canChangeRoundness: false,
  },
  iframe: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasBackground: true,
    hasStrokeWidth: true,
    hasStrokeStyle: true,
    canChangeRoundness: true,
    isBindable: true,
    usesAdaptiveRadius: true,
  },
  embeddable: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasBackground: true,
    hasStrokeColor: true,
    hasStrokeWidth: true,
    hasStrokeStyle: true,
    canChangeRoundness: true,
    isBindable: true,
    usesAdaptiveRadius: true,
    isEligibleFrameChild: true,
  },
  line: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasBackground: true,
    hasStrokeColor: true,
    hasStrokeWidth: true,
    hasStrokeStyle: true,
    canChangeRoundness: true,
    usesProportionalRadius: true,
    isEligibleFrameChild: true,
  },
  arrow: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasStrokeColor: true,
    hasStrokeWidth: true,
    hasStrokeStyle: true,
    canHaveArrowheads: true,
    isTextBindableContainer: true,
    usesProportionalRadius: true,
    isEligibleFrameChild: true,
  },
  freedraw: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasBackground: true,
    hasStrokeColor: true,
    hasStrokeWidth: true,
    isEligibleFrameChild: true,
  },
  text: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasStrokeColor: true,
    // note: text is only bindable when not bound to a container — this is
    // enforced by `isBindableElement()` on top of this flag
    isBindable: true,
    isEligibleFrameChild: true,
  },
  image: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    canChangeRoundness: true,
    isBindable: true,
    usesAdaptiveRadius: true,
    isEligibleFrameChild: true,
  },
  frame: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    isBindable: true,
    isEligibleFrameChild: true,
  },
  magicframe: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    isBindable: true,
  },
  // tool-only type (shape recognition), not an element type
  autoshape: {
    ...DEFAULT_ELEMENT_CAPABILITIES,
    hasBackground: true,
    hasStrokeColor: true,
    hasStrokeWidth: true,
    hasStrokeStyle: true,
  },
};

/**
 * Returns the capability row for given element/tool type, defaulting to
 * all-`false` for unregistered types.
 */
export const getElementCapabilities = (type: string): ElementCapabilities =>
  ELEMENT_CAPABILITIES[type] ?? DEFAULT_ELEMENT_CAPABILITIES;
