import React, { useState } from 'react';
import { Modal, Button, Menu } from 'antd';
import { LogOut, Sun, Moon, Monitor, ChevronLeft, SettingsIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme/useTheme';
import clsx from 'clsx';
import AuthService from '@/services/auth/AuthService';
import type { MenuProps } from 'antd'; // Import MenuProps for typing

interface ThemeOption {
	value: 'light' | 'dark' | 'system';
	label: string;
	icon: React.ReactNode;
}

interface SettingsProps {
	size?: number;
	showLabel?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ size, showLabel }) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [appearanceOpen, setAppearanceOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	// Theme options
	const themeOptions: ThemeOption[] = [
		{ value: 'light', label: 'Light', icon: <Sun size={18} /> },
		{ value: 'dark', label: 'Dark', icon: <Moon size={18} /> },
		{ value: 'system', label: 'System', icon: <Monitor size={18} /> },
	];

	const handleOpenSettings = () => {
		setSettingsOpen(true);
	};

	const handleCloseSettings = () => {
		setSettingsOpen(false);
	};

	const handleOpenAppearance = () => {
		setAppearanceOpen(true);
		setSettingsOpen(false);
	};

	const handleCloseAppearance = () => {
		setAppearanceOpen(false);
		setSettingsOpen(true);
	};

	const handleLogout = async () => {
		handleCloseSettings();
		try {
			await AuthService.logout();
			localStorage.removeItem('access_token');
			window.location.href = '/';
		} catch (error) {
			console.error('Logout error:', error);
			localStorage.removeItem('access_token');
			window.location.href = '/';
		}
	};

	const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
		setTheme(theme);
		handleCloseAppearance();
		setSettingsOpen(true);
	};

	// Determine if dark mode is active
	const isDarkMode =
		theme === 'dark' ||
		(theme === 'system' &&
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches);

	const settingsMenuItems: MenuProps['items'] = [
		{
			key: 'appearance',
			label: 'Switch Appearance',
			icon: <Sun size={18} />,
			onClick: handleOpenAppearance,
			className: 'flex items-center',
		},
		{
			type: 'divider' as const,
			style: { margin: '16px 0' },
			className: clsx(isDarkMode ? 'bg-gray-700' : 'bg-gray-200'),
		},
		{
			key: 'logout',
			label: 'Logout',
			icon: <LogOut size={18} />,
			onClick: handleLogout,
			danger: true,
			className: 'flex items-center',
		},
	];

	const appearanceMenuItems: MenuProps['items'] = themeOptions.map((option) => ({
		key: option.value,
		label: option.label,
		icon: option.icon,
		onClick: () => handleThemeChange(option.value),
		className: 'flex items-center',
	}));

	return (
		<>
			{/* Settings Button */}
			<button
				onClick={handleOpenSettings}
				className="flex items-center p-3 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
			>
				<SettingsIcon size={size} className={clsx({ 'mr-4': showLabel, 'mr-0': !showLabel })} />
				{showLabel && <span>Settings</span>}
			</button>

			{/* Settings Modal */}
			<Modal
				title="Settings"
				open={settingsOpen}
				onCancel={handleCloseSettings}
				footer={null}
				width={300}
				className={clsx(isDarkMode && 'ant-modal-dark-theme')}
				style={{
					position: 'absolute',
					left: '4rem',
					bottom: '4rem',
					right: 'auto',
					top: 'auto',
				}}
				styles={{
					content: {
						background: isDarkMode ? '#101828' : '#ffffff',
					},
					header: {
						background: isDarkMode ? '#101828' : '#ffffff',
						borderBottom: isDarkMode ? '1px solid #364153' : '1px solid #e5e7eb',
						paddingBottom: '0.5rem',
					},
				}}
			>
				<Menu
					mode="vertical"
					className={clsx('border-none', isDarkMode && 'ant-menu-dark')}
					theme={isDarkMode ? 'dark' : 'light'}
					selectedKeys={['']}
					items={settingsMenuItems}
				/>
			</Modal>

			{/* Appearance Modal */}
			<Modal
				title={
					<div className="flex items-center">
						<Button
							type="text"
							icon={<ChevronLeft size={18} color={isDarkMode ? 'rgba(255, 255, 255, 0.45)' : '#000000'} />}
							onClick={handleCloseAppearance}
							className="mr-2"
						/>
						<span>Appearance</span>
					</div>
				}
				open={appearanceOpen}
				onCancel={handleCloseAppearance}
				footer={null}
				width={300}
				className={clsx(isDarkMode && 'ant-modal-dark-theme')}
				style={{
					position: 'absolute',
					left: '4rem',
					bottom: '4rem',
					right: 'auto',
					top: 'auto',
				}}
				styles={{
					content: {
						background: isDarkMode ? '#101828' : '#ffffff',
					},
					header: {
						background: isDarkMode ? '#101828' : '#ffffff',
						borderBottom: isDarkMode ? '1px solid #364153' : '1px solid #e5e7eb',
						paddingBottom: '0.5rem',
					},
				}}
			>
				<Menu
					mode="vertical"
					className={clsx('border-none', isDarkMode && 'ant-menu-dark')}
					theme={isDarkMode ? 'dark' : 'light'}
					selectedKeys={[theme]}
					items={appearanceMenuItems}
				/>
			</Modal>
		</>
	);
};

export default Settings;
