// src/services/PromptService.ts (or wherever it's defined)
import api from "@/configs/axios.config";
import { PromptInterface } from "@/interfaces/prompt/PromptInterface";

class PromptService {
    getScript = async (data: PromptInterface): Promise<string> => {
        try {
            const response = await api.post<{ summary: string }>(`/agents/generate-script`, data);
            return response.data.summary;
        } catch (error) {
            console.error("Error fetching script:", error);
            throw error;
        }
    }

    getProviders = async (): Promise<string[]> => {
        try {
            const response = await api.get<string[]>(`/agents/provider`);
            return response.data;
        } catch (error) {
            console.error("Error fetching providers:", error);
            throw error;
        }
    }

    getModelsByProvider = async (provider: string): Promise<string[]> => {
        const encodedProvider = encodeURIComponent(provider);
        try {
            const response = await api.get<string[]>(`/agents/${encodedProvider}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching models for provider ${provider}:`, error);
            throw error;
        }
    }
}

export default new PromptService();
