import React, { useState, useEffect } from "react";
import { Card, Form, Button, Dropdown, message, Typography, Space, Alert, Modal as AntdModal } from "antd";
import { VideoCameraOutlined, StarOutlined, StarFilled, ClockCircleOutlined, YoutubeOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import VideoService from "@/services/video/VideoService";
import PageLayout from "@/layouts/PageLayout";
import ItemGrid from "@/components/grid/ItemGrid";
import ItemModal from "@/components/modal/ItemModal";
import { BaseVideo } from "@/interfaces/video/VideoInterface";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";
import VideoFileIcon from "@/components/icon/VideoFileIcon";
import YoutubeUploadModal from "@/components/modal/YoutubeUploadModal";

const { confirm } = AntdModal;

const VideoPage = () => {
	const [videos, setVideos] = useState<BaseVideo[]>([]);
	const [selectedVideo, setSelectedVideo] = useState<BaseVideo | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [searchText, setSearchText] = useState("");
	const [sortOption, setSortOption] = useState<string>("date-new");
	const [filterOption, setFilterOption] = useState<string>("all");
	const [form] = Form.useForm();

	const [isYouTubeModalVisible, setIsYouTubeModalVisible] = useState(false);
	const [youTubeInitialData, setYouTubeInitialData] = useState<{ url?: string | null; title?: string | null } | null>(null);


	useEffect(() => {
		const fetchVideos = async () => {
			setLoading(true);
			try {
				const data = await VideoService.getVideos();
				setVideos(Array.isArray(data) ? data : []);
			} catch (error: any) {
				console.error("Error fetching videos:", error);
				message.error(`Failed to load videos: ${error?.message || 'Unknown error'}`);
				setVideos([]);
			} finally {
				setLoading(false);
			}
		};
		fetchVideos();
	}, []);

	const openVideo = (video: BaseVideo) => {
		setSelectedVideo(video);
		setIsEditing(false);
		form.setFieldsValue({
			title: video.title || '',
		});
	};

	const closeVideo = () => {
		setSelectedVideo(null);
		setIsEditing(false);
		form.resetFields();
	};

	const toggleEdit = () => {
		if (!selectedVideo) return;
		const currentlyEditing = !isEditing;
		setIsEditing(currentlyEditing);
		if (currentlyEditing) {
			form.setFieldsValue({
				title: selectedVideo.title || '',
			});
		} else {
			form.setFieldsValue({
				title: selectedVideo.title || '',
			});
		}
	};

	const handleSave = async () => {
		if (!selectedVideo) return;
		try {
			const values = await form.validateFields(['title']);
			const updatedVideoData = {
				title: values.title,
				starred: selectedVideo.starred,
			};

			await VideoService.updateVideo(selectedVideo.id, updatedVideoData);

			const updatedVideos = videos.map((video) =>
				video.id === selectedVideo.id ? { ...video, ...updatedVideoData, updated_at: new Date().toISOString() } : video
			);
			setVideos(updatedVideos);
			setSelectedVideo({ ...selectedVideo, ...updatedVideoData, updated_at: new Date().toISOString() });
			setIsEditing(false);
			message.success("Video updated successfully!");

		} catch (error: any) {
			console.error("Error saving video:", error);
			if (error.errorFields) {
				message.error("Please check the fields in the form.");
			} else {
				message.error(`Failed to update video: ${error?.message || 'Unknown error'}`);
			}
		}
	};

	const toggleStar = async (videoId: string, event?: React.MouseEvent) => {
		event?.stopPropagation();
		const videoIndex = videos.findIndex((video) => video.id === videoId);
		if (videoIndex === -1) return;

		const originalVideo = videos[videoIndex];
		const updatedStarred = !originalVideo.starred;
		const optimisticVideo = { ...originalVideo, starred: updatedStarred };

		const updatedVideos = [...videos];
		updatedVideos[videoIndex] = optimisticVideo;
		setVideos(updatedVideos);
		if (selectedVideo && selectedVideo.id === videoId) {
			setSelectedVideo(optimisticVideo);
		}

		try {
			await VideoService.updateVideo(videoId, { starred: updatedStarred });
		} catch (error: any) {
			console.error("Error updating starred status:", error);
			message.error("Failed to update star status. Reverting.");
			const revertedVideos = [...videos];
			revertedVideos[videoIndex] = originalVideo;
			setVideos(revertedVideos);
			if (selectedVideo && selectedVideo.id === videoId) {
				setSelectedVideo(originalVideo);
			}
		}
	};

	const handleDeleteVideo = (videoToDelete: BaseVideo) => {
		confirm({
			title: `Delete "${videoToDelete.title || 'Untitled Video'}"?`,
			icon: <ExclamationCircleFilled />,
			content: 'This action cannot be undone.',
			okText: 'Delete',
			okType: 'danger',
			cancelText: 'Cancel',
			onOk: async () => {
				try {
					await VideoService.deleteVideo(videoToDelete.id);
					setVideos(currentVideos => currentVideos.filter(video => video.id !== videoToDelete.id));
					if (selectedVideo && selectedVideo.id === videoToDelete.id) {
						closeVideo();
					}
					message.success("Video deleted successfully!");
				} catch (error: any) {
					console.error("Error deleting video:", error);
					message.error(`Failed to delete video: ${error?.message || 'Unknown error'}`);
				}
			},
			onCancel() {
				console.log('Delete cancelled');
			},
		});
	};

	const handleDuplicateVideo = async (videoToDuplicate: BaseVideo) => {
		try {
			const duplicatedVideo = await VideoService.duplicateVideo(videoToDuplicate.id, {
				title: `Copy of ${videoToDuplicate.title || "Untitled"}`,
			});
			setVideos(currentVideos => [duplicatedVideo, ...currentVideos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
			message.success("Video duplicated successfully!");
		} catch (error: any) {
			console.error("Error duplicating video:", error);
			message.error(`Failed to duplicate video: ${error?.message || 'Unknown error'}`);
		}
	};

	const filteredAndSortedVideos = () => {
		const filtered = videos.filter((video) => {
			const titleMatch = video.title?.toLowerCase().includes(searchText.toLowerCase()) ?? false;
			const starredMatch = filterOption === "starred" ? video.starred === true : true;
			return titleMatch && starredMatch;
		});

		switch (sortOption) {
			case "name-asc": return [...filtered].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
			case "name-desc": return [...filtered].sort((a, b) => (b.title || "").localeCompare(a.title || ""));
			case "date-new": return [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
			case "date-old": return [...filtered].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
			default: return [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
		}
	};


	const showGenericYoutubeUploadModal = () => {
		setYouTubeInitialData(null);
		setIsYouTubeModalVisible(true);
	};

	const showSpecificYoutubeUploadModal = () => {
		if (!selectedVideo) return;
		if (!selectedVideo.url) {
			message.warning("This video does not have a valid URL and cannot be uploaded to YouTube.");
			return;
		}
		setYouTubeInitialData({ url: selectedVideo.url, title: selectedVideo.title || 'Untitled Video' });
		setIsYouTubeModalVisible(true);
	};

	const handleYouTubeModalClose = () => {
		setIsYouTubeModalVisible(false);
		setYouTubeInitialData(null);
	};

	const filterComponent = (
		<Dropdown
			menu={{
				items: [{ key: "all", label: "All" }, { key: "starred", label: "Starred" },],
				onClick: ({ key }) => setFilterOption(key),
				selectable: true, defaultSelectedKeys: [filterOption],
			}} >
			<Button style={{ borderRadius: 6 }}> Filter: {filterOption === "all" ? "All" : "Starred"} </Button>
		</Dropdown>
	);

	const sortComponent = (
		<Dropdown
			menu={{
				items: [{ key: "name-asc", label: "Name (A-Z)" }, { key: "name-desc", label: "Name (Z-A)" }, { key: "date-new", label: "Date (Newest)" }, { key: "date-old", label: "Date (Oldest)" },],
				onClick: ({ key }) => setSortOption(key),
				selectable: true, defaultSelectedKeys: [sortOption],
			}} >
			<Button style={{ borderRadius: 6 }}> Sort: {sortOption === "name-asc" ? "Name (A-Z)" : sortOption === "name-desc" ? "Name (Z-A)" : sortOption === "date-new" ? "Date (Newest)" : "Date (Oldest)"} </Button>
		</Dropdown>
	);

	const pageHeaderActions = (
		<Space>
			<Button type="primary" icon={<YoutubeOutlined />} onClick={showGenericYoutubeUploadModal} >
				Upload New Video to YouTube
			</Button>
		</Space>
	);

	return (
		<PageLayout
			title="Videos"
			description="Manage and organize your video content"
			searchText={searchText}
			onSearchChange={setSearchText}
			filterComponent={filterComponent}
			sortComponent={sortComponent}
			totalItems={filteredAndSortedVideos().length}
			headerActions={pageHeaderActions}
		>
			<ItemGrid
				items={filteredAndSortedVideos()}
				loading={loading}
				searchText={searchText}
				renderItem={(video) => (
					<Card
						hoverable
						style={{ borderRadius: 8, overflow: "hidden", height: "100%" }}
						styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}
						onClick={() => openVideo(video)}
					>
						<VideoFileIcon />
						<div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flexGrow: 1 }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<Typography.Text
									strong
									style={{
										fontSize: 15,
										lineHeight: 1.4,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										maxWidth: "calc(100% - 24px)",
									}}
								>
									{video.title || "Untitled"}
								</Typography.Text>
								<Button
									type="text"
									size="small"
									icon={video.starred ? <StarFilled style={{ color: "#fadb14" }} /> : <StarOutlined />}
									onClick={(e) => toggleStar(video.id, e)}
								/>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
								<ClockCircleOutlined style={{ fontSize: 12, color: "#8c8c8c" }} />
								<Typography.Text type="secondary" style={{ fontSize: 12 }}>
									{FormatRelativeTime(video.updated_at)}
								</Typography.Text>
							</div>
						</div>
					</Card>
				)}
			/>

			<ItemModal
				item={selectedVideo}
				isEditing={isEditing}
				onClose={closeVideo}
				onEditToggle={toggleEdit}
				onSave={handleSave}
				form={form}
				onDelete={handleDeleteVideo}
				onDuplicate={handleDuplicateVideo}
				renderTitle={(video) => (
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<VideoCameraOutlined style={{ fontSize: 14, color: "#1677ff"}} /> {video.title || "Untitled"}
						<Button
							type="text"
							size="small"
							icon={video.starred ? <StarFilled style={{ color: "#fadb14" }} /> : <StarOutlined />}
							onClick={(e) => {
								e.stopPropagation();
								toggleStar(video.id, e);
							}}
						/>
					</div>
				)}
				renderContent={(video: BaseVideo) => (
					video.url ? (
						<video key={video.id} src={video.url} controls style={{ width: '100%', maxHeight: '60vh', borderRadius: '4px', backgroundColor: '#000' }} onError={(e) => console.error("Video player error:", e)} />
					) : (
						<Alert message="No video preview available (URL missing)." type="warning" showIcon />
					)
				)}
				actionName={selectedVideo?.url ? "Upload to YouTube" : "View Details"}
				onActionClick={selectedVideo?.url ? showSpecificYoutubeUploadModal : undefined}
				hideEditButton={false}
				hideContentField={true}
			/>

			<YoutubeUploadModal
				visible={isYouTubeModalVisible}
				onClose={handleYouTubeModalClose}
				initialVideoUrl={youTubeInitialData?.url}
				initialTitle={youTubeInitialData?.title}
				hideSourceFields={!!youTubeInitialData?.url}
			/>
		</PageLayout>
	);
};

export default VideoPage;
