import type React from "react";
import { useState, useEffect, useRef } from "react";
import TtsService from "@/services/tts/TtsService";
import type { VoiceData } from "@/interfaces/voice/VoiceInterface";
import { Loader2, Play, Square } from "lucide-react";

interface AudioStepProps {
    textContent: string;
    setTextContent: (text: string) => void; // Assuming this exists if needed elsewhere
}

const AudioStep = ({ textContent }: AudioStepProps) => {
    // State for TTS options
    const [engines, setEngines] = useState<string[]>([]);
    const [selectedEngine, setSelectedEngine] = useState<string>("");
    const [languages, setLanguages] = useState<string[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [genders] = useState<string[]>(["all", "male", "female"]);
    const [selectedGender, setSelectedGender] = useState<string>("all");
    const [voices, setVoices] = useState<VoiceData[]>([]);

    // State for paragraphs and selected voices
    const [paragraphs, setParagraphs] = useState<string[]>(["", "", "", ""]);
    const [selectedVoices, setSelectedVoices] = useState<string[]>(["", "", "", ""]);

    // State for audio playback and loading
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
    const [isReplayingAll, setIsReplayingAll] = useState<boolean>(false); // Track replay sequence

    // Ref for audio element
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Ref to store the index of the next paragraph to play in the sequence
    const nextPlayIndexRef = useRef<number>(0);

    // Split text into paragraphs
    useEffect(() => {
        const split = textContent
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter((p) => p)
            .slice(0, 4);
        const padded = [...split];
        while (padded.length < 4) padded.push("");
        setParagraphs(padded);

        // Reset selected voices when paragraphs change only if voices are already loaded
        if (voices.length > 0) {
             const defaultVoice = voices.length > 0 ? voices[0].voice_id : "";
             setSelectedVoices(Array(4).fill(defaultVoice));
        } else {
             setSelectedVoices(Array(4).fill(""));
        }
        // Stop any playback if text changes
        handleStop();
    }, [textContent, voices]);

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
                    setSelectedEngine(""); // Reset if no engines
                }
            } catch (error) {
                console.error("Failed to load engines:", error);
                setEngines([]);
                setSelectedEngine("");
            } finally {
                setIsLoading(false); // Ensure loading stops even on error
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
            return;
        }

        const loadLanguages = async () => {
            setIsLoading(true);
            setLanguages([]); // Clear previous languages
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
                 setIsLoading(false); // Loading stops after languages attempt
            }
        };

        loadLanguages();
    }, [selectedEngine]);

    // Load voices when engine, language, or gender changes
    useEffect(() => {
        if (!selectedEngine || !selectedLanguage) {
            setVoices([]);
            setSelectedVoices(Array(4).fill(""));
            return;
        }

        const loadVoices = async () => {
            setIsLoading(true);
            setVoices([]); // Clear previous voices
            try {
                const filteredVoices = await TtsService.filterVoices(selectedEngine, selectedLanguage, selectedGender);
                setVoices(filteredVoices);
                // Set default voice for all paragraphs based on the new list
                const defaultVoice = filteredVoices.length > 0 ? filteredVoices[0].voice_id : "";
                setSelectedVoices(Array(4).fill(defaultVoice));

            } catch (error) {
                console.error(`Failed to load voices for ${selectedEngine}/${selectedLanguage}/${selectedGender}:`, error);
                 setSelectedVoices(Array(4).fill("")); // Clear voices on error
            } finally {
                 setIsLoading(false);
            }
        };

        loadVoices();
    }, [selectedEngine, selectedLanguage, selectedGender]); // Removed paragraphs dependency

    // Cleanup audio on unmount
    useEffect(() => {
        const audio = audioRef.current;
        return () => {
            if (audio) {
                audio.pause();
                audio.removeAttribute('src'); // Clean up src
                audio.load(); // Reset audio element state
                URL.revokeObjectURL(audio.src); // Revoke object URL if used
            }
        };
    }, []);


    // --- Event Handlers ---

    const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleStop(); // Stop playback on change
        setSelectedEngine(e.target.value);
        // Reset dependent selections will be handled by useEffect triggers
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleStop();
        setSelectedLanguage(e.target.value);
        // Reset dependent selections will be handled by useEffect triggers
    };

    const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleStop();
        setSelectedGender(e.target.value);
         // Reset voice selections will be handled by useEffect triggers
    };

    const handleVoiceChange = (index: number, voiceId: string) => {
        handleStop(); // Optional: Stop playback if voice changes for a paragraph
        const newSelections = [...selectedVoices];
        newSelections[index] = voiceId;
        setSelectedVoices(newSelections);
    };

    // Function to play a single paragraph (used by both individual play and replay all)
    const playParagraph = async (index: number, onEndCallback?: () => void) => {
        if (!selectedEngine || !selectedVoices[index] || !paragraphs[index]) {
             if (onEndCallback) onEndCallback(); // Ensure callback fires even if paragraph is invalid
             return;
        }
        if (isLoading || loadingIndex !== null) return; // Prevent concurrent loading

        // Stop any currently playing audio first
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            // Don't revoke URL immediately, let the new playback handle it
        }

        try {
            setLoadingIndex(index);
            setIsLoading(true);
            setPlayingIndex(null); // Clear playing index while loading

            const audioUrl = await TtsService.generateTts(selectedEngine, paragraphs[index], selectedVoices[index]);

            if (!audioRef.current) {
                audioRef.current = new Audio();
            } else {
                 // Clean up previous source before setting new one
                 if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
                      URL.revokeObjectURL(audioRef.current.src);
                 }
            }


            // --- Event Handlers for the NEW audio instance ---
            const currentAudio = audioRef.current;

             // Remove previous listeners to prevent memory leaks or duplicate calls
             currentAudio.onplay = null;
             currentAudio.onended = null;
             currentAudio.onerror = null;

            currentAudio.onplay = () => {
                 console.log(`Audio playing for index: ${index}`);
                 setPlayingIndex(index);
                 setIsLoading(false);
                 setLoadingIndex(null);
            };

            currentAudio.onended = () => {
                 console.log(`Audio ended for index: ${index}`);
                 setPlayingIndex(null);
                 // Revoke URL only after playback finishes
                 if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(currentAudio.src);
                 }
                 if (onEndCallback) {
                     onEndCallback(); // Call the callback to trigger the next action (e.g., next paragraph)
                 } else {
                    setIsReplayingAll(false); // Ensure replay flag is reset if it was a single play
                 }
            };

            currentAudio.onerror = (e) => {
                console.error(`Error playing audio for index ${index}:`, e);
                setPlayingIndex(null);
                setIsLoading(false);
                setLoadingIndex(null);
                 // Revoke URL on error too
                 if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(currentAudio.src);
                 }
                if (onEndCallback) {
                     onEndCallback(); // Still call callback to potentially try next item or finish sequence
                } else {
                    setIsReplayingAll(false); // Reset replay flag on error during single play
                }

            };

            // --- Set source and play ---
            currentAudio.src = audioUrl;
            currentAudio.play().catch(error => {
                // Catch potential errors from play() itself (e.g., user interaction needed)
                console.error(`Error initiating playback for index ${index}:`, error);
                setPlayingIndex(null);
                setIsLoading(false);
                setLoadingIndex(null);
                if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
                   URL.revokeObjectURL(currentAudio.src);
                }
                if (onEndCallback) onEndCallback(); // Proceed in sequence even if play fails immediately
                else setIsReplayingAll(false);
            });

        } catch (error) {
            console.error(`Failed to generate or play audio for paragraph ${index}:`, error);
            setIsLoading(false);
            setLoadingIndex(null);
            setPlayingIndex(null); // Ensure playing state is reset
            if (onEndCallback) {
                onEndCallback(); // Ensure sequence continues or ends even on TTS error
            } else {
                setIsReplayingAll(false); // Reset replay flag on error
            }
        }
    };


    // Play single paragraph button handler
    const handlePlay = (index: number) => {
        if (isReplayingAll) return; // Don't allow individual play during sequence
        setIsReplayingAll(false); // Make sure replay mode is off
        nextPlayIndexRef.current = 0; // Reset sequence tracking just in case
        playParagraph(index); // Play only the selected paragraph
    };

    // Stop audio playback
    const handleStop = () => {
        console.log("Stop requested");
        if (audioRef.current) {
            audioRef.current.pause();
            // Clean up event listeners to prevent calls after stopping
            audioRef.current.onplay = null;
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
            }
             audioRef.current.removeAttribute('src'); // Clean up src attribute
             audioRef.current.load(); // Reset internal state
        }
        // Reset all relevant states
        setPlayingIndex(null);
        setIsLoading(false);
        setLoadingIndex(null);
        setIsReplayingAll(false); // Crucial: Stop the sequence flag
        nextPlayIndexRef.current = 0; // Reset sequence pointer
    };


    // Function to play the next paragraph in the sequence
    const playNextParagraph = () => {
        // Find the next valid paragraph index to play
        let nextIndex = nextPlayIndexRef.current;
        while (nextIndex < paragraphs.length && (!paragraphs[nextIndex] || !selectedVoices[nextIndex])) {
            nextIndex++;
        }

        if (nextIndex >= paragraphs.length) {
            // End of sequence
            console.log("Replay All sequence finished.");
            setIsReplayingAll(false);
            nextPlayIndexRef.current = 0; // Reset for next time
            return;
        }

        // Store the index for the *next* call after this one finishes
        nextPlayIndexRef.current = nextIndex + 1;
        console.log(`Playing next paragraph in sequence: index ${nextIndex}`);
        // Play the found paragraph and set the callback to call this function again
        playParagraph(nextIndex, playNextParagraph);
    };

    // Handle replay all paragraphs button
    const handleReplayAll = () => {
        if (isLoading || loadingIndex !== null || playingIndex !== null || isReplayingAll) return;

        console.log("Replay All sequence started.");
        handleStop();
        setIsReplayingAll(true);
        nextPlayIndexRef.current = 0;

        // Find the first valid paragraph and play it
        let firstValidIndex = -1;
        for (let i = 0; i < paragraphs.length; i++) {
            if (paragraphs[i] && selectedVoices[i]) {
                firstValidIndex = i;
                break;
            }
        }

        if (firstValidIndex !== -1) {
            nextPlayIndexRef.current = firstValidIndex + 1; // Set up for the next paragraph after the first one
            playParagraph(firstValidIndex, playNextParagraph);
        } else {
            // No valid paragraphs to play
            setIsReplayingAll(false);
            nextPlayIndexRef.current = 0;
            console.log("No valid paragraphs to replay.");
        }
    };


    // --- Render Logic ---

    const canReplayAll = !isReplayingAll && !isLoading && playingIndex === null && paragraphs.some((p, i) => p && selectedVoices[i]);
    const showStopButton = playingIndex !== null || isReplayingAll; // Show stop if playing individually OR during replay sequence

    return (
        <div className="space-y-6">
            {/* TTS Options */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                    <label htmlFor="engine-select" className="block text-sm font-medium text-gray-700 mb-1">Engine</label>
                    <select
                        id="engine-select"
                        value={selectedEngine}
                        onChange={handleEngineChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        disabled={isLoading || engines.length === 0} // Disable during any loading
                    >
                        {engines.length === 0 && !isLoading && <option value="">No engines available</option>}
                        {engines.length === 0 && isLoading && <option value="">Loading engines...</option>}
                        {engines.map((engine) => (
                            <option key={engine} value={engine}>
                                {engine}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                         id="language-select"
                        value={selectedLanguage}
                        onChange={handleLanguageChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        disabled={isLoading || !selectedEngine || languages.length === 0}
                    >
                        {!selectedEngine && <option value="">Select engine first</option>}
                        {selectedEngine && languages.length === 0 && !isLoading && <option value="">No languages</option>}
                        {selectedEngine && languages.length === 0 && isLoading && <option value="">Loading...</option>}
                        {languages.map((language) => (
                            <option key={language} value={language}>
                                {language}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="gender-select" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                         id="gender-select"
                        value={selectedGender}
                        onChange={handleGenderChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                        disabled={isLoading || !selectedLanguage || voices.length === 0}
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
                 const canPlayThis = !!para && !!selectedVoices[index] && !isLoading && !isReplayingAll && playingIndex === null; // Can only play individually if not busy/replaying

                 return (
                     <div key={index} className={`border border-gray-200 rounded-lg p-4 transition-colors duration-300 ${isCurrentLoading ? 'bg-purple-50' : isCurrentPlaying ? 'bg-green-50' : 'bg-white'}`}>
                         <p className="mb-3 text-sm text-gray-700 min-h-[20px]"> {/* Min height prevents layout shifts */}
                             {para || <span className="italic text-gray-400">No content for this paragraph</span>}
                         </p>
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                             <select
                                 value={selectedVoices[index]}
                                 onChange={(e) => handleVoiceChange(index, e.target.value)}
                                 className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                 // Disable if loading voices, loading audio, replaying all, or if no voices/paragraph text
                                 disabled={isLoading || isReplayingAll || voices.length === 0 || !para}
                             >
                                 {!selectedLanguage && <option value="">Select language</option>}
                                 {selectedLanguage && voices.length === 0 && !isLoading && <option value="">No voices available</option>}
                                 {selectedLanguage && voices.length === 0 && isLoading && <option value="">Loading voices...</option>}

                                 {voices.map((voice) => (
                                     <option key={voice.voice_id} value={voice.voice_id}>
                                         {voice.display_name || voice.voice_id} ({voice.gender})
                                     </option>
                                 ))}
                             </select>

                             <div className="flex items-center gap-2 flex-shrink-0">
                                 {isCurrentLoading ? (
                                     <button
                                         className="flex items-center justify-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md w-[90px] h-[30px]" // Fixed size
                                         disabled
                                     >
                                         <Loader2 className="h-4 w-4 animate-spin" />
                                         <span>Loading</span>
                                     </button>
                                 ) : isCurrentPlaying ? (
                                     <button
                                         onClick={handleStop} // Stop button stops everything
                                         className="flex items-center justify-center gap-1 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition w-[90px] h-[30px]" // Fixed size
                                     >
                                         <Square className="h-4 w-4 fill-current" />
                                         <span>Stop</span>
                                     </button>
                                 ) : (
                                     <button
                                         onClick={() => handlePlay(index)}
                                         className={`flex items-center justify-center gap-1 px-3 py-1 text-sm rounded-md transition w-[90px] h-[30px] ${ // Fixed size
                                             !canPlayThis
                                                 ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                 : "bg-purple-600 text-white hover:bg-purple-700"
                                             }`}
                                         disabled={!canPlayThis}
                                         title={!para ? "No text to play" : !selectedVoices[index] ? "No voice selected" : isLoading ? "Loading..." : isReplayingAll ? "Replay All active" : playingIndex !== null ? "Audio playing" : "Play"}
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
                     className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition ${
                         !canReplayAll
                             ? "bg-purple-100 text-purple-400 cursor-not-allowed"
                             : "bg-purple-600 text-white hover:bg-purple-700"
                         }`}
                     title={!paragraphs.some((p, i) => p && selectedVoices[i]) ? "Add text and select voices first" : (isLoading || playingIndex !== null || isReplayingAll) ? "Busy..." : "Play all paragraphs sequentially"}
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
                         title="Stop current playback"
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
