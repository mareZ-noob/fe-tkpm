import React from "react";
import { Clock, Eye, ThumbsUp, MessageSquare } from 'lucide-react';
import { VideoStat } from "@/interfaces/youtube/YouTubeInterface";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";
import { FormatViewCount } from "@/utils/FormatViewCount";

interface YouTubeVideoCardProps {
	video: VideoStat;
}

const YouTubeVideoCard = ({ video }: YouTubeVideoCardProps) => {
	const thumbnailUrl = video.thumbnail || "https://placehold.co/320x180/1f2937/f3f4f6?text=No+Thumbnail";

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col h-full">
			<div className="relative">
				<a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title} on YouTube`}>
					<img
						src={thumbnailUrl}
						alt={`Thumbnail for ${video.title}`}
						className="w-full object-cover aspect-video"
						onError={(e) => {
							(e.target as HTMLImageElement).src = "https://placehold.co/320x180/1f2937/f3f4f6?text=Error";
						}}
					/>
				</a>
				{/* <span className="absolute bottom-2 right-2 bg-black/70 dark:bg-black/50 text-white dark:text-gray-100 text-xs px-1 py-0.5 rounded">
					{video.duration}
				</span> */}
			</div>
			<div className="p-4 pb-3 flex-grow">
				<a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 dark:hover:text-blue-400">
					<h3 className="font-medium text-base text-gray-900 dark:text-gray-100 line-clamp-2 mb-1" title={video.title}>
						{video.title || "Untitled YouTube Video"}
					</h3>
				</a>
				{/* <p className="text-sm text-gray-500 dark:text-gray-400">{video.channel}</p> */}
			</div>
			<div className="px-4 pt-2 pb-3 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 mt-auto">
				<div className="flex items-center gap-1 mb-2">
					<Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
					<span>Published {FormatRelativeTime(video.publishedAt)}</span>
				</div>
				<div className="flex justify-between items-center gap-3">
					<div className="flex items-center gap-1" title={`${video.views} views`}>
						<Eye className="h-3 w-3 text-gray-500 dark:text-gray-400" />
						<span>{FormatViewCount(video.views)}</span>
					</div>
					<div className="flex items-center gap-1" title={`${video.likes} likes`}>
						<ThumbsUp className="h-3 w-3 text-gray-500 dark:text-gray-400" />
						<span>{FormatViewCount(video.likes)}</span>
					</div>
					<div className="flex items-center gap-1" title={`${video.comments} comments`}>
						<MessageSquare className="h-3 w-3 text-gray-500 dark:text-gray-400" />
						<span>{FormatViewCount(video.comments)}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default YouTubeVideoCard;
