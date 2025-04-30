import React from "react";
import { FileText, Star, Clock } from 'lucide-react';
import { BaseDocument } from "@/interfaces/document/DocumentInterface";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";

interface DocumentCardProps {
	document: BaseDocument;
}

const DocumentCard = ({ document }: DocumentCardProps) => {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600 shadow-md dark:shadow-md hover:shadow-lg dark:hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col h-full">
			<div className="p-4 pb-3 flex-grow">
				<div className="flex items-start justify-between mb-2">
					<div className="flex items-center gap-2 overflow-hidden">
						<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-400/15 flex items-center justify-center flex-shrink-0">
							<FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
						</div>
						<h3
							className="font-medium text-gray-900 dark:text-gray-100 truncate"
							title={document.title || "Untitled Document"}
						>
							{document.title || "Untitled Document"}
						</h3>
					</div>
					{document.starred && (
						<Star className="h-4 w-4 text-yellow-400 dark:text-yellow-400 fill-yellow-400 dark:fill-yellow-400 flex-shrink-0" />
					)}
				</div>
				<p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">
					{document.content || "No content preview available."}
				</p>
			</div>
			<div className="px-4 py-3 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 mt-auto">
				<div className="flex items-center gap-1">
					<Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
					<span>Updated {FormatRelativeTime(document.updated_at)}</span>
				</div>
			</div>
		</div>
	);
};

export default DocumentCard;
