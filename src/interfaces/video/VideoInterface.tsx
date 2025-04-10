export interface BaseVideo {
	id: string;
	title?: string;
	url?: string;
	user_id: string;
	starred: boolean;
	created_at: string;
	updated_at: string;
}

export type VideoUpdate = Pick<
BaseVideo,
	"title" | "url" | "starred"
>;

export type VideoCreate = Pick<
BaseVideo,
	"title" | "url"
>;

export type VideoList = BaseVideo[];

export interface DuplicateVideo {
	title: string;
};
