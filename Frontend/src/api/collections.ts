import { apiClient } from "./client";
import type { AxiosResponse } from "axios";

/** Follow DRF pagination without sending credentials to a URL supplied in `next`. */
export async function getCollection<T>(path: string, filters: Record<string, string> = {}): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let page: string | null = null;
  do {
    const params: Record<string, string> = { ...filters, ...(page ? { page } : {}) };
    const response: AxiosResponse<T[] | { results: T[]; next?: string | null }> = Object.keys(params).length ? await apiClient.get(path, { params }) : await apiClient.get(path);
    if (Array.isArray(response.data)) return [...items, ...response.data];
    if (!Array.isArray(response.data.results)) throw new Error("Resposta de listagem inválida.");
    items.push(...response.data.results);
    if (!response.data.next) return items;
    page = new URL(response.data.next, "http://pagination.invalid").searchParams.get("page");
    if (!page || seen.has(page)) throw new Error("Paginação inválida. Tente novamente.");
    seen.add(page);
  } while (page);
  return items;
}
