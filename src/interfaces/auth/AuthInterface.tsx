import { BaseUser } from "../user/UserInterface";

export interface AuthResponse {
	access_token: string;
}

export type RegisterResponse = BaseUser & { msg?: string };

export interface LoginResponse {
	user: BaseUser;
	access_token: string;
	msg?: string;
}
