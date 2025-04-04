export interface BaseUser {
	id: string;
	username: string;
	email: string;
	description?: string;
	date_of_birth?: string;
	first_name?: string;
	last_name?: string;
	created_at?: string;
	updated_at?: string;
	avatar?: string;
}

export type UserProfile = BaseUser;

export type UserUpdate = Pick<
	BaseUser,
	"first_name" | "last_name" | "description" | "date_of_birth" | "avatar"
>;
