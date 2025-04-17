import React from "react"
import { Link } from "react-router-dom"
import { Film } from 'lucide-react'

const WelcomePage: React.FC = () => {
	return (
		<div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col items-center justify-center p-4">
			<div className="max-w-3xl w-full text-center">
				<div className="mb-6 flex justify-center">
					<div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center">
						<Film size={32} className="text-white" />
					</div>
				</div>

				<h1 className="text-4xl md:text-5xl font-bold text-pink-600 mb-4">Turn Ideas Into Videos with AI</h1>

				<p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
					Transform your ideas into stunning videos with our AI video generator.
					Easy to use Text-to-Video editor featuring lifelike voiceovers, dynamic AI video clips,
					and a wide range of AI-powered features.
				</p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
					<Link
						to="/login"
						className="px-8 py-3 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors duration-300 text-lg font-medium"
					>
						Log In
					</Link>

					<Link
						to="/register"
						className="px-8 py-3 bg-white text-pink-500 border border-pink-200 rounded-md hover:bg-pink-50 transition-colors duration-300 text-lg font-medium"
					>
						Register
					</Link>
				</div>

				<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
					<FeatureCard
						icon="✨"
						title="AI-Powered Creation"
						description="Create professional videos in minutes with our advanced AI technology."
					/>
					<FeatureCard
						icon="🎙️"
						title="Natural Voiceovers"
						description="Choose from dozens of lifelike AI voices in multiple languages."
					/>
					<FeatureCard
						icon="🎬"
						title="Dynamic Editing"
						description="Easily customize styles, transitions, and effects with our intuitive editor."
					/>
				</div>

				<footer className="mt-16 text-sm text-gray-500">
					<p>© 2025 AI Video Generator. All rights reserved.</p>
				</footer>
			</div>
		</div>
	)
}

interface FeatureCardProps {
	icon: string
	title: string
	description: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
	return (
		<div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
			<div className="text-3xl mb-4">{icon}</div>
			<h3 className="text-xl font-semibold text-pink-600 mb-2">{title}</h3>
			<p className="text-gray-600">{description}</p>
		</div>
	)
}

export default WelcomePage;
