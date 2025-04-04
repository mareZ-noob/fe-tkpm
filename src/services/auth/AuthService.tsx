import api from "@/configs/axios.config";
import { LoginResponse, RegisterResponse } from "@/interfaces/auth/AuthInterface";

class AuthService {
	login = async (username: string, password: string): Promise<LoginResponse> => {
		try {
			const response = await api.post("/auth/login", {
				username,
				password,
			});
			const { access_token } = response.data;
			localStorage.setItem("access_token", access_token);

			return response.data;
		} catch (error) {
			console.error("Error during login:", error);
			throw error;
		}
	};

	logout = async (): Promise<void> => {
		try {
			await api.post("/auth/logout");
			localStorage.removeItem("access_token");
		} catch (error) {
			console.error("Error during logout:", error);
			throw error;
		}
	};

	register = async (userData: {
		username: string;
		email: string;
		password: string;
	}): Promise<RegisterResponse> => {
		try {
			const response = await api.post("/auth/register", userData);
			return response.data;
		} catch (error) {
			console.error("Error during registration:", error);
			throw error;
		}
	};

	getCurrentUser = (): boolean => {
		const token = localStorage.getItem('access_token');
		return !!token;
	};
}

export default new AuthService();
