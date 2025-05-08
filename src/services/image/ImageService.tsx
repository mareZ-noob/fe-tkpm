import api from "@/configs/axios.config";
import { GenerateImagePayload, GenerateImageResponse, ImageStatusResponse, UploadUserImagesResponse } from "@/interfaces/image/ImageInterface";

class ImageService {
	generateImages = async (payload: GenerateImagePayload): Promise<GenerateImageResponse> => {
		try {
			const response = await api.post<GenerateImageResponse>('/images/generate', payload);
			if (response.status >= 200 && response.status < 300 && response.data?.success) return response.data;
			else throw new Error(response.data?.msg || `Failed task creation (Status: ${response.status}).`);
		} catch (error: any) { throw new Error(error.response?.data?.msg || error.message || "Unknown error during request."); }
	};

	checkImageStatus = async (taskId: string): Promise<ImageStatusResponse> => {
		try {
			const response = await api.get<ImageStatusResponse>(`/images/status/${taskId}`);
			return response.data;
		} catch (error: any) {
			const errorMsg = error.response?.data?.msg || error.message || `Unknown error checking status.`;
			return { success: false, task_id: taskId, status: 'FETCH_ERROR', completed: false, msg: `Fetch status failed: ${errorMsg}`, error: errorMsg, images: [] };
		}
	};

	uploadUserImagesSync = async (formData: FormData): Promise<UploadUserImagesResponse> => {
        try {
            const response = await api.post<UploadUserImagesResponse>('/images/upload-user-images', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(response.data?.msg || `Upload failed with status: ${response.status}`);
            }
        } catch (error: any) {
            console.error("Error in uploadUserImagesSync:", error);
            throw new Error(error.response?.data?.msg || error.message || "Unknown error during image upload.");
        }
    }
}

export default new ImageService();
