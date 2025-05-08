import type React from "react";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import TtsService from "@/services/tts/TtsService";
import type { VoiceData } from "@/interfaces/voice/VoiceInterface";
import { Loader2, Play, Square, UploadCloud, XCircle } from "lucide-react";
import clsx from "clsx";

interface AudioStepProps {
	textContent: string;
}

export interface AudioStepHandle {
	getAudioBlobsForUpload: () => Promise<(Blob | null)[]>;
}

const AudioStep = forwardRef<AudioStepHandle, AudioStepProps>(({ textContent }, ref) => {
	const [engines, setEngines] = useState<string[]>([]);
	const [selectedEngine, setSelectedEngine] = useState<string>("");
	const [languages, setLanguages] = useState<string[]>([]);
	const [selectedLanguage, setSelectedLanguage] = useState<string>("");
	const [genders] = useState<string[]>(["all", "male", "female"]);
	const [selectedGender, setSelectedGender] = useState<string>("all");
	const [voices, setVoices] = useState<VoiceData[]>([]);
	const [paragraphs, setParagraphs] = useState<string[]>(["", "", "", ""]);
	const [selectedVoices, setSelectedVoices] = useState<string[]>(["", "", "", ""]);
	const [selectedSpeeds, setSelectedSpeeds] = useState<number[]>([1, 1, 1, 1]);
	const [playingIndex, setPlayingIndex] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isGenerating, setIsGenerating] = useState<boolean>(false);
	const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
	const [isReplayingAll, setIsReplayingAll] = useState<boolean>(false);
	const [uploadedAudioUrls, setUploadedAudioUrls] = useState<(string | null)[]>(Array(4).fill(null));

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const nextPlayIndexRef = useRef<number>(0);
	const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const speedOptions = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2];
	const MAX_PARAGRAPHS = 10;
	const globalDisabled = isLoading || isGenerating || isReplayingAll || playingIndex !== null || loadingIndex !== null;

	// Split text, reset voices/speeds/uploads
	useEffect(() => {
		const split = textContent
			.split(/\n\n+/)
			.map((p) => p.trim())
			.filter((p) => p)
			.slice(0, MAX_PARAGRAPHS);
		const padded = [...split];
		while (padded.length < MAX_PARAGRAPHS) padded.push("");
		setParagraphs(padded);
		setSelectedSpeeds(Array(MAX_PARAGRAPHS).fill(1)); // Reset speeds

		// Clean up any existing uploaded audio URLs before resetting
		uploadedAudioUrls.forEach(url => {
			if (url) URL.revokeObjectURL(url);

		});
		setUploadedAudioUrls(Array(MAX_PARAGRAPHS).fill(null)); // Reset uploads

		if (voices.length > 0) {
			const defaultVoice = voices.length > 0 ? voices[0].voice_id : "";
			setSelectedVoices(Array(MAX_PARAGRAPHS).fill(defaultVoice));
		} else {
			setSelectedVoices(Array(MAX_PARAGRAPHS).fill(""));
		}
		handleStop();
		// Reset file input values visually
		fileInputRefs.current.forEach(input => {
			if (input) input.value = "";
		});
	}, [textContent, voices]);

	// Load engines
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

	// Load languages
	useEffect(() => {
		if (!selectedEngine) {
			setLanguages([]);
			setSelectedLanguage("");
			setVoices([]);
			setSelectedVoices(Array(MAX_PARAGRAPHS).fill(""));
			return;
		}

		const loadLanguages = async () => {
			setIsLoading(true);
			setLanguages([]);
			setSelectedLanguage("");
			setVoices([]);
			setSelectedVoices(Array(MAX_PARAGRAPHS).fill(""));

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

	// Load voices
	useEffect(() => {
		if (!selectedEngine || !selectedLanguage) {
			setVoices([]);
			setSelectedVoices(Array(MAX_PARAGRAPHS).fill(""));
			return;
		}

		const loadVoices = async () => {
			setIsLoading(true);
			setVoices([]);
			try {
				const filteredVoices = await TtsService.filterVoices(selectedEngine, selectedLanguage, selectedGender);
				setVoices(filteredVoices);
				const defaultVoice = filteredVoices.length > 0 ? filteredVoices[0].voice_id : "";
				// Only reset voices if they haven't been manually set for an upload yet
				// This logic might need refinement depending on desired UX
				setSelectedVoices(prev => prev.map((v, i) => uploadedAudioUrls[i] ? v : defaultVoice));
			} catch (error) {
				console.error(`Failed to load voices for ${selectedEngine}/${selectedLanguage}/${selectedGender}:`, error);
				setSelectedVoices(Array(MAX_PARAGRAPHS).fill(""));
			} finally {
				setIsLoading(false);
			}
		};

		loadVoices();
	}, [selectedEngine, selectedLanguage, selectedGender]);

	// Cleanup audio element and TTS blob URLs on unmount
	useEffect(() => {
		const audio = audioRef.current;
		return () => {
			if (audio) {
				audio.pause();
				const currentSrc = audio.src;

				if (currentSrc && currentSrc.startsWith('blob:')) {
					// Only revoke if it's a TTS blob, not an uploaded file object URL
					// This distinction is tricky without more state; assume stop/unmount should revoke blobs.
					// Uploaded URLs are handled separately.
					URL.revokeObjectURL(currentSrc);
				}
				audio.removeAttribute('src');
				audio.load();
			}
		};
	}, []);

	// Cleanup uploaded audio object URLs on unmount or when they change
	useEffect(() => {
		// This captures the URLs when the effect runs
		const urlsToClean = uploadedAudioUrls.filter(url => url !== null) as string[];
		return () => {
			// This runs when the component unmounts or before the effect runs again
			urlsToClean.forEach(url => URL.revokeObjectURL(url));
		};
	}, [uploadedAudioUrls]);

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

		handleClearUpload(index, false);

		const newSelections = [...selectedVoices];
		newSelections[index] = voiceId;
		setSelectedVoices(newSelections);
	};

	const handleSpeedChange = (index: number, speed: number) => {
		handleStop();

		const newSpeeds = [...selectedSpeeds];
		newSpeeds[index] = speed;
		setSelectedSpeeds(newSpeeds);
	};

	const handleFileUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (file.type !== 'audio/mpeg') {
			alert('Invalid file type. Please upload an MP3 file.');
			if (event.target) event.target.value = '';
			return;
		}
		handleStop(); // Stop any current playback

		// Revoke previous object URL for this index if it exists
		const currentUrl = uploadedAudioUrls[index];
		if (currentUrl) {
			URL.revokeObjectURL(currentUrl);
		}

		// Create a new object URL
		const objectUrl = URL.createObjectURL(file);

		// Update the state
		const newUrls = [...uploadedAudioUrls];
		newUrls[index] = objectUrl;
		setUploadedAudioUrls(newUrls);

		// Optionally clear the file input value after processing
		// if (event.target) event.target.value = '';
		// Note: Clearing value immediately might feel abrupt if upload fails later
		// But required if you want onChange to fire for the *same* file again.
		// Let's clear it here for re-upload capability.
		if (event.target) event.target.value = '';
		// Optionally, deselect TTS voice when uploading to avoid confusion
		// const newSelections = [...selectedVoices];
		// newSelections[index] = ""; // Or a placeholder value
		// setSelectedVoices(newSelections);
	};

	const handleClearUpload = (index: number, shouldStopPlayback = true) => {
		if (shouldStopPlayback) {
			handleStop();
		}

		const currentUrl = uploadedAudioUrls[index];

		if (currentUrl) {
			URL.revokeObjectURL(currentUrl);
			const newUrls = [...uploadedAudioUrls];
			newUrls[index] = null;
			setUploadedAudioUrls(newUrls);

			// Reset file input visually if ref exists
			if (fileInputRefs.current[index]) {
				fileInputRefs.current[index]!.value = "";
			}

			// Restore default voice if needed
			if (voices.length > 0 && !selectedVoices[index]) {
				const defaultVoice = voices[0].voice_id;
				const newSelections = [...selectedVoices];
				newSelections[index] = defaultVoice;
				setSelectedVoices(newSelections);
			}
		}
	};

	const playParagraph = async (index: number, onEndCallback?: () => void) => {
		const hasText = !!paragraphs[index];
		const hasTtsVoice = !!selectedVoices[index];
		const hasUploadedAudio = !!uploadedAudioUrls[index];

		if (!hasText || (!hasTtsVoice && !hasUploadedAudio)) {
			console.warn(`Skipping paragraph ${index}: No text or no audio source (TTS/Upload).`);
			if (onEndCallback) onEndCallback();
			return;
		}

		if ((isLoading || loadingIndex !== null || playingIndex !== null) && playingIndex !== index) return;

		if (audioRef.current && !audioRef.current.paused) {
			audioRef.current.pause();
		}

		// Set loading state specifically for this paragraph
		setLoadingIndex(index);
		setIsLoading(true);
		setPlayingIndex(null);

		try {
			let audioUrl: string | null = null;
			let isUploadedAudio = false;

			// Determine Audio Source
			if (hasUploadedAudio) {
				audioUrl = uploadedAudioUrls[index];
				isUploadedAudio = true;
				console.log(`Playing uploaded audio for paragraph ${index}`);
			} else if (hasTtsVoice) {
				// Generate TTS only if no uploaded audio exists for this index
				console.log(`Generating TTS for paragraph ${index}`);
				const speed = selectedSpeeds[index];
				try {
					audioUrl = await TtsService.generateTts(selectedEngine, paragraphs[index], selectedVoices[index], speed);
				} catch (ttsError) {
					console.error(`TTS Generation failed for index ${index}:`, ttsError);
					throw ttsError;
				}
			}

			if (!audioUrl) {
				throw new Error("Could not determine audio source.");
			}

			// Setup Audio Element
			if (!audioRef.current) {
				audioRef.current = new Audio();
			}
			const currentAudio = audioRef.current;

			// Clean up previous *blob* source if it exists before setting new source
			if (currentAudio.src && currentAudio.src.startsWith('blob:') && currentAudio.src !== audioUrl) {
				URL.revokeObjectURL(currentAudio.src);
			}

			// Assign Event Handlers
			// Remove previous listeners to avoid leaks or double triggers
			currentAudio.onplay = null;
			currentAudio.onended = null;
			currentAudio.onerror = null;
			currentAudio.onloadeddata = null;

			currentAudio.onplay = () => {
				setPlayingIndex(index);
				setIsLoading(false); // Stop general loading
				setLoadingIndex(null); // Stop specific loading
			};

			currentAudio.onended = () => {
				setPlayingIndex(null);

				// Crucially, only revoke the URL if it was a TTS blob
				if (!isUploadedAudio && currentAudio.src && currentAudio.src.startsWith('blob:')) {
					URL.revokeObjectURL(currentAudio.src);
					console.log(`Revoked TTS blob URL for index ${index}`);
				}

				// Clear src attribute after revoking or finishing uploaded playback
				currentAudio.removeAttribute('src'); // Good practice
				currentAudio.load(); // Reset audio element state

				if (onEndCallback) {
					onEndCallback();
				} else {
					setIsReplayingAll(false); // Ensure replay flag is cleared if single play ends
				}
			};

			currentAudio.onerror = (e) => {
				console.error(`Error playing audio for index ${index}:`, e);
				setPlayingIndex(null);
				setIsLoading(false);
				setLoadingIndex(null);

				// Attempt to revoke URL if it was a TTS blob
				if (!isUploadedAudio && currentAudio.src && currentAudio.src.startsWith('blob:')) {
					URL.revokeObjectURL(currentAudio.src);
					console.log(`Revoked TTS blob URL on error for index ${index}`);
				}

				currentAudio.removeAttribute('src');
				currentAudio.load();

				if (onEndCallback) {
					onEndCallback(); // Still proceed in replay sequence on error
				} else {
					setIsReplayingAll(false);
				}
			};

			// Play
			currentAudio.src = audioUrl;
			// Playback Rate only works reliably for TTS. For uploaded, it depends on browser/encoding.
			// We could try setting it, but it might not work. Speed dropdown is disabled for uploads UI-wise.
			currentAudio.playbackRate = isUploadedAudio ? 1 : selectedSpeeds[index]; // Set speed for TTS

			currentAudio.play().catch(error => {
				console.error(`Error initiating playback for index ${index}:`, error);
				// Ensure state cleanup even if .play() rejects immediately
				setPlayingIndex(null);
				setIsLoading(false);
				setLoadingIndex(null);

				// Attempt to revoke URL if it was a TTS blob
				if (!isUploadedAudio && currentAudio.src && currentAudio.src.startsWith('blob:')) {
					URL.revokeObjectURL(currentAudio.src);
				}
				currentAudio.removeAttribute('src');
				currentAudio.load();

				if (onEndCallback) onEndCallback();
				else setIsReplayingAll(false);
			});
		} catch (error) {
			console.error(`Failed to prepare or play audio for paragraph ${index}:`, error);
			setIsLoading(false);
			setLoadingIndex(null);
			setPlayingIndex(null);

			if (onEndCallback) {
				onEndCallback(); // Move to next item in replay sequence even on error
			} else {
				setIsReplayingAll(false);
			}
		}
	};

	const getAudioBlobsForUpload = async (): Promise<(Blob | null)[]> => {
		setIsGenerating(true);
		handleStop();

		const blobPromises = paragraphs.map(async (para, index): Promise<Blob | null> => {
			const hasText = !!para;
			const hasTtsVoice = !!selectedVoices[index];
			const hasUploadedAudio = !!uploadedAudioUrls[index];

			if (!hasText) return null;

			try {
				if (hasUploadedAudio && uploadedAudioUrls[index]) {
					console.log(`Workspaceing blob for uploaded audio index ${index}`);
					const response = await fetch(uploadedAudioUrls[index]!);
					if (!response.ok) {
						throw new Error(`Failed to fetch uploaded audio blob for index ${index}: ${response.statusText}`);
					}
					return await response.blob();
				} else if (hasTtsVoice && selectedEngine && selectedVoices[index]) {
					// Generate TTS blob using the new service method
					console.log(`Generating TTS blob for index ${index}`);
					const speed = selectedSpeeds[index];
					return await TtsService.generateTtsBlob(selectedEngine, para, selectedVoices[index], speed);
				} else {
					console.log(`No audio source for index ${index}`);
					return null;
				}
			} catch (error) {
				console.error(`Error getting audio blob for index ${index}:`, error);
				// Maybe notify the user about the specific failure
				// Return null to indicate failure for this segment
				return null;
			}
		});

		try {
			const results = await Promise.all(blobPromises);
			return results;
		} catch (error) {
			console.error("Error processing audio blobs:", error);
			throw new Error("Failed to prepare one or more audio segments.");
		} finally {
			setIsGenerating(false);
		}
	};

	// Expose the function via the ref
	useImperativeHandle(ref, () => ({
		getAudioBlobsForUpload,
	}));


	const handlePlay = (index: number) => {
		if (isReplayingAll || isLoading || loadingIndex !== null) return; // Prevent overlap
		setIsReplayingAll(false); // Ensure single play mode
		nextPlayIndexRef.current = 0; // Reset replay sequence
		playParagraph(index);

	};

	const handleStop = () => {
		if (audioRef.current) {
			const audio = audioRef.current;
			audio.pause();
			audio.onplay = null;
			audio.onended = null;
			audio.onerror = null;
			const currentSrc = audio.src;

			// Only revoke if it's a TTS blob URL
			if (currentSrc && currentSrc.startsWith('blob:') && !uploadedAudioUrls.includes(currentSrc)) {
				URL.revokeObjectURL(currentSrc);
				console.log(`Revoked TTS blob URL on stop`);
			}
			audio.removeAttribute('src');
			audio.load(); // Reset
		}

		// Reset all playback/loading states
		setPlayingIndex(null);
		setIsLoading(false);
		setLoadingIndex(null);
		setIsReplayingAll(false);
		nextPlayIndexRef.current = 0; // Reset replay sequence counter
	};

	const playNextParagraph = () => {
		let nextIndex = nextPlayIndexRef.current;
		while (nextIndex < paragraphs.length) {
			const hasContent = !!paragraphs[nextIndex];
			const hasTts = !!selectedVoices[nextIndex];
			const hasUpload = !!uploadedAudioUrls[nextIndex];

			if (hasContent && (hasTts || hasUpload)) {
				break;
			}
			nextIndex++;
		}

		if (nextIndex >= paragraphs.length) {
			setIsReplayingAll(false);
			nextPlayIndexRef.current = 0;
			handleStop();
			return;
		}

		nextPlayIndexRef.current = nextIndex + 1;
		playParagraph(nextIndex, playNextParagraph);
	};

	const handleReplayAll = () => {
		if (isLoading || loadingIndex !== null || playingIndex !== null || isReplayingAll) return;

		handleStop();
		setIsReplayingAll(true);
		nextPlayIndexRef.current = 0;

		let firstValidIndex = -1;
		for (let i = 0; i < paragraphs.length; i++) {
			const hasContent = !!paragraphs[i];
			const hasTts = !!selectedVoices[i];
			const hasUpload = !!uploadedAudioUrls[i];
			if (hasContent && (hasTts || hasUpload)) {
				firstValidIndex = i;
				break;
			}
		}

		if (firstValidIndex !== -1) {
			nextPlayIndexRef.current = firstValidIndex + 1; // Prepare for the one *after* the first
			playParagraph(firstValidIndex, playNextParagraph); // Start playback
		} else {
			console.log("Replay All: No playable paragraphs found.");
			setIsReplayingAll(false); // No paragraphs to play, reset flag
			nextPlayIndexRef.current = 0;
		}
	};

	const canReplayAll = !isReplayingAll && !isLoading && playingIndex === null && loadingIndex === null &&
		paragraphs.some((p, i) => p && (selectedVoices[i] || uploadedAudioUrls[i]));
	const showStopButton = playingIndex !== null || loadingIndex !== null || isReplayingAll;

	const baseSelectClasses = "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-slate-200 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500 dark:focus:ring-purple-600 dark:focus:border-purple-600";
	const disabledSelectClasses = "disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed";

	return (
		<div className="space-y-6  p-4 sm:p-6 rounded-lg">
			{/* TTS Options */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700/30">
				{/* Engine, Language, Gender Selects (unchanged) */}
				<div>
					<label htmlFor="engine-select" className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Engine</label>
					<select
						id="engine-select"
						value={selectedEngine}
						onChange={handleEngineChange}
						className={clsx(baseSelectClasses, disabledSelectClasses)}
						disabled={globalDisabled || engines.length === 0}
					>
						{/* Options */}
						{engines.length === 0 && !isLoading && <option value="">No engines</option>}
						{engines.length === 0 && isLoading && <option value="">Loading...</option>}
						{engines.map((engine) => <option key={engine} value={engine}>{engine}</option>)}
					</select>
				</div>

				<div>
					<label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Language</label>
					<select
						id="language-select"
						value={selectedLanguage}
						onChange={handleLanguageChange}
						className={clsx(baseSelectClasses, disabledSelectClasses)}
						disabled={globalDisabled || !selectedEngine || languages.length === 0}
					>
						{/* Options */}
						{!selectedEngine && <option value="">Select engine</option>}
						{selectedEngine && languages.length === 0 && !isLoading && <option value="">No languages</option>}
						{selectedEngine && languages.length === 0 && isLoading && <option value="">Loading...</option>}
						{languages.map((language) => <option key={language} value={language}>{language}</option>)}
					</select>
				</div>

				<div>
					<label htmlFor="gender-select" className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">Gender</label>
					<select
						id="gender-select"
						value={selectedGender}
						onChange={handleGenderChange}
						className={clsx(baseSelectClasses, disabledSelectClasses)}
						disabled={globalDisabled || !selectedLanguage || (voices.length === 0 && !isLoading)}
					>
						{/* Options */}
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
				const hasUploadedAudio = !!uploadedAudioUrls[index];
				const hasContent = !!para;

				const globalBusy = isLoading || isGenerating || isReplayingAll || loadingIndex !== null || playingIndex !== null;
				const paragraphGloballyDisabled = globalBusy;
				const paragraphContentMissing = !hasContent;
				const baseDisabled = globalDisabled || !hasContent;
				const ttsControlsDisabled = baseDisabled || hasUploadedAudio;
				const controlsBaseDisabled = paragraphGloballyDisabled || paragraphContentMissing;
				const canPlayThis = hasContent && (!!selectedVoices[index] || hasUploadedAudio) && !globalDisabled;

				return (
					<div
						key={index}
						className={clsx(
							'border', 'border-gray-200', 'dark:border-gray-700', 'rounded-lg', 'p-4', 'transition-colors', 'duration-300',
							{
								'bg-purple-50 dark:bg-purple-900/30': isCurrentLoading,
								'bg-blue-50 dark:bg-blue-900/30': isCurrentPlaying && hasUploadedAudio,
								'bg-green-50 dark:bg-green-900/30': isCurrentPlaying && !hasUploadedAudio,
								'bg-white dark:bg-gray-700': !isCurrentLoading && !isCurrentPlaying,
							}
						)}
					>
						<p className={clsx(
							"mb-3 text-sm min-h-[40px] cursor-default",
							hasContent ? "text-gray-800 dark:text-slate-200" : "text-gray-400 dark:text-gray-500 italic"
						)}>
							{para || "No content for this paragraph"}
						</p>
						{/* Controls Row */}
						<div className="flex flex-wrap items-center justify-between gap-4">
							{/* Left Group: TTS Voice/Speed or Upload Info */}
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-grow min-w-[200px]">
								{/* Voice Select (Disabled if Uploaded Audio) */}
								<div className="flex-1 min-w-[150px]">
									<label htmlFor={`voice-select-${index}`} className="sr-only">Voice</label>
									<select
										id={`voice-select-${index}`}
										value={selectedVoices[index]}
										onChange={(e) => handleVoiceChange(index, e.target.value)}
										className={clsx(baseSelectClasses, disabledSelectClasses, 'text-xs sm:text-sm')}
										disabled={ttsControlsDisabled || voices.length === 0 || globalDisabled}
										title={hasUploadedAudio ? "Using uploaded audio" : "Select TTS voice"}
									>
										{/* Options... */}
										{!selectedLanguage && <option value="">Select language</option>}
										{selectedLanguage && voices.length === 0 && !isLoading && <option value="">No voices</option>}
										{selectedLanguage && voices.length === 0 && isLoading && <option value="">Loading...</option>}
										{/* Add a placeholder if uploaded */}
										{hasUploadedAudio && <option value="">Uploaded Audio Active</option>}
										{/* Only show voice options if NOT using uploaded audio */}
										{!hasUploadedAudio && voices.map((voice) => (
											<option key={voice.voice_id} value={voice.voice_id}>
												{voice.display_name || voice.voice_id} ({voice.gender})
											</option>
										))}
									</select>
								</div>

								{/* Speed Select (Disabled if Uploaded Audio) */}
								<div className="flex-shrink-0">
									<label htmlFor={`speed-select-${index}`} className="sr-only">Speed</label>
									<select
										id={`speed-select-${index}`}
										value={selectedSpeeds[index]}
										onChange={(e) => handleSpeedChange(index, parseFloat(e.target.value))}
										className={clsx(baseSelectClasses, disabledSelectClasses, 'text-xs sm:text-sm py-2 px-2')}
										disabled={ttsControlsDisabled || globalDisabled}
										title={hasUploadedAudio ? "Speed control inactive for uploaded audio" : "Select playback speed for TTS"}
									>
										{speedOptions.map((speed) => (
											<option key={speed} value={speed}>
												{speed}x
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Right Group: Upload/Clear and Play/Stop */}
							<div className="flex items-center justify-end sm:justify-start gap-2 flex-shrink-0">
								{/* Upload Button */}
								<div className="relative">
									<input
										ref={el => { fileInputRefs.current[index] = el; }} // Assign ref
										type="file"
										id={`audio-upload-${index}`}
										accept=".mp3,audio/mpeg"
										onChange={(e) => handleFileUpload(index, e)}
										className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
										disabled={baseDisabled || globalDisabled}
										title={hasUploadedAudio ? "Replace uploaded MP3" : "Upload MP3 audio"}
									/>

									<button
										type="button"
										onClick={() => fileInputRefs.current[index]?.click()} // Trigger hidden input
										className={clsx(
											"flex items-center justify-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition w-[95px] h-[38px]",
											'text-white',
											{
												'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed': controlsBaseDisabled,
												'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500': !controlsBaseDisabled && hasUploadedAudio,
												'bg-gray-300 hover:bg-gray-600 dark:bg-gray-500 dark:hover:bg-gray-400': !controlsBaseDisabled && !hasUploadedAudio,
											}
										)}
										disabled={baseDisabled || globalDisabled}
										title={hasUploadedAudio ? "Replace uploaded MP3" : "Upload MP3 audio"}
									>
										<UploadCloud className="h-4 w-4" />
										<span>{hasUploadedAudio ? "Replace" : "Upload"}</span>
									</button>
								</div>

								{/* Clear Upload Button */}
								{hasUploadedAudio && (
									<button
										onClick={() => handleClearUpload(index)}
										className={clsx(
											"flex items-center justify-center p-2 text-sm rounded-md transition h-[38px]",
											'bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700',
											'dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 dark:hover:text-red-300',
											'disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed'
										)}
										disabled={baseDisabled}
										title="Remove uploaded audio and use TTS"
									>
										<XCircle className="h-4 w-4" />
										<span className="sr-only">Clear Upload</span>
									</button>
								)}

								{/* Play/Loading/Stop Button */}
								{isCurrentLoading ? (
									<button
										className={clsx(
											"flex items-center justify-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition w-[90px] h-[38px]",
											{
												'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-wait': isCurrentLoading,
												'bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-500': !isCurrentLoading && isCurrentPlaying,
												'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600': !isCurrentLoading && !isCurrentPlaying && canPlayThis && hasUploadedAudio,
												'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600': !isCurrentLoading && !isCurrentPlaying && canPlayThis && !hasUploadedAudio,
												'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed': !isCurrentLoading && !isCurrentPlaying && !canPlayThis,
											}
										)}
										disabled
									>
										<Loader2 className="h-4 w-4 animate-spin" />
										<span>Loading</span>
									</button>

								) : isCurrentPlaying ? (
									<button
										onClick={handleStop}
										className="flex items-center justify-center gap-1 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition w-[90px] h-[38px]"
									>
										<Square className="h-4 w-4 fill-current" />
										<span>Stop</span>
									</button>
								) : (
									<button
										onClick={() => handlePlay(index)}
										className={`flex items-center justify-center gap-1 px-3 py-1 text-sm rounded-md transition w-[90px] h-[38px] ${!canPlayThis
											? "bg-gray-200 text-gray-500 cursor-not-allowed"
											: hasUploadedAudio
												? "bg-blue-600 text-white hover:bg-blue-700"
												: "bg-purple-600 text-white hover:bg-purple-700"
											}`}
										disabled={!canPlayThis}
										title={!hasContent ? "No text" : (!selectedVoices[index] && !hasUploadedAudio) ? "No audio source" : (isLoading || loadingIndex !== null || playingIndex !== null) ? "Busy..." : `Play ${hasUploadedAudio ? 'uploaded audio' : 'TTS'}`}
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
				{/* Replay All Button (Logic updated in handler) */}
				<button
					onClick={handleReplayAll}
					disabled={globalDisabled || !paragraphs.some((p, i) => p && (selectedVoices[i] || uploadedAudioUrls[i]))}
					className={clsx(
						"flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition",
						{
							'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600': canReplayAll,
							'bg-purple-100 dark:bg-purple-900/30 text-purple-400 dark:text-purple-600 cursor-not-allowed': !canReplayAll,
						}
					)}
					title={!paragraphs.some((p, i) => p && (selectedVoices[i] || uploadedAudioUrls[i])) ? "Add text and select voice/upload audio" : (isLoading || playingIndex !== null || isReplayingAll || loadingIndex !== null) ? "Busy..." : "Play all paragraphs sequentially"}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
						<path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.204 2.776l.71-.71a4.5 4.5 0 0 0 7.416-2.288l-.71.71a3.5 3.5 0 0 1-5.898-1.713l.71-.71a2.5 2.5 0 0 0 4.212-1.224l-.71.71a1.5 1.5 0 1 1-2.121-2.121l.71-.71-1.415-1.414-.709.709a5.5 5.5 0 0 1 8.827 3.347l-.71.71Zm-2.121-2.121a1.5 1.5 0 1 1-2.121-2.121l.71-.71 1.414 1.414-.707.707a3.5 3.5 0 0 1-4.389 1.003l.71-.71a2.5 2.5 0 0 0 3.01.717l-.71.71a1.5 1.5 0 1 1-2.121-2.121l.71-.71-1.414-1.414-.71.71a5.5 5.5 0 0 1 7.166 5.834l.71.71a1.5 1.5 0 1 1-2.122 2.121l-.71-.71.707-.707a3.5 3.5 0 0 1-1.003-4.389l.71.71a2.5 2.5 0 0 0-.717-3.01l.71-.71Z" clipRule="evenodd" />
					</svg>
					<span>Replay All</span>
				</button>

				{/* Stop Button (Logic updated in handler) */}
				{showStopButton && (
					<button
						onClick={handleStop}
						className={clsx(
							"flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition",
							'bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-500'
						)}
						title="Stop current playback or loading"
					>
						<Square className="h-4 w-4 fill-current" />
						<span>Stop</span>
					</button>
				)}
			</div>
		</div>
	);
});

export default AudioStep;
