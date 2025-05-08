import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import AudioStep, { AudioStepHandle } from "@/pages/create/steps/AudioStep";
import ImageStep, { ImageStepHandle } from "@/pages/create/steps/ImageStep";
import TextStep from "@/pages/create/steps/TextStep";
import PromptStep from "@/pages/create/steps/PromptStep";
import api from "@/configs/axios.config";
import DocumentService from "@/services/document/DocumentService";
import { DocumentCreate } from "@/interfaces/document/DocumentInterface";
import VideoStep, { VideoStepHandle } from "@/pages/create/steps/VideoStep";
import UploadStep, { UploadStepHandle } from "@/pages/create/steps/UploadStep";

type Step = {
	id: number;
	name: string;
	component: (props: any) => React.ReactNode;
};

interface VideoEditorProps {
	initialContent?: string;
	initialStep?: number;
}

interface SrtSegment {
	start: number;
	end: number;
	text: string;
}

interface SrtSegment { start: number; end: number; text: string; }
interface SingleTimelineSegment { type: 'single'; id: string; originalIndex: number; segment: SrtSegment; }
interface GroupedTimelineSegment { type: 'group'; id: string; originalIndices: number[]; segments: SrtSegment[]; start: number; end: number; text: string; }
type TimelineSegmentData = SingleTimelineSegment | GroupedTimelineSegment;
type DraggableItemType = "image" | "pexels_video" | "pexels_image";
type UniqueIdentifier = string | number;

interface TimelineItem {
	instanceId: UniqueIdentifier;
	originalId: UniqueIdentifier;
	type: DraggableItemType;
	url: string;
	sourceUrl?: string;
	duration: number;
	meta?: unknown;
	id?: UniqueIdentifier;
}
interface SegmentMediaMap { [timelineSegmentId: string]: TimelineItem[]; }

interface TimelineAssetsGrouped {
	audioUrl: string;
	srtData: SrtSegment[];
	timelineStructure: TimelineSegmentData[];
	mediaMap: SegmentMediaMap;
	estimatedDuration: number;
}

interface FfmpegClip {
	id: string;
	type: 'image' | 'video';
	sourceUrl: string;
	duration: number;
	startTime: number;
}

interface FfmpegPayload {
	audioUrl: string;
	clips: FfmpegClip[];
	totalDuration: number;
	srtData?: SrtSegment[];
}

const VideoEditor: React.FC<VideoEditorProps> = ({ initialContent = "", initialStep = 1 }) => {
	const [currentStep, setCurrentStep] = useState(initialStep);
	const [textContent, setTextContent] = useState(initialContent);
	const [triggerFetchSummary, setTriggerFetchSummary] = useState(false);
	const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
	const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
	const [isProcessingAudio, setIsProcessingAudio] = useState(false);
	const [audioProcessingError, setAudioProcessingError] = useState<string | null>(null);
	const [isGeneratingScript, setIsGeneratingScript] = useState(false);
	const [scriptGenerationError, setScriptGenerationError] = useState<string | null>(null);
	const [model, setModel] = useState<string | null>("meta-llama/llama-4-scout:free");
	const [listImages, setListImages] = useState<string[]>([]);
	const audioStepRef = useRef<AudioStepHandle>(null);
	const imageStepRef = useRef<ImageStepHandle>(null);
	const videoStepRef = useRef<VideoStepHandle>(null);
	const uploadStepRef = useRef<UploadStepHandle>(null);
	const [isProcessingImages, setIsProcessingImages] = useState(false);
	const [imageProcessingError, setImageProcessingError] = useState<string | null>(null);
	const [selectedAssetsForGeneration, setSelectedAssetsForGeneration] = useState<TimelineAssetsGrouped | null>(null);
	const [duration, setDuration] = useState<number>(0);
	const [listVideos, setListVideos] = useState<string[]>([]);
	const [languageOutput, setLanguageOutput] = useState<string>("English");
	const [languageSupported, setLanguageSupported] = useState<boolean>(true);
	const [srtUrl, setSrtUrl] = useState<string>("");
	const [srtJson, setSrtJson] = useState<SrtSegment[] | null>(null);
	const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
	const [videoGenerationError, setVideoGenerationError] = useState<string | null>(null);
	const [generatedFfmpegPayload, setGeneratedFfmpegPayload] = useState<FfmpegPayload | null>(null);
	const [isSegmentMediaDurationMismatch, setIsSegmentMediaDurationMismatch] = useState(false);
	const [videoGenerationStatus, setVideoGenerationStatus] = useState<string | null>(null);
	const [isPollingVideoStatus, setIsPollingVideoStatus] = useState(false);

	useEffect(() => {
		setTextContent(initialContent);
	}, [initialContent]);

	useEffect(() => {
		setCurrentStep(initialStep);
	}, [initialStep]);

	useEffect(() => {
		const handleResetTrigger = () => {
			setTriggerFetchSummary(false);
			setIsGeneratingScript(false);
		};
		window.addEventListener("resetTriggerFetchSummary", handleResetTrigger);

		return () => {
			window.removeEventListener("resetTriggerFetchSummary", handleResetTrigger);
		};
	}, []);

	const saveDocument = async () => {
		try {
			const payload: DocumentCreate = {
				content: textContent,
			};

			const response = await DocumentService.createDocument(payload);

			if (response) {
				console.log("Text saved successfully!");
			}
		} catch (error) {
			console.error("Error saving text:", error);
		}
	};

	const concatenateAndUploadAudio = async (audioBlobs: (Blob | null)[]) => {
		const formData = new FormData();
		let validBlobs = 0;
		audioBlobs.forEach((blob, index) => {
			if (blob) {
				formData.append(`audio_part_${index}`, blob, `paragraph_${index}.mp3`);
				validBlobs++;
			}
		});
		formData.append("language", languageOutput);
		formData.append("model", model || "meta-llama/llama-4-scout:free");
		if (validBlobs === 0) {
			throw new Error("No valid audio segments found to process.");
		}

		console.log("Sending audio blobs to backend:", formData);

		const response = await api.post("/tts/concatenate-and-upload", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});

		if (response.status === 200 && response.data?.cloudinary_url) {
			if (response.data?.language_supported) {
				console.log("Language supported:", response.data.language_supported);
				setLanguageSupported(response.data.language_supported);
			}
			if (response.data?.srt_url) {
				console.log("SRT URL:", response.data.srt_url);
				setSrtUrl(response.data.srt_url);
			}
			if (response.data?.srt_json) {
				const receivedSrtData = response.data.srt_json;
				console.log("Raw SRT Data Received from API:", receivedSrtData);

				if (Array.isArray(receivedSrtData)) {
					setSrtJson(receivedSrtData as SrtSegment[]);
				} else {
					console.error("Invalid SRT data format received from API:", receivedSrtData);
					setSrtJson(null);
					throw new Error("Invalid SRT data format received from the server.");
				}
			}
			return response.data.cloudinary_url;
		} else {
			throw new Error(response.data?.msg || "Failed to process audio on the server.");
		}
	};

	const handleScriptGenerated = (success: boolean, script: string | null, errorMsg: string | null = null) => {
		setIsGeneratingScript(false);
		setTriggerFetchSummary(false);

		if (success && script !== null) {
			console.log("Script generated successfully, proceeding to Text Step.");
			setTextContent(script);
			setCurrentStep(2);
			setScriptGenerationError(null);
		} else {
			console.error("Script generation failed:", errorMsg);
			setScriptGenerationError(errorMsg || "Failed to generate script.");
		}
	};

	const handleNextStep = async () => {
		if (currentStep === 3) {
			setIsProcessingAudio(false);
			setAudioProcessingError(null);
		}
		if (currentStep === 4) {
			setIsProcessingImages(false);
			setImageProcessingError(null);
		}
		if (currentStep === 5) {
			setVideoGenerationError(null);
			setVideoGenerationStatus(null);
			setIsPollingVideoStatus(false);
		}

		if (currentStep === 2) {
			await saveDocument();
			setCurrentStep((prev) => prev + 1);
		} else if (currentStep === 3) {
			if (audioStepRef.current) {
				setIsProcessingAudio(true);
				try {
					console.log("Getting audio blobs from AudioStep...");
					const audioBlobs = await audioStepRef.current.getAudioBlobsForUpload();
					console.log("Received blobs:", audioBlobs);

					const url = await concatenateAndUploadAudio(audioBlobs.filter((b) => b !== null) as Blob[]);
					setFinalAudioUrl(url);
					let audio: HTMLAudioElement | null = null;
					audio = new Audio(url);
					audio.preload = "metadata";
					setDuration(audio.duration);
					console.log("Audio processed successfully. Cloudinary URL:", url);
					setCurrentStep((prev) => prev + 1);
				} catch (error: any) {
					console.error("Error processing audio:", error);
					setAudioProcessingError(error.message || "An unknown error occurred while processing audio.");
				} finally {
					setIsProcessingAudio(false);
				}
			} else {
				console.error("AudioStep ref is not available.");
				setAudioProcessingError("Cannot process audio. Component reference missing.");
			}
		} else if (currentStep === 4) {
			if (imageStepRef.current) {
				setIsProcessingImages(true);
				setImageProcessingError(null);
				try {
					console.log("VideoEditor: Calling prepareImagesForNextStep on ImageStep ref...");
					const finalImageUrls = await imageStepRef.current.prepareImagesForNextStep();
					console.log("VideoEditor: Received final image URLs:", finalImageUrls);

					if (finalImageUrls.length === 0) {
						console.warn("VideoEditor: No final images available to proceed.");
					}

					setListImages(finalImageUrls);
					setCurrentStep((prev) => prev + 1);
				} catch (error: any) {
					console.error("VideoEditor: Error preparing images:", error);
					setImageProcessingError(error.message || "An error occurred while preparing images.");
				} finally {
					setIsProcessingImages(false);
				}
			} else {
				console.error("ImageStep ref is not available.");
				setImageProcessingError("Cannot process images. Component reference missing.");
			}
		} else if (currentStep === 5) {
			if (videoStepRef.current) {
				setIsGeneratingVideo(true);
				setVideoGenerationError(null);
				setVideoGenerationStatus("Initiating video generation...");
				setIsPollingVideoStatus(true);

				const handleProgressUpdate = (message: string, isPollingActive: boolean) => {
					setVideoGenerationStatus(message);
					setIsPollingVideoStatus(isPollingActive);
				};

				try {
					console.log("VideoEditor: Calling prepareVideosForNextStep on VideoStep ref...");
					const generatedVideoUrl = await videoStepRef.current.prepareVideosForNextStep(handleProgressUpdate);

					setFinalVideoUrl(generatedVideoUrl);
					setCurrentStep((prev) => prev + 1);
					console.log("VideoEditor: Video generation successful. Video URL:", generatedVideoUrl);
					setVideoGenerationStatus("Video successfully generated! Ready for upload.");
				} catch (error: any) {
					console.error("VideoEditor: Error generating video via VideoStep:", error);
					setVideoGenerationError(error.message || "Video generation failed.");
					setVideoGenerationStatus(`Error: ${error.message || "Unknown error"}`);
				} finally {
					setIsGeneratingVideo(false);
					setIsPollingVideoStatus(false);
				}
			} else {
				console.error("VideoEditor: VideoStep ref is not available.");
				setVideoGenerationError("Cannot generate video. Component reference missing.");
				setVideoGenerationStatus("Error: Video component reference missing.");
				setIsGeneratingVideo(false);
				setIsPollingVideoStatus(false);
			}
		} else if (currentStep === 6) {
			if (uploadStepRef.current) {
				uploadStepRef.current.navigateToDashBoard();
			} else {
				console.error("ImageStep ref is not available.");
			}
		} else if (currentStep < steps.length) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const handlePreviousStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
			if (currentStep === 2) {
				setTriggerFetchSummary(false);
				setScriptGenerationError(null);
			}
			if (currentStep === 3) {
				setIsProcessingAudio(false);
				setAudioProcessingError(null);
			}
			if (currentStep === 4) {
				setIsProcessingImages(false);
				setImageProcessingError(null);
			}
			if (currentStep === 5) {
				setIsGeneratingVideo(false);
				setVideoGenerationError(null);
			}
		}
	};

	const handlePromptNext = () => {
		setTriggerFetchSummary(true);
		setScriptGenerationError(null);
		setIsGeneratingScript(true);
	};

	const handleAssetsSelected = useCallback((assets: TimelineAssetsGrouped) => {
		console.log("VideoEditor: Received selected timeline assets from VideoStep", assets);
		setSelectedAssetsForGeneration(assets);
	}, []);

	const tempFinalVideoUrl = "https://res.cloudinary.com/ds9macgdo/video/upload/v1746566038/tkpm/video/1/dbc0531c-6133-4799-87b5-2e79331e5a46.mp4";

	const steps: Step[] = [
		{
			id: 1,
			name: "Prompt",
			component: (props) => (
				<PromptStep
					textContent={textContent}
					setTextContent={setTextContent}
					onGenerationComplete={handleScriptGenerated}
					triggerFetchSummary={triggerFetchSummary}
					setIsGeneratingScript={setIsGeneratingScript}
					setModel={setModel}
					setLanguageOutput={setLanguageOutput}
					{...props}
				/>
			),
		},
		{
			id: 2,
			name: "Text",
			component: (props) => (
				<TextStep
					textContent={textContent}
					setTextContent={setTextContent}
					{...props}
				/>
			),
		},
		{
			id: 3,
			name: "Audio",
			component: (props) => (
				<AudioStep
					ref={audioStepRef}
					textContent={textContent}
					{...props}
				/>
			),
		},
		{
			id: 4,
			name: "Image",
			component: (props) => (
				<ImageStep
					ref={imageStepRef}
					textContent={textContent}
					model={model}
					{...props}
				/>
			),
		},
		{
			id: 5,
			name: "Video",
			component: (props) => (
				<VideoStep
					ref={videoStepRef}
					finalAudioUrl={finalAudioUrl}
					setFinalVideoUrl={setFinalVideoUrl}
					listImages={listImages}
					onAssetsSelected={handleAssetsSelected}
					srtJson={srtJson}
					setIsSegmentMediaDurationMismatch={setIsSegmentMediaDurationMismatch}
					{...props}
				/>
			),
		},
		{
			id: 6,
			name: "Upload",
			component: (props) => (
				<UploadStep
					ref={uploadStepRef}
					finalVideoUrl={finalVideoUrl}
					{...props}
				/>
			),
		},
	];

	const getConnectorClass = (index: number) => {
		const isActive = index < currentStep - 1;
		return `flex-1 mx-2 h-0.5 ${isActive ? "bg-purple-400 dark:bg-purple-600" : "bg-purple-200 dark:bg-slate-600"}`;
	};

	const getStepLabelClass = (stepId: number) => {
		const isActive = currentStep === stepId;
		return `text-sm mt-2 transition-colors duration-300 ${isActive ? "text-purple-600 dark:text-purple-400 font-semibold" : "text-purple-400 dark:text-slate-400"}`;
	};

	const getStepButtonClass = (stepId: number) => {
		const isActive = currentStep >= stepId;
		return `w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${isActive ? "bg-purple-500 dark:bg-purple-600 text-white" : "bg-purple-200 dark:bg-slate-600 text-purple-600 dark:text-slate-300"}`;
	};

	return (
		<div
			className="p-6 rounded-lg w-full mx-auto flex flex-col bg-purple-50 dark:bg-gray-800 border border-purple-200 dark:border-slate-700 shadow-md">
			<div className="mb-6">
				<h3 className="text-purple-600 dark:text-purple-400 mb-4 text-xl">Step</h3>
				<div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm dark:border dark:border-slate-700">
					<div className="relative w-full">
						<div className="absolute top-5 left-0 right-0 h-0.5 z-0 flex justify-between">
							{steps.map((_, index) =>
								index < steps.length - 1 ?
									<div key={`connector-${index}`} className={getConnectorClass(index)} /> : null
							)}
						</div>
						<div className="flex justify-between items-center relative z-10">
							{steps.map((step) => (
								<div key={step.id} className="flex flex-col items-center">
									<button disabled className={getStepButtonClass(step.id)}>
										{step.id}
									</button>
									<span className={getStepLabelClass(step.id)}>{step.name}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
			<div className="mb-4">
				<h3 className="text-purple-600 dark:text-purple-400 mb-4 text-xl">{steps[currentStep - 1].name}</h3>
				{currentStep === 1 && scriptGenerationError && (
					<div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
						<strong>Script Error:</strong> {scriptGenerationError}
					</div>
				)}
				{currentStep === 3 && audioProcessingError && (
					<div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
						<strong>Audio Error:</strong> {audioProcessingError}
					</div>
				)}
				{currentStep === 4 && imageProcessingError && (
					<div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
						<strong>Image Error:</strong> {imageProcessingError}
					</div>
				)}
				{currentStep === 5 && videoGenerationError && (
					<div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
						<strong>Video Error:</strong> {videoGenerationError}
					</div>
				)}
				<div
					className="bg-white p-4 rounded-lg dark:bg-slate-800 shadow-sm dark:border dark:border-slate-700 dark:text-slate-200">
					{steps[currentStep - 1].component({})}
				</div>
			</div>
			<div className="flex justify-end gap-2 mt-4">
				{currentStep > 1 && (
					<button
						onClick={handlePreviousStep}
						className="px-4 py-2 bg-white text-purple-600 rounded-md border border-purple-200 hover:bg-purple-50 cursor-pointer"
						disabled={isProcessingAudio}
					>
						Previous
					</button>
				)}
				{currentStep < steps.length && (
					<button
						onClick={currentStep === 1 ? handlePromptNext : handleNextStep}
						className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] cursor-pointer"
						disabled={
							(currentStep === 1 && isGeneratingScript) ||
							(currentStep === 3 && isProcessingAudio) ||
							(currentStep === 4 && isProcessingImages) ||
							(currentStep === 5 && isSegmentMediaDurationMismatch) ||
							(currentStep === 5 && isGeneratingVideo)
						}
					>
						{(currentStep === 1 && isGeneratingScript) ||
							(currentStep === 3 && isProcessingAudio) ||
							(currentStep === 4 && isProcessingImages) ||
							(currentStep === 5 && isGeneratingVideo) ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							"Next"
						)}
					</button>
				)}
				{currentStep === steps.length && (
					<button
						onClick={handleNextStep}
						className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] cursor-pointer">
						Finish
					</button>
				)}
			</div>
		</div>
	);
};

export default VideoEditor;
