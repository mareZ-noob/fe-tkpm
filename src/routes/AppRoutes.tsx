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
import VideosPage from "@/pages/video/VideoPage";
import FilesPage from "@/pages/documents/DocumentPage";
import CreatePage from "@/pages/create/CreatePage";
import AuthService from "@/services/auth/AuthService";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

interface PublicRouteProps {
	children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
	const isAuthenticated = AuthService.getCurrentUser();

	return isAuthenticated ? (
		<Navigate to={Path.user.outlets.dashboard} replace />
	) : (
		<>{children}</>
	);
};

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const isAuthenticated = AuthService.getCurrentUser();

	// For testing purposes, you can uncomment the line below to simulate an authenticated user
	// const isAuthenticated = true;

	return isAuthenticated ? (
		<>{children}</>
	) : (
		<Navigate to={Path.login.index} />
	);
};

const AppRoutes: React.FC = () => {
	return (
		<div>
			<Routes>
				<Route path="*" element={<NotFoundPage />} />
				<Route path={Path.root.index} element={<WelcomePage />} />

				<Route
					path={Path.login.index}
					element={
						<PublicRoute>
							<LoginPage />
						</PublicRoute>
					}
				/>
				<Route
					path={Path.register.index}
					element={
						<PublicRoute>
							<RegisterPage />
						</PublicRoute>
					}
				/>
				<Route
					path={Path.forgotPassword.index}
					element={
						<PublicRoute>
							<ForgotPasswordPage />
						</PublicRoute>
					}
				/>
				<Route
					path={Path.resetPassword.index}
					element={
						<PublicRoute>
							<ResetPasswordPage />
						</PublicRoute>
					}
				/>

				<Route element={<NavigationLayout />}>
					<Route
						path={Path.user.outlets.dashboard}
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path={Path.user.outlets.profile}
						element={
							<ProtectedRoute>
								<ProfilePage />
							</ProtectedRoute>
						}
					/>
					<Route
						path={Path.user.outlets.videos}
						element={
							<ProtectedRoute>
								<VideosPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path={Path.user.outlets.documents}
						element={
							<ProtectedRoute>
								<FilesPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path={Path.user.outlets.create}
						element={
							<ProtectedRoute>
								<CreatePage />
							</ProtectedRoute>
						}
					/>
				</Route>
			</Routes>
		</div>
	);
};
export default AppRoutes;
