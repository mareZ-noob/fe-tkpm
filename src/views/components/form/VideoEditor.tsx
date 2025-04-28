import React, { useEffect, useRef, useState } from "react";
import { Loader2, VideoIcon } from "lucide-react";
import AudioStep, { AudioStepHandle } from "@/pages/create/steps/AudioStep";
import VideoStep from "@/pages/create/steps/VideoStep";
import TextStep from "@/pages/create/steps/TextStep";
import PromptStep from "@/pages/create/steps/PromptStep";
import api from "@/configs/axios.config";
import DocumentService from "@/services/document/DocumentService";
import { DocumentCreate } from "@/interfaces/document/DocumentInterface";

type Step = {
	id: number;
	name: string;
	component: (props: any) => React.ReactNode;
};

const VideoEditor = () => {
	const [currentStep, setCurrentStep] = useState(1);
	const [textContent, setTextContent] = useState("");
	const [triggerFetchSummary, setTriggerFetchSummary] = useState(false);
	const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
	const [isProcessingAudio, setIsProcessingAudio] = useState(false);
	const [audioProcessingError, setAudioProcessingError] = useState<string | null>(null);
	const [isGeneratingScript, setIsGeneratingScript] = useState(false);
	const audioStepRef = useRef<AudioStepHandle>(null);

	useEffect(() => {
		const handleResetTrigger = () => {
			setTriggerFetchSummary(false);
			setIsGeneratingScript(false);
		};
		window.addEventListener('resetTriggerFetchSummary', handleResetTrigger);

		return () => {
			window.removeEventListener('resetTriggerFetchSummary', handleResetTrigger);
		};
	}, []);

	const saveDocument = async () => {
		try {
			const payload: DocumentCreate = {
				content: textContent,
			}
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

		if (validBlobs === 0) {
			throw new Error("No valid audio segments found to process.");
		}

		console.log("Sending audio blobs to backend:", formData);

		const response = await api.post('/tts/concatenate-and-upload', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});

		if (response.status === 200 && response.data?.cloudinary_url) {
			return response.data.cloudinary_url;
		} else {
			throw new Error(response.data?.msg || "Failed to process audio on the server.");
		}
	};

	const handleNextStep = async () => {
		setAudioProcessingError(null);

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

					const url = await concatenateAndUploadAudio(audioBlobs.filter(b => b !== null) as Blob[]);

					setFinalAudioUrl(url);
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
		} else if (currentStep < steps.length) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const handlePreviousStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
			if (currentStep === 2) {
				setTriggerFetchSummary(false);
			}
		}
	};

	const handlePromptNext = () => {
		setTriggerFetchSummary(true);
	};

	const steps: Step[] = [
		{
			id: 1,
			name: "Prompt",
			component: (props) => (
				<PromptStep
					textContent={textContent}
					setTextContent={setTextContent}
					onNext={handleNextStep}
					triggerFetchSummary={triggerFetchSummary}
					setIsGeneratingScript={setIsGeneratingScript}
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
					setTextContent={setTextContent}
					{...props}
				/>
			),
		},
		{
			id: 4,
			name: "Video",
			component: (props) => (
				<VideoStep
					textContent={textContent}
					setTextContent={setTextContent}
					finalAudioUrl={finalAudioUrl}
					{...props}
				/>
			),
		},
	];

	const getConnectorClass = (index: number) => {
		const isActive = index < currentStep - 1;
		return `flex-1 mx-2 h-0.5 ${isActive
			? "bg-purple-400 dark:bg-purple-600"
			: "bg-purple-200 dark:bg-slate-600"
			}`;
	};

	const getStepLabelClass = (stepId: number) => {
		const isActive = currentStep === stepId;
		return `text-sm mt-2 transition-colors duration-300 ${isActive
			? "text-purple-600 dark:text-purple-400 font-semibold"
			: "text-purple-400 dark:text-slate-400"
			}`;
	};

	const getStepButtonClass = (stepId: number) => {
		const isActive = currentStep >= stepId;
		return `w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${isActive
			? "bg-purple-500 dark:bg-purple-600 text-white"
			: "bg-purple-200 dark:bg-slate-600 text-purple-600 dark:text-slate-300"
			}`;
	};

	return (
		<div className="p-6 rounded-lg w-full mx-auto flex flex-col bg-purple-50 dark:bg-slate-900">
			<div className="flex items-center gap-2 mb-4">
				<VideoIcon className="text-purple-600 dark:text-purple-400" size={24} />
				<h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400">Video</h2>
			</div>

			<div className="mb-6">
				<h3 className="text-purple-600 dark:text-purple-400 mb-4">Step</h3>
				<div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm dark:border dark:border-slate-700">
					<div className="relative w-full">
						{/* Connector Lines */}
						<div className="absolute top-5 left-0 right-0 h-0.5 z-0 flex justify-between">
							{steps.map((_, index) =>
								index < steps.length - 1 ? (
									<div
										key={`connector-${index}`}
										className={getConnectorClass(index)}
									/>
								) : null
							)}
						</div>

						<div className="flex justify-between items-center relative z-10">
							{steps.map((step) => (
								<div
									key={step.id}
									className="flex flex-col items-center"
								>
									<button
										disabled
										className={getStepButtonClass(step.id)}
									>
										{step.id}
									</button>
									<span
										className={getStepLabelClass(step.id)}
									>
										{step.name}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="mb-4">
				<h3 className="text-purple-600 mb-4">
					{steps[currentStep - 1].name}
				</h3>
				{currentStep === 3 && audioProcessingError && (
					<div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
						<strong>Audio Error:</strong> {audioProcessingError}
					</div>
				)}
				<div className="bg-white p-4 rounded-lg">
					{steps[currentStep - 1].component({})}
				</div>
			</div>

			<div className="flex justify-end gap-2 mt-4">
				{currentStep > 1 && (
					<button
						onClick={handlePreviousStep}
						className="px-4 py-2 bg-white text-purple-600 rounded-md border border-purple-200 hover:bg-purple-50"
						disabled={isProcessingAudio}
					>
						Previous
					</button>
				)}
				{currentStep < steps.length && (
					<button
						onClick={currentStep === 1 ? handlePromptNext : handleNextStep}
						className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
						disabled={isProcessingAudio || (currentStep === 1 && isGeneratingScript)}
					>
						{(isProcessingAudio && currentStep === 3) || (isGeneratingScript && currentStep === 1) ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							"Next"
						)}
					</button>
				)}
				{currentStep === steps.length && (
					<button className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
						Generate Video
					</button>
				)}
			</div>
		</div>
	);
};

export default VideoEditor;
