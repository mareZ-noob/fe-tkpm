"use client";

import React, { useState } from "react";
import { VideoIcon } from "lucide-react";
import AudioStep from "@/pages/create/steps/AudioStep";
import StylesStep from "@/pages/create/steps/StylesStep";
import VideoStep from "@/pages/create/steps/VideoStep";
import TextStep from "@/pages/create/steps/TextStep";
import PromptStep from "@/pages/create/steps/PromptStep";

type Step = {
	id: number;
	name: string;
	component: (props: any) => React.ReactNode;
};

export default function VideoEditor() {
	const [currentStep, setCurrentStep] = useState(1);
	const [textContent, setTextContent] = useState("");
	const [duration, setDuration] = useState(30);
	const [triggerFetchSummary, setTriggerFetchSummary] = useState(false);

	const token = localStorage.getItem("access_token");
	console.log("Token:", token);

	const saveTextToDB = async () => {
		try {
			const response = await fetch("http://localhost:5000/create/text", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					content: textContent,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save text");
			}

			console.log("Text saved successfully!");
		} catch (error) {
			console.error("Error saving text:", error);
		}
	};

	const handleNextStep = async () => {
		if (currentStep === 2) {
			await saveTextToDB();
		}

		if (currentStep < steps.length) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const handlePreviousStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
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
					setTextContent={setTextContent}
					onNext={handleNextStep}
					triggerFetchSummary={triggerFetchSummary}
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
					duration={duration}
					setDuration={setDuration}
					{...props}
				/>
			),
		},

		{
			id: 3,
			name: "Audio",
			component: (props) => <AudioStep {...props} />,
		},
		{
			id: 4,
			name: "Video",
			component: (props) => <VideoStep {...props} />,
		},
	];

	return (
		<div className="bg-purple-50 p-6 rounded-lg h-full min-h-[1050px] w-full mx-auto">
			<div className="flex items-center gap-2 mb-4">
				<VideoIcon className="text-purple-600" size={24} />
				<h2 className="text-xl font-semibold text-purple-600">Video</h2>
			</div>

			<div className="mb-6">
				<h3 className="text-purple-600 mb-4">Step</h3>
				<div className="bg-white p-4 rounded-lg">
					<div className="relative w-full">
						{/* Đường nối ngang giữa các ô tròn */}
						<div className="absolute top-5 left-0 right-0 h-0.5 bg-purple-200 z-0 flex justify-between">
							{steps.map((_, index) =>
								index < steps.length - 1 ? (
									<div
										key={`connector-${index}`}
										className={`flex-1 mx-2 h-0.5 ${
											index < currentStep - 1
												? "bg-purple-400"
												: "bg-purple-200"
										}`}
									/>
								) : null
							)}
						</div>

						{/* Các nút step */}
						<div className="flex justify-between items-center relative z-10">
							{steps.map((step) => (
								<div
									key={step.id}
									className="flex flex-col items-center"
								>
									<button
										onClick={() => setCurrentStep(step.id)}
										className={`w-10 h-10 rounded-full flex items-center justify-center ${
											currentStep >= step.id
												? "bg-purple-400 text-white"
												: "bg-purple-200 text-purple-600"
										}`}
									>
										{step.id}
									</button>
									<span
										className={`text-sm mt-2 ${
											currentStep === step.id
												? "text-purple-600 font-medium"
												: "text-purple-400"
										}`}
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
				<div className="bg-white p-4 rounded-lg">
					{steps[currentStep - 1].component({})}
				</div>
			</div>

			<div className="flex justify-end gap-2 mt-4">
				{currentStep > 1 && (
					<button
						onClick={handlePreviousStep}
						className="px-4 py-2 bg-white text-purple-600 rounded-md border border-purple-200 hover:bg-purple-50"
					>
						Previous
					</button>
				)}
				{currentStep < steps.length && (
					<button
						onClick={
							currentStep === 1
								? handlePromptNext
								: handleNextStep
						}
						className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
					>
						Next
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
}
