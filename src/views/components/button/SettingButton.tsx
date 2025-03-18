import React, { useState } from 'react';
import { Modal, Button, Menu, Divider } from 'antd';
import { LogOut, Sun, Moon, Monitor, ChevronLeft, SettingsIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme/useTheme';
import clsx from 'clsx';

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

	const handleLogout = () => {
		handleCloseSettings();
	};

	const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
		setTheme(theme);
		handleCloseAppearance();
		setSettingsOpen(true);
	};

	// Determine if dark mode is active
	const isDarkMode = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	return (
		<>
			{/* Settings Button */}
			<button
				onClick={handleOpenSettings}
				className="flex items-center p-3 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			>
				<SettingsIcon size={size} className={clsx({ 'mr-4': showLabel, 'mr-0': !showLabel })} />

				{/* Show label when expanded */}
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
				styles={{
					content: {
						background: isDarkMode ? '#101828' : '#ffffff',
					},
					header: {
						background: isDarkMode ? '#101828' : '#ffffff',
						borderBottom: isDarkMode ? '1px solid #364153' : '1px solid #e5e7eb',
					},
				}}
			>
				<Menu
					mode="vertical"
					className={clsx('border-none', isDarkMode && 'ant-menu-dark')}
					theme={isDarkMode ? 'dark' : 'light'}
					selectedKeys={[""]}
				>
					<Menu.Item
						key="appearance"
						onClick={handleOpenAppearance}
						icon={<Sun size={18} />}
						className={'flex items-center'}
					>
						Switch Appearance
					</Menu.Item>
					<Divider className={clsx('my-2', isDarkMode ? 'bg-gray-700' : 'bg-gray-200')} />
					<Menu.Item
						key="logout"
						onClick={handleLogout}
						icon={<LogOut size={18} />}
						danger
						className="flex items-center"
					>
						Logout
					</Menu.Item>
				</Menu>
			</Modal>

			{/* Appearance Modal */}
			<Modal
				title={
					<div className="flex items-center">
						<Button
							type="text"
							icon={<ChevronLeft size={18} color={isDarkMode ? 'rgba(255, 255, 255, 0.45)' : '#000000'} />}
							onClick={handleCloseAppearance}
							className={'mr-2'}
						/>
						<span>Appearance</span>
					</div>
				}
				open={appearanceOpen}
				onCancel={handleCloseAppearance}
				footer={null}
				width={300}
				className={clsx(isDarkMode && 'ant-modal-dark-theme')}
				styles={{
					content: {
						background: isDarkMode ? '#101828' : '#ffffff',
					},
					header: {
						background: isDarkMode ? '#101828' : '#ffffff',
						borderBottom: isDarkMode ? '1px solid #364153' : '1px solid #e5e7eb',
					},
				}}
			>
				<Menu
					mode="vertical"
					className={clsx('border-none', isDarkMode && 'ant-menu-dark')}
					theme={isDarkMode ? 'dark' : 'light'}
					selectedKeys={[theme]}
				>
					{themeOptions.map((option) => (
						<Menu.Item
							key={option.value}
							icon={option.icon}
							onClick={() => handleThemeChange(option.value)}
							className={'flex items-center'}
						>
							{option.label}
						</Menu.Item>
					))}
				</Menu>
			</Modal>
		</>
	);
};

export default Settings;