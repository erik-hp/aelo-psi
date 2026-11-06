import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

const loginSchema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const { notify } = useToast();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values);
      notify({ type: "success", title: "Sessão iniciada", description: "Ambiente clínico carregado com segurança." });
    } catch {
      notify({ type: "error", title: "Falha no login", description: "Verifique as credenciais e tente novamente." });
    }
  }

  return (
    <form className="space-y-4" noValidate aria-busy={isLoading} onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <Input id="email" type="email" autoComplete="email" className="mt-2" aria-invalid={!!form.formState.errors.email} aria-describedby={form.formState.errors.email ? "email-error" : undefined} {...form.register("email")} />
        {form.formState.errors.email ? <p id="email-error" role="alert" className="mt-1 text-caption-1-medium text-text-error-primary">{form.formState.errors.email.message}</p> : null}
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="password">Senha</label>
        <Input id="password" type="password" autoComplete="current-password" className="mt-2" aria-invalid={!!form.formState.errors.password} aria-describedby={form.formState.errors.password ? "password-error" : undefined} {...form.register("password")} />
        {form.formState.errors.password ? <p id="password-error" role="alert" className="mt-1 text-caption-1-medium text-text-error-primary">{form.formState.errors.password.message}</p> : null}
      </div>
      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}
