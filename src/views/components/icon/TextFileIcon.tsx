import { FileTextOutlined } from "@ant-design/icons";

const TextFileIcon = ({ content }: { content?: string }) => {
	const colors = ["#1677ff", "#52c41a", "#722ed1", "#fa8c16", "#eb2f96"];
	const defaultColor = colors[2];

	return (
		<div className="relative h-[140px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-200">
			<div className="absolute inset-0 p-3 flex items-center justify-center">
				<div className="h-full w-full overflow-hidden">
					<div className="text-xs text-gray-500 dark:text-gray-400 blur-sm">
						{content || "No content"}
					</div>
				</div>
			</div>
			<div className="relative z-10 flex h-full w-full items-center justify-center bg-white/85 dark:bg-gray-800/85">
				<div className="flex flex-col items-center gap-2">
					<div className="w-[60px] h-[60px] rounded-full bg-purple-100 dark:bg-purple-400/15 flex items-center justify-center">
						<FileTextOutlined className="text-[28px] text-purple-600 dark:text-purple-400" />
					</div>
					<div className="w-5 h-1 bg-purple-600 dark:bg-purple-400 rounded-sm" />
				</div>
			</div>
		</div>
	);
};

export default TextFileIcon;
