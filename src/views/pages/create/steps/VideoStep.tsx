const VideoStep = () => {
	return (
		<div className="min-h-[300px] flex flex-col items-center justify-center">
			<div className="w-full max-w-md bg-gray-100 rounded-md p-8 text-center">
				<div className="text-4xl mb-4">🎬</div>
				<h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
				<p className="text-sm text-gray-500 mb-4">
					Your video settings are complete. Click the Generate Video button to create your video.
				</p>
				<div className="text-xs text-gray-500">Estimated generation time: 2-3 minutes</div>
			</div>
		</div>
	);
};

export default VideoStep;
