import axios from "axios";
import { apiClient } from "@/api/client";

export interface ClinicalDraft {
  title: string;
  content: string;
  version: number;
  updated_at?: string;
}

export const clinicalDraftService = {
  async get(patientId: string): Promise<ClinicalDraft | null> {
    try {
      const { data } = await apiClient.get<ClinicalDraft>(`/clinical-notes/drafts/${patientId}/`);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  async put(patientId: string, draft: ClinicalDraft): Promise<number> {
    const { data } = await apiClient.put<{ version: number }>(`/clinical-notes/drafts/${patientId}/`, draft);
    return data.version;
  },
  async remove(patientId: string): Promise<void> {
    await apiClient.delete(`/clinical-notes/drafts/${patientId}/`);
  },
};
