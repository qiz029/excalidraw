/**
 * Registry of shape extension packages shown in the "shape extensions"
 * toolbar dropdown (`ShapeExtensionsDropdown`).
 *
 * Data-only: icons, shortcuts and labels are looked up from the `TOOLS`
 * table (Tools.tsx) and `toolBar.*` i18n keys, so adding a new package or
 * shape only requires one entry here (plus the tool itself being
 * registered in `TOOLS`).
 */
export const SHAPE_EXTENSION_PACKAGES = [
  {
    id: "geometry",
    labelKey: "shapePackages.geometry",
    tools: ["hexagon", "triangle"],
  },
  {
    id: "architecture",
    labelKey: "shapePackages.architecture",
    tools: ["database", "pipe", "cloud", "document"],
  },
] as const;

export type ShapeExtensionPackageId =
  typeof SHAPE_EXTENSION_PACKAGES[number]["id"];

export type ShapeExtensionToolType =
  typeof SHAPE_EXTENSION_PACKAGES[number]["tools"][number];

const SHAPE_EXTENSION_TOOLS: readonly ShapeExtensionToolType[] =
  SHAPE_EXTENSION_PACKAGES.flatMap((pkg) => pkg.tools);

/**
 * Returns the tool type if it's one of the registered shape extension
 * tools, `null` otherwise.
 */
export const getShapeExtensionTool = (
  type: string,
): ShapeExtensionToolType | null =>
  (SHAPE_EXTENSION_TOOLS as readonly string[]).includes(type)
    ? (type as ShapeExtensionToolType)
    : null;
