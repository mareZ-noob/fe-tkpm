import React, { useState, useEffect } from "react";
import { Card, Form, Button, Dropdown, message, Typography } from "antd";
import { VideoCameraOutlined, StarOutlined, StarFilled, ClockCircleOutlined } from "@ant-design/icons";
import VideoService from "@/services/video/VideoService";
import PageLayout from "@/layouts/PageLayout";
import ItemGrid from "@/components/grid/ItemGrid";
import ItemModal from "@/components/modal/ItemModal";
import { BaseVideo } from "@/interfaces/video/VideoInterface";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";
import VideoFileIcon from "@/components/icon/VideoFileIcon";

const VideoPage = () => {
	const [videos, setVideos] = useState<BaseVideo[]>([]);
	const [selectedVideo, setSelectedVideo] = useState<BaseVideo | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [searchText, setSearchText] = useState("");
	const [sortOption, setSortOption] = useState<string>("date-new");
	const [filterOption, setFilterOption] = useState<string>("all");
	const [form] = Form.useForm();

	useEffect(() => {
		const fetchVideos = async () => {
			try {
				const data = await VideoService.getVideos();
				setVideos(data);
				setLoading(false);
			} catch (error) {
				console.error("Error fetching videos:", error);
				message.error("Failed to load videos");
				setLoading(false);
			}
		};
		fetchVideos();
	}, []);

	const openVideo = (video: BaseVideo) => {
		setSelectedVideo(video);
		setIsEditing(false);
		form.setFieldsValue({ title: video.title });
	};

	const closeVideo = () => {
		setSelectedVideo(null);
		setIsEditing(false);
	};

	const toggleEdit = () => {
		setIsEditing(!isEditing);
		if (selectedVideo) form.setFieldsValue({ title: selectedVideo.title });
	};

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			if (!selectedVideo) return;

			const updatedVideo = {
				title: values.title,
				starred: selectedVideo.starred,
			};

			await VideoService.updateVideo(selectedVideo.id, updatedVideo);
			const updatedVideos = videos.map((video) =>
				video.id === selectedVideo.id ? { ...video, ...updatedVideo, updated_at: new Date().toISOString() } : video
			);
			setVideos(updatedVideos);
			setSelectedVideo({ ...selectedVideo, ...updatedVideo, updated_at: new Date().toISOString() });
			setIsEditing(false);
			message.success("Video updated successfully!");
		} catch (error) {
			console.error("Error saving video:", error);
			message.error("Failed to update video");
		}
	};

	const toggleStar = async (videoId: string, event: React.MouseEvent) => {
		event.stopPropagation();
		try {
			const videoToUpdate = videos.find((video) => video.id === videoId);
			if (!videoToUpdate) return;

			const updatedStarred = !videoToUpdate.starred;
			await VideoService.updateVideo(videoId, { starred: updatedStarred });

			const updatedVideos = videos.map((video) =>
				video.id === videoId ? { ...video, starred: updatedStarred } : video
			);
			setVideos(updatedVideos);
			if (selectedVideo && selectedVideo.id === videoId) {
				setSelectedVideo({ ...selectedVideo, starred: updatedStarred });
			}
		} catch (error) {
			console.error("Error updating starred status:", error);
			message.error("Failed to update starred status");
		}
	};

	const filteredAndSortedVideos = () => {
		const filtered = videos.filter((video) => {
			const matchesSearch = (video.title?.toLowerCase().includes(searchText.toLowerCase()) || false);
			const matchesStarred = filterOption === "starred" ? video.starred : true;
			return matchesSearch && matchesStarred;
		});

		switch (sortOption) {
			case "name-asc":
				filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
				break;
			case "name-desc":
				filtered.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
				break;
			case "date-new":
				filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
				break;
			case "date-old":
				filtered.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
				break;
		}
		return filtered;
	};

	const handleDeleteVideo = async (videoId: string) => {
		try {
			await VideoService.deleteVideo(videoId);
			setVideos(videos.filter(video => video.id !== videoId));
			closeVideo();
			message.success("Video deleted successfully!");
		} catch (error) {
			console.error("Error deleting video:", error);
			message.error("Failed to delete video");
		}
	};

	const handleDuplicateVideo = async (video: BaseVideo) => {
		try {
			const duplicatedVideo = await VideoService.duplicateVideo(video.id, {
				title: `Copy of ${video.title || "Untitled"}`,
			});

			setVideos([...videos, duplicatedVideo]);
			message.success("Video duplicated successfully!");
		} catch (error) {
			console.error("Error duplicating video:", error);
			message.error("Failed to duplicate video");
		}
	};

	const filterComponent = (
		<Dropdown
			menu={{
				items: [
					{ key: "all", label: "All" },
					{ key: "starred", label: "Starred" },
				],
				onClick: ({ key }) => setFilterOption(key),
			}}
		>
			<Button style={{ borderRadius: 6 }}>
				Filter: {filterOption === "all" ? "All" : "Starred"}
			</Button>
		</Dropdown>
	);

	const sortComponent = (
		<Dropdown
			menu={{
				items: [
					{ key: "name-asc", label: "Name (A-Z)" },
					{ key: "name-desc", label: "Name (Z-A)" },
					{ key: "date-new", label: "Date (Newest)" },
					{ key: "date-old", label: "Date (Oldest)" },
				],
				onClick: ({ key }) => setSortOption(key),
			}}
		>
			<Button style={{ borderRadius: 6 }}>
				Sort:{" "}
				{sortOption === "name-asc"
					? "Name (A-Z)"
					: sortOption === "name-desc"
						? "Name (Z-A)"
						: sortOption === "date-new"
							? "Date (Newest)"
							: "Date (Oldest)"}
			</Button>
		</Dropdown>
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
				actionName="Upload"
				onSave={handleSave}
				form={form}
				onDelete={(video) => handleDeleteVideo(video.id)}
				onDuplicate={(video) => handleDuplicateVideo(video)}
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
				renderContent={(video) => <video src={video.url} controls style={{ width: '100%' }} />}
				hideEditButton={false}
				hideContentField={true}
			/>
		</PageLayout>
	);
};

export default VideoPage;
