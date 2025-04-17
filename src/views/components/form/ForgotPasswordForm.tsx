import { useState } from "react";
import AuthService from "@/services/auth/AuthService";

const ForgotPasswordForm = () => {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState({ type: "", text: "" });
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage({ type: "", text: "" });
		setLoading(true);

		try {
			await AuthService.forgotPassword(email);

			setMessage({
				type: "success",
				text: "Password reset email sent! Please check your inbox.",
			});
			setLoading(false);
		} catch (error: any) {
			console.error("Password reset request failed:", error);

			let errorMessage = "Server error. Please try again later.";
			if (error?.response?.data?.msg) {
				errorMessage = error.response.data.msg;
			} else if (error?.msg) {
				errorMessage = error.message;
			}

			setMessage({ type: "error", text: errorMessage });
			setLoading(false);
		}
	};

	return (
		<div className="w-full max-w-md bg-pink-50 p-8 rounded-lg shadow-md">
			<div className="w-full">
				<h2 className="text-2xl font-semibold text-pink-600 mb-4 text-center">
					Recover Password
				</h2>

				<p className="text-sm text-gray-600 mb-6 text-center">
					Enter your email address and we'll send you a link to reset your password.
				</p>

				{message.text && (
					<div
						className={`text-sm p-2 mb-4 rounded-md text-center ${message.type === "success"
							? "bg-green-200 text-green-700"
							: "bg-red-200 text-red-700"
							}`}
					>
						{message.text}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-2">
						<input
							type="email"
							placeholder="Email Address"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full bg-transparent border-b border-gray-300 rounded-none px-0 h-10 focus:outline-none focus:border-pink-500 placeholder-slate-500 text-slate-800"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className={`w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md ${loading ? "opacity-50 cursor-not-allowed" : ""
							}`}
					>
						{loading ? "Sending..." : "Send Reset Link"}
					</button>
				</form>

				<div className="text-sm text-center text-pink-800 mt-6 flex flex-col gap-2">
					<div>
						<span>Remember your password? </span>
						<a href="/login" className="text-pink-600 hover:underline">
							Log in
						</a>
					</div>
					<div>
						<span>Don't have an account? </span>
						<a href="/register" className="text-pink-600 hover:underline">Register</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ForgotPasswordForm;
