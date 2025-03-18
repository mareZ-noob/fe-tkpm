import { Navigate, Route, Routes } from "react-router-dom";
import { Path } from "./path";
import React from "react";
import ProfilePage from "@/pages/profile/ProfilePage";
import NotFoundPage from "@/pages/notfound/NotFoundPage";
import WelcomePage from "@/pages/welcome/WelcomePage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import NavigationLayout from "@/layouts/NavigationLayout";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import VideosPage from "@/pages/videos/VideosPage";
import FilesPage from "@/pages/files/FilesPage";
import CreatePage from "@/pages/create/CreatePage";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const token = localStorage.getItem("token");
	return token ? children : <Navigate to={Path.root.index} />;
};

const AppRoutes: React.FC = () => {
	return (
		<>
			<div>
				<Routes>
					<Route path="*" element={<NotFoundPage />} />
					<Route path={Path.root.index} element={<WelcomePage />} />

					<Route path={Path.login.index} element={<LoginPage />} />
					<Route path={Path.register.index} element={<RegisterPage />} />

					<Route element={<NavigationLayout />}>
						<Route path={Path.user.outlets.dashboard} element={<DashboardPage />} />
						<Route path={Path.user.outlets.profile} element={<ProfilePage />} />
						<Route path={Path.user.outlets.videos} element={<VideosPage />} />
						<Route path={Path.user.outlets.files} element={<FilesPage />} />
						<Route path={Path.user.outlets.create} element={<CreatePage />} />

						<Route
							path="/dashboard"
							element={
								<ProtectedRoute>
									<DashboardPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/profile"
							element={
								<ProtectedRoute>
									<ProfilePage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/videos"
							element={
								<ProtectedRoute>
									<VideosPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/files"
							element={
								<ProtectedRoute>
									<FilesPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/create"
							element={
								<ProtectedRoute>
									<CreatePage />
								</ProtectedRoute>
							}
						/>
					</Route>
				</Routes>
			</div>
		</>
	);
};
export default AppRoutes;
