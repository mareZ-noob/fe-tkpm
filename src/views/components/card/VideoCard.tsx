import React from "react";
import { Star, Clock } from 'lucide-react';
import { BaseVideo } from "@/interfaces/video/VideoInterface";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";
import VideoFileIcon from "@/components/icon/VideoFileIcon";

interface VideoCardProps {
	video: BaseVideo;
}

const VideoCard = ({ video }: VideoCardProps) => {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col h-full">
			<div className="relative">
				<VideoFileIcon />
				{/* Add duration overlay if available in your BaseVideo */}
				{/* <span className="absolute bottom-2 right-2 bg-black/70 dark:bg-black/50 text-white dark:text-gray-100 text-xs px-1 py-0.5 rounded">
					{video.duration}
				</span> */}
			</div>
			<div className="p-4 pb-3 flex-grow">
				<div className="flex items-start justify-between mb-2">
					<h3
						className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1"
						title={video.title || "Untitled Video"}
					>
						{video.title || "Untitled Video"}
					</h3>
					{video.starred && (
						<Star className="h-4 w-4 text-yellow-400 dark:text-yellow-400 fill-yellow-400 dark:fill-yellow-400 flex-shrink-0" />
					)}
				</div>
				{/* Add Channel/description if available */}
				{/* <p className="text-sm text-gray-500 dark:text-gray-400">{video.channel}</p> */}
			</div>
			<div className="px-4 py-3 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 mt-auto">
				<div className="flex items-center gap-1">
					<Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
					<span>Updated {FormatRelativeTime(video.updated_at)}</span>
				</div>
			</div>
		</div>
	);
};

export default VideoCard;
