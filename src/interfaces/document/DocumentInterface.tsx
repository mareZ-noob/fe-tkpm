export interface BaseDocument {
	id: string;
	title?: string;
	content?: string;
	user_id: string;
	starred: boolean;
	created_at: string;
	updated_at: string;
}

export type DocumentUpdate = Pick<
	BaseDocument,
	"title" | "content" | "starred"
>;

export type DocumentCreate = Pick<
	BaseDocument,
	"title" | "content"
>;

export type DocumentList = BaseDocument[];
