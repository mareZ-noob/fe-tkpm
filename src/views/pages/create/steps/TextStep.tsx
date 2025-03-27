interface TextStepProps {
	textContent: string;
	setTextContent: (text: string) => void;
	duration: number;
	setDuration: (duration: number) => void;
}

export default function TextStep({
	textContent,
	setTextContent,
	duration,
	setDuration,
}: TextStepProps) {
	return (
		<div className="min-h-[300px]">
			<textarea
				className="w-full h-60 p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300 font-sans text-sm placeholder-gray-400 text-black"
				value={textContent}
				onChange={(e) => setTextContent(e.target.value)}
			></textarea>
			<div className="mt-4 flex items-center">
				<span className="text-sm text-purple-600 font-medium">
					Duration:
				</span>
				<div className="flex items-center ml-2">
					<button
						className="w-6 h-6 bg-purple-100 text-purple-600 rounded flex items-center justify-center"
						onClick={() => setDuration(Math.max(5, duration - 5))}
					>
						-
					</button>
					<span className="mx-2 text-sm text-gray-500">{duration} seconds</span>
					<button
						className="w-6 h-6 bg-purple-100 text-purple-600 rounded flex items-center justify-center"
						onClick={() => setDuration(duration + 5)}
					>
						+
					</button>
				</div>
			</div>
		</div>
	);
}
