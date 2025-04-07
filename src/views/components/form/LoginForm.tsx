import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AuthService from "@/services/auth/AuthService";

export default function LoginForm() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage({ type: "", text: "" });
		setLoading(true);

		try {
		  const data = await AuthService.login(username, password);
		  console.log("Login Response Data:", data);

		  if (data.access_token) {
			localStorage.setItem("access_token", data.access_token);

			setMessage({ type: "success", text: "Login successful! Redirecting..." });
			setTimeout(() => (window.location.href = "/dashboard"), 2000);
		  } else {
			setMessage({ type: "error", text: data.msg || "Invalid credentials" });
		  }
		} catch (error) {
		  console.error("An unexpected error happened:", error);
		  setMessage({ type: "error", text: "Server error. Please try again later." });
		} finally {
		  setLoading(false);
		}
	  };


	return (
		<div className="w-full max-w-md bg-pink-50 p-8 rounded-lg shadow-md">
			<div className="w-full">
				<h2 className="text-2xl font-semibold text-pink-600 mb-8 text-center">Welcome</h2>

				{message.text && (
					<div className={`text-sm p-2 rounded-md text-center ${message.type === "success" ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"}`}>
						{message.text}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-2">
						<input
							type="text"
							placeholder="Username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							className="w-full bg-transparent border-b border-gray-300 rounded-none px-0 h-10 focus:outline-none focus:border-pink-500 placeholder-slate-500 text-slate-800"
						/>
					</div>

					<div className="space-y-2 relative">
						<input
							type={showPassword ? "text" : "password"}
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full bg-transparent border-b border-gray-300 rounded-none px-0 h-10 focus:outline-none focus:border-pink-500 pr-10 placeholder-slate-500 text-slate-800"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500"
						>
							{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>

					<button
						type="submit"
						disabled={loading}
						className={`w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>

				<p className="text-sm text-center text-pink-800 mt-6">
					Don't have an account?{" "}
					<a href="/register" className="text-pink-600 hover:underline">
						Register now!
					</a>
				</p>
			</div>
		</div>
	);
}
