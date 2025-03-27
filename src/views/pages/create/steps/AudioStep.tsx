export default function AudioStep() {
  const voices = [
    { id: 1, name: "Emma (Female)", language: "English (US)" },
    { id: 2, name: "John (Male)", language: "English (US)" },
    { id: 3, name: "Sophie (Female)", language: "English (UK)" },
    { id: 4, name: "Michael (Male)", language: "English (UK)" },
  ]

  return (
    <div className="min-h-[300px]">
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Voice</h4>
        <div className="space-y-2">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:border-purple-400"
            >
              <input type="radio" name="voice" id={`voice-${voice.id}`} className="mr-3" />
              <label htmlFor={`voice-${voice.id}`} className="flex-1">
                <div className="font-medium">{voice.name}</div>
                <div className="text-xs text-gray-500">{voice.language}</div>
              </label>
              <button className="text-purple-600 text-sm">Preview</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Background Music</h4>
        <div className="p-3 border border-gray-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">Ambient Music</div>
              <div className="text-xs text-gray-500">Calm, relaxing background music</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-purple-600 text-sm">Preview</button>
              <input type="range" min="0" max="100" defaultValue="30" className="w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}