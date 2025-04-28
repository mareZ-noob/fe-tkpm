import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, PlusSquare, FileText, FileVideo, User, PanelLeftClose, PanelRightClose } from 'lucide-react';
import NavigationButton from '@/components/button/NavigationButton';
import { Constants } from '@/configs/constant';
import Settings from '@/components/button/SettingButton';

const NavigationLayout: React.FC = () => {
	const [expanded, setExpanded] = useState(true);
	const toggleSidebar = () => setExpanded(!expanded);
	const navIconSize = Constants.navIconSize;

	const navItems = [
		{ to: '/dashboard', icon: <LayoutDashboard size={navIconSize} />, label: 'Dashboard' },
		{ to: '/documents', icon: <FileText size={navIconSize} />, label: 'Documents' },
		{ to: '/create', icon: <PlusSquare size={navIconSize} />, label: 'Create' },
		{ to: '/videos', icon: <FileVideo size={navIconSize} />, label: 'Videos' },
		{ to: '/profile', icon: <User size={navIconSize} />, label: 'Profile' }
	];

	return (
		<div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
			{/* Sidebar for desktop */}
			<aside
				className={clsx(
                    "hidden md:flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-300 px-4 py-8",
                    "bg-white dark:bg-slate-800",
                    expanded ? 'w-70' : 'w-20'
                )}
			>
				<div
					className={clsx("p-2 flex items-center mb-8",
						expanded ? 'justify-between' : 'justify-center'
					)}
				>
					{expanded && (
						<NavLink to="/dashboard" className="cursor-pointer text-4xl font-app font-bold">
							saikou
						</NavLink>
					)}
					<button
						onClick={toggleSidebar}
						className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer relative group transition-colors duration-200"
					>
						{expanded ? <PanelLeftClose size={30} /> : <PanelRightClose size={30} />}
						<span className="absolute z-30 left-full ml-2 top-1/2 transform -translate-y-1/2 w-max px-2 py-1 text-xs bg-gray-700 dark:bg-gray-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
							{expanded ? 'Close Sidebar' : 'Open Sidebar'}
						</span>
					</button>
				</div>

				<nav className="flex flex-col gap-8">
					{navItems.map((item) => (
						<NavigationButton
							key={item.to}
							to={item.to}
							icon={item.icon}
							label={item.label}
							showLabel={expanded}
						/>
					))}
				</nav>

				{/* Settings Button and text go here*/}
				<div className="mt-auto mb-4 cursor-pointer">
					<Settings size={parseInt(navIconSize)} showLabel={expanded} />
				</div>
			</aside>

			{/* Bottom navigation for mobile */}
			<div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-20">
				<div className="flex justify-around px-2 py-3">
					{navItems.slice(0, 5).map((item) => (
						<NavigationButton
							key={item.to}
							to={item.to}
							icon={item.icon}
							label={item.label}
							showLabel={false}
						/>
					))}
				</div>
			</div>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-purple-50 dark:bg-slate-900">
				<Outlet />
			</main>
		</div>
	);
};

export default NavigationLayout;
