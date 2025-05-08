export interface GenerateImagePayload {
	model: string;
	paragraph_id: string | number;
	content: string;
	num_images?: number;
}

export interface GenerateImageResponse {
	success: boolean;
	task_id: string;
	msg: string;
	status_url: string;
}

export interface ImageResult {
	paragraph_id: string | number;
	prompt: string;
	url: string;
	public_id: string;
	image_id: string;
}

export interface ImageStatusResponse {
	success: boolean;
	task_id: string;
	status: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'FETCH_ERROR' | string;
	completed: boolean;
	msg: string;
	images?: ImageResult[];
	error?: string;
}

export interface DisplayableImageResult {
	id: string;
	paragraphId: string | number;
	prompt?: string;
	url: string;
	public_id?: string;
	image_id?: string;
	isUploaded?: boolean;
	displayOrder: number;
	file?: File;
	originalAI?: {
		url: string;
		public_id?: string;
		image_id?: string;
	}
}

export interface UploadUserImageResult {
	success: boolean;
	filename: string;
	url?: string;
	image_id?: string;
	error?: string;
}

export interface UploadUserImagesResponse {
	success: boolean;
	msg: string;
	results: UploadUserImageResult[];
}
