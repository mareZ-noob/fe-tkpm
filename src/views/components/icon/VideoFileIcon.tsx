import { VideoCameraOutlined } from "@ant-design/icons";

const VideoFileIcon = () => {
	const colors = ["#1677ff", "#52c41a", "#722ed1", "#fa8c16", "#eb2f96"];
	const defaultColor = colors[0];

	return (
		<div className="relative h-[140px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-200">
			<div className="relative z-10 flex h-full w-full items-center justify-center bg-white/85 dark:bg-gray-800/85">
				<div className="flex flex-col items-center gap-2">
					<div className="w-[60px] h-[60px] rounded-full bg-blue-100 dark:bg-blue-400/15 flex items-center justify-center">
						<VideoCameraOutlined className="text-[28px] text-blue-600 dark:text-blue-400" />
					</div>
					<div className="w-5 h-1 bg-blue-600 dark:bg-blue-400 rounded-sm" />
				</div>
			</div>
		</div>
	);
};

export default VideoFileIcon;
