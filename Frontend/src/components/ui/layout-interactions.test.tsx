import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";
import { Dialog } from "./modal";
import { Button } from "./button";

afterEach(cleanup);

describe("Layout keyboard interactions", () => {
  it("associates tabs with panels and switches with arrow keys", async () => {
    const user = userEvent.setup();
    render(<Tabs defaultSelectedKey="first">
      <TabList aria-label="Seções"><Tab id="first">Primeira</Tab><Tab id="second">Segunda</Tab></TabList>
      <TabPanel id="first">Conteúdo inicial</TabPanel><TabPanel id="second">Conteúdo seguinte</TabPanel>
    </Tabs>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Primeira" }));
    await user.keyboard("{ArrowRight}");
    const selected = screen.getByRole("tab", { name: "Segunda" });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").id).toBe(selected.getAttribute("aria-controls"));
    expect(screen.getByRole("tabpanel").textContent).toBe("Conteúdo seguinte");
  });

  it("contains keyboard focus in a modal and restores it after Escape", async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return <><Button onClick={() => setOpen(true)}>Abrir revisão</Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Revisão">
          <Button onClick={() => setOpen(false)}>Cancelar</Button><Button>Confirmar</Button>
        </Dialog></>;
    }
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Abrir revisão" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Revisão" });
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
