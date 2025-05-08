import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import ImageService from "@/services/image/ImageService";
import type { DisplayableImageResult, ImageResult as BackendImageResult, UploadUserImageResult } from "@/interfaces/image/ImageInterface";
import clsx from "clsx";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragOverlay,
	UniqueIdentifier,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, CheckCircle, GripVertical, ImageIcon, Loader2, PlusCircle, RefreshCw, Replace, Trash2, Upload, XCircle } from "lucide-react";

const generateFrontendId = () => `frontend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

interface DisplayableImageResultExtended extends DisplayableImageResult {
	file?: File;
}

interface ImageStepProps {
	textContent: string;
	model: string | null;
}

interface ParagraphGenerationState {
	paragraphId: string | number;
	content: string;
	taskId: string | null;
	status: 'idle' | 'pending' | 'generating' | 'uploading' | 'success' | 'failed' | 'polling_error';
	message: string | null;
	results: DisplayableImageResultExtended[];
	error: string | null;
	numImages: number;
}

export interface ImageStepHandle {
	prepareImagesForNextStep: () => Promise<string[]>;
}

interface SortableImageItemProps {
	image: DisplayableImageResultExtended;
	paragraphId: string | number;
	triggerFileInput: (paragraphId: string | number, imageId: string) => void;
	handleRemoveImage: (paragraphId: string | number, imageId: string) => void;
	isOverlay?: boolean;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({
	image,
	paragraphId,
	triggerFileInput,
	handleRemoveImage,
	isOverlay = false
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: image.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging || isOverlay ? 10 : 1,
		cursor: isOverlay ? 'grabbing' : 'grab',
	};

	const inputId = `file-input-${paragraphId}-${image.id}`;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={clsx(
				"aspect-square relative group border border-gray-300 dark:border-gray-600 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 transition-opacity",
				{ 'shadow-lg': isDragging || isOverlay }
			)}
		>
			{/* Hidden File Input for REPLACING this image */}
			<input
				type="file"
				id={inputId}
				className="hidden"
				accept="image/jpeg,image/png,image/webp,image/gif"
			// onChange is handled by parent via ref map
			/>

			{/* Image Container */}
			<div className="absolute inset-0 z-0">
				<img
					src={image.url} // Will be blob URL for pending uploads, final URL otherwise
					alt={image.prompt || `Image ${image.displayOrder + 1}`}
					className="w-full h-full object-cover"
					loading="lazy"
					onError={(e) => {
						console.error(`Error loading image: ${image.url}`);
						e.currentTarget.src = `https://placehold.co/300x300/eee/ccc?text=Load+Error`;
						e.currentTarget.alt = 'Error loading image';
					}}
				/>
			</div>

			{/* Control Overlay */}
			{!isDragging && !isOverlay && (
				<div className="absolute inset-0 z-10 bg-black opacity-0 group-hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"></div>
			)}

			{/* Control Buttons */}
			{!isDragging && !isOverlay && (
				<div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1 sm:gap-2">
					{/* Replace Button */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							triggerFileInput(paragraphId, image.id);
						}}
						className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs"
						title="Replace Image"
					>
						<Replace className="h-3 w-3 sm:h-4 sm:w-4" />
					</button>

					{/* Remove Button */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							handleRemoveImage(paragraphId, image.id);
						}}
						className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs"
						title="Remove Image"
					>
						<Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
					</button>
					{/* Drag Handle */}
					<div
						{...attributes}
						{...listeners}
						className="p-2 text-white cursor-grab"
						title="Drag to reorder"
					>
						<GripVertical className="h-3 w-3 sm:h-4 sm:w-4" />
					</div>
				</div>
			)}

			{/* Uploaded Indicator */}
			{image.isUploaded && (
				<div className="absolute top-1 right-1 z-30 bg-blue-500 text-white p-1 rounded-full text-xs" title="User uploaded">
					<Upload className="h-3 w-3" />
				</div>
			)}
		</div>
	);
};

const ImageStep = forwardRef<ImageStepHandle, ImageStepProps>(({
	textContent,
	model
}, ref) => {
	const [paragraphsState, setParagraphsState] = useState<ParagraphGenerationState[]>([]);
	const [globalError, setGlobalError] = useState<string | null>(null);
	const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null); // Use UniqueIdentifier
	const pollingIntervals = useRef<Record<string | number, NodeJS.Timeout | null>>({});
	const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	useEffect(() => {
		const split = textContent.split(/\n\n+/).map((p) => p.trim()).filter((p) => p);
		setParagraphsState(prevStates => {
			const newStates: ParagraphGenerationState[] = split.map((content, index) => {
				const existing = prevStates.find(p => p.paragraphId === index);
				const ensureIdsAndOrder = (results: DisplayableImageResultExtended[]): DisplayableImageResultExtended[] => {
					const sorted = [...results].sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity));
					return sorted.map((img, idx) => ({
						...img,
						id: img.id || generateFrontendId(),
						displayOrder: idx
					}));
				};

				if (existing && existing.content === content) {
					// Preserve existing state if content hasn't changed
					const updatedResults = ensureIdsAndOrder(existing.results);
					return { ...existing, results: updatedResults };
				}

				// Initialize new state for new or changed paragraph
				return {
					paragraphId: index, content: content, taskId: null, status: 'idle',
					message: null, results: [], error: null, numImages: 2 // Default numImages
				};
			});

			// Cleanup logic (unchanged from previous version)
			const currentParagraphIds = new Set(newStates.map(p => p.paragraphId));
			const currentImageIds = new Set(newStates.flatMap(p => p.results.map(img => img.id)));

			Object.keys(pollingIntervals.current).forEach(idStr => {
				const id = parseInt(idStr, 10);
				if (!currentParagraphIds.has(id)) stopPolling(id);
			});

			Object.keys(fileInputRefs.current).forEach(refKey => {
				const parts = refKey.split('-');
				const type = parts[0];
				const paragraphId = parseInt(parts[parts.length - 1], 10);

				if (!currentParagraphIds.has(paragraphId)) {
					delete fileInputRefs.current[refKey];
					return;
				}

				if (type === 'file' && refKey.startsWith('file-input-')) {
					const imageId = parts.slice(2, -1).join('-');
					if (!currentImageIds.has(imageId)) {
						delete fileInputRefs.current[refKey];
					}
				}
			});

			return newStates;
		});

		if (!model) {
			setGlobalError("Image generation model not selected.");
		} else {
			setGlobalError(null);
		}
	}, [textContent, model]);

	// Stop Polling
	const stopPolling = useCallback((paragraphId: string | number) => {
		if (pollingIntervals.current[paragraphId]) {
			clearInterval(pollingIntervals.current[paragraphId]!);
			delete pollingIntervals.current[paragraphId];
			console.log(`Stopped polling for paragraph ${paragraphId}`);
		}
	}, []);

	// Cleanup Polling on Unmount
	useEffect(() => {
		return () => {
			Object.keys(pollingIntervals.current).forEach(id => stopPolling(parseInt(id, 10)));

			// Revoke blob URLs on unmount
			paragraphsState.forEach(pState => {
				pState.results.forEach(img => {
					if (img.isUploaded && img.url.startsWith('blob:')) {
						URL.revokeObjectURL(img.url);
					}
				});
			});
		};
	}, [stopPolling]);

	// Image Generation and Status Polling
	const checkStatusAndUpdateState = useCallback(async (paragraphId: string | number, taskId: string) => {
		try {
			const response = await ImageService.checkImageStatus(taskId);
			let shouldStopPolling = false;

			setParagraphsState(prevStates =>
				prevStates.map(p => {
					if (p.paragraphId === paragraphId && p.taskId === taskId) {
						const isOngoing = response.status === 'PENDING' || response.status === 'RETRY' || (response.status === 'SUCCESS' && !response.completed);
						if (p.status === response.status && isOngoing && p.message === response.msg) return p;

						let newStatus: ParagraphGenerationState['status'] = p.status;
						let newMessage: string | null = response.msg;
						let newError: string | null = null;
						let newResults: DisplayableImageResultExtended[] = p.results;

						switch (response.status) {
							case 'PENDING':
							case 'RETRY':
								newStatus = 'pending';
								newMessage = response.msg || 'Waiting...';
								shouldStopPolling = false;
								break;
							case 'SUCCESS':
								if (response.completed) {
									newStatus = 'success';
									newResults = (response.images || []).map((img: BackendImageResult, index: number): DisplayableImageResultExtended => ({
										id: img.image_id || img.public_id || generateFrontendId(),
										paragraphId: img.paragraph_id,
										prompt: img.prompt,
										url: img.url,
										public_id: img.public_id,
										image_id: img.image_id,
										isUploaded: false,
										displayOrder: index,
										file: undefined
									}));

									newMessage = response.msg || 'Generation successful.';
									shouldStopPolling = true;
								} else {
									newStatus = 'uploading'; // Or 'generating'
									newMessage = response.msg || 'Processing...';
									if (response.images?.length) {
										newResults = response.images.map((img, index) => ({
											id: img.image_id || img.public_id || generateFrontendId(),
											paragraphId: img.paragraph_id, prompt: img.prompt, url: img.url,
											public_id: img.public_id, image_id: img.image_id,
											isUploaded: false, displayOrder: index, file: undefined
										}));
									}
									shouldStopPolling = false;
								}
								break;
							case 'FAILURE':
								newStatus = 'failed';
								newError = response.error || response.msg || 'Generation failed.';
								newMessage = "Failed";
								newResults = [];
								shouldStopPolling = true;
								break;
							case 'FETCH_ERROR':
								newStatus = 'polling_error';
								newError = response.error || 'Failed to fetch status.';
								newMessage = "Polling Error";
								shouldStopPolling = false; // Keep polling? Maybe stop after a few tries? For now, keep trying.
								break;
							default:
								console.warn(`Unknown task status received: ${response.status}`);
								newStatus = 'failed';
								newError = `Unknown status: ${response.status}`;
								newMessage = "Unknown Error";
								newResults = [];
								shouldStopPolling = true;
								break;
						}

						// Only update state if something actually changed
						if (p.status !== newStatus || p.message !== newMessage || p.error !== newError || JSON.stringify(p.results.map(r => r.id)) !== JSON.stringify(newResults.map(r => r.id))) { // Compare based on IDs or URLs if stable
							return { ...p, status: newStatus, message: newMessage, results: newResults, error: newError };
						} else {
							if (newStatus === 'success' || newStatus === 'failed') shouldStopPolling = true;
							return p;
						}
					}
					return p;
				})
			);

			if (shouldStopPolling) {
				stopPolling(paragraphId);
			}
		} catch (error: any) {
			console.error(`!!! Critical Error in checkStatusAndUpdateState for task ${taskId}:`, error);
			setParagraphsState(prevStates =>
				prevStates.map(p =>
					p.paragraphId === paragraphId
						? { ...p, status: 'polling_error', error: `Polling failed: ${error.message}`, message: "Polling Error" }
						: p
				)
			);

			// Decide whether to stop polling on critical fetch errors
			stopPolling(paragraphId);
		}
	}, [stopPolling]);

	const startPolling = useCallback((paragraphId: string | number, taskId: string) => {
		stopPolling(paragraphId);
		console.log(`Starting polling for paragraph ${paragraphId}, task ${taskId}`);
		checkStatusAndUpdateState(paragraphId, taskId);
		const intervalId = setInterval(async () => {
			if (pollingIntervals.current[paragraphId]) {
				try {
					console.log(`Polling check for task ${taskId}...`);
					await checkStatusAndUpdateState(paragraphId, taskId);
				} catch (intervalError) {
					console.error(`!!! Error within setInterval loop for task ${taskId}:`, intervalError);
				}
			} else {
				clearInterval(intervalId);
				console.log(`Interval loop stopped for cleared task ${taskId}`);
			}
		}, 5000); // Poll every 5 seconds

		pollingIntervals.current[paragraphId] = intervalId;
	}, [stopPolling, checkStatusAndUpdateState]);

	const handleGenerateImages = async (paragraphId: string | number) => {
		if (!model) {
			setGlobalError("Model not selected.");
			return;
		}
		const paragraph = paragraphsState.find(p => p.paragraphId === paragraphId);
		if (!paragraph) return;

		// Revoke old blob URLs before generating new ones
		paragraph.results.forEach(img => {
			if (img.isUploaded && img.url.startsWith('blob:')) {
				URL.revokeObjectURL(img.url);
			}
		});

		setParagraphsState(prevStates =>
			prevStates.map(p =>
				p.paragraphId === paragraphId
					? { ...p, status: 'pending', error: null, message: 'Initiating...', taskId: null, results: [] } // Clear results
					: p
			)
		);

		try {
			const payload = { model, paragraph_id: paragraph.paragraphId, content: paragraph.content, num_images: paragraph.numImages };
			const response = await ImageService.generateImages(payload);

			if (response.success && response.task_id) {
				setParagraphsState(prevStates =>
					prevStates.map(p =>
						p.paragraphId === paragraphId
							? { ...p, taskId: response.task_id, message: 'Task started. Waiting...' }
							: p
					)
				);
				startPolling(paragraphId, response.task_id);
			} else {
				throw new Error(response.msg || "Backend failed to create the image generation task.");
			}
		} catch (error: any) {
			console.error(`Error generating images for paragraph ${paragraphId}:`, error);
			setParagraphsState(prevStates =>
				prevStates.map(p =>
					p.paragraphId === paragraphId
						? { ...p, status: 'failed', error: error.message, message: 'Failed to start.' }
						: p
				)
			);
		}
	};

	// User Image Upload and Handling
	const handleNumImagesChange = (paragraphId: string | number, value: string) => {
		const num = parseInt(value, 10);
		if (!isNaN(num) && num > 0 && num <= 10) { // Limit to 10 for example
			setParagraphsState(prevStates =>
				prevStates.map(p =>
					p.paragraphId === paragraphId ? { ...p, numImages: num } : p
				)
			);
		}
	};

	const triggerReplaceFileInput = (paragraphId: string | number, imageId: string) => {
		const inputId = `file-input-${paragraphId}-${imageId}`;
		fileInputRefs.current[inputId]?.click();
	};

	const triggerAddFileInput = (paragraphId: string | number) => {
		const inputId = `add-file-input-${paragraphId}`;
		fileInputRefs.current[inputId]?.click();
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, paragraphId: string | number, imageToReplaceId: string | null) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Basic File Validation (optional: add more checks)
		const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

		if (!allowedTypes.includes(file.type)) {
			alert("Invalid file type. Please select a JPEG, PNG, WEBP, or GIF image.");
			event.target.value = ''; return;
		}

		const maxSizeInBytes = 10 * 1024 * 1024; // 10MB limit
		if (file.size > maxSizeInBytes) {
			alert(`File is too large. Maximum size is ${maxSizeInBytes / 1024 / 1024}MB.`);
			event.target.value = ''; return;
		}

		const objectUrl = URL.createObjectURL(file); // Temporary URL for preview

		setParagraphsState(prevStates =>
			prevStates.map(p => {
				if (p.paragraphId === paragraphId) {
					let updatedResults: DisplayableImageResultExtended[];

					if (imageToReplaceId) { // Replacing
						let originalAIData: DisplayableImageResultExtended['originalAI'] | undefined = undefined;
						updatedResults = p.results.map(img => {
							if (img.id === imageToReplaceId) {
								// Revoke previous blob URL if it exists and belongs to a user upload
								if (img.isUploaded && img.url.startsWith('blob:')) {
									URL.revokeObjectURL(img.url);
								}
								// Store original AI data if replacing an AI image
								if (!img.isUploaded) {
									originalAIData = { url: img.url, public_id: img.public_id, image_id: img.image_id };
								}

								return {
									...img,
									url: objectUrl,
									isUploaded: true,
									file: file,
									prompt: undefined, public_id: undefined, image_id: undefined,
									originalAI: originalAIData || img.originalAI
								};
							}
							return img;
						});
					} else { // Adding new
						const newImage: DisplayableImageResultExtended = {
							id: generateFrontendId(),
							paragraphId: paragraphId,
							url: objectUrl,
							isUploaded: true,
							file: file,
							prompt: undefined, public_id: undefined, image_id: undefined,
							displayOrder: p.results.length,
							originalAI: undefined
						};
						updatedResults = [...p.results, newImage];
					}

					// Ensure displayOrder is sequential
					const finalResults = updatedResults.map((img, index) => ({ ...img, displayOrder: index }));
					return { ...p, results: finalResults };
				}
				return p;
			})
		);

		event.target.value = ''; // Clear the file input
	};

	const handleAddNewFile = (event: React.ChangeEvent<HTMLInputElement>, paragraphId: string | number) => {
		handleFileChange(event, paragraphId, null); // Add new, so imageToReplaceId is null
	};

	const handleRemoveImage = (paragraphId: string | number, imageIdToRemove: string) => {
		setParagraphsState(prevStates =>
			prevStates.map(p => {
				if (p.paragraphId === paragraphId) {
					const imageToRemove = p.results.find(img => img.id === imageIdToRemove);

					// Revoke blob URL if removing a user-uploaded image
					if (imageToRemove?.isUploaded && imageToRemove.url.startsWith('blob:')) {
						URL.revokeObjectURL(imageToRemove.url);
					}
					const filteredResults = p.results.filter(img => img.id !== imageIdToRemove);

					// Update displayOrder
					const finalResults = filteredResults.map((img, index) => ({ ...img, displayOrder: index }));
					return { ...p, results: finalResults };
				}
				return p;
			})
		);

		// Clean up associated file input ref
		const refKey = `file-input-${paragraphId}-${imageIdToRemove}`;
		if (fileInputRefs.current[refKey]) {
			delete fileInputRefs.current[refKey];
		}
	};

	const handleResetGeneration = (paragraphId: string | number) => {
		stopPolling(paragraphId);
		const paraState = paragraphsState.find(p => p.paragraphId === paragraphId);
		paraState?.results.forEach(img => {
			if (img.isUploaded && img.url.startsWith('blob:')) {
				URL.revokeObjectURL(img.url);
			}
		});

		setParagraphsState(prevStates =>
			prevStates.map(p =>
				p.paragraphId === paragraphId
					? { ...p, taskId: null, status: 'idle', message: null, results: [], error: null }
					: p
			)
		);
	};

	// Drag and Drop
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const handleDragStart = (event: DragEndEvent) => {
		setActiveDragId(event.active.id);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveDragId(null);
		if (!over || active.id === over.id) return;

		const paragraph = paragraphsState.find(p => p.results.some(img => img.id === active.id));
		if (!paragraph) return;

		const paragraphId = paragraph.paragraphId;

		setParagraphsState((prevStates) =>
			prevStates.map(p => {
				if (p.paragraphId === paragraphId) {
					const oldIndex = p.results.findIndex(img => img.id === active.id);
					const newIndex = p.results.findIndex(img => img.id === over.id);
					if (oldIndex === -1 || newIndex === -1) return p;
					const reorderedResults = arrayMove(p.results, oldIndex, newIndex);
					const finalResults = reorderedResults.map((img, index) => ({ ...img, displayOrder: index }));
					return { ...p, results: finalResults };
				}
				return p;
			})
		);
	};

	const activeDragImage = activeDragId ? paragraphsState.flatMap(p => p.results).find(img => img.id === activeDragId) : null;

	// Exposed Function via Ref
	useImperativeHandle(ref, () => ({
		prepareImagesForNextStep: async (): Promise<string[]> => {
			console.log("ImageStep: Preparing images for next step...");

			// Collect and sort all images from the current state
			const allImages: DisplayableImageResultExtended[] = [];
			paragraphsState.forEach(p => {
				// Ensure images within the paragraph are sorted by displayOrder before adding
				const sortedParagraphImages = [...p.results].sort((a, b) => a.displayOrder - b.displayOrder);
				allImages.push(...sortedParagraphImages);
			});

			// The overall order is implicitly paragraph 0 images, then paragraph 1 images, etc.
			console.log("ImageStep: Collected images:", allImages.length);

			// Identify images needing upload (user-uploaded with blob URLs and file objects)
			const imagesToUploadData: { file: File; originalIndex: number; blobUrl: string }[] = [];
			allImages.forEach((img, index) => {
				if (img.isUploaded && img.url.startsWith('blob:') && img.file) {
					imagesToUploadData.push({
						file: img.file,
						originalIndex: index,
						blobUrl: img.url
					});
				}
			});
			console.log("ImageStep: Images requiring upload:", imagesToUploadData.length);

			// Perform upload if necessary
			if (imagesToUploadData.length > 0) {
				const formData = new FormData();
				// Append all files under the 'images' key as expected by the backend
				imagesToUploadData.forEach(item => {
					formData.append('images', item.file, item.file.name); // Use 'images' key
					console.log(`ImageStep: Appending file ${item.file.name} to FormData with key 'images'.`);
				});

				try {
					console.log("ImageStep: Calling ImageService.uploadUserImagesSync...");
					const uploadResponse = await ImageService.uploadUserImagesSync(formData);
					console.log("ImageStep: Upload response received:", uploadResponse);

					if (uploadResponse.success && uploadResponse.results) {
						// Update the `allImages` array with results from the upload
						// Assuming the backend returns results in the same order as files were sent

						if (uploadResponse.results.length !== imagesToUploadData.length) {
							console.warn(`ImageStep: Mismatch between uploaded files (${imagesToUploadData.length}) and results received (${uploadResponse.results.length}). Mapping might be incorrect.`);
							// Handle this potential mismatch? Maybe throw an error or try a fallback mapping?
							// For now, we proceed assuming the order matches.
						}

						uploadResponse.results.forEach((result: UploadUserImageResult, resultIndex: number) => {
							// Map based on index, assuming order is preserved
							const uploadItem = imagesToUploadData[resultIndex];
							if (!uploadItem) {
								console.warn(`ImageStep: Could not find mapping data for result at index ${resultIndex}.`);
								return; // Skip this result if mapping fails
							}

							const originalImageIndex = uploadItem.originalIndex;

							if (result.success && result.url) {
								// Update the image object in the main list
								allImages[originalImageIndex] = {
									...allImages[originalImageIndex],
									url: result.url,
									image_id: result.image_id,
									public_id: undefined,
									file: undefined,
									// Keep isUploaded: true, originalAI, etc.
								};
								console.log(`ImageStep: Updated image at original index ${originalImageIndex} with URL: ${result.url}`);
								// Revoke the blob URL now that we have the final one
								URL.revokeObjectURL(uploadItem.blobUrl);
								console.log(`ImageStep: Revoked blob URL for uploaded image: ${uploadItem.blobUrl}`);
							} else {
								console.error(`ImageStep: Upload failed for file originally at index ${originalImageIndex} (Filename from backend: ${result.filename}): ${result.error}`);
								// Handle individual file upload failure - maybe collect errors?
								// We still need to return something, maybe keep the blob URL or throw?
								// For now, we'll let it proceed but log the error. The blob URL won't be revoked.
								// Consider throwing an error here to notify the parent component more forcefully.
								throw new Error(`Upload failed for one or more images. Check console logs.`);
							}
						});
						console.log("ImageStep: User image uploads processed successfully.");
					} else {
						// Handle overall upload failure
						console.error("ImageStep: Overall upload request failed:", uploadResponse.msg);
						// Revoke all blob URLs for this batch on overall failure
						imagesToUploadData.forEach(item => URL.revokeObjectURL(item.blobUrl));
						throw new Error(uploadResponse.msg || "Failed to upload user images.");
					}
				} catch (error: any) {
					console.error("ImageStep: Error during image upload:", error);
					// Revoke all blob URLs for this batch if an exception occurs during upload
					imagesToUploadData.forEach(item => URL.revokeObjectURL(item.blobUrl));
					// Propagate the error to the parent component
					throw new Error(`Image upload failed: ${error.message}`);
				}
			} else {
				console.log("ImageStep: No user images to upload.");
			}

			// Update component state (Optional but recommended for UI consistency)
			// This part updates the internal state of ImageStep after the upload is done
			// and the final URLs are known. This ensures the UI shows the final images.
			setParagraphsState(currentStates => {
				// Create a deep clone to avoid direct mutation
				const newStates = JSON.parse(JSON.stringify(currentStates));
				let imageCounter = 0;
				newStates.forEach((pState: ParagraphGenerationState) => {
					pState.results.forEach((img: DisplayableImageResultExtended, imgIndex: number) => {
						const correspondingAllImage = allImages[imageCounter];
						if (correspondingAllImage && img.id === correspondingAllImage.id) {
							// Update URL and clear file if it matches the processed image
							newStates[pState.paragraphId].results[imgIndex].url = correspondingAllImage.url;
							newStates[pState.paragraphId].results[imgIndex].image_id = correspondingAllImage.image_id;
							newStates[pState.paragraphId].results[imgIndex].file = undefined; // Clear file
						}
						imageCounter++;
					});
				});
				return newStates;
			});

			// Return the final list of URLs in the correct order
			const finalUrls = allImages.map(img => img.url);
			console.log("ImageStep: Returning final image URLs:", finalUrls);
			return finalUrls;
		}
	}), [paragraphsState, model, stopPolling, checkStatusAndUpdateState, startPolling]);

	// Status Indicator Rendering
	const renderStatusIndicator = (state: ParagraphGenerationState) => {
		if (state.status === 'idle' || state.error) return null; // Don't show if idle or if a specific error is shown below

		switch (state.status) {
			case 'pending':
			case 'generating':
			case 'uploading':
				return (
					<div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>{state.message || state.status.charAt(0).toUpperCase() + state.status.slice(1) + '...'}</span>
					</div>
				);

			case 'success':
				// Only show success message briefly or if there are results?
				if (state.results.length > 0) {
					return (
						<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<CheckCircle className="h-4 w-4" />
							<span>{state.message || 'Completed'}</span>
						</div>
					);
				}
				return null; // Don't show success message if no images were generated
			case 'failed': // Failed and Polling Error are handled by the dedicated error display below
			case 'polling_error':
				return null;
			default:
				return null;
		}
	};

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
			<div className="space-y-6">
				{/* Global Error */}
				{globalError && (
					<div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
						<strong>Error:</strong> {globalError}
					</div>
				)}

				{/* Placeholder */}
				{paragraphsState.length === 0 && !globalError && (
					<div className="text-center text-gray-500 dark:text-gray-400 py-4">
						No paragraphs found. Add content in the Text step.
					</div>
				)}

				{/* Paragraphs */}
				{paragraphsState.map((paraState) => {
					const { paragraphId, content, status, results, error } = paraState;
					const isLoading = status === 'pending' || status === 'generating' || status === 'uploading';
					const hasFailed = status === 'failed' || status === 'polling_error';
					const isIdle = status === 'idle';
					const isSuccess = status === 'success';
					const canInitiateGeneration = !isLoading;
					const imageIds = results.map(img => img.id);

					let generateButtonText = "Generate";
					let generateButtonIcon = <ImageIcon className="h-4 w-4" />;
					if (isLoading) {
						generateButtonIcon = <Loader2 className="h-4 w-4 animate-spin" />;
						generateButtonText = "Generating...";
					} else if (hasFailed) {
						generateButtonIcon = <RefreshCw className="h-4 w-4" />;
						generateButtonText = "Retry";
					} else if (isSuccess || isIdle) {
						generateButtonIcon = <RefreshCw className="h-4 w-4" />;
						generateButtonText = results.length > 0 ? "Re-generate" : "Generate";
					}

					return (
						<div key={paragraphId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50 shadow-sm space-y-4">
							{/* Paragraph Content */}
							<p className="text-sm text-gray-700 dark:text-slate-300 italic bg-gray-50 dark:bg-gray-900/60 p-3 rounded border border-gray-100 dark:border-gray-700/80 shadow-inner">
								"{content}"
							</p>

							{/* Controls Section */}
							<div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
								{/* Left Controls */}
								<div className="flex items-center gap-4 flex-wrap">
									<button
										onClick={() => handleGenerateImages(paragraphId)}
										disabled={!model || isLoading}
										className={clsx(
											"flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150",
											"bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400",
											"disabled:bg-indigo-300 dark:disabled:bg-indigo-800 disabled:text-indigo-100 dark:disabled:text-indigo-400 disabled:cursor-not-allowed"
										)}
										title={!model ? "Select an image generation model first" : (isLoading ? "Generation in progress..." : (hasFailed ? "Retry generation" : (results.length > 0 ? "Re-generate images" : "Generate images")))}
									>
										{generateButtonIcon}
										<span>{generateButtonText}</span>
									</button>

									{/* Status Indicator */}
									{renderStatusIndicator(paraState)}

									{/* Reset Button */}
									{!isIdle && (
										<button
											onClick={() => handleResetGeneration(paragraphId)}
											className={clsx(
												"flex items-center justify-center p-2 text-sm rounded-md transition-colors duration-150",
												"bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-700",
												"dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
											)}
											title="Reset and clear images for this paragraph"
										>
											<XCircle className="h-4 w-4" />
											<span className="sr-only">Reset</span>
										</button>
									)}
								</div>

								{/* Right Controls */}
								<div className="flex items-center gap-4 flex-wrap">
									{/* Number of Images Selector (only show if not loading and not failed - allows changing before retry) */}
									{!isLoading && (
										<div className="flex items-center gap-2">
											<label htmlFor={`num-images-${paragraphId}`} className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
												AI Images:
											</label>
											<select
												id={`num-images-${paragraphId}`}
												value={paraState.numImages}
												onChange={(e) => handleNumImagesChange(paragraphId, e.target.value)}
												className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-slate-200 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600 dark:focus:border-indigo-600"
												disabled={isLoading}
											>
												{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
											</select>
										</div>
									)}

									{/* Add Image Button */}
									<button
										onClick={() => triggerAddFileInput(paragraphId)}
										className={clsx(
											"flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150",
											"bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500",
											"disabled:bg-green-300 dark:disabled:bg-green-800 disabled:cursor-not-allowed"
										)}
										title="Upload your own image for this paragraph"
										disabled={isLoading} // Disable adding if AI generation is running
									>
										<PlusCircle className="h-4 w-4" />
										<span>Add Image</span>
									</button>
								</div>
							</div>

							{/* Dedicated Error Display Area */}
							{error && ( // Show error specifically if it exists
								<div className="p-3 my-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-300 flex items-start gap-2">
									<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
									<div>
										<strong className="font-medium">Error:</strong> {error}
									</div>
								</div>
							)}

							{/* Image Grid */}
							{results.length > 0 && (
								<SortableContext items={imageIds} strategy={rectSortingStrategy}>
									<div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
										{results.map((img) => (
											<SortableImageItem
												key={img.id}
												image={img}
												paragraphId={paragraphId}
												triggerFileInput={triggerReplaceFileInput}
												handleRemoveImage={handleRemoveImage}
											/>
										))}
									</div>
								</SortableContext>
							)}

							{/* Other Messages */}
							{isSuccess && results.length === 0 && !error && (
								<div className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
									Generation completed, but no images were returned.
								</div>
							)}

							{isSuccess && results.length > 0 && results.length < paraState.numImages && !error && (
								<div className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
									Note: Generated {results.length} of {paraState.numImages} requested images.
								</div>
							)}

							{/* Hidden File Inputs */}
							<input
								key={`add-file-input-${paragraphId}`}
								type="file" id={`add-file-input-${paragraphId}`}
								ref={el => { fileInputRefs.current[`add-file-input-${paragraphId}`] = el; }}
								className="hidden" accept="image/jpeg,image/png,image/webp,image/gif"
								onChange={(e) => handleAddNewFile(e, paragraphId)}
							/>
							{results.map(img => (
								<input
									key={`file-input-hidden-${img.id}`}
									type="file" id={`file-input-${paragraphId}-${img.id}`}
									ref={el => { fileInputRefs.current[`file-input-${paragraphId}-${img.id}`] = el; }}
									className="hidden" accept="image/jpeg,image/png,image/webp,image/gif"
									onChange={(e) => handleFileChange(e, paragraphId, img.id)}
								/>
							))}
						</div>
					);
				})}
			</div>

			{/* Drag Overlay */}
			<DragOverlay>
				{activeDragId && activeDragImage ? (
					<SortableImageItem
						image={activeDragImage}
						paragraphId={activeDragImage.paragraphId}
						triggerFileInput={() => { }} handleRemoveImage={() => { }}
						isOverlay={true}
					/>
				) : null}
			</DragOverlay>
		</DndContext>
	);
});

ImageStep.displayName = "ImageStep";

export default ImageStep;
