import api from "@/configs/axios.config";
import { EnginesResponse, LanguagesResponse, VoicesResponse, VoiceData } from "@/interfaces/voice/VoiceInterface";

class TtsService {
	async getEngines(): Promise<string[]> {
		try {
			const response = await api.get<EnginesResponse>(`/tts/engines`);
			return response.data?.engines || [];
		} catch (error) {
			console.error("Error fetching engines:", error);
			throw new Error("Could not fetch engines. Please ensure the backend is running.");
		}
	}

	async getLanguages(engine: string): Promise<string[]> {
		try {
			const response = await api.post<LanguagesResponse>(`/tts/languages`, { engine });
			return response.data?.languages || [];
		} catch (error) {
			console.error(`Error fetching languages for engine ${engine}:`, error);
			throw new Error(`Could not fetch languages for engine ${engine}.`);
		}
	}

	async filterVoices(engine: string, language: string, gender: string = 'all'): Promise<VoiceData[]> {
		try {
			const response = await api.post<VoicesResponse>(`/tts/voices/filter`, {
				engine,
				language,
				gender
			});
			console.log("Filtered voices response:", response.data.voices);
			return response.data?.voices || [];
		} catch (error) {
			console.error(`Error filtering voices for ${engine}/${language}:`, error);
			throw new Error(`Could not filter voices for ${engine}/${language}.`);
		}
	}

	async generateTts(engine: string, text: string, voiceId: string): Promise<string> {
		try {
			const response = await api.post(`/tts/generate`, {
				engine,
				text,
				voice_id: voiceId
			}, {
				responseType: 'blob'
			});

			if (response.status === 200 && response.data) {
				if (response.data.type !== 'audio/mp3') {
					if (response.data.type === 'application/json') {
						const errorJsonText = await response.data.text();
						try {
							const parsedError = JSON.parse(errorJsonText);
							console.error("Backend returned JSON error:", parsedError);
							throw new Error(`TTS Generation Failed: ${parsedError.msg || 'Unknown backend error'}`);
						} catch (error) {
							console.error("Failed to parse backend JSON error:", errorJsonText);
							console.error("Received unexpected JSON response:", error);
							throw new Error("TTS Generation Failed: Received unexpected JSON response.");
						}
					} else {
						console.error("Received unexpected blob type:", response.data.type);
						throw new Error(`TTS Generation Failed: Expected audio/mp3 but received ${response.data.type}`);
					}
				}
				// Create an object URL from the audio blob
				const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
				const audioUrl = URL.createObjectURL(audioBlob);
				return audioUrl;
			} else {
				console.error("Received invalid response from TTS generation:", response);
				throw new Error(`Received invalid response (status ${response.status}) from TTS generation`);
			}
		} catch (error: any) {
			console.error("Error during TTS generation request:", error);

			if (error.response && error.response.data) {
				if (error.response.data instanceof Blob && error.response.data.type === "application/json") {
					const errorJsonText = await error.response.data.text();
					try {
						const parsedError = JSON.parse(errorJsonText);
						throw new Error(`TTS Generation Failed: ${parsedError.msg || 'Unknown backend error'}`);
					} catch (parseError) {
						console.error("Failed to parse backend JSON error:", errorJsonText);
						console.error("Received unexpected JSON response:", parseError);
						throw new Error(`TTS Generation Failed: ${error.message || 'Network or server error (failed to parse error details)'}`);
					}
				} else if (typeof error.response.data === 'object') {
					throw new Error(`TTS Generation Failed: ${error.response.data.msg || JSON.stringify(error.response.data)}`);
				}
			}
			throw new Error(`TTS Generation Failed: ${error.message || 'Network or server error'}`);
		}
	}
}

export default new TtsService();
