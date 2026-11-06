import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Button } from "./button";

afterEach(cleanup);

describe("BoardUI compatibility with existing forms", () => {
  it("forwards React 18 DOM refs and preserves native change events", async () => {
    const input = createRef<HTMLInputElement>();
    const textarea = createRef<HTMLTextAreaElement>();
    const button = createRef<HTMLButtonElement>();
    const changed = vi.fn();
    render(<>
      <label htmlFor="field">Campo</label><Input id="field" ref={input} onChange={changed} />
      <label htmlFor="note">Nota</label><Textarea id="note" ref={textarea} />
      <Button ref={button}>Salvar</Button>
    </>);
    expect(input.current).toBe(screen.getByLabelText("Campo"));
    expect(textarea.current).toBe(screen.getByLabelText("Nota"));
    expect(button.current).toBe(screen.getByRole("button", { name: "Salvar" }));
    await userEvent.type(input.current!, "sintético");
    await userEvent.type(textarea.current!, "nota sintética");
    expect(input.current?.value).toBe("sintético");
    expect(textarea.current?.value).toBe("nota sintética");
    expect(changed).toHaveBeenCalled();
  });

  it("keeps react-hook-form submission, validation focus, and keyboard navigation", async () => {
    const submit = vi.fn();
    function Form() {
      const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();
      return <form onSubmit={handleSubmit(submit)}>
        <label htmlFor="email">Email</label>
        <Input id="email" aria-invalid={!!errors.email} {...register("email", { required: true })} />
        <Button type="submit">Entrar</Button>
      </form>;
    }
    const user = userEvent.setup();
    render(<Form />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    const field = screen.getByLabelText("Email");
    expect(submit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    await user.type(field, "synthetic@example.test");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Entrar" }));
    await user.keyboard("{Enter}");
    expect(submit.mock.calls[0][0]).toEqual({ email: "synthetic@example.test" });
  });

  it("prevents disabled actions and keeps ordinary buttons from submitting forms", async () => {
    const submit = vi.fn((event) => event.preventDefault());
    const action = vi.fn();
    render(<form onSubmit={submit}>
      <Button onClick={action} disabled>Restrito</Button>
      <Button>Cancelar</Button>
    </form>);
    await userEvent.click(screen.getByRole("button", { name: "Restrito" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(action).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});
