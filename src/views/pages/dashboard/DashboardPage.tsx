import React, { useState, useEffect } from "react";
import { AlertCircle, ExternalLink, FileText, Loader2, Video, Youtube } from 'lucide-react';

import DocumentService from "@/services/document/DocumentService";
import VideoService from "@/services/video/VideoService";
import YoutubeService from "@/services/youtube/YouTubeService";

import { BaseDocument } from "@/interfaces/document/DocumentInterface";
import { BaseVideo } from "@/interfaces/video/VideoInterface";
import { AuthStatusResponse, VideoStat } from "@/interfaces/youtube/YouTubeInterface";

import RecentItemsSection from "@/components/section/RecentItemsSection";
import StatCard from "@/components/card/StatCard";
import MonthlyCreationChart from "@/components/chart/MonthlyCreationChart";
import { StarOutlined, StarFilled, ClockCircleOutlined } from "@ant-design/icons";
import YouTubeVideoCard from "@/components/card/YouTubeVideoCard";
import PageLayout from "@/layouts/PageLayout";
import { Button, Card, Typography } from "antd";
import TextFileIcon from "@/components/icon/TextFileIcon";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";
import VideoFileIcon from "@/components/icon/VideoFileIcon";

const DashboardPage = () => {
	const [documents, setDocuments] = useState<BaseDocument[]>([]);
	const [isLoadingDocs, setIsLoadingDocs] = useState(true);
	const [docError, setDocError] = useState<string | null>(null);

	const [videos, setVideos] = useState<BaseVideo[]>([]);
	const [isLoadingVideos, setIsLoadingVideos] = useState(true);
	const [videoError, setVideoError] = useState<string | null>(null);

	const [youtubeVideos, setYoutubeVideos] = useState<VideoStat[]>([]);
	const [isLoadingYouTubeVideos, setIsLoadingYouTubeVideos] = useState(true);
	const [youTubeVideoError, setYouTubeVideoError] = useState<string | null>(null);
	const [isYouTubeAuthenticated, setIsYouTubeAuthenticated] = useState<boolean | null>(null); // Initial state null (unknown)
	const [isLoadingAuthStatus, setIsLoadingAuthStatus] = useState(true); // Loading state for auth check
	const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);


	useEffect(() => {
		const fetchDocuments = async () => {
			setIsLoadingDocs(true);
			setDocError(null);
			try {
				const data = await DocumentService.getDocuments();
				setDocuments(data || []);
			} catch (error: any) {
				console.error("Failed to fetch documents:", error);
				setDocError(error.message || "Could not load documents.");
				setDocuments([]);
			} finally {
				setIsLoadingDocs(false);
			}
		};

		const fetchVideos = async () => {
			setIsLoadingVideos(true);
			setVideoError(null);
			try {
				const data = await VideoService.getVideos();
				setVideos(Array.isArray(data) ? data : []);
			} catch (error: any) {
				console.error("Failed to fetch local videos:", error);
				setVideoError(error.message || "Could not load local videos.");
				setVideos([]);
			} finally {
				setIsLoadingVideos(false);
			}
		};

		const checkYouTubeAuth = async () => {
			setIsLoadingAuthStatus(true);
			try {
				const status: AuthStatusResponse = await YoutubeService.getAuthenticationStatus();
				setIsYouTubeAuthenticated(status.is_authenticated);
				if (status.is_authenticated) {
					fetchYouTubeVideos();
				} else {
					setIsLoadingYouTubeVideos(false);
					await YoutubeService.logout();
					setYoutubeVideos([]);
				}
			} catch (error: any) {
				console.error("Failed to check YouTube auth status:", error);
				setIsYouTubeAuthenticated(false);
				setYouTubeVideoError("Could not verify YouTube connection status.");
				setIsLoadingYouTubeVideos(false);
			} finally {
				setIsLoadingAuthStatus(false);
			}
		};

		const fetchYouTubeVideos = async () => {
			setIsLoadingYouTubeVideos(true);
			setYouTubeVideoError(null);
			try {
				const data = await YoutubeService.getVideoStats();
				if (data.success && Array.isArray(data.videos)) {
					setYoutubeVideos(data.videos);
				} else {
					console.error("Failed to fetch YouTube video stats or data format incorrect:", data);
					setYoutubeVideos([]);
					setYouTubeVideoError("Could not load YouTube videos or data format incorrect.");
				}
			} catch (error: any) {
				console.error("Failed to fetch YouTube video stats:", error);
				setYouTubeVideoError(error.message || "Could not load YouTube videos.");
				setYoutubeVideos([]);
			} finally {
				setIsLoadingYouTubeVideos(false);
			}
		};

		fetchDocuments();
		fetchVideos();
		checkYouTubeAuth();

	}, []);

	const handleYouTubeConnect = async () => {
		setIsConnectingYouTube(true);
		setYouTubeVideoError(null);
		try {
			const response = await YoutubeService.getAuthorizationUrl();
			if (response.auth_url) {
				window.location.href = response.auth_url;
			} else {
				throw new Error("Authorization URL not received.");
			}
		} catch (error: any) {
			console.error("Failed to get YouTube authorization URL:", error);
			setYouTubeVideoError(error.message || "Could not initiate YouTube connection.");
			setIsConnectingYouTube(false);
		}
	};

	const renderYouTubeSection = () => {
		if (isLoadingAuthStatus) {
			return (
				<div className="flex justify-center items-center h-40 text-gray-500">
					<Loader2 className="h-6 w-6 animate-spin mr-2" />
					<span>Checking YouTube connection...</span>
				</div>
			);
		}

		if (isYouTubeAuthenticated === false) {
			return (
				<div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col items-center text-center dark:bg-gray-800 dark:border-gray-700">
					<Youtube className="h-12 w-12 text-red-500 mb-4" />
					<h3 className="text-lg font-semibold mb-2">Connect to YouTube</h3>
					<p className="text-sm text-gray-600 mb-4 bg-white dark:bg-gray-800 dark:text-gray-100" >
						Link your YouTube account to view your video statistics and manage uploads directly from the dashboard.
					</p>
					{youTubeVideoError && (
						<div className="text-xs text-red-600 mb-3 flex items-center">
							<AlertCircle className="h-4 w-4 mr-1" /> {youTubeVideoError}
						</div>
					)}
					<button
						onClick={handleYouTubeConnect}
						disabled={isConnectingYouTube}
						className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
					>
						{isConnectingYouTube ? (
							<>
								<Loader2 className="animate-spin h-4 w-4 mr-2" /> Connecting...
							</>
						) : (
							<>
								<ExternalLink className="h-4 w-4 mr-2" /> Connect YouTube Account
							</>
						)}
					</button>
				</div>
			);
		}

		return (
			<RecentItemsSection
				title="Recent YouTube Videos"
				items={youtubeVideos}
				isLoading={isLoadingYouTubeVideos}
				error={youTubeVideoError && !isConnectingYouTube ? youTubeVideoError : null}
				sortBy="publishedAt"
				renderItem={(item) => <YouTubeVideoCard video={item as VideoStat} />}
				maxItems={3}
				emptyStateMessage="No YouTube videos found or failed to load stats."
			/>
		);
	};

	return (
		<PageLayout
			title="Dashboard"
			description="Overview of your documents and videos"
		>
			<div className="container mx-auto">
				<div className="flex flex-col gap-8">
					{/* Statistics Section */}
					<div className="grid gap-4 md:grid-cols-3">
						<StatCard
							title="Total Documents"
							value={isLoadingDocs ? "..." : documents.length}
							icon={<FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />}
						/>
						<StatCard
							title="Total Local Videos"
							value={isLoadingVideos ? "..." : videos.length}
							icon={<Video className="h-5 w-5 text-green-500 dark:text-green-400" />}
						/>
						<StatCard
							title="Total YouTube Videos"
							value={isLoadingAuthStatus ? '...' : (isYouTubeAuthenticated ? (isLoadingYouTubeVideos ? '...' : youtubeVideos.length) : 'N/A')}
							icon={<Youtube className={`h-5 w-5 ${isYouTubeAuthenticated === false ? 'text-gray-400 dark:text-gray-500' : 'text-red-500 dark:text-red-400'}`} />}
						/>
					</div>

					{/* Monthly Creation Charts */}
					<MonthlyCreationChart
						documents={documents}
						videos={videos}
						youtubeVideos={isYouTubeAuthenticated === true ? youtubeVideos : []}
					/>

					{/* Recent Documents Section */}
					<RecentItemsSection
						title="Recent Documents"
						items={documents}
						isLoading={isLoadingDocs}
						error={docError}
						sortBy="updated_at"
						renderItem={(file) => (
							<Card
								hoverable
								className="bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg"
								style={{ borderRadius: 8, overflow: "hidden", height: "100%" }}
								styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}
							// onClick={() => openDocument(file)}
							>
								<TextFileIcon content={file.content} />
								<div className="p-3 flex flex-col gap-2 flex-grow" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flexGrow: 1 }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
										<Typography.Text
											strong
											className="text-gray-900 dark:text-gray-100"
											style={{
												fontSize: 15,
												lineHeight: 1.4,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												maxWidth: "calc(100% - 24px)",
											}}
										>
											{file.title || "Untitled"}
										</Typography.Text>
										<Button
											type="text"
											size="small"
											icon={
												file.starred ? (
													<StarFilled className="text-yellow-500 dark:text-yellow-400" />
												) : (
													<StarOutlined className="text-gray-600 dark:text-gray-300" />
												)
											}
										// onClick={(e) => toggleDocumentStar(file.id, e)}
										/>
									</div>
									<div className="flex items-center gap-2 mt-auto" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
										<ClockCircleOutlined className="text-gray-500 dark:text-gray-400" style={{ fontSize: 12, color: "#8c8c8c" }} />
										<Typography.Text className="text-gray-500 dark:text-gray-400" type="secondary" style={{ fontSize: 12 }}>
											{FormatRelativeTime(file.updated_at)}
										</Typography.Text>
									</div>
								</div>
							</Card>
						)}
						maxItems={3}
					/>

					<hr className="my-4 border-gray-200" />

					{/* Recent Local Videos Section */}
					<RecentItemsSection
						title="Recent Local Videos"
						items={videos}
						isLoading={isLoadingVideos}
						error={videoError}
						sortBy="updated_at"
						renderItem={(video) => (
							<Card
								hoverable
								className="bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg"
								style={{ borderRadius: 8, overflow: "hidden", height: "100%" }}
								styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}
							// onClick={() => openVideo(video)}
							>
								<VideoFileIcon />
								<div className="p-3 flex flex-col gap-2 flex-grow" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flexGrow: 1 }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
										<Typography.Text
											strong
											className="text-gray-900 dark:text-gray-100"
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
											icon={
												video.starred ? (
													<StarFilled className="text-yellow-500 dark:text-yellow-400" />
												) : (
													<StarOutlined className="text-gray-600 dark:text-gray-300" />
												)
											}
										// onClick={(e) => toggleVideoStar(video.id, e)}
										/>
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
										<ClockCircleOutlined className="text-gray-500 dark:text-gray-400" style={{ fontSize: 12, color: "#8c8c8c" }} />
										<Typography.Text className="text-gray-500 dark:text-gray-400" type="secondary" style={{ fontSize: 12 }}>
											{FormatRelativeTime(video.updated_at)}
										</Typography.Text>
									</div>
								</div>
							</Card>
						)}
						maxItems={3}
						emptyStateMessage="No local videos found."
					/>

					<hr className="my-4 border-gray-200" />

					{/* YouTube Videos Section */}
					{renderYouTubeSection()}

				</div>
			</div>
		</PageLayout>
	);
}

export default DashboardPage;
