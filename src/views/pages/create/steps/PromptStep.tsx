import { PromptInterface } from "@/interfaces/prompt/PromptInterface";
import PromptService from "@/services/prompt/PromptService";
import React, { useState, useEffect, useCallback } from "react";

interface PromptStepProps {
	textContent: string;
	setTextContent: (text: string) => void;
	triggerFetchSummary: boolean;
	setIsGeneratingScript: (isLoading: boolean) => void;
	onGenerationComplete: (success: boolean, script: string | null, errorMsg?: string | null) => void;
	setModel: (model: string) => void;
	setLanguageOutput: (language: string) => void;
}

const PromptStep = ({ setTextContent, triggerFetchSummary, setIsGeneratingScript, onGenerationComplete, setModel, setLanguageOutput }: PromptStepProps) => {
	const [keyword, setKeyword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [style, setStyle] = useState("casual");
	const [age, setAge] = useState("18-24");
	const [language, setLanguage] = useState("English");
	const [tone, setTone] = useState("engaging");

	const [providers, setProviders] = useState<string[]>([]);
	const [selectedProvider, setSelectedProvider] = useState<string>("");
	const [loadingProviders, setLoadingProviders] = useState<boolean>(false);
	const [providerError, setProviderError] = useState<string>("");

	const [models, setModels] = useState<string[]>([]);
	const [selectedModel, setSelectedModel] = useState<string>("");
	const [loadingModels, setLoadingModels] = useState<boolean>(false);
	const [modelError, setModelError] = useState<string>("");

	useEffect(() => {
		const fetchProviders = async () => {
			setLoadingProviders(true);
			setProviderError("");
			try {
				const providerList = await PromptService.getProviders();
				setProviders(providerList);
			} catch (err: any) {
				console.error("Failed to fetch providers:", err);
				setProviderError(err.response?.data?.message || err.message || "Failed to load providers.");
			} finally {
				setLoadingProviders(false);
			}
		};
		fetchProviders();
	}, []);

	useEffect(() => {
		if (!selectedProvider) {
			setModels([]);
			setSelectedModel("");
			return;
		}

		const fetchModels = async () => {
			setLoadingModels(true);
			setModelError("");
			setModels([]);
			setSelectedModel("");
			try {
				const modelList = await PromptService.getModelsByProvider(selectedProvider);
				setModels(modelList);
				// Optionally select the first model by default
				if (modelList.length > 0) {
					setSelectedModel(modelList[0]);
				}
			} catch (err: any) {
				console.error(`Failed to fetch models for ${selectedProvider}:`, err);
				setModelError(err.response?.data?.message || err.message || `Failed to load models for ${selectedProvider}.`);
			} finally {
				setLoadingModels(false);
			}
		};

		fetchModels();
	}, [selectedProvider]);

	const handleFetchSummary = useCallback(async () => {
		if (!keyword.trim()) {
			setError("Please enter a prompt keyword.");
			onGenerationComplete(false, null, "Please enter a prompt keyword.");
			handleFetchComplete();
			return;
		}
		if (!selectedProvider) {
			setError("Please select a provider.");
			onGenerationComplete(false, null, "Please select a provider.");
			handleFetchComplete();
			return;
		}
		if (!selectedModel) {
			setError("Please select a model.");
			onGenerationComplete(false, null, "Please select a model.");
			handleFetchComplete();
			return;
		}

		setLoading(true);
		setIsGeneratingScript(true);
		setError("");

		const payload: PromptInterface = {
			keyword,
			style,
			age,
			language,
			tone,
			model: selectedModel
		};
		console.log("Payload being sent to server:", payload);

		try {
			const summaryResult = await PromptService.getScript(payload);
			setTextContent(summaryResult);
			setModel(selectedModel);
			onGenerationComplete(true, summaryResult);
		} catch (err: any) {
			console.error("Error generating script:", err);
			const message = err.response?.data?.message
				|| err.response?.data?.msg
				|| err.message
				|| "Something went wrong while generating the script.";
			setError(message);
			onGenerationComplete(false, null, message);
		} finally {
			setLoading(false);
			setLanguageOutput(language);
			handleFetchComplete();
		}
	}, [keyword, style, age, language, tone, selectedProvider, selectedModel, setTextContent, setIsGeneratingScript, onGenerationComplete]);

	const handleFetchComplete = () => {
		const resetTrigger = new CustomEvent('resetTriggerFetchSummary');
		window.dispatchEvent(resetTrigger);
	};

	useEffect(() => {
		if (triggerFetchSummary) {
			handleFetchSummary();
		}
	}, [triggerFetchSummary, handleFetchSummary]);

	const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedProvider(e.target.value);
	};

	const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedModel(e.target.value);
	};

	const isFormDisabled = loading || loadingProviders || loadingModels;

	const labelClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-slate-300";
	const selectClasses = `
        w-full p-2 border rounded-md appearance-none
        bg-white dark:bg-slate-700
        border-gray-300 dark:border-slate-600
        text-gray-900 dark:text-slate-100
        focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500 focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400
    `;
	const textareaClasses = `
        w-full h-30 p-3 border rounded-md
        bg-white dark:bg-slate-700
        border-gray-300 dark:border-slate-600
        text-gray-900 dark:text-slate-100
        placeholder-gray-400 dark:placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500 focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800
    `;
	const errorTextClasses = "text-red-600 dark:text-red-400 text-xs mt-1";
	const loadingTextClasses = "text-purple-600 dark:text-purple-400 text-xs ml-1";

	return (
		<div className="min-h-[300px] relative text-gray-900 dark:text-slate-100">
			{loading && (
				<div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm z-10 rounded-lg">
					<div className="flex items-center space-x-2 p-4 bg-white dark:bg-slate-700 rounded-lg shadow-md">
						<svg className="animate-spin h-6 w-6 text-purple-500 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8H4z"></path>
						</svg>
						<span className="text-gray-600 dark:text-slate-300 font-semibold">Generating Script...</span>
					</div>
				</div>
			)}

			{/* Prompt Textarea */}
			<textarea
				className={`${textareaClasses} h-30`}
				placeholder="Enter Wikipedia article title or your prompt here (e.g., 'Explain black holes to a 5-year-old')..."
				value={keyword}
				onChange={(e) => setKeyword(e.target.value)}
				disabled={isFormDisabled}
			></textarea>

			{/* Configuration Grid (Adjust grid columns if needed) */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">

				{/* Provider Selector */}
				<div>
					<label className={labelClasses}>
						Provider {loadingProviders && <span className={loadingTextClasses}>(Loading...)</span>}
					</label>
					{/* Wrap select in a div for custom arrow styling if needed */}
					<div className="relative">
						<select
							value={selectedProvider}
							onChange={handleProviderChange}
							className={selectClasses}
							disabled={isFormDisabled || loadingProviders}
						>
							<option value="" disabled>-- Select Provider --</option>
							{providers.map(provider => (
								<option key={provider} value={provider}>{provider}</option>
							))}
						</select>
						{/* Basic custom arrow indicator */}
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
							<svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
						</div>
					</div>
					{providerError && <p className={errorTextClasses}>{providerError}</p>}
				</div>

				{/* Model Selector */}
				<div>
					<label className={labelClasses}>
						Model {loadingModels && <span className={loadingTextClasses}>(Loading...)</span>}
					</label>
					<div className="relative">
						<select
							value={selectedModel}
							onChange={handleModelChange}
							className={selectClasses}
							disabled={isFormDisabled || loadingModels || !selectedProvider}
						>
							<option value="" disabled>
								{loadingModels ? "Loading..." : (selectedProvider ? "-- Select Model --" : "-- Select Provider First --")}
							</option>
							{models.map(model => (
								<option key={model} value={model}>{model}</option>
							))}
						</select>
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
							<svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
						</div>
					</div>
					{modelError && <p className={errorTextClasses}>{modelError}</p>}
				</div>

				{/* Style Selector */}
				<div>
					<label className={labelClasses}>Style</label>
					<div className="relative">
						<select value={style} onChange={(e) => setStyle(e.target.value)} className={selectClasses} disabled={isFormDisabled}>
							<option value="casual">Casual</option>
							<option value="educational">Educational</option>
							<option value="dramatic">Dramatic</option>
							<option value="motivational">Motivational</option>
							<option value="inspirational">Inspirational</option>
							<option value="humorous">Humorous</option>
						</select>
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
							<svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
						</div>
					</div>
				</div>

				{/* Age Group Selector */}
				<div>
					<label className={labelClasses}>Age Group</label>
					<div className="relative">
						<select value={age} onChange={(e) => setAge(e.target.value)} className={selectClasses} disabled={isFormDisabled}>
							<option value="under-13">Under 13</option>
							<option value="13-17">13-17</option>
							<option value="18-24">18-24</option>
							<option value="25-34">25-34</option>
							<option value="35-49">35-49</option>
							<option value="50-plus">50+</option>
						</select>
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
							<svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
						</div>
					</div>
				</div>

				{/* Language Selector */}
				<div>
					<label className={labelClasses}>Language</label>
					<div className="relative">
						<select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClasses} disabled={isFormDisabled}>
							<option value="English">English</option>
							<option value="Spanish">Spanish</option>
							<option value="French">French</option>
							<option value="German">German</option>
							<option value="Chinese">Chinese</option>
							<option value="Japanese">Japanese</option>
							<option value="Vietnamese">Vietnamese</option>
							<option value="Hindi">Hindi</option>
							<option value="Arabic">Arabic</option>
							<option value="Portuguese">Portuguese</option>
						</select>
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
							<svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
						</div>
					</div>
				</div>

				{/* Tone Selector */}
				<div>
					<label className={labelClasses}>Tone</label>
					<div className="relative">
						<select value={tone} onChange={(e) => setTone(e.target.value)} className={selectClasses} disabled={isFormDisabled}>
							<option value="engaging">Engaging</option>
							<option value="friendly">Friendly</option>
							<option value="chill">Chill</option>
							<option value="professional">Professional</option>
							<option value="funny">Funny</option>
							<option value="sarcastic">Sarcastic</option>
							<option value="empathetic">Empathetic</option>
							<option value="motivational">Motivational</option>
						</select>
						<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
							<svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
						</div>
					</div>
				</div>
			</div>

			{/* Script Generation Error Message */}
			{error && <p className="text-red-600 dark:text-red-400 text-sm mt-4">{error}</p>}

			{/* Help Text */}
			<div className="mt-4">
				<p className="text-sm text-gray-500 dark:text-slate-400">
					Select your desired provider and model, then describe the video you want to create.
				</p>
			</div>
		</div>
	);
};

export default PromptStep;
