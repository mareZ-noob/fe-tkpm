import api from "@/configs/axios.config";
import { AuthStatusResponse, AuthUrlResponse, LogoutResponse, UploadInitiationResponse, UploadStatusResponse, UploadUrlPayload, VideoStatsResponse } from "@/interfaces/youtube/YoutubeInterface";

class YouTubeService {
	getAuthorizationUrl = async (): Promise<AuthUrlResponse> => {
		try {
			const response = await api.get<AuthUrlResponse>('/youtube/auth');
			return response.data;
		} catch (error) {
			console.error("Error fetching YouTube authorization URL:", error);
			throw error;
		}
	};

	getAuthenticationStatus = async (): Promise<AuthStatusResponse> => {
		try {
			const response = await api.get<AuthStatusResponse>('/youtube/auth/status');
			return response.data;
		} catch (error) {
			console.error("Error checking YouTube authentication status:", error);
			throw error;
		}
	};

	logout = async (): Promise<LogoutResponse> => {
		try {
			const response = await api.get<LogoutResponse>('/youtube/auth/logout');
			return response.data;
		} catch (error) {
			console.error("Error logging out from YouTube:", error);
			throw error;
		}
	};

	uploadVideoFromFile = async (formData: FormData): Promise<UploadInitiationResponse> => {
		try {
			// Axios automatically sets Content-Type to multipart/form-data for FormData
			const response = await api.post<UploadInitiationResponse>('/youtube/videos/upload', formData);
			return response.data;
		} catch (error) {
			console.error("Error uploading video from file:", error);
			throw error;
		}
	};

	uploadVideoFromUrl = async (payload: UploadUrlPayload): Promise<UploadInitiationResponse> => {
		try {
			// Ensure Content-Type is application/json (default for Axios post with object)
			const response = await api.post<UploadInitiationResponse>('/youtube/videos/upload', payload);
			return response.data;
		} catch (error) {
			console.error("Error uploading video from URL:", error);
			throw error;
		}
	};

	checkUploadStatus = async (taskId: string): Promise<UploadStatusResponse> => {
		try {
			const response = await api.get<UploadStatusResponse>(`/youtube/videos/upload/status/${taskId}`);
			return response.data;
		} catch (error) {
			console.error(`Error checking upload status for task ${taskId}:`, error);
			throw error;
		}
	};

	getVideoStats = async (): Promise<VideoStatsResponse> => {
		try {
			const response = await api.get<VideoStatsResponse>('/youtube/videos/stats');
			return response.data;
		} catch (error) {
			console.error("Error fetching YouTube video stats:", error);
			throw error;
		}
	};
}

export default new YouTubeService();
