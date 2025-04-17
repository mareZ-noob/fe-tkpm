import { useState, useEffect } from "react";

interface AudioStepProps {
	textContent: string;
	setTextContent: (text: string) => void;
}

const AudioStep = ({
	textContent,
	setTextContent,
}: AudioStepProps) => {
	const voices = [
		{ id: 1, name: "Emma (Female)", language: "en-US", gender: "female" },
		{ id: 2, name: "John (Male)", language: "en-US", gender: "male" },
		{ id: 3, name: "Sophie (Female)", language: "en-GB", gender: "female" },
		{ id: 4, name: "Michael (Male)", language: "en-GB", gender: "male" },
	];

	const [paragraphs, setParagraphs] = useState<string[]>(["", "", "", ""]);
	const [selectedVoices, setSelectedVoices] = useState<number[]>([
		1, 1, 1, 1,
	]);
	const [availableVoices, setAvailableVoices] = useState<
		SpeechSynthesisVoice[]
	>([]);
	const [isReplaying, setIsReplaying] = useState<boolean>(false);

	useEffect(() => {
		const split = textContent
			.split(/\n\n+/)
			.map((p) => p.trim())
			.filter((p) => p)
			.slice(0, 4);
		const padded = [...split];
		while (padded.length < 4) padded.push("");
		setParagraphs(padded);
		setSelectedVoices(Array(4).fill(voices[0].id));
	}, [textContent]);

	useEffect(() => {
		const loadVoices = () => {
			const synthVoices = window.speechSynthesis.getVoices();
			setAvailableVoices(synthVoices);
		};
		loadVoices();
		window.speechSynthesis.onvoiceschanged = loadVoices;
	}, []);

	const getVoice = (customVoice: (typeof voices)[0]) => {
		return availableVoices.find(
			(v) =>
				v.lang === customVoice.language &&
				v.name
					.toLowerCase()
					.includes(customVoice.name.split(" ")[0].toLowerCase())
		);
	};

	const handleVoiceChange = (index: number, voiceId: number) => {
		const newSelections = [...selectedVoices];
		newSelections[index] = voiceId;
		setSelectedVoices(newSelections);
	};

	const handlePlay = (index: number) => {
		const para = paragraphs[index];
		const selectedVoiceId = selectedVoices[index];
		const voiceConfig = voices.find((v) => v.id === selectedVoiceId);
		const matchedVoice = voiceConfig ? getVoice(voiceConfig) : undefined;

		const utterance = new SpeechSynthesisUtterance(para);
		if (matchedVoice) utterance.voice = matchedVoice;
		window.speechSynthesis.speak(utterance);
	};

	const handleReplayAll = async () => {
		setIsReplaying(true);
		for (let i = 0; i < paragraphs.length; i++) {
			await new Promise<void>((resolve) => {
				const utterance = new SpeechSynthesisUtterance(paragraphs[i]);
				const voiceConfig = voices.find(
					(v) => v.id === selectedVoices[i]
				);
				const matchedVoice = voiceConfig
					? getVoice(voiceConfig)
					: undefined;
				if (matchedVoice) utterance.voice = matchedVoice;
				utterance.onend = () => resolve();
				window.speechSynthesis.speak(utterance);
			});
		}
		setIsReplaying(false);
	};

	return (
		<div className="space-y-6">
			{paragraphs.map((para, index) => (
				<div
					key={index}
					className="border border-gray-200 rounded-lg p-4"
				>
					<p className="mb-2 text-sm text-gray-700">{para}</p>
					<div className="flex items-center justify-between">
						<select
							value={selectedVoices[index]}
							onChange={(e) =>
								handleVoiceChange(
									index,
									parseInt(e.target.value)
								)
							}
							className="border border-gray-300 rounded px-2 py-1 text-sm"
							disabled={isReplaying}
						>
							{voices.map((voice) => (
								<option key={voice.id} value={voice.id}>
									{voice.name} - {voice.language}
								</option>
							))}
						</select>
						<button
							onClick={() => handlePlay(index)}
							className={`ml-4 text-sm text-purple-600 hover:underline ${
								isReplaying
									? "opacity-50 cursor-not-allowed"
									: ""
							}`}
							disabled={isReplaying}
						>
							▶️ Play
						</button>
					</div>
				</div>
			))}
			<div className="pt-4">
				<div className="flex items-center gap-4 px-4 py-2 bg-white w-fit">
					<button
						onClick={handleReplayAll}
						disabled={isReplaying}
						className={`text-sm font-medium px-3 py-1 rounded-md transition ${
							isReplaying
								? "bg-purple-100 text-purple-400 cursor-not-allowed"
								: "bg-purple-600 text-white hover:bg-purple-700"
						}`}
					>
						🔁 {isReplaying ? "Replaying..." : "Replay All"}
					</button>

					{isReplaying && (
						<button
							onClick={() => {
								window.speechSynthesis.cancel();
								setIsReplaying(false);
							}}
							className="text-sm font-medium px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
						>
							⏹️ Stop
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default AudioStep;
