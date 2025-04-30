import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface RecentItemsSectionProps<T extends { id: string; updated_at?: string; publishedAt?: string }> {
	title: string;
	items: T[];
	isLoading: boolean;
	error: string | null;
	renderItem: (item: T) => React.ReactNode;
	sortBy: 'updated_at' | 'publishedAt';
	maxItems?: number;
	emptyStateMessage?: string;
}

const RecentItemsSection = <T extends { id: string; updated_at?: string; publishedAt?: string }>({
	title,
	items,
	isLoading,
	error,
	renderItem,
	sortBy,
	maxItems = 3,
	emptyStateMessage = "No items found.",
}: RecentItemsSectionProps<T>) => {

	const sortedItems = [...items].sort((a, b) => {
		const dateA = new Date(sortBy === 'publishedAt' ? a.publishedAt! : a.updated_at!).getTime();
		const dateB = new Date(sortBy === 'publishedAt' ? b.publishedAt! : b.updated_at!).getTime();

		if (isNaN(dateB) && isNaN(dateA)) return 0;
		if (isNaN(dateB)) return -1;
		if (isNaN(dateA)) return 1;

		return dateB - dateA;
	});


	const itemsToShow = sortedItems.slice(0, maxItems);

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">{title}</h2>
			</div>

			{isLoading && (
				<div className="flex justify-center items-center h-40">
					<Loader2 className="h-8 w-8 animate-spin text-gray-500" />
					<span className="ml-2 text-gray-500">Loading...</span>
				</div>
			)}

			{error && !isLoading && (
				<div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
					<AlertCircle className="h-5 w-5 mr-2" />
					<span>Error loading items: {error}</span>
				</div>
			)}

			{!isLoading && !error && itemsToShow.length === 0 && (
				<div className="text-center text-gray-500 py-8">
					{emptyStateMessage}
				</div>
			)}

			{!isLoading && !error && itemsToShow.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{itemsToShow.map(item => (
						<React.Fragment key={item.id}>
							{renderItem(item)}
						</React.Fragment>
					))}
				</div>
			)}
		</div>
	);
}

export default RecentItemsSection;
