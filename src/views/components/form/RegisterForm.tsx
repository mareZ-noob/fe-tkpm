"use client";

import type React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterForm() {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});

	const [message, setMessage] = useState({ type: "", text: "" });

	const validateInputs = () => {
		const newErrors: { [key: string]: string } = {};
		if (!username.trim()) newErrors.username = "Username is required";
		if (!email.includes("@")) newErrors.email = "Invalid email format";
		if (password.length < 6)
			newErrors.password = "Password must be at least 6 characters";
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
			const response = await fetch("http://localhost:5000/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, email, password }),
			});

			const data = await response.json();
			if (response.ok) {
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
					text: data.message || "Invalid credentials",
				});
				setErrors({ form: data.message || "Registration failed" });
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

	return (
		<div className="w-full max-w-md bg-pink-50 p-8 rounded-lg shadow-md">
			<h2 className="text-2xl font-semibold text-pink-600 mb-6 text-center">
				Create Account
			</h2>

			{message.text && (
				<div className={`text-sm p-2 rounded-md text-center ${message.type === "success" ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"}`}>
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
						className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 ${errors.username
								? "border-red-500"
								: "border-gray-300"
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

				<div className="relative">
					<input
						type={showPassword ? "text" : "password"}
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 pr-10 ${errors.password
								? "border-red-500"
								: "border-gray-300"
							}`}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500"
					>
						{showPassword ? (
							<EyeOff size={18} />
						) : (
							<Eye size={18} />
						)}
					</button>
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
						className={`w-full bg-transparent border-b px-0 h-10 placeholder-gray-500 text-gray-800 focus:outline-none focus:border-pink-500 pr-10 ${errors.confirmPassword
								? "border-red-500"
								: "border-gray-300"
							}`}
					/>
					<button
						type="button"
						onClick={() =>
							setShowConfirmPassword(!showConfirmPassword)
						}
						className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500"
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
					className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md"
				>
					Register
				</button>
			</form>

			<p className="text-sm text-center text-pink-800 mt-6">
				Already have an account?{" "}
				<a href="/" className="text-pink-600 hover:underline">
					Log in
				</a>
			</p>
		</div>
	);
}
