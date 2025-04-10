import api from "@/configs/axios.config";
import { BaseVideo, DuplicateVideo, VideoCreate, VideoList, VideoUpdate } from "@/interfaces/video/VideoInterface";

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
}

export default new VideoService();
