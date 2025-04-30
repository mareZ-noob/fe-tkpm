import React from "react";
import { Line } from "react-chartjs-2";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
	ChartOptions,
	ChartData,
} from "chart.js";
import { BaseDocument } from "@/interfaces/document/DocumentInterface";
import { BaseVideo } from "@/interfaces/video/VideoInterface";
import { VideoStat } from "@/interfaces/youtube/YouTubeInterface";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const generateMonthlyData = (
	documents: BaseDocument[],
	videos: BaseVideo[],
	youtubeVideos: VideoStat[]
) => {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const documentsByMonth = Array(12).fill(0);
	const videosByMonth = Array(12).fill(0);
	const youtubeVideosByMonth = Array(12).fill(0);

	documents.forEach(doc => {
		try {
			const date = new Date(doc.created_at);
			if (!isNaN(date.getTime())) {
				documentsByMonth[date.getMonth()]++;
			}
		} catch (e) { console.error("Invalid document date:", doc.created_at); }
	});

	videos.forEach(video => {
		try {
			const date = new Date(video.created_at);
			if (!isNaN(date.getTime())) {
				videosByMonth[date.getMonth()]++;
			}
		} catch (e) { console.error("Invalid local video date:", video.created_at); }
	});

	youtubeVideos.forEach(ytVideo => {
		try {
			const date = new Date(ytVideo.publishedAt);
			if (!isNaN(date.getTime())) {
				youtubeVideosByMonth[date.getMonth()]++;
			}
		} catch (e) { console.error("Invalid YouTube video date:", ytVideo.publishedAt); }
	});

	return {
		labels: months,
		documentData: documentsByMonth,
		videoData: videosByMonth,
		youtubeVideoData: youtubeVideosByMonth
	};
};

interface ChartDataInput {
	labels: string[];
	datasets: {
		label: string;
		data: number[];
		borderColor: string;
		backgroundColor: string;
		tension?: number;
		fill?: boolean;
	}[];
}

interface MonthlyCreationChartProps {
	documents: BaseDocument[];
	videos: BaseVideo[];
	youtubeVideos: VideoStat[];
}

const MonthlyCreationChart = ({ documents, videos, youtubeVideos }: MonthlyCreationChartProps) => {
	const monthlyData = generateMonthlyData(documents, videos, youtubeVideos);

	const chartDataDocuments: ChartDataInput = {
		labels: monthlyData.labels,
		datasets: [
			{
				label: 'Documents',
				data: monthlyData.documentData,
				borderColor: '#3b82f6', // blue-500
				backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500/10
				tension: 0.4,
				fill: true,
			}
		]
	};
	const chartDataVideos: ChartDataInput = {
		labels: monthlyData.labels,
		datasets: [
			{
				label: 'Local Videos',
				data: monthlyData.videoData,
				borderColor: '#10b981',
				backgroundColor: 'rgba(16, 185, 129, 0.1)',
				tension: 0.4,
				fill: true,
			}
		]
	};
	const chartDataYouTubeVideos: ChartDataInput = {
		labels: monthlyData.labels,
		datasets: [
			{
				label: 'YouTube Videos',
				data: monthlyData.youtubeVideoData,
				borderColor: '#ef4444',
				backgroundColor: 'rgba(239, 68, 68, 0.1)',
				tension: 0.4,
				fill: true,
			}
		]
	};

	const chartOptions: ChartOptions<'line'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				mode: 'index',
				intersect: false,
				backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : 'rgba(0, 0, 0, 0.7)',
				titleColor: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#fff',
				bodyColor: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#fff',
			},
		},
		scales: {
			x: {
				grid: { display: false },
				ticks: { color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280' },
			},
			y: {
				beginAtZero: true,
				grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(75, 85, 99, 0.3)' : 'rgba(0, 0, 0, 0.05)' },
				ticks: { precision: 0, color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280' },
			},
		},
		elements: { point: { radius: 2, hoverRadius: 4 }, line: { borderWidth: 2 } },
	};

	if (document.documentElement.classList.contains('dark')) {
		chartDataDocuments.datasets[0].borderColor = '#60a5fa';
		chartDataDocuments.datasets[0].backgroundColor = 'rgba(96, 165, 250, 0.1)';
		chartDataVideos.datasets[0].borderColor = '#34d399';
		chartDataVideos.datasets[0].backgroundColor = 'rgba(52, 211, 153, 0.1)';
		chartDataYouTubeVideos.datasets[0].borderColor = '#f87171';
		chartDataYouTubeVideos.datasets[0].backgroundColor = 'rgba(248, 113, 113, 0.1)';
	}

	return (
		<div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
			<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 p-4">
				<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">Documents Created by Month</h3>
				<div className="h-60 md:h-72">
					<Line data={chartDataDocuments as ChartData<'line'>} options={chartOptions} />
				</div>
			</div>
			<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 p-4">
				<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">Local Videos Created by Month</h3>
				<div className="h-60 md:h-72">
					<Line data={chartDataVideos as ChartData<'line'>} options={chartOptions} />
				</div>
			</div>
			<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 p-4">
				<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">YouTube Videos Published by Month</h3>
				<div className="h-60 md:h-72">
					<Line data={chartDataYouTubeVideos as ChartData<'line'>} options={chartOptions} />
				</div>
			</div>
		</div>
	);
}

export default MonthlyCreationChart;
