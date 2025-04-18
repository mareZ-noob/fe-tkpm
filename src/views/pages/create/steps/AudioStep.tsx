import type React from "react";
import { useState, useEffect, useRef } from "react";
import TtsService from "@/services/tts/TtsService";
import type { VoiceData } from "@/interfaces/voice/VoiceInterface";
import { Loader2, Play, Square } from "lucide-react";

interface AudioStepProps {
	textContent: string;
	setTextContent: (text: string) => void;
}

const AudioStep = ({ textContent }: AudioStepProps) => {
	const [engines, setEngines] = useState<string[]>([]);
	const [selectedEngine, setSelectedEngine] = useState<string>("");
	const [languages, setLanguages] = useState<string[]>([]);
	const [selectedLanguage, setSelectedLanguage] = useState<string>("");
	const [genders] = useState<string[]>(["all", "male", "female"]);
	const [selectedGender, setSelectedGender] = useState<string>("all");
	const [voices, setVoices] = useState<VoiceData[]>([]);

	// State for paragraphs, selected voices, and speeds
	const [paragraphs, setParagraphs] = useState<string[]>(["", "", "", ""]);
	const [selectedVoices, setSelectedVoices] = useState<string[]>(["", "", "", ""]);
	const [selectedSpeeds, setSelectedSpeeds] = useState<number[]>([1, 1, 1, 1]); // Added state for speeds

	// State for audio playback and loading
	const [playingIndex, setPlayingIndex] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
	const [isReplayingAll, setIsReplayingAll] = useState<boolean>(false);

	// Ref for audio element
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const nextPlayIndexRef = useRef<number>(0);

	// Speed options constant
	const speedOptions = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2];

	// Split text into paragraphs and reset voices/speeds
	useEffect(() => {
		const split = textContent
			.split(/\n\n+/)
			.map((p) => p.trim())
			.filter((p) => p)
			.slice(0, 4);
		const padded = [...split];
		while (padded.length < 4) padded.push("");
		setParagraphs(padded);
		setSelectedSpeeds([1, 1, 1, 1]); // Reset speeds to default when text changes

		// Reset selected voices (only if voices are already loaded)
		if (voices.length > 0) {
			const defaultVoice = voices.length > 0 ? voices[0].voice_id : "";
			setSelectedVoices(Array(4).fill(defaultVoice));
		} else {
			setSelectedVoices(Array(4).fill(""));
		}
		handleStop(); // Stop any playback if text changes
	}, [textContent, voices]); // Keep voices dependency for resetting voices based on loaded voices

	// Load engines on component mount
	useEffect(() => {
		const loadEngines = async () => {
			setIsLoading(true);
			try {
				const availableEngines = await TtsService.getEngines();
				setEngines(availableEngines);
				if (availableEngines.length > 0) {
					setSelectedEngine(availableEngines[0]);
				} else {
					setSelectedEngine("");
				}
			} catch (error) {
				console.error("Failed to load engines:", error);
				setEngines([]);
				setSelectedEngine("");
			} finally {
				setIsLoading(false);
			}
		};
		loadEngines();
	}, []);

	// Load languages when engine changes
	useEffect(() => {
		if (!selectedEngine) {
			setLanguages([]);
			setSelectedLanguage("");
			setVoices([]);
			setSelectedVoices(Array(4).fill(""));
			// Keep selected speeds, don't reset them here
			return;
		}

		const loadLanguages = async () => {
			setIsLoading(true);
			setLanguages([]);
			setSelectedLanguage("");
			setVoices([]);
			setSelectedVoices(Array(4).fill(""));
			try {
				const availableLanguages = await TtsService.getLanguages(selectedEngine);
				setLanguages(availableLanguages);
				if (availableLanguages.length > 0) {
					setSelectedLanguage(availableLanguages[0]);
				}
			} catch (error) {
				console.error(`Failed to load languages for engine ${selectedEngine}:`, error);
			} finally {
				setIsLoading(false);
			}
		};

		loadLanguages();
	}, [selectedEngine]);

	// Load voices when engine, language, or gender changes
	useEffect(() => {
		if (!selectedEngine || !selectedLanguage) {
			setVoices([]);
			setSelectedVoices(Array(4).fill(""));
			// Keep selected speeds, don't reset them here
			return;
		}

		const loadVoices = async () => {
			setIsLoading(true);
			setVoices([]);
			try {
				const filteredVoices = await TtsService.filterVoices(selectedEngine, selectedLanguage, selectedGender);
				setVoices(filteredVoices);
				const defaultVoice = filteredVoices.length > 0 ? filteredVoices[0].voice_id : "";
				setSelectedVoices(Array(4).fill(defaultVoice));

			} catch (error) {
				console.error(`Failed to load voices for ${selectedEngine}/${selectedLanguage}/${selectedGender}:`, error);
				setSelectedVoices(Array(4).fill(""));
			} finally {
				setIsLoading(false);
			}
		};

		loadVoices();
	}, [selectedEngine, selectedLanguage, selectedGender]);

	// Cleanup audio on unmount
	useEffect(() => {
		const audio = audioRef.current;
		return () => {
			if (audio) {
				audio.pause();
				if (audio.src && audio.src.startsWith('blob:')) {
					URL.revokeObjectURL(audio.src);
				}
				audio.removeAttribute('src');
				audio.load();
			}
		};
	}, []);


	// --- Event Handlers ---

	const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		handleStop();
		setSelectedEngine(e.target.value);
	};

	const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		handleStop();
		setSelectedLanguage(e.target.value);
	};

	const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		handleStop();
		setSelectedGender(e.target.value);
	};

	const handleVoiceChange = (index: number, voiceId: string) => {
		handleStop();
		const newSelections = [...selectedVoices];
		newSelections[index] = voiceId;
		setSelectedVoices(newSelections);
	};

	// Added: Handle speed change for a paragraph
	const handleSpeedChange = (index: number, speed: number) => {
		handleStop(); // Optional: Stop playback if speed changes, consistent with voice/option changes
		const newSpeeds = [...selectedSpeeds];
		newSpeeds[index] = speed;
		setSelectedSpeeds(newSpeeds);
	};

	// Play a single paragraph
	const playParagraph = async (index: number, onEndCallback?: () => void) => {
		// Speed check in guard clause if speed 0 should prevent playback
		if (!selectedEngine || !selectedVoices[index] || !paragraphs[index]) {
			if (onEndCallback) onEndCallback();
			return;
		}
		if (isLoading || loadingIndex !== null) return;

		if (audioRef.current && !audioRef.current.paused) {
			audioRef.current.pause();
		}

		try {
			setLoadingIndex(index);
			setIsLoading(true);
			setPlayingIndex(null);

			const speed = selectedSpeeds[index];
			const audioUrl = await TtsService.generateTts(selectedEngine, paragraphs[index], selectedVoices[index], speed);

			if (!audioRef.current) {
				audioRef.current = new Audio();
			} else {
				if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
					URL.revokeObjectURL(audioRef.current.src);
				}
			}

			const currentAudio = audioRef.current;
			currentAudio.onplay = null;
			currentAudio.onended = null;
			currentAudio.onerror = null;

			currentAudio.onplay = () => {
				setPlayingIndex(index);
				setIsLoading(false);
				setLoadingIndex(null);
			};

			currentAudio.onended = () => {
				setPlayingIndex(null);
				if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
					URL.revokeObjectURL(currentAudio.src);
				}
				if (onEndCallback) {
					onEndCallback();
				} else {
					setIsReplayingAll(false);
				}
			};

			currentAudio.onerror = (e) => {
				console.error(`Error playing audio for index ${index}:`, e);
				setPlayingIndex(null);
				setIsLoading(false);
				setLoadingIndex(null);
				if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
					URL.revokeObjectURL(currentAudio.src);
				}
				if (onEndCallback) {
					onEndCallback();
				} else {
					setIsReplayingAll(false);
				}
			};

			currentAudio.src = audioUrl;
			currentAudio.play().catch(error => {
				console.error(`Error initiating playback for index ${index}:`, error);
				setPlayingIndex(null);
				setIsLoading(false);
				setLoadingIndex(null);
				if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
					URL.revokeObjectURL(currentAudio.src);
				}
				if (onEndCallback) onEndCallback();
				else setIsReplayingAll(false);
			});

		} catch (error) {
			console.error(`Failed to generate or play audio for paragraph ${index}:`, error);
			setIsLoading(false);
			setLoadingIndex(null);
			setPlayingIndex(null);
			if (onEndCallback) {
				onEndCallback();
			} else {
				setIsReplayingAll(false);
			}
		}
	};

	const handlePlay = (index: number) => {
		if (isReplayingAll) return;
		setIsReplayingAll(false);
		nextPlayIndexRef.current = 0;
		playParagraph(index);
	};

	// Stop audio playback
	const handleStop = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.onplay = null;
			audioRef.current.onended = null;
			audioRef.current.onerror = null;
			if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
				URL.revokeObjectURL(audioRef.current.src);
			}
			audioRef.current.removeAttribute('src');
			audioRef.current.load();
		}
		setPlayingIndex(null);
		setIsLoading(false);
		setLoadingIndex(null);
		setIsReplayingAll(false);
		nextPlayIndexRef.current = 0;
	};

	// Play the next paragraph in the sequence
	const playNextParagraph = () => {
		let nextIndex = nextPlayIndexRef.current;
		// Check for valid voice selection for robustness
		while (nextIndex < paragraphs.length && (!paragraphs[nextIndex] || !selectedVoices[nextIndex])) {
			nextIndex++;
		}

		if (nextIndex >= paragraphs.length) {
			setIsReplayingAll(false);
			nextPlayIndexRef.current = 0;
			return;
		}

		nextPlayIndexRef.current = nextIndex + 1;
		playParagraph(nextIndex, playNextParagraph);
	};

	const handleReplayAll = () => {
		if (isLoading || loadingIndex !== null || playingIndex !== null || isReplayingAll) return;

		handleStop(); // Clean state before starting
		setIsReplayingAll(true);
		nextPlayIndexRef.current = 0;

		let firstValidIndex = -1;
		for (let i = 0; i < paragraphs.length; i++) {
			if (paragraphs[i] && selectedVoices[i]) { // Valid voice is selected
				firstValidIndex = i;
				break;
			}
		}

		if (firstValidIndex !== -1) {
			nextPlayIndexRef.current = firstValidIndex + 1;
			playParagraph(firstValidIndex, playNextParagraph);
		} else {
			setIsReplayingAll(false);
			nextPlayIndexRef.current = 0;
		}
	};


	const canReplayAll = !isReplayingAll && !isLoading && playingIndex === null && paragraphs.some((p, i) => p && selectedVoices[i]);
	const showStopButton = playingIndex !== null || isReplayingAll || loadingIndex !== null; // Show stop if playing, replaying, or loading specific track

	return (
		<div className="space-y-6">
			{/* TTS Options */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
				{/* Engine Select */}
				<div>
					<label htmlFor="engine-select" className="block text-sm font-medium text-gray-700 mb-1">Engine</label>
					<select
						id="engine-select"
						value={selectedEngine}
						onChange={handleEngineChange}
						className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
						disabled={isLoading || engines.length === 0}
					>
						{engines.length === 0 && !isLoading && <option value="">No engines</option>}
						{engines.length === 0 && isLoading && <option value="">Loading...</option>}
						{engines.map((engine) => <option key={engine} value={engine}>{engine}</option>)}
					</select>
				</div>
				{/* Language Select */}
				<div>
					<label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">Language</label>
					<select
						id="language-select"
						value={selectedLanguage}
						onChange={handleLanguageChange}
						className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
						disabled={isLoading || !selectedEngine || languages.length === 0}
					>
						{!selectedEngine && <option value="">Select engine</option>}
						{selectedEngine && languages.length === 0 && !isLoading && <option value="">No languages</option>}
						{selectedEngine && languages.length === 0 && isLoading && <option value="">Loading...</option>}
						{languages.map((language) => <option key={language} value={language}>{language}</option>)}
					</select>
				</div>
				{/* Gender Select */}
				<div>
					<label htmlFor="gender-select" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
					<select
						id="gender-select"
						value={selectedGender}
						onChange={handleGenderChange}
						className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
						// Disable if loading globally, or no language selected, or (if voices loaded) no voices found.
						disabled={isLoading || !selectedLanguage || (voices.length === 0 && !isLoading)} // Allow change even if loading *voices* specifically
					>
						{genders.map((gender) => (
							<option key={gender} value={gender}>
								{gender.charAt(0).toUpperCase() + gender.slice(1)}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Paragraphs */}
			{paragraphs.map((para, index) => {
				const isCurrentLoading = loadingIndex === index;
				const isCurrentPlaying = playingIndex === index;
				// Common disable condition for paragraph controls
				const isDisabled = isLoading || isReplayingAll || !para;
				// Specific condition for play button
				const canPlayThis = !!para && !!selectedVoices[index] && !isLoading && !isReplayingAll && playingIndex === null;

				return (
					<div key={index} className={`border border-gray-200 rounded-lg p-4 transition-colors duration-300 ${isCurrentLoading ? 'bg-purple-50' : isCurrentPlaying ? 'bg-green-50' : 'bg-white'}`}>
						<p className="mb-3 text-sm text-gray-700 min-h-[20px]">
							{para || <span className="italic text-gray-400">No content for this paragraph</span>}
						</p>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							{/* Group for Selects */}
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-grow">
								{/* Voice Select */}
								<div className="flex-1 min-w-[150px]">
									<label htmlFor={`voice-select-${index}`} className="sr-only">Voice</label>
									<select
										id={`voice-select-${index}`}
										value={selectedVoices[index]}
										onChange={(e) => handleVoiceChange(index, e.target.value)}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
										disabled={isDisabled || voices.length === 0}
									>
										{!selectedLanguage && <option value="">Select language</option>}
										{selectedLanguage && voices.length === 0 && !isLoading && <option value="">No voices</option>}
										{selectedLanguage && voices.length === 0 && isLoading && <option value="">Loading...</option>}
										{voices.map((voice) => (
											<option key={voice.voice_id} value={voice.voice_id}>
												{voice.display_name || voice.voice_id} ({voice.gender})
											</option>
										))}
									</select>
								</div>

								{/* Speed Select (NEW) */}
								<div className="flex-shrink-0">
									<label htmlFor={`speed-select-${index}`} className="sr-only">Speed</label>
									<select
										id={`speed-select-${index}`}
										value={selectedSpeeds[index]}
										onChange={(e) => handleSpeedChange(index, parseFloat(e.target.value))}
										className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
										disabled={isDisabled} // Disable if general loading, replaying, or no text
									>
										{speedOptions.map((speed) => (
											<option key={speed} value={speed}>
												{speed}x
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Play/Stop Button Group */}
							<div className="flex items-center justify-end sm:justify-start flex-shrink-0">
								{isCurrentLoading ? (
									<button
										className="flex items-center justify-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md w-[90px] h-[38px]" // Adjusted height to match select py-2
										disabled
									>
										<Loader2 className="h-4 w-4 animate-spin" />
										<span>Loading</span>
									</button>
								) : isCurrentPlaying ? (
									<button
										onClick={handleStop}
										className="flex items-center justify-center gap-1 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition w-[90px] h-[38px]" // Adjusted height
									>
										<Square className="h-4 w-4 fill-current" />
										<span>Stop</span>
									</button>
								) : (
									<button
										onClick={() => handlePlay(index)}
										className={`flex items-center justify-center gap-1 px-3 py-1 text-sm rounded-md transition w-[90px] h-[38px] ${ // Adjusted height
											!canPlayThis
												? "bg-gray-200 text-gray-500 cursor-not-allowed"
												: "bg-purple-600 text-white hover:bg-purple-700"
											}`}
										disabled={!canPlayThis}
										title={!para ? "No text" : !selectedVoices[index] ? "No voice" : isLoading ? "Loading..." : isReplayingAll ? "Replay active" : playingIndex !== null ? "Playing..." : "Play"}
									>
										<Play className="h-4 w-4 fill-current" />
										<span>Play</span>
									</button>
								)}
							</div>
						</div>
					</div>
				);
			})}

			{/* Action Buttons */}
			<div className="pt-4 flex items-center gap-4">
				<button
					onClick={handleReplayAll}
					disabled={!canReplayAll}
					className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition ${!canReplayAll
						? "bg-purple-100 text-purple-400 cursor-not-allowed"
						: "bg-purple-600 text-white hover:bg-purple-700"
						}`}
					title={!paragraphs.some((p, i) => p && selectedVoices[i]) ? "Add text/voices" : (isLoading || playingIndex !== null || isReplayingAll) ? "Busy..." : "Play all"}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
						<path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.204 2.776l.71-.71a4.5 4.5 0 0 0 7.416-2.288l-.71.71a3.5 3.5 0 0 1-5.898-1.713l.71-.71a2.5 2.5 0 0 0 4.212-1.224l-.71.71a1.5 1.5 0 1 1-2.121-2.121l.71-.71-1.415-1.414-.709.709a5.5 5.5 0 0 1 8.827 3.347l-.71.71Zm-2.121-2.121a1.5 1.5 0 1 1-2.121-2.121l.71-.71 1.414 1.414-.707.707a3.5 3.5 0 0 1-4.389 1.003l.71-.71a2.5 2.5 0 0 0 3.01.717l-.71.71a1.5 1.5 0 1 1-2.121-2.121l.71-.71-1.414-1.414-.71.71a5.5 5.5 0 0 1 7.166 5.834l.71.71a1.5 1.5 0 1 1-2.122 2.121l-.71-.71.707-.707a3.5 3.5 0 0 1-1.003-4.389l.71.71a2.5 2.5 0 0 0-.717-3.01l.71-.71Z" clipRule="evenodd" />
					</svg>
					<span>Replay All</span>
				</button>

				{showStopButton && (
					<button
						onClick={handleStop}
						className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
						title="Stop current playback/loading"
					>
						<Square className="h-4 w-4 fill-current" />
						<span>Stop</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default AudioStep;

