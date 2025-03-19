import LoginForm from "@/components/login-form"
import VideoFeatures from "@/components/video-features"

export default function LoginPage() {
  return (
    <main className="min-h-screen flex bg-gray-50">
      {/* Video features takes 30% of the screen */}
      <div className="w-[30%] h-screen">
        <VideoFeatures />
      </div>

      {/* Login form centered in the remaining 70% */}
      <div className="w-[70%] h-screen flex items-center justify-center">
        <LoginForm />
      </div>
    </main>
  )
}

