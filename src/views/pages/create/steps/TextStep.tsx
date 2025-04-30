import React, { useEffect, useState } from "react";

interface TextStepProps {
	textContent: string;
	setTextContent: (text: string) => void;
}

const TextStep = ({
	textContent,
	setTextContent,
}: TextStepProps) => {
	const [paragraphs, setParagraphs] = useState<string[]>([]);

	useEffect(() => {
		const split = textContent.split(/\n\n+/).map(p => p.trim()).filter(p => p).slice(0, 4);
		const padded = [...split];
		while (padded.length < 4) padded.push("");
		setParagraphs(padded);
	}, [textContent]);

	const handleChange = (index: number, value: string) => {
		const updated = [...paragraphs];
		updated[index] = value;
		setParagraphs(updated);
		setTextContent(updated.join("\n\n"));
	};

	return (
		<div className="grid grid-cols-1 gap-4">
			{paragraphs.map((para, idx) => (
				<textarea
					key={idx}
					className="w-full h-40 p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300 font-sans text-sm placeholder-gray-400 text-black dark:bg-gray-800 dark:text-slate-200 dark:border-slate-700"
					placeholder={`Paragraph ${idx + 1}`}
					value={para}
					onChange={(e) => handleChange(idx, e.target.value)}
				/>
			))}
		</div>
	);
};

export default TextStep;
