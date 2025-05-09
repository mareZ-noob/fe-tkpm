import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Form, Input, Select, Upload, Button, Progress, message, Alert, Space, Typography } from 'antd';
import { UploadOutlined, YoutubeOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import YoutubeService from '@/services/youtube/YouTubeService';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface YouTubeUploadModalProps {
	visible: boolean;
	onClose: () => void;
	initialVideoUrl?: string | null;
	initialTitle?: string | null;
	hideSourceFields?: boolean;
}

const YouTubeUploadModal: React.FC<YouTubeUploadModalProps> = ({
	visible,
	onClose,
	initialVideoUrl,
	initialTitle,
	hideSourceFields = false
}) => {
	const [form] = Form.useForm();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const [isLoadingAuthStatus, setIsLoadingAuthStatus] = useState(true);
	const [authError, setAuthError] = useState<string | null>(null);

	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatusMessage, setUploadStatusMessage] = useState('');
	const [taskId, setTaskId] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const [fileList, setFileList] = useState<UploadFile[]>([]);
	const [uploadSource, setUploadSource] = useState<'file' | 'url'>('file');
	const isSpecificVideoUpload = hideSourceFields;

	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const authWindowRef = useRef<Window | null>(null);
	const authCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const checkAuthStatus = useCallback(async (showLoading = false) => {
		if (showLoading) setIsLoadingAuthStatus(true);
		setAuthError(null);
		try {
			const data = await YoutubeService.getAuthenticationStatus();
			setIsAuthenticated(data.is_authenticated);
		} catch (error) {
			console.error("Error checking YouTube auth status:", error);
			setIsAuthenticated(false);
			setAuthError("Failed to check YouTube authentication status. Please try again later.");
		} finally {
			if (showLoading) setIsLoadingAuthStatus(false);
		}
	}, []);

	useEffect(() => {
		if (visible) {
			checkAuthStatus(true);
			setUploading(false);
			setUploadProgress(0);
			setUploadStatusMessage('');
			setTaskId(null);
			setUploadError(null);
			setIsAuthenticating(false);
			setFileList([]);

			if (isSpecificVideoUpload && initialVideoUrl) {
				setUploadSource('url');
				form.setFieldsValue({
					videoUrl: initialVideoUrl,
					title: initialTitle || 'Untitled Video',
					description: '',
					tags: '',
					privacyStatus: 'private',
				});
			} else {
				setUploadSource('file');
				form.resetFields();
				form.setFieldsValue({ uploadSource: 'file', privacyStatus: 'private' });
			}

			if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
			if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);

		} else {
			if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
			if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);
			if (authWindowRef.current && !authWindowRef.current.closed) {
				authWindowRef.current.close();
			}
		}
	}, [visible, initialVideoUrl, initialTitle, isSpecificVideoUpload, checkAuthStatus, form]);

	const handleAuthorize = async () => {
		setIsAuthenticating(true);
		setAuthError(null);
		try {
			const data = await YoutubeService.getAuthorizationUrl();
			if (data.auth_url) {
				if (authWindowRef.current && !authWindowRef.current.closed) authWindowRef.current.close();
				authWindowRef.current = window.open(data.auth_url, '_blank', 'width=600,height=700,noopener,noreferrer');
				if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);

				authCheckIntervalRef.current = setInterval(async () => {
					if (!authWindowRef.current || authWindowRef.current.closed) {
						if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);
						authCheckIntervalRef.current = null;
						authWindowRef.current = null;
						message.info("Authentication window closed. Checking status...");
						await checkAuthStatus(false);
						setIsAuthenticating(false);
					}
				}, 2000);

			} else { throw new Error("No authorization URL received"); }
		} catch (error: any) {
			console.error("Error initiating YouTube authorization:", error);
			const errorMsg = error?.response?.data?.error || error.message || "Unknown error";
			setAuthError(`Failed to start YouTube authorization: ${errorMsg}`);
			setIsAuthenticating(false);
			if (authWindowRef.current) authWindowRef.current = null;
			if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);
			authCheckIntervalRef.current = null;
		}
	};

	const handleLogout = async () => {
		setAuthError(null);
		setIsLoadingAuthStatus(true);
		try {
			await YoutubeService.logout();
			setIsAuthenticated(false);
			message.success("Logged out from YouTube successfully.");
		} catch (error: any) {
			console.error("Error logging out from YouTube:", error);
			const errorMsg = error?.response?.data?.msg || error.message || "Unknown error";
			message.error(`Failed to log out from YouTube: ${errorMsg}`);
		} finally {
			setIsLoadingAuthStatus(false);
		}
	};

	const startPolling = (currentTaskId: string) => {
		if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
		pollingIntervalRef.current = setInterval(async () => {
			try {
				const data = await YoutubeService.checkUploadStatus(currentTaskId);
				setUploadStatusMessage(data.status || 'Polling status...');
				setUploadProgress(data.percent || 0);

				if (data.state === 'SUCCESS') {
					message.success('Video uploaded successfully to YouTube!');
					setUploading(false); setTaskId(null);
					if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
					pollingIntervalRef.current = null;
					onClose();
				} else if (data.state === 'FAILURE') {
					const errorMsg = data.error || 'Unknown upload error';
					message.error(`YouTube upload failed: ${errorMsg}`);
					setUploadError(errorMsg);
					setUploading(false); setTaskId(null);
					if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
					pollingIntervalRef.current = null;
				}
			} catch (error: any) {
				console.error("Error polling upload status:", error);
				const errorMsg = error?.response?.data?.error || error.message || 'Failed to get upload status.';
				setUploadStatusMessage(`Error fetching status: ${errorMsg}. Retrying...`);
			}
		}, 3000);
	};

	const handleUpload = async () => {
		if (!isAuthenticated) {
			message.error("Please authenticate with YouTube first.");
			return;
		}
		try {
			const fieldsToValidate = ['title', 'description', 'tags', 'privacyStatus'];
			if (!isSpecificVideoUpload) {
				fieldsToValidate.push('uploadSource');
				if (uploadSource === 'file') fieldsToValidate.push('file');
				else fieldsToValidate.push('videoUrl');
			}
			const values = await form.validateFields(fieldsToValidate);

			setUploading(true);
			setUploadError(null);
			setUploadProgress(0);
			setUploadStatusMessage('Initiating upload...');
			setTaskId(null);

			let response;
			const currentUploadType = isSpecificVideoUpload ? 'url' : uploadSource;

			if (currentUploadType === 'file') {
				if (fileList.length === 0 || !fileList[0].originFileObj) {
					message.error("Please select a valid video file to upload.");
					setUploading(false); return;
				}
				const formData = new FormData();
				formData.append('file', fileList[0].originFileObj as Blob);
				formData.append('title', values.title);
				formData.append('description', values.description || '');
				formData.append('tags', values.tags || '');
				formData.append('privacy_status', values.privacyStatus);
				response = await YoutubeService.uploadVideoFromFile(formData);

			} else {
				const urlToUpload = isSpecificVideoUpload ? initialVideoUrl : values.videoUrl;
				if (!urlToUpload) {
					message.error("Video URL is missing.");
					setUploading(false); return;
				}
				const payload = {
					video_url: urlToUpload,
					title: values.title,
					description: values.description || '',
					tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
					privacy_status: values.privacyStatus,
				};
				response = await YoutubeService.uploadVideoFromUrl(payload);
			}

			if (response.success && response.task_id) {
				setTaskId(response.task_id);
				setUploadStatusMessage('Upload initiated. Processing...');
				startPolling(response.task_id);
			} else {
				throw new Error(response.status || "Backend did not return a success status or task ID.");
			}

		} catch (error: any) {
			console.error("Error initiating YouTube upload:", error);
			const errorMessage = error?.response?.data?.error || error?.response?.data?.msg || error.message || "An unknown error occurred during upload initiation.";
			setUploadError(`Upload failed: ${errorMessage}`);
			message.error(`Upload failed: ${errorMessage}`);
			setUploading(false);
			setTaskId(null);
			if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}
	};

	const uploadProps: UploadProps = {
		onRemove: () => { setFileList([]); form.setFields([{ name: 'file', errors: [] }]); },
		beforeUpload: file => {
			const isVideo = file.type.startsWith('video/');
			if (!isVideo) { message.error(`${file.name} is not a video file`); return Upload.LIST_IGNORE; }
			setFileList([file]); form.setFields([{ name: 'file', errors: [] }]);
			return false;
		},
		fileList, maxCount: 1, accept: "video/*"
	};

	return (
		<Modal
			title={
				<Space><YoutubeOutlined style={{ color: 'red' }} />
					{isSpecificVideoUpload ? "Upload Video to YouTube" : "Upload New Video to YouTube"}
				</Space>
			}
			open={visible}
			onCancel={onClose}
			footer={null}
			width={600}
			maskClosable={!uploading}
			destroyOnClose
		>
			<div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
				<Title level={5} className="dark:text-gray-100">Authentication</Title>
				{isLoadingAuthStatus ? (<Text type="secondary">Checking YouTube authentication status...</Text>) : (
					<>
						{authError && <Alert message={authError} type="error" showIcon style={{ marginBottom: 15 }} closable onClose={() => setAuthError(null)} />}
						{isAuthenticated ? (
							<Space>
								<Text type="success">Authenticated with YouTube.</Text>
								<Button icon={<LogoutOutlined />} onClick={handleLogout} danger size="small">Logout</Button>
							</Space>
						) : (
							<Button icon={<LoginOutlined />} onClick={handleAuthorize} loading={isAuthenticating} type="primary" disabled={isAuthenticating} >
								{isAuthenticating ? 'Waiting...' : 'Authenticate with YouTube'}
							</Button>
						)}
					</>
				)}
			</div>

			<Form
				form={form}
				layout="vertical"
				onFinish={handleUpload}
				disabled={!isAuthenticated || isAuthenticating || uploading || isLoadingAuthStatus}
				style={{ marginTop: 20 }}
				initialValues={{
					videoUrl: isSpecificVideoUpload ? initialVideoUrl : '',
					title: initialTitle || '',
					privacyStatus: 'private'
				}}
			>
				{!isSpecificVideoUpload && (
					<>
						<Form.Item label="Upload Source" name="uploadSource" initialValue="file">
							<Select onChange={(value) => setUploadSource(value)} disabled={uploading}>
								<Option value="file">Upload File</Option>
								<Option value="url">From URL</Option>
							</Select>
						</Form.Item>

						{uploadSource === 'file' ? (
							<Form.Item
								name="file"
								label={<span className="dark:text-gray-200">Video File</span>}
								validateTrigger={['onChange', 'onBlur']}
								rules={[{ required: true, validator: async () => (fileList.length > 0 ? Promise.resolve() : Promise.reject(new Error('Please select a video file!'))) }]}
								help="Select the video file you want to upload."
							>
								<Upload {...uploadProps}>
									<Button icon={<UploadOutlined />} disabled={uploading}>Select File</Button>
								</Upload>
							</Form.Item>
						) : (
							<Form.Item
								name="videoUrl"
								label={<span className="dark:text-gray-200">Video URL</span>}
								rules={[{ required: true, message: 'Video URL is required!' }, { type: 'url', warningOnly: true, message: 'Input does not look like a valid URL.' }, { whitespace: true, message: 'URL cannot be empty space!' }]}
								help="Enter the public URL of the video."
							>
								<Input placeholder="https://example.com/myvideo.mp4" disabled={uploading} />
							</Form.Item>
						)}
					</>
				)}

				<Form.Item
					name="title"
					label={<span className="dark:text-gray-200">Video Title</span>}
					rules={[{ required: true, message: 'Please input the video title!' }, { whitespace: true, message: 'Title cannot be empty space!' }]}
				>
					<Input className="dark:bg-slate-700 dark:text-gray-200 dark:placeholder-gray-400 dark:border-slate-600" placeholder="My Awesome Video" />
				</Form.Item>

				<Form.Item name="description" label={<span className="dark:text-gray-200">Description</span>} >
					<TextArea className="dark:bg-slate-700 dark:text-gray-200 dark:placeholder-gray-400 dark:border-slate-600" rows={3} placeholder="A short description of your video (optional)" />
				</Form.Item>

				<Form.Item name="tags" label={<span className="dark:text-gray-200">Tags</span>} help={<span className="dark:text-gray-400">Comma-separated tags (e.g., tech, review, gaming)</span>}>
					<Input className="dark:bg-slate-700 dark:text-gray-200 dark:placeholder-gray-400 dark:border-slate-600" placeholder="tag1, tag2, tag3 (optional)" />
				</Form.Item>

				<Form.Item name="privacyStatus" label={<span className="dark:text-gray-200">Privacy Status</span>} rules={[{ required: true, message: 'Please select a privacy status!' }]} >
					<Select className="dark:bg-slate-700 dark:text-gray-200 dark:placeholder-gray-400 dark:border-slate-600">
						<Option value="private">{<span className="dark:text-gray-400">Private</span>}</Option>
						<Option value="unlisted">{<span className="dark:text-gray-400">Unlisted</span>}</Option>
						<Option value="public">{<span className="dark:text-gray-400">Public</span>}</Option>
					</Select>
				</Form.Item>

				{/* Upload Progress and Status Section (same as before) */}
				{uploading && (
					<div style={{ marginTop: 20 }}>
						<Text strong>{uploadStatusMessage || 'Processing...'}</Text>
						<Progress percent={uploadProgress} status={uploadError ? 'exception' : (uploadProgress === 100 ? 'success' : 'active')} strokeColor={uploadError ? undefined : { from: '#108ee9', to: '#87d068' }} />
					</div>
				)}
				{uploadError && !uploading && (<Alert message={`Upload Error: ${uploadError}`} type="error" showIcon style={{ marginTop: 15 }} />)}

				{/* Modal Footer Buttons (same as before) */}
				<Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
					<Space>
						<Button onClick={onClose} disabled={uploading}> Cancel </Button>
						<Button className="dark:bg-blue-600 dark:text-white" type="primary" htmlType="submit" loading={uploading} disabled={uploading || !isAuthenticated || isAuthenticating || isLoadingAuthStatus} >
							{uploading ? 'Uploading...' : 'Start Upload'}
						</Button>
					</Space>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default YouTubeUploadModal;
