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

export interface VideoEffectsTaskInfo {
    task_id: string | null;
    filename: string;
    status_url?: string;
    error?: string;
}

export interface VideoEffectsResponse {
    success: boolean;
    msg: string;
    tasks: VideoEffectsTaskInfo[];
}

export interface GeneratedVideoInfo {
    effect: string;
    url: string;
    video_id: number;
    success?: boolean;
    error?: string;

}

export interface VideoStatusResponse {
    success: boolean;
    task_id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'FETCH_ERROR' | string;
    completed: boolean;
    msg: string;
    videos: GeneratedVideoInfo[];
    error?: string;
}
