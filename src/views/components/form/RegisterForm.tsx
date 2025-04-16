import type React from "react";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import AuthService from "@/services/auth/AuthService";

const RegisterForm = () => {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [message, setMessage] = useState({ type: "", text: "" });
	const [passwordStrength, setPasswordStrength] = useState({
		score: 0,
		hasMinLength: false,
		hasNumber: false,
		hasSpecialChar: false,
	});

	// Password strength checker
	useEffect(() => {
		const hasMinLength = password.length >= 8;
		const hasNumber = /\d/.test(password);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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
	}, [password]);

	const validateInputs = () => {
		const newErrors: { [key: string]: string } = {};
		if (!username.trim()) newErrors.username = "Username is required";
		if (!email.includes("@")) newErrors.email = "Invalid email format";
		if (!passwordStrength.hasMinLength)
			newErrors.password = "Password must be at least 8 characters";
		if (password !== confirmPassword)
			newErrors.confirmPassword = "Passwords do not match";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setMessage({ type: "", text: "" });
		if (!validateInputs()) return;

		try {
			const data = await AuthService.register({
				username,
				email,
				password,
			});

			if (data.id) {
				setMessage({
					type: "success",
					text: "Register successful! Redirecting...",
				});
				setTimeout(() => {
					window.location.href = "/login";
				}, 3000);
			} else {
				setMessage({
					type: "error",
					text: data.msg || "Invalid credentials",
				});
				setErrors({ form: data.msg || "Registration failed" });
			}
		} catch (error) {
			console.error("An unexpected error happened:", error);
			setMessage({
				type: "error",
				text: "Server error. Please try again later.",
			});
			setErrors({ form: "Something went wrong. Please try again." });
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
		if (!password) return "";
		switch (passwordStrength.score) {
			case 1: return "Weak";
			case 2: return "Medium";
			case 3: return "Strong";
			default: return "Very Weak";
		}
	};

	return (
		<div className="w-full max-w-md bg-pink-50 p-8 rounded-lg shadow-md">
			<h2 className="text-2xl font-semibold text-pink-600 mb-6 text-center">
				Create Account
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

			<form onSubmit={handleSubmit} className="space-y-5">
				<div>
					<input
						type="text"
						placeholder="Username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 ${errors.username ? "border-red-500" : "border-gray-300"
							}`}
					/>
					{errors.username && (
						<p className="text-red-500 text-sm">
							{errors.username}
						</p>
					)}
				</div>

				<div>
					<input
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 ${errors.email ? "border-red-500" : "border-gray-300"
							}`}
					/>
					{errors.email && (
						<p className="text-red-500 text-sm">{errors.email}</p>
					)}
				</div>

				<div className="space-y-3">
					<div className="relative">
						<input
							type={showPassword ? "text" : "password"}
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 pr-10 ${errors.password ? "border-red-500" : "border-gray-300"
								}`}
							aria-invalid={password !== "" && passwordStrength.score < 2}
							aria-describedby="password-strength"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500"
							aria-label={showPassword ? "Hide password" : "Show password"}
						>
							{showPassword ? (
								<EyeOff size={18} />
							) : (
								<Eye size={18} />
							)}
						</button>
					</div>

					{password && (
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

					{errors.password && (
						<p className="text-red-500 text-sm">
							{errors.password}
						</p>
					)}
				</div>

				<div className="relative">
					<input
						type={showConfirmPassword ? "text" : "password"}
						placeholder="Confirm Password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 pr-10 ${errors.confirmPassword ? "border-red-500" : "border-gray-300"
							}`}
					/>
					<button
						type="button"
						onClick={() => setShowConfirmPassword(!showConfirmPassword)}
						className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500"
						aria-label={showConfirmPassword ? "Hide password" : "Show password"}
					>
						{showConfirmPassword ? (
							<EyeOff size={18} />
						) : (
							<Eye size={18} />
						)}
					</button>
					{errors.confirmPassword && (
						<p className="text-red-500 text-sm">
							{errors.confirmPassword}
						</p>
					)}
				</div>

				{errors.form && (
					<p className="text-red-500 text-center text-sm">
						{errors.form}
					</p>
				)}

				<button
					type="submit"
					className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md transition-colors"
				>
					Register
				</button>
			</form>

			<div className="text-sm text-center text-pink-800 mt-6">
				<div>
					<span>Already have an account? </span>
					<a
						href="/login"
						className="text-pink-600 hover:underline"
					>
						Log in
					</a>
				</div>
			</div>
		</div>
	);
}

export default RegisterForm;
