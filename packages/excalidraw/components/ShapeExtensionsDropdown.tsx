import clsx from "clsx";
import { Fragment, useState } from "react";

import { t } from "../i18n";

import DropdownMenu from "./dropdownMenu/DropdownMenu";
import { ShapesIcon } from "./icons";
import {
  getShapeExtensionTool,
  SHAPE_EXTENSION_PACKAGES,
} from "./shapeExtensions";
import { getToolShortcut, isToolButtonDisabled, TOOLS } from "./Tools";

import type { AppClassProperties, AppState, UIAppState } from "../types";
import type { JSX } from "react";

/**
 * The "shape extensions" toolbar dropdown, listing the registered shape
 * extension packages (see `shapeExtensions.ts`) in sections. When the
 * active tool is one of the extension shapes, the trigger shows that
 * shape's icon in the selected state, mirroring `ExtraToolsDropdown`.
 *
 * Shared between the desktop toolbar and the mobile toolbar.
 */
export const ShapeExtensionsDropdown = ({
  app,
  activeTool,
  setAppState,
  align = "end",
  triggerStyle,
}: {
  app: AppClassProperties;
  activeTool: UIAppState["activeTool"];
  setAppState: React.Component<any, AppState>["setState"];
  align?: "start" | "center" | "end";
  triggerStyle?: React.CSSProperties;
}) => {
  const [isShapeExtensionsMenuOpen, setIsShapeExtensionsMenuOpen] =
    useState(false);

  const activeExtensionTool = getShapeExtensionTool(activeTool.type);

  return (
    <DropdownMenu open={isShapeExtensionsMenuOpen}>
      <DropdownMenu.Trigger
        className={clsx("App-toolbar__shape-extensions-trigger", {
          "App-toolbar__shape-extensions-trigger--selected":
            activeExtensionTool !== null,
        })}
        onToggle={() => {
          setIsShapeExtensionsMenuOpen(!isShapeExtensionsMenuOpen);
          setAppState({ openMenu: null, openPopup: null });
        }}
        title={t("toolBar.shapeExtensions")}
        data-testid="toolbar-shape-extensions"
        style={triggerStyle}
      >
        {activeExtensionTool ? TOOLS[activeExtensionTool].icon : ShapesIcon}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        onClickOutside={() => setIsShapeExtensionsMenuOpen(false)}
        onSelect={() => setIsShapeExtensionsMenuOpen(false)}
        className="App-toolbar__extra-tools-dropdown"
        align={align}
      >
        {SHAPE_EXTENSION_PACKAGES.map((pkg) => (
          <Fragment key={pkg.id}>
            <div style={{ margin: "6px 0", fontSize: 14, fontWeight: 600 }}>
              {t(pkg.labelKey)}
            </div>
            {pkg.tools.map((type) => (
              <DropdownMenu.Item
                key={type}
                onSelect={() => app.setActiveTool({ type })}
                icon={TOOLS[type].icon as JSX.Element}
                shortcut={getToolShortcut(type)}
                data-testid={`toolbar-${type}`}
                selected={activeTool.type === type}
                disabled={isToolButtonDisabled(app, type)}
              >
                {t(`toolBar.${type}`)}
              </DropdownMenu.Item>
            ))}
          </Fragment>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
