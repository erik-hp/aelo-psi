import axios from "axios";

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return "Sessão expirada. Entre novamente.";
    if (error.response?.status === 403 || error.response?.status === 404) return "Registro indisponível ou sem permissão para esta ação.";
    if (error.response?.status === 409) return "O registro foi alterado. Atualize os dados antes de salvar.";
    if (error.response?.status === 400) return "Confira os campos. O código pode estar em uso ou o horário pode estar ocupado.";
  }
  return fallback;
}
