"use client";

import React, { useState, useEffect } from "react";

interface PromptStepProps {
  setTextContent: (text: string) => void;
  onNext: () => void;
  triggerFetchSummary: boolean;
}

export default function PromptStep({ setTextContent, onNext, triggerFetchSummary }: PromptStepProps) {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchSummary = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    setError("");

    const token = localStorage.getItem("jwtToken");

    try {
      const response = await fetch("http://localhost:5000/create/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyword }),
      });

      const data = await response.json();
      if (response.ok) {
        setTextContent(data.summary);
        onNext();
      } else {
        setError(data.error || "Failed to fetch summary.");
      }
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (triggerFetchSummary) {
      handleFetchSummary();
    }
  }, [triggerFetchSummary]);

  return (
    <div className="min-h-[300px] relative">
      <textarea
        className="w-full h-40 p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-gray-400 text-black"
        placeholder="Enter your prompt here..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        disabled={loading} // Ngăn nhập liệu khi loading
      ></textarea>

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
}
