import { Film } from "lucide-react"

export default function VideoFeatures() {
  return (
    <div className="w-full h-full bg-pink-500 text-white p-8 flex flex-col justify-center">
      <div className="max-w-xs mx-auto">
        <div className="mb-6">
          <Film size={32} />
        </div>

        <h1 className="text-4xl font-bold mb-4">Turn idea into videos with AI</h1>

        <p className="text-sm opacity-90">
          Transform your ideas into stunning videos with our AI video generator. Easy to use Text-to-Video editor
          featuring lifelike voiceovers, dynamic AI video clips, and a wide range of AI-powered features.
        </p>
      </div>
    </div>
  )
}

