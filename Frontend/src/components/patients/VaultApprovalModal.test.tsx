import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VaultApprovalModal } from "./VaultApprovalModal";

describe("VaultApprovalModal", () => {
  it("requires a written justification before signing", () => {
    const confirm = vi.fn();
    render(<VaultApprovalModal open busy={false} onClose={() => undefined} onConfirm={confirm} />);
    const button = screen.getByRole("button", { name: "Assinar aprovação" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Justificativa clínica" }), { target: { value: "Evidências conferidas na nota." } });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledWith("Evidências conferidas na nota.");
  });

  it("blocks live approval when the server has not supplied a complete SHA-256", () => {
    render(<VaultApprovalModal open busy={false} requireHash onClose={() => undefined} onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Justificativa clínica" }), { target: { value: "Evidências conferidas na nota." } });
    expect(screen.getByText("Hash SHA-256 indisponível")).toBeDefined();
    expect((screen.getByRole("button", { name: "Assinar aprovação" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
