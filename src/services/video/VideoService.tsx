import api from "@/configs/axios.config";
import { BaseVideo, DuplicateVideo, VideoCreate, VideoList, VideoUpdate, VideoEffectsResponse, VideoStatusResponse } from "@/interfaces/video/VideoInterface";

class VideoService {
	getVideos = async (): Promise<VideoList> => {
		try {
			const response = await api.get(`/videos`);
			return response.data;
		} catch (error) {
			console.error("Error fetching videos:", error);
			throw error;
		}
	};

	createVideo = async (
		videoData: VideoCreate
	): Promise<VideoCreate> => {
		try {
			const response = await api.post(`/videos`, videoData);
			return response.data;
		} catch (error) {
			console.error("Error creating video:", error);
			throw error;
		}
	};

	updateVideo = async (
		videoId: string,
		videoData: VideoUpdate
	): Promise<VideoUpdate> => {
		try {
			const response = await api.put(`/videos/${videoId}`, videoData);
			console.log("Video updated successfully:", response.data);
			return response.data;
		} catch (error) {
			console.error("Error updating video:", error);
			throw error;
		}
	};

	deleteVideo = async (videoId: string): Promise<void> => {
		try {
			await api.delete(`/videos/${videoId}`);
			console.log("Video deleted successfully");
		} catch (error) {
			console.error("Error deleting video:", error);
			throw error;
		}
	};

	duplicateVideo = async (
		videoId: string,
		videoData: DuplicateVideo
	): Promise<BaseVideo> => {
		try {
			const response = await api.post(`/videos/${videoId}/duplicate`, videoData);
			return response.data;
		} catch (error) {
			console.error("Error duplicating video:", error);
			throw error;
		}
	};

	generateVideoEffects = async (formData: FormData): Promise<VideoEffectsResponse> => {
        try {
            const response = await api.post<VideoEffectsResponse>('/videos/generate', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.status === 200 && response.data?.success) {
                return response.data;
            } else {
                throw new Error(response.data?.msg || `Failed video task creation (Status: ${response.status}).`);
            }
        } catch (error: any) {
            console.error("Error in generateVideoEffects:", error);
            throw new Error(error.response?.data?.msg || error.message || "Unknown error during video effect generation request.");
        }
    };

    checkVideoStatus = async (taskId: string): Promise<VideoStatusResponse> => {
        try {
            const response = await api.get<VideoStatusResponse>(`/videos/status/${taskId}`);
            return response.data;
        } catch (error: any) {
            console.error(`Error checking video status for task ${taskId}:`, error);
            const errorMsg = error.response?.data?.msg || error.message || `Unknown error checking video status.`;
            return {
                success: false,
                task_id: taskId,
                status: 'FETCH_ERROR',
                completed: false,
                msg: `Workspace video status failed: ${errorMsg}`,
                error: errorMsg,
                videos: []
            };
        }
    };
}

export default new VideoService();
