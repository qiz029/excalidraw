import { Excalidraw } from "../index";
import { render, waitFor, getByTestId, fireEvent } from "../tests/test-utils";

describe("Test <ShapeExtensionsDropdown/>", () => {
  it("should list the extension packages and activate the selected shape tool", async () => {
    const { container } = await render(<Excalidraw />);

    fireEvent.click(getByTestId(container, "toolbar-shape-extensions"));

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="dropdown-menu"]'),
      ).not.toBeNull();
    });

    const menu = document.querySelector('[data-testid="dropdown-menu"]')!;

    // package section titles
    expect(menu.textContent).toContain("Geometry");
    expect(menu.textContent).toContain("Architecture");

    // all 6 extension shapes are listed
    for (const type of [
      "hexagon",
      "triangle",
      "database",
      "pipe",
      "cloud",
      "document",
    ]) {
      expect(
        menu.querySelector(`[data-testid="toolbar-${type}"]`),
      ).not.toBeNull();
    }

    // selecting a shape activates its tool
    fireEvent.click(menu.querySelector('[data-testid="toolbar-hexagon"]')!);
    expect(window.h.state.activeTool.type).toBe("hexagon");
  });
});
