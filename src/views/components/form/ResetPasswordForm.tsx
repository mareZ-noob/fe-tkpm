import { useState, useEffect } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import AuthService from "@/services/auth/AuthService";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPasswordForm() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [token, setToken] = useState<string>("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [loading, setLoading] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState({
		score: 0,
		hasMinLength: false,
		hasNumber: false,
		hasSpecialChar: false,
	});

	useEffect(() => {
		const urlToken = searchParams.get("token");
		if (!urlToken) {
			setMessage({
				type: "error",
				text: "Invalid or missing reset token. Please request a new password reset link.",
			});
		} else {
			setToken(urlToken);
		}
	}, [searchParams]);

	// Password strength checker
	useEffect(() => {
		const hasMinLength = newPassword.length >= 8;
		const hasNumber = /\d/.test(newPassword);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

		let score = 0;
		if (hasMinLength) score++;
		if (hasNumber) score++;
		if (hasSpecialChar) score++;

		setPasswordStrength({
			score,
			hasMinLength,
			hasNumber,
			hasSpecialChar
		});
	}, [newPassword]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Clear previous messages
		setMessage({ type: "", text: "" });

		// Validate passwords match
		if (newPassword !== confirmPassword) {
			setMessage({
				type: "error",
				text: "Passwords don't match",
			});
			return;
		}

		// Validate password strength
		if (!passwordStrength.hasMinLength) {
			setMessage({
				type: "error",
				text: "Password must be at least 8 characters long",
			});
			return;
		}

		setLoading(true);

		try {
			await AuthService.resetPassword(token, newPassword);

			setMessage({
				type: "success",
				text: "Password reset successful! Redirecting to login...",
			});

			setTimeout(() => navigate("/login"), 3000);
		} catch (error: any) {
			console.error("An error occurred during password reset:", error);

			let errorMessage = "Failed to reset password. Please try again.";
			if (error?.response?.data?.msg) {
				errorMessage = error.response.data.msg;
			} else if (error?.message) {
				errorMessage = error.message;
			}

			setMessage({ type: "error", text: errorMessage });
		} finally {
			setLoading(false);
		}
	};

	const getStrengthColor = () => {
		switch (passwordStrength.score) {
			case 0: return "bg-gray-200";
			case 1: return "bg-red-500";
			case 2: return "bg-yellow-500";
			case 3: return "bg-green-500";
			default: return "bg-gray-200";
		}
	};

	const getStrengthText = () => {
		if (!newPassword) return "";
		switch (passwordStrength.score) {
			case 1: return "Weak";
			case 2: return "Medium";
			case 3: return "Strong";
			default: return "Very Weak";
		}
	};

	return (
		<div className="w-full max-w-md bg-pink-50 p-8 rounded-lg shadow-md">
			<div className="w-full">
				<h2 className="text-2xl font-semibold text-pink-600 mb-8 text-center">
					Reset Your Password
				</h2>

				{message.text && (
					<div
						className={`text-sm p-3 rounded-md text-center mb-4 ${message.type === "success"
							? "bg-green-200 text-green-700"
							: "bg-red-200 text-red-700"
							}`}
						role="alert"
						aria-live="assertive"
					>
						{message.type === "success" ? (
							<Check className="inline-block mr-1" size={16} />
						) : (
							<AlertCircle className="inline-block mr-1" size={16} />
						)}
						{message.text}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-3">
						<label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
							New Password
						</label>
						<div className="relative">
							<input
								id="new-password"
								type={showPassword ? "text" : "password"}
								placeholder="Enter new password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								className="w-full bg-transparent border-b border-gray-300 rounded-none px-0 h-10 focus:outline-none focus:border-pink-500 pr-10 placeholder-slate-500 text-slate-800"
								disabled={!token || loading}
								aria-invalid={newPassword !== "" && passwordStrength.score < 2}
								aria-describedby="password-strength"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500"
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>

						{newPassword && (
							<div className="mt-2" id="password-strength">
								<div className="flex items-center mb-1">
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className={`h-2 rounded-full ${getStrengthColor()}`}
											style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
										/>
									</div>
									<span className="text-xs text-gray-700 ml-2">{getStrengthText()}</span>
								</div>

								<ul className="text-xs text-gray-600 list-disc pl-5 mt-1 space-y-1">
									<li className={passwordStrength.hasMinLength ? "text-green-600" : ""}>
										At least 8 characters
									</li>
									<li className={passwordStrength.hasNumber ? "text-green-600" : ""}>
										At least 1 number
									</li>
									<li className={passwordStrength.hasSpecialChar ? "text-green-600" : ""}>
										At least 1 special character (!@#$%^&*(),.?":{ }|&lt;&gt;)
									</li>
								</ul>
							</div>
						)}
					</div>

					<div className="space-y-3">
						<label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
							Confirm Password
						</label>
						<div className="relative">
							<input
								id="confirm-password"
								type={showPassword ? "text" : "password"}
								placeholder="Confirm your password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								className="w-full bg-transparent border-b border-gray-300 rounded-none px-0 h-10 focus:outline-none focus:border-pink-500 pr-10 placeholder-slate-500 text-slate-800"
								disabled={!token || loading}
								aria-invalid={confirmPassword !== "" && confirmPassword !== newPassword}
							/>
						</div>
						{confirmPassword && newPassword !== confirmPassword && (
							<p className="text-sm text-red-600 mt-1">Passwords don't match</p>
						)}
					</div>

					<button
						type="submit"
						disabled={!token || loading}
						className={`w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md transition-colors ${!token || loading ? "opacity-50 cursor-not-allowed" : ""
							}`}
					>
						{loading ? "Resetting Password..." : "Reset Password"}
					</button>
				</form>

				<div className="text-sm text-center text-pink-800 mt-6">
					<div>
						<span>Remember your password? </span>
						<a href="/login" className="text-pink-600 hover:underline">
							Login
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
