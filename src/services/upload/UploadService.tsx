import api from "@/configs/axios.config";

class UploadService {
	uploadAvatar = async (file: File): Promise<{ msg: string; task_id: string }> => {
		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await api.put("/upload/avatar", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			console.log("Avatar uploaded successfully:", response.data);

			return response.data;
		} catch (error) {
			console.error("Error uploading avatar:", error);
			throw error;
		}
	};
}

export default new UploadService();
