export interface VoiceData {
	language: string;
	gender: string;
	voice_id: string;
	display_name?: string;
}

export interface EnginesResponse {
	engines: string[];
}

export interface LanguagesResponse {
	languages: string[];
}

export interface VoicesResponse {
	voices: VoiceData[];
}
