import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavigationButtonProps {
	to: string;
	icon: React.ReactNode;
	label: string;
	showLabel?: boolean;
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
	to,
	icon,
	label,
	showLabel = true
}) => {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				`flex items-center gap-4 p-3 rounded-md transition-all duration-200 ${isActive
					? 'font-bold bg-gray-100 dark:bg-gray-800'
					: 'hover:bg-gray-50 dark:hover:bg-gray-800'
				}`
			}
		>
			<div className="text-xl">{icon}</div>
			{showLabel && <span className="text-md">{label}</span>}
		</NavLink>
	);
};

export default NavigationButton;