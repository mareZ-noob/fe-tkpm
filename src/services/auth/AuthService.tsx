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
			localStorage.removeItem("access_token");
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

	changePassword = async (
		old_password: string,
		new_password: string
	): Promise<void> => {
		try {
			await api.post("/auth/change-password", {
				old_password,
				new_password,
			});
		} catch (error) {
			console.error("Error during password change:", error);
			throw error;
		}
	};

	forgotPassword = async (email: string): Promise<void> => {
		try {
			await api.post("/auth/forgot-password", { email });
		} catch (error) {
			console.error("Error during password reset:", error);
			throw error;
		}
	}

	resetPassword = async (
		token: string,
		new_password: string
	): Promise<void> => {
		try {
			await api.post("/auth/reset-password", {
				token,
				new_password,
			});
		} catch (error) {
			console.error("Error during password reset:", error);
			throw error;
		}
	};

	getCurrentUser = (): boolean => {
		const token = localStorage.getItem('access_token');
		return !!token;
	};
}

export default new AuthService();
