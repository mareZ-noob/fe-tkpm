import api from "@/configs/axios.config";
import { UserProfile, UserUpdate } from "@/interfaces/user/UserInterface";

class UserService {
	getUserProfile = async (): Promise<UserProfile> => {
		try {
			const response = await api.get(`/users/profile`);
			return response.data;
		} catch (error) {
			console.error("Error fetching user profile:", error);
			throw error;
		}
	};

	updateUserProfile = async (
		userData: UserUpdate
	): Promise<UserProfile> => {
		try {
			const response = await api.put(`/users/profile`, userData);
			return response.data;
		} catch (error) {
			console.error("Error updating user profile:", error);
			throw error;
		}
	};
}

export default new UserService();
