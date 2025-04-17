import React, { useState, useEffect } from "react";

interface PromptStepProps {
	setTextContent: (text: string) => void;
	onNext: () => void;
	triggerFetchSummary: boolean;
}

const PromptStep = ({ setTextContent, onNext, triggerFetchSummary }: PromptStepProps) => {
	const [keyword, setKeyword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [style, setStyle] = useState("casual");
	const [age, setAge] = useState("18-24");
	const [language, setLanguage] = useState("English");
	const [tone, setTone] = useState("engaging");

	const handleFetchSummary = async () => {
		if (!keyword.trim()) return;

		setLoading(true);
		setError("");

		const token = localStorage.getItem("access_token");

		try {
			const response = await fetch("http://localhost:5000/create/prompt", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ keyword, style, age, language, tone }),
			});

			const payload = { keyword, style, age, language, tone };
			console.log("Payload being sent to server:", payload);

			const data = await response.json();
			if (response.ok) {
				setTextContent(data.summary);
				onNext();
			} else {
				setError(data.msg || "Failed to fetch summary.");
			}
		} catch (err) {
			setError("Something went wrong.");
		} finally {
			setLoading(false);
			handleFetchComplete();
		}
	};

	const handleFetchComplete = () => {
        const resetTrigger = new CustomEvent('resetTriggerFetchSummary');
        window.dispatchEvent(resetTrigger);
    };

	useEffect(() => {
		if (triggerFetchSummary) {
			handleFetchSummary();
		}
	}, [triggerFetchSummary]);

	return (
		<div className="min-h-[300px] relative">
			<textarea
				className="w-full h-30 p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-400 text-black"
				placeholder="Enter your prompt here..."
				value={keyword}
				onChange={(e) => setKeyword(e.target.value)}
				disabled={loading}
			></textarea>

			<div className="grid grid-cols-2 gap-4 mt-4">
				<div>
					<label className="block mb-1 text-sm font-medium">Style</label>
					<select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full p-2 border rounded">
						<option value="casual">Casual</option>
						<option value="educational">Educational</option>
						<option value="dramatic">Dramatic</option>
						<option value="motivational">Motivational</option>
						<option value="inspirational">Inspirational</option>
						<option value="humorous">Humorous</option>
					</select>
				</div>

				<div>
					<label className="block mb-1 text-sm font-medium">Age Group</label>
					<select value={age} onChange={(e) => setAge(e.target.value)} className="w-full p-2 border rounded">
						<option value="under-13">Under 13</option>
						<option value="13-17">13-17</option>
						<option value="18-24">18-24</option>
						<option value="25-34">25-34</option>
						<option value="35-49">35-49</option>
						<option value="50-plus">50+</option>
					</select>
				</div>

				<div>
					<label className="block mb-1 text-sm font-medium">Language</label>
					<select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full p-2 border rounded">
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
				</div>

				<div>
					<label className="block mb-1 text-sm font-medium">Tone</label>
					<select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full p-2 border rounded">
						<option value="engaging">Engaging</option>
						<option value="friendly">Friendly</option>
						<option value="chill">Chill</option>
						<option value="professional">Professional</option>
						<option value="funny">Funny</option>
						<option value="sarcastic">Sarcastic</option>
						<option value="empathetic">Empathetic</option>
						<option value="motivational">Motivational</option>
					</select>
				</div>
			</div>

			{loading && (
				<div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-50">
					<div className="flex items-center space-x-2">
						<svg
							className="animate-spin h-6 w-6 text-purple-500"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8H4z"
							></path>
						</svg>
						<span className="text-gray-500 font-semibold">Processing...</span>
					</div>
				</div>
			)}

			{error && <p className="text-red-500 text-sm mt-2">{error}</p>}

			<div className="mt-4">
				<p className="text-sm text-gray-500">
					Describe what kind of video you want to create. Be specific about the topic, style, and content.
				</p>
			</div>
		</div>
	);
};

export default PromptStep;
