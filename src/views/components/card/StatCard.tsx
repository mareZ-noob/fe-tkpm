import React from "react";

interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
}

const StatCard = ({ title, value, icon }: StatCardProps) => {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 p-4">
			<div className="flex items-center justify-between pb-2">
				<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
				{icon}
			</div>
			<div>
				<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
				{/* Trend removed as per request */}
				{/* <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Some static text if needed</p> */}
			</div>
		</div>
	);
};

export default StatCard;
