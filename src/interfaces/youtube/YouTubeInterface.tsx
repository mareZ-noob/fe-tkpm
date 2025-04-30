export interface UploadUrlPayload {
	video_url: string;
	title: string;
	description?: string;
	tags?: string[];
	privacy_status?: 'private' | 'public' | 'unlisted';
}

export interface UploadInitiationResponse {
	success: boolean;
	task_id: string;
	status: string;
	status_url: string;
}

export interface UploadStatusResponse {
	state: 'PENDING' | 'FAILURE' | 'DOWNLOADING' | 'UPLOADING' | 'PROGRESS' | 'SUCCESS' | string;
	status?: string;
	current?: number;
	total?: number;
	percent?: number;
	error?: string;
}

export interface AuthUrlResponse {
	auth_url: string;
}

export interface AuthStatusResponse {
	is_authenticated: boolean;
}

export interface LogoutResponse {
	msg: string;
}

export interface VideoStat {
	id: string;
	title: string;
	publishedAt: string;
	thumbnail: string | null;
	views: number;
	likes: number;
	comments: number;
}

export interface VideoStatsResponse {
	success: boolean;
	videos: VideoStat[];
}
