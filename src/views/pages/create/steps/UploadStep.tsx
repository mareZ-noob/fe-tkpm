import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Button, Typography, Spin, Alert, message, Tooltip } from 'antd';
import {
	YoutubeOutlined,
	LinkOutlined,
	VideoCameraAddOutlined,
	CheckCircleFilled,
	ExclamationCircleOutlined,
	CopyOutlined,
	CheckOutlined
} from '@ant-design/icons';
import YouTubeUploadModal from '@/components/modal/YouTubeUploadModal';

interface UploadStepProps {
	finalVideoUrl: string | null;
	videoTitle?: string;
}

export interface UploadStepHandle {
	navigateToDashBoard: () => void;
}

const UploadStep = forwardRef<UploadStepHandle, UploadStepProps>(({ finalVideoUrl, videoTitle = "Generated Video" }, ref) => {
	const [isYouTubeModalVisible, setIsYouTubeModalVisible] = useState(false);
	const [videoPlayerError, setVideoPlayerError] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	const triggerModalOpen = () => {
		if (!finalVideoUrl) {
			console.error("Video URL is not available to upload.");
			setVideoPlayerError("Video URL is not available. Cannot open upload modal.");
			return;
		}
		setVideoPlayerError(null);
		setIsYouTubeModalVisible(true);
	};

	useImperativeHandle(ref, () => ({
		navigateToDashBoard: () => {
			window.location.href = '/dashboard';
		}
	}));

	const handleYouTubeModalClose = () => {
		setIsYouTubeModalVisible(false);
	};

	const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
		console.error("Video player error:", e);
		setVideoPlayerError("Could not load video preview. The video file might be invalid or the URL inaccessible. You can still try to use the URL or attempt to upload.");
	};

	const copyToClipboard = () => {
		if (finalVideoUrl) {
			navigator.clipboard.writeText(finalVideoUrl)
				.then(() => {
					setIsCopied(true);
					message.success('URL copied to clipboard!');
					setTimeout(() => setIsCopied(false), 2000);
				})
				.catch(err => {
					console.error('Failed to copy URL: ', err);
					message.error('Failed to copy URL');
				});
		}
	};

	const getTruncatedUrl = (url: string) => {
		if (!url) return '';

		const maxLength = 40;
		if (url.length <= maxLength) return url;

		return `${url.substring(0, 20)}...${url.substring(url.length - 20)}`;
	};

	return (
		<div className="min-h-[350px] w-full flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-lg">
			{finalVideoUrl ? (
				<div className="w-full max-w-5xl bg-gray-50 dark:bg-slate-700 shadow-xl rounded-lg p-6 sm:p-8">
					{/* Header Section */}
					<div className="text-center mb-6 sm:mb-8">
						<CheckCircleFilled style={{ fontSize: '48px', color: '#52c41a' }} className="mb-4" />
						<Typography.Title level={2} className="mb-2 text-gray-800 dark:text-white">
							Video Generated!
						</Typography.Title>
						<Typography.Paragraph className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
							Your video is ready. Preview it and find upload options and the direct URL.
						</Typography.Paragraph>
					</div>

					{/* Two-column layout for video and controls */}
					<div className="flex flex-col md:flex-row gap-6 lg:gap-8">
						{/* Left Column: Video Player */}
						<div className="md:w-3/5 lg:w-2/3 flex flex-col">
							<div className="w-full bg-black rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
								<video
									key={finalVideoUrl}
									src={finalVideoUrl}
									controls
									className="w-full h-full block"
									onError={handleVideoError}
									onCanPlay={() => setVideoPlayerError(null)}
								>
									Your browser does not support the video tag.
								</video>
							</div>
							{videoPlayerError && (
								<Alert
									message="Video Preview Error"
									description={videoPlayerError}
									type="error"
									showIcon
									icon={<ExclamationCircleOutlined />}
									className="mt-4 text-left"
								/>
							)}
						</div>

						{/* Right Column: Upload Button and Link */}
						<div className="md:w-2/5 lg:w-1/3 flex flex-col gap-6 pt-4 md:pt-0">
							<Button
								type="primary"
								danger
								icon={<YoutubeOutlined />}
								onClick={triggerModalOpen}
								size="large"
								className="w-full"
							>
								Upload to YouTube
							</Button>
							<div className="p-4 bg-gray-100 dark:bg-slate-600 rounded-md text-left flex-grow">
								<Typography.Text strong className="text-gray-700 dark:text-gray-200 block mb-3">
									Video URL:
								</Typography.Text>
								<div className="flex items-center bg-white dark:bg-slate-800 rounded px-3 py-2 shadow-sm border border-gray-200 dark:border-slate-600">
									<LinkOutlined className="mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400" />
									<Tooltip title={finalVideoUrl}>
										<a
											href={finalVideoUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate flex-grow"
										>
											{getTruncatedUrl(finalVideoUrl)}
										</a>
									</Tooltip>
									<Button
										type="text"
										icon={isCopied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined className="dark:text-gray-50" />}
										onClick={copyToClipboard}
										className="flex-shrink-0 ml-2"
										size="small"
										title="Copy URL"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				// Fallback if finalVideoUrl is null (e.g., still processing)
				<div className="w-full max-w-md bg-gray-50 dark:bg-slate-700 shadow-md rounded-lg p-8 text-center">
					<Spin indicator={<VideoCameraAddOutlined style={{ fontSize: 48 }} spin />} />
					<Typography.Title level={3} className="mt-6 mb-2 text-gray-800 dark:text-white">
						Generating Video
					</Typography.Title>
					<Typography.Paragraph className="text-sm text-gray-500 dark:text-gray-400">
						Please wait while your video is being processed. This might take a few minutes.
					</Typography.Paragraph>
				</div>
			)}

			<YouTubeUploadModal
				visible={isYouTubeModalVisible}
				onClose={handleYouTubeModalClose}
				initialVideoUrl={finalVideoUrl}
				initialTitle={videoTitle}
				hideSourceFields={!!finalVideoUrl}
			/>
		</div>
	);
});

export default UploadStep;
