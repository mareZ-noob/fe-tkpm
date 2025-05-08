import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import {
	Loader2, Search, Video, GripVertical, XCircle, Play, Pause, Eye,
	Link2, Unlink2, AlertTriangle, Clock, PlusCircle, Image as ImageIcon
} from "lucide-react";
import clsx from "clsx";
import {
	DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, UniqueIdentifier,
	closestCenter, useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuidv4 } from 'uuid';
import api from "@/configs/axios.config";

export interface VideoStepHandle {
	prepareVideosForNextStep: (onProgressUpdate: (message: string, isPollingActive: boolean) => void) => Promise<string>;
}

interface FfmpegClip {
	id: string;
	type: 'image' | 'video';
	sourceUrl: string;
	duration: number;
	startTime: number;
}

interface FfmpegPayload {
	audioUrl: string;
	clips: FfmpegClip[];
	totalDuration: number;
	srtData?: SrtSegment[];
}

// Constants
const PEXELS_API_KEY = "1VvBrW7DnnIw7jCdz2PIXe1kgFAYUrOX4yx4zyeNDo4RoQU5IzVzK1n7";
const DEFAULT_IMAGE_DURATION = 3.0;
const MIN_IMAGE_DURATION = 0.1;
const DURATION_DECIMAL_PLACES = 1;
const PREVIEW_SYNC_TOLERANCE = 0.5;
const SEEK_DELAY = 200;
const TIME_UPDATE_INTERVAL = 1000 / 60; // Target ~60fps for smoother updates
const DEBUG_LOGGING = true;

// Interfaces
interface PexelsVideo { id: number; width: number; height: number; url: string; image: string; duration: number; user: { id: number; name: string; url: string }; video_files: { id: number; quality: string; file_type: string; width: number; height: number; link: string }[]; }
interface PexelsVideoApiResponse { page: number; per_page: number; total_results: number; url: string; videos: PexelsVideo[]; }
interface PexelsImageSrc { original: string; large2x: string; large: string; medium: string; small: string; portrait: string; landscape: string; tiny: string; }
interface PexelsImage { id: number; width: number; height: number; url: string; photographer: string; photographer_url: string; photographer_id: number; avg_color: string; src: PexelsImageSrc; liked: boolean; alt: string; }
interface PexelsImageApiResponse { page: number; per_page: number; total_results: number; next_page?: string; photos: PexelsImage[]; }
type DraggableItemType = "image" | "pexels_video" | "pexels_image";

interface DraggableItemData {
	id: UniqueIdentifier;
	originalId: UniqueIdentifier;
	type: DraggableItemType;
	url: string;
	sourceUrl?: string;
	duration?: number;
	meta?: unknown;
}

interface TimelineItem extends DraggableItemData {
	instanceId: UniqueIdentifier;
	duration: number;
}

interface SrtSegment { start: number; end: number; text: string; }

interface SingleTimelineSegment { type: 'single'; id: string; originalIndex: number; segment: SrtSegment; }
interface GroupedTimelineSegment { type: 'group'; id: string; originalIndices: number[]; segments: SrtSegment[]; start: number; end: number; text: string; }
type TimelineSegmentData = SingleTimelineSegment | GroupedTimelineSegment;

interface SegmentMediaMap {
	[timelineSegmentId: string]: TimelineItem[];
}

interface ActiveMediaDetails {
	segment: TimelineSegmentData;
	item: TimelineItem | null;
	itemIndex: number;
	timeIntoItem: number;
}

interface TimelineAssetsGrouped {
	audioUrl: string;
	srtData: SrtSegment[];
	timelineStructure: TimelineSegmentData[];
	mediaMap: SegmentMediaMap;
	estimatedDuration: number;
}

interface VideoStepProps {
	finalAudioUrl: string | null;
	setFinalVideoUrl: (url: string | null) => void;
	listImages: string[];
	onAssetsSelected: (assets: TimelineAssetsGrouped) => void;
	srtJson: SrtSegment[] | null;
	setIsSegmentMediaDurationMismatch?: (mismatch: boolean) => void;
}

const formatTime = (seconds: number): string => {
	if (isNaN(seconds) || seconds < 0) seconds = 0;
	const totalSeconds = Math.round(seconds);
	const minutes = Math.floor(totalSeconds / 60);
	const remainingSeconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const generateInitialTimeline = (srt: SrtSegment[] | null): TimelineSegmentData[] => {
	if (!srt) return [];
	return srt.map((segment, index) => ({
		type: 'single',
		id: `single-${index}`,
		originalIndex: index,
		segment: segment,
	}));
};

const calculateMediaTotalDuration = (mediaItems: TimelineItem[]): number => {
	return mediaItems.reduce((total, item) => {
		const duration = item?.duration;
		return total + (typeof duration === 'number' && !isNaN(duration) ? duration : 0);
	}, 0);
};

// Draggable Asset Component
const DraggableAsset: React.FC<{ itemData: DraggableItemData; isSource?: boolean }> = ({ itemData, isSource = true }) => {
	const dragId = itemData.id;
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: dragId,
		data: { ...itemData, isSource },
	});
	const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1, touchAction: "none" };

	let displayText = `Item ${itemData.originalId.toString().slice(-4)}`;
	if (itemData.type === "image") displayText = `Image ${itemData.originalId.toString().split('-').pop()}`;
	else if (itemData.type === "pexels_image") displayText = `Pexels Img ${itemData.originalId.toString().split('-').pop()}`;
	else if (itemData.type === "pexels_video") displayText = `Pexels Vid ${itemData.originalId.toString().split('-').pop()}`;

	return (
		<div ref={setNodeRef} style={style} className="p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all cursor-grab">
			<div className="flex items-center gap-3">
				<img src={itemData.url} alt={itemData.type} className="w-16 h-12 md:w-20 md:h-14 object-cover rounded-md flex-shrink-0 bg-gray-200 dark:bg-gray-700" loading="lazy" onError={(e) => { e.currentTarget.src = `https://placehold.co/80x56/eee/ccc?text=Error`; e.currentTarget.alt = `Error loading ${itemData.type}`; }} />
				<div className="text-sm overflow-hidden flex-grow">
					<p className="font-semibold truncate dark:text-gray-100">{displayText}</p>
					{itemData.duration && (
						<p className="text-gray-500 dark:text-gray-400 text-xs">
							{itemData.duration.toFixed(itemData.type === 'pexels_video' ? 1 : DURATION_DECIMAL_PLACES)}s {itemData.type.replace('_', ' ')}
						</p>
					)}
				</div>
				<button {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none" aria-label="Drag item"><GripVertical className="h-5 w-5" /></button>
			</div>
		</div>
	);
};

// Timeline Segment Display Component
const TimelineSegmentDisplay: React.FC<{
	timelineItem: TimelineSegmentData;
	itemIndex: number;
	totalItems: number;
	associatedMedia: TimelineItem[];
	onRemoveMediaItem: (timelineSegmentId: string, mediaInstanceId: UniqueIdentifier) => void;
	onUpdateImageDuration: (timelineSegmentId: string, mediaInstanceId: UniqueIdentifier, newDuration: number) => void;
	isActivePreview: boolean;
	activeMediaIndexInPreview: number | null;
	isSelected: boolean;
	onToggleSelect: (itemIndex: number) => void;
	isDroppableActive: boolean;
}> = ({
	timelineItem, itemIndex, totalItems, associatedMedia, onRemoveMediaItem, onUpdateImageDuration,
	isActivePreview, activeMediaIndexInPreview, isSelected, onToggleSelect, isDroppableActive
}) => {
		const { setNodeRef, isOver } = useDroppable({
			id: `timeline-dropzone-${timelineItem.id}`,
			data: { accepts: ["image", "pexels_video", "pexels_image"], type: "timeline_drop_zone", timelineSegmentId: timelineItem.id },
		});

		const isGroup = timelineItem.type === 'group';
		const segmentStartTime = isGroup ? timelineItem.start : timelineItem.segment.start;
		const segmentEndTime = isGroup ? timelineItem.end : timelineItem.segment.end;
		const segmentDuration = Math.max(0, segmentEndTime - segmentStartTime);
		const displayText = isGroup ? `Group: ${timelineItem.segments[0].text.substring(0, 25)}...` : timelineItem.segment.text;

		const totalMediaDuration = useMemo(() => calculateMediaTotalDuration(associatedMedia), [associatedMedia]);
		const durationMismatch = associatedMedia.length > 0 && Math.abs(totalMediaDuration - segmentDuration) > 0.05;

		const handleDurationChange = (mediaInstanceId: UniqueIdentifier, value: string) => {
			let newDuration = parseFloat(value);
			if (!isNaN(newDuration)) {
				newDuration = Math.max(MIN_IMAGE_DURATION, newDuration);
				onUpdateImageDuration(timelineItem.id, mediaInstanceId, newDuration);
			} else if (value === "") {
				onUpdateImageDuration(timelineItem.id, mediaInstanceId, NaN);
			}
		};

		const handleDurationBlur = (mediaInstanceId: UniqueIdentifier, value: string) => {
			let newDuration = parseFloat(value);
			if (isNaN(newDuration) || newDuration < MIN_IMAGE_DURATION) {
				newDuration = MIN_IMAGE_DURATION;
			}
			newDuration = parseFloat(newDuration.toFixed(DURATION_DECIMAL_PLACES));
			onUpdateImageDuration(timelineItem.id, mediaInstanceId, newDuration);
		};

		return (
			<div
				className={clsx(
					"flex flex-col md:flex-row items-stretch gap-4 p-4 border-b dark:border-gray-700 transition-colors duration-200 relative rounded-md mb-2",
					isActivePreview ? "bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-300 dark:ring-blue-700" : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
					isGroup && "border-l-4 border-indigo-500 dark:border-indigo-400 pl-3",
					isSelected && "ring-2 ring-offset-1 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/30"
				)}
			>
				<div className="w-full md:w-1/3 flex-shrink-0 space-y-2 py-1 flex md:flex-col">
					<div className="flex items-start gap-3 w-full mb-2 md:mb-0">
						<div className="flex items-center pt-1">
							<input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(itemIndex)} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-800" aria-label={`Select segment ${itemIndex + 1}`} />
						</div>
						<div className="text-xs font-mono text-gray-600 dark:text-gray-300 space-y-1">
							<div>{formatTime(segmentStartTime)} - {formatTime(segmentEndTime)}</div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"> <Clock className="h-3 w-3" /> {segmentDuration.toFixed(1)}s </span>
								{associatedMedia.length > 0 && (
									<span title={`Total media duration (${totalMediaDuration.toFixed(DURATION_DECIMAL_PLACES)}s)`} className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1", durationMismatch ? "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300" : "bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300")}> {durationMismatch && <AlertTriangle className="h-3 w-3" />} <ImageIcon className="h-3 w-3" />/<Video className="h-3 w-3" /> {totalMediaDuration.toFixed(1)}s </span>
								)}
							</div>
							{durationMismatch && (
								<div className="text-red-600 dark:text-red-400 text-[10px] flex items-center gap-1 font-sans mt-1">
									<AlertTriangle className="h-3 w-3" /> Media time doesn't match segment time!
								</div>
							)}
						</div>
					</div>
					<div className="flex-grow pl-8 md:pl-0 md:pt-2"> <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug break-words">{displayText}</p> {isGroup && <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">Grouped ({timelineItem.segments.length} segments)</p>} </div>
				</div>
				<div
					ref={setNodeRef}
					className={clsx(
						"flex-grow min-h-[8rem] border-2 border-dashed rounded-lg flex items-center justify-center relative transition-all duration-150 p-2",
						(isOver || isDroppableActive) ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 ring-2 ring-indigo-300" : "border-gray-300 dark:border-gray-600",
						associatedMedia.length > 0 ? "border-solid bg-gray-100 dark:bg-gray-700/50 items-start justify-start" : "bg-gray-50 dark:bg-gray-800/30"
					)}
					style={{ minWidth: '200px' }}
				>
					{associatedMedia.length === 0 ? (<div className="text-center text-gray-400 dark:text-gray-500 p-2"> <PlusCircle className="h-7 w-7 mx-auto mb-1.5" /> <span className="text-xs font-medium">Drop media here</span> </div>
					) : (
						<div className="flex space-x-2 overflow-x-auto custom-scrollbar pb-2 w-full">
							{associatedMedia.map((media, mediaIndex) => (
								<div
									key={media.instanceId}
									className={clsx(
										"relative group flex-shrink-0 w-32 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md p-1.5 shadow-sm",
										isActivePreview && activeMediaIndexInPreview === mediaIndex && "ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400"
									)}
								>
									<img src={media.url} alt={media.type} className="w-full h-16 object-cover rounded-sm mb-1 bg-gray-200 dark:bg-gray-600" onError={(e) => { e.currentTarget.src = `https://placehold.co/128x64/eee/ccc?text=Error`; e.currentTarget.alt = 'Error loading media'; }} />
									<div className="text-[10px] leading-tight text-gray-600 dark:text-gray-300">
										<p className="font-semibold capitalize truncate">{media.type.replace('_', ' ')}</p>
										{media.type === 'pexels_video' ? (
											<p><Clock className="h-2.5 w-2.5 inline mr-0.5" /> {media.duration?.toFixed(1)}s</p>
										) : (
											<div className="flex items-center gap-1 mt-0.5">
												<Clock className="h-2.5 w-2.5 inline mr-0.5 flex-shrink-0" />
												<input
													type="number"
													value={typeof media.duration === 'number' ? media.duration.toFixed(DURATION_DECIMAL_PLACES) : ''}
													onChange={(e) => handleDurationChange(media.instanceId, e.target.value)}
													onBlur={(e) => handleDurationBlur(media.instanceId, e.target.value)}
													min={MIN_IMAGE_DURATION}
													step={Math.pow(10, -DURATION_DECIMAL_PLACES).toString()}
													className="w-full text-[10px] p-0.5 border border-gray-300 dark:border-gray-500 rounded bg-gray-50 dark:bg-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none"
													aria-label={`Duration for image ${mediaIndex + 1}`}
												/>
												<span className="ml-0.5">s</span>
											</div>
										)}
									</div>
									<button onClick={() => onRemoveMediaItem(timelineItem.id, media.instanceId)} className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" title="Remove this item" aria-label={`Remove media item ${mediaIndex + 1}`}>
										<XCircle className="h-4 w-4" />
									</button>
								</div>
							))}
							<div className="flex items-center justify-center w-16 flex-shrink-0 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md opacity-50 hover:opacity-100 transition-opacity"> <PlusCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" /> </div>
						</div>
					)}
				</div>
			</div>
		);
	};

// Main Video Step Component
const VideoStep = forwardRef<VideoStepHandle, VideoStepProps>(({
	finalAudioUrl, listImages, onAssetsSelected, srtJson, setIsSegmentMediaDurationMismatch }, ref) => {
	// State Variables
	const [audioDuration, setAudioDuration] = useState<number | null>(null);
	const [isLoadingDuration, setIsLoadingDuration] = useState(false);
	const [durationError, setDurationError] = useState<string | null>(null);
	const mainAudioRef = useRef<HTMLAudioElement | null>(null);

	const [pexelsVideoQuery, setPexelsVideoQuery] = useState("");
	const [pexelsVideoResults, setPexelsVideoResults] = useState<PexelsVideo[]>([]);
	const [isSearchingPexelsVideo, setIsSearchingPexelsVideo] = useState(false);
	const [pexelsVideoError, setPexelsVideoError] = useState<string | null>(null);

	const [pexelsImageQuery, setPexelsImageQuery] = useState("");
	const [pexelsImageResults, setPexelsImageResults] = useState<PexelsImage[]>([]);
	const [isSearchingPexelsImage, setIsSearchingPexelsImage] = useState(false);
	const [pexelsImageError, setPexelsImageError] = useState<string | null>(null);

	const [timelineSegments, setTimelineSegments] = useState<TimelineSegmentData[]>([]);
	const [segmentMediaMap, setSegmentMediaMap] = useState<SegmentMediaMap>({});
	const [selectedSegmentIndices, setSelectedSegmentIndices] = useState<number[]>([]);
	const [activeDragData, setActiveDragData] = useState<DraggableItemData | null>(null);
	const [activeDropZoneId, setActiveDropZoneId] = useState<UniqueIdentifier | null>(null);

	// Preview State
	const [isPreviewing, setIsPreviewing] = useState(false);
	const [isPreviewReady, setIsPreviewReady] = useState(false);
	const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
	const [currentPreviewTime, setCurrentPreviewTime] = useState(0);
	const [activeMediaDetails, setActiveMediaDetails] = useState<ActiveMediaDetails | null>(null);
	const [isVideoBuffering, setIsVideoBuffering] = useState(false);

	const previewAudioRef = useRef<HTMLAudioElement | null>(null);
	const previewVideoRef = useRef<HTMLVideoElement | null>(null);
	const isPreviewClosing = useRef(false);
	const animationFrameId = useRef<number | null>(null);
	const isSeekingRef = useRef(false);
	const resumePlaybackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const activeMediaDetailsRef = useRef<ActiveMediaDetails | null>(null);

	const preparePayloadForFfmpegInVideoStep = (
		assets: TimelineAssetsGrouped
	): FfmpegPayload | null => {
		if (!assets) {
			if (DEBUG_LOGGING) console.warn("[FFMPEG PAYLOAD PREP - VideoStep] Critical: Input 'assets' is null.");
			return null;
		}

		const { audioUrl, srtData, timelineStructure, mediaMap, estimatedDuration } = assets;
		const ffmpegClips: FfmpegClip[] = [];

		if (DEBUG_LOGGING) console.log("[FFMPEG PAYLOAD PREP - VideoStep] Starting preparation with input assets:", JSON.parse(JSON.stringify(assets)));

		if (!timelineStructure || timelineStructure.length === 0) {
			if (DEBUG_LOGGING) console.warn("[FFMPEG PAYLOAD PREP - VideoStep] timelineStructure is empty. No clips will be generated from segments.");
		}
		if (!mediaMap || Object.keys(mediaMap).length === 0) {
			if (DEBUG_LOGGING) console.warn("[FFMPEG PAYLOAD PREP - VideoStep] mediaMap is empty. No clips will be generated from segments.");
		}

		for (const timelineSegment of timelineStructure) {
			const segmentMediaItems: TimelineItem[] = mediaMap[timelineSegment.id] || [];
			let timeWithinSegment = 0;

			const segmentOverallStartTime = timelineSegment.type === 'group'
				? timelineSegment.start
				: timelineSegment.segment.start;

			if (DEBUG_LOGGING) console.log(`[FFMPEG PAYLOAD PREP - VideoStep] Processing Segment ID: ${timelineSegment.id}, Type: ${timelineSegment.type}, Overall Start: ${segmentOverallStartTime.toFixed(2)}s. Contains ${segmentMediaItems.length} media items.`);

			if (segmentMediaItems.length === 0) {
				if (DEBUG_LOGGING) console.log(`[FFMPEG PAYLOAD PREP - VideoStep] Segment ${timelineSegment.id} has no media items added.`);
				continue;
			}

			for (let i = 0; i < segmentMediaItems.length; i++) {
				const mediaItem = segmentMediaItems[i];
				if (DEBUG_LOGGING) console.log(`[FFMPEG PAYLOAD PREP - VideoStep] -- Item ${i + 1}/${segmentMediaItems.length} in Segment ${timelineSegment.id}: InstanceID=${mediaItem.instanceId}, Type=${mediaItem.type}, Duration=${mediaItem.duration}, sourceUrl=${mediaItem.sourceUrl}, url=${mediaItem.url}`);

				const resolvedSourceUrl = mediaItem.sourceUrl || mediaItem.url;

				if (!resolvedSourceUrl) {
					if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] SKIPPING Item InstanceID ${mediaItem.instanceId}: Missing 'sourceUrl' and 'url'.`);
					continue;
				}
				if (typeof mediaItem.duration !== 'number' || isNaN(mediaItem.duration) || mediaItem.duration <= 0) {
					if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] SKIPPING Item InstanceID ${mediaItem.instanceId} (URL: ${resolvedSourceUrl}): Invalid duration: ${mediaItem.duration}.`);
					continue;
				}

				const clipAbsoluteStartTime = segmentOverallStartTime + timeWithinSegment;

				if (clipAbsoluteStartTime >= estimatedDuration && estimatedDuration > 0) {
					if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] SKIPPING Item InstanceID ${mediaItem.instanceId} (URL: ${resolvedSourceUrl}): Calculated start time ${clipAbsoluteStartTime.toFixed(2)}s meets or exceeds total video duration ${estimatedDuration.toFixed(2)}s. Stopping additions for this segment.`);
					break;
				}

				let ffmpegType: 'image' | 'video';
				if (mediaItem.type === 'pexels_video') {
					ffmpegType = 'video';
				} else if (mediaItem.type === 'image' || mediaItem.type === 'pexels_image') {
					ffmpegType = 'image';
				} else {
					if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] Item InstanceID ${mediaItem.instanceId}: Unknown media type "${mediaItem.type}". Defaulting to 'image'.`);
					ffmpegType = 'image';
				}

				let effectiveDuration = mediaItem.duration;
				if (estimatedDuration > 0 && (clipAbsoluteStartTime + effectiveDuration > estimatedDuration)) {
					effectiveDuration = estimatedDuration - clipAbsoluteStartTime;
					if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] CAPPING DURATION for Item InstanceID ${mediaItem.instanceId}: Original ${mediaItem.duration}s, Capped to ${effectiveDuration.toFixed(2)}s to fit total duration ${estimatedDuration.toFixed(2)}s.`);
				}

				if (effectiveDuration <= 0) {
					if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] SKIPPING Item InstanceID ${mediaItem.instanceId}: Effective duration is non-positive (${effectiveDuration.toFixed(2)}s) after capping.`);
					continue;
				}

				const clip: FfmpegClip = {
					id: String(mediaItem.instanceId || mediaItem.originalId),
					type: ffmpegType,
					sourceUrl: resolvedSourceUrl,
					duration: effectiveDuration,
					startTime: clipAbsoluteStartTime,
				};
				ffmpegClips.push(clip);
				if (DEBUG_LOGGING) console.log(`[FFMPEG PAYLOAD PREP - VideoStep] ADDED clip: ID=${clip.id}, Type=${clip.type}, Start=${clip.startTime.toFixed(2)}s, Duration=${clip.duration.toFixed(2)}s`);

				timeWithinSegment += effectiveDuration;
			}
		}

		ffmpegClips.sort((a, b) => a.startTime - b.startTime);

		if (timelineStructure.length > 0 && ffmpegClips.length === 0) {
			const totalMediaItems = Object.values(mediaMap || {}).reduce((sum, items) => sum + (items?.length || 0), 0);
			if (totalMediaItems > 0) {
				if (DEBUG_LOGGING) console.error(`[FFMPEG PAYLOAD PREP - VideoStep] CRITICAL DIAGNOSIS: mediaMap contained ${totalMediaItems} items, but ALL were SKIPPED by filtering logic (URL, duration, timing). Check 'SKIPPING' logs.`);
			} else {
				if (DEBUG_LOGGING) console.warn(`[FFMPEG PAYLOAD PREP - VideoStep] Finished. No media items found in mediaMap for the given timelineStructure segments. Clips array is empty.`);
			}
		} else {
			if (DEBUG_LOGGING) console.log(`[FFMPEG PAYLOAD PREP - VideoStep] Finished. Total clips added: ${ffmpegClips.length}.`);
		}

		return {
			audioUrl,
			clips: ffmpegClips,
			totalDuration: estimatedDuration,
			srtData: srtData || undefined,
		};
	};

	useImperativeHandle(ref, () => ({
        prepareVideosForNextStep: async (onProgressUpdate: (message: string, isPollingActive: boolean) => void): Promise<string> => {
            if (DEBUG_LOGGING) console.log("[VideoStep] prepareVideosForNextStep called.");
            onProgressUpdate("Preparing video data...", true);

            if (!finalAudioUrl || !srtJson || audioDuration === null) {
                const errorMsg = "Missing data for video generation: audio URL, SRT data, or audio duration.";
                if (DEBUG_LOGGING) console.error(`[VideoStep] ${errorMsg}`);
                onProgressUpdate(errorMsg, false);
                throw new Error(errorMsg);
            }

            const assets: TimelineAssetsGrouped = {
                audioUrl: finalAudioUrl,
                srtData: srtJson,
                timelineStructure: timelineSegments,
                mediaMap: segmentMediaMap,
                estimatedDuration: audioDuration,
            };

            if (DEBUG_LOGGING) console.log("[VideoStep] Constructed assets for payload:", assets);
            const ffmpegPayload = preparePayloadForFfmpegInVideoStep(assets);

            if (!ffmpegPayload) {
                const errorMsg = "Failed to prepare FFmpeg payload. Payload was null.";
                if (DEBUG_LOGGING) console.error(`[VideoStep] ${errorMsg}`);
                onProgressUpdate(errorMsg, false);
                throw new Error(errorMsg);
            }
             // Allow generation even if clips array is empty (e.g. audio + srt only)
            // if (ffmpegPayload.clips.length === 0) {
            //     const errorMsg = "No valid media clips were prepared for the video.";
            //     if (DEBUG_LOGGING) console.warn(`[VideoStep] ${errorMsg}`);
            //     onProgressUpdate(errorMsg, false);
            //     throw new Error(errorMsg);
            // }

            if (DEBUG_LOGGING) console.log("[VideoStep] Submitting payload to /videos/generate-with-ffmpeg:", JSON.stringify(ffmpegPayload, null, 2));
            onProgressUpdate("Submitting video generation task...", true);

            try {
                const initialResponse = await api.post("/videos/generate-with-ffmpeg", ffmpegPayload);

                if (!initialResponse.data || !initialResponse.data.success || !initialResponse.data.task_id || !initialResponse.data.status_url) {
                    const errorMsg = initialResponse.data?.msg || "Failed to submit video task: Invalid server response.";
                    if (DEBUG_LOGGING) console.error(`[VideoStep] Task submission error: ${errorMsg}`, initialResponse.data);
                    onProgressUpdate(errorMsg, false);
                    throw new Error(errorMsg);
                }

                const { task_id, status_url } = initialResponse.data;
                if (DEBUG_LOGGING) console.log(`[VideoStep] Task ${task_id} submitted. Status URL: ${status_url}`);
                onProgressUpdate(`Processing task ${task_id.substring(0,8)}...`, true);

                return new Promise<string>((resolve, reject) => {
                    const pollInterval = 3000; // Poll every 3 seconds
                    const maxPollTime = 5 * 60 * 1000; // 5 minutes timeout for polling
                    let pollTimerId: NodeJS.Timeout | null = null;
                    const startTime = Date.now();

                    const cleanupPolling = () => {
                        if (pollTimerId) clearTimeout(pollTimerId);
                    };

                    const poll = async () => {
                        if (Date.now() - startTime > maxPollTime) {
                            cleanupPolling();
                            const timeoutMsg = "Video generation timed out.";
                            if (DEBUG_LOGGING) console.error(`[VideoStep] Polling timeout for task ${task_id}.`);
                            onProgressUpdate(timeoutMsg, false);
                            reject(new Error(timeoutMsg));
                            return;
                        }

                        try {
                            if (DEBUG_LOGGING) console.log(`[VideoStep] Polling task ${task_id} from ${status_url}`);
                            // status_url is absolute, so use axios.get directly
                            const statusRes = await axios.get(status_url);

                            if (!statusRes.data) {
                                if (DEBUG_LOGGING) console.warn(`[VideoStep] Poll ${task_id}: Received empty data.`);
                                pollTimerId = setTimeout(poll, pollInterval);
                                return;
                            }

                            const { success: taskSuccess, completed, status, msg, video_url, error: taskError } = statusRes.data;
                            if (DEBUG_LOGGING) console.log(`[VideoStep] Poll ${task_id} Data:`, statusRes.data);

                            if (status === 'SUCCESS' && completed && video_url) {
                                cleanupPolling();
                                if (DEBUG_LOGGING) console.log(`[VideoStep] Task ${task_id} SUCCESS. URL: ${video_url}`);
                                onProgressUpdate(msg || "Video generated!", false);
                                resolve(video_url);
                            } else if (status === 'FAILURE' || (completed && !taskSuccess)) {
                                cleanupPolling();
                                const failureMsg = taskError || msg || "Video generation failed.";
                                if (DEBUG_LOGGING) console.error(`[VideoStep] Task ${task_id} FAILED. Msg: ${failureMsg}`);
                                onProgressUpdate(failureMsg, false);
                                reject(new Error(failureMsg));
                            } else {
                                // PENDING, RETRY, or other ongoing states
                                onProgressUpdate(msg || `Processing... (Status: ${status})`, true);
                                pollTimerId = setTimeout(poll, pollInterval);
                            }
                        } catch (pollErr: any) {
                            // Don't reject immediately on poll network error, retry a few times
                            const pollErrMsg = axios.isAxiosError(pollErr)
                                ? (pollErr.response?.data?.message || pollErr.message) : pollErr.message;
                            if (DEBUG_LOGGING) console.warn(`[VideoStep] Poll ${task_id} error: ${pollErrMsg}. Retrying...`);
                            onProgressUpdate(`Connection issue, retrying... (Task: ${status})`, true);
                            pollTimerId = setTimeout(poll, pollInterval * 1.5); // Slightly longer wait on error
                        }
                    };
                    poll(); // Initial poll
                });

            } catch (error: any) { // Error from initial POST
                const errMsg = axios.isAxiosError(error)
                    ? (error.response?.data?.message || error.message) : error.message;
                if (DEBUG_LOGGING) console.error("[VideoStep] Error submitting task:", error);
                onProgressUpdate(errMsg || "Failed to submit video task.", false);
                throw new Error(errMsg || "Failed to submit video task.");
            }
        },
    }));

	// Hooks
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor)
	);

	// Effect to load main audio duration
	useEffect(() => {
		let isMounted = true;
		let audio: HTMLAudioElement | null = null;

		const handleLoadedMetadata = () => {
			if (isMounted && audio) {
				if (typeof audio.duration === "number" && !isNaN(audio.duration) && isFinite(audio.duration)) {
					if (DEBUG_LOGGING) console.log(`[Main Audio] Loaded metadata. Duration: ${audio.duration}`);
					setAudioDuration(audio.duration);
					setDurationError(null);
				} else {
					if (DEBUG_LOGGING) console.error("[Main Audio] Could not determine audio duration.", audio.duration);
					setDurationError("Could not determine audio duration.");
					setAudioDuration(null);
				}
				setIsLoadingDuration(false);
			}
		};

		const handleError = (e: Event | string) => {
			if (isMounted) {
				const error = audio?.error;
				const errorMsg = error ? `MediaError code ${error.code}: ${error.message}` : "Failed to load audio.";
				if (DEBUG_LOGGING) console.error("[Main Audio] Error:", errorMsg, e);
				setDurationError(errorMsg);
				setIsLoadingDuration(false);
				setAudioDuration(null);
			}
		};

		if (finalAudioUrl) {
			if (DEBUG_LOGGING) console.log("[Main Audio] Loading URL:", finalAudioUrl);
			setIsLoadingDuration(true);
			setDurationError(null);
			setAudioDuration(null);
			audio = new Audio(finalAudioUrl);
			mainAudioRef.current = audio;
			audio.preload = "metadata";
			audio.addEventListener("loadedmetadata", handleLoadedMetadata);
			audio.addEventListener("error", handleError);
		} else {
			if (DEBUG_LOGGING) console.log("[Main Audio] No URL provided.");
			setAudioDuration(null);
			setDurationError(null);
			setIsLoadingDuration(false);
			mainAudioRef.current = null;
		}

		return () => {
			if (DEBUG_LOGGING) console.log("[Main Audio] Cleanup effect.");
			isMounted = false;
			if (audio) {
				audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
				audio.removeEventListener("error", handleError);
				if (!audio.paused) audio.pause();
				audio.removeAttribute("src");
				try { audio.load(); } catch (e) { console.warn("Error during main audio cleanup load:", e); }
				audio = null;
			}
			if (mainAudioRef.current && mainAudioRef.current === audio) {
				mainAudioRef.current = null;
			}
		};
	}, [finalAudioUrl]);

	// Effect to initialize timeline when SRT data is available
	useEffect(() => {
		if (DEBUG_LOGGING) console.log("[Timeline Init] SRT JSON changed:", srtJson);
		const initialTimeline = generateInitialTimeline(srtJson);
		if (DEBUG_LOGGING) console.log("[Timeline Init] Generated initial timeline:", initialTimeline);
		setTimelineSegments(initialTimeline);
		setSegmentMediaMap({});
		setSelectedSegmentIndices([]);
		setActiveMediaDetails(null);
		activeMediaDetailsRef.current = null;
	}, [srtJson]);

	// Effect to call onAssetsSelected when relevant data changes
	useEffect(() => {
		if (finalAudioUrl && srtJson && audioDuration !== null && timelineSegments.length > 0) {
			const assets: TimelineAssetsGrouped = {
				audioUrl: finalAudioUrl,
				srtData: srtJson,
				timelineStructure: timelineSegments,
				mediaMap: segmentMediaMap,
				estimatedDuration: audioDuration,
			};
			if (DEBUG_LOGGING) console.log("[Assets Callback] Calling onAssetsSelected with:", assets);
			console.log("[Assets Callback] Assets selected:", assets);
			onAssetsSelected(assets);
		}
	}, [segmentMediaMap, timelineSegments, finalAudioUrl, srtJson, audioDuration, onAssetsSelected]);

	// Pexels API Search Functions
	const handlePexelsVideoSearch = useCallback(async (query?: string) => {
		const searchQuery = query || pexelsVideoQuery;
		if (DEBUG_LOGGING) console.log("[Pexels Video Search] Starting search for:", searchQuery);
		if (!searchQuery.trim() || !PEXELS_API_KEY) {
			const errorMsg = "Search query is empty.";
			if (DEBUG_LOGGING) console.warn("[Pexels Video Search] Aborted:", errorMsg);
			setPexelsVideoError(errorMsg);
			return;
		}
		setIsSearchingPexelsVideo(true);
		setPexelsVideoError(null);
		setPexelsVideoResults([]);
		try {
			const response = await axios.get<PexelsVideoApiResponse>("https://api.pexels.com/videos/search", {
				headers: { Authorization: PEXELS_API_KEY },
				params: { query: searchQuery, per_page: 9, orientation: "landscape", size: "medium" },
			});
			if (DEBUG_LOGGING) console.log("[Pexels Video Search] API Response:", response.data);
			if (response.data?.videos?.length > 0) {
				setPexelsVideoResults(response.data.videos);
			} else {
				setPexelsVideoError("No videos found for this query.");
			}
		} catch (error: any) {
			const message = axios.isAxiosError(error)
				? `Pexels API error: ${error.response?.status} - ${error.response?.data?.error || error.message}`
				: (error instanceof Error ? error.message : "An unknown error occurred");
			setPexelsVideoError(message);
			console.error("Pexels video search error:", error);
			if (DEBUG_LOGGING) console.error("[Pexels Video Search] Error details:", error);
		} finally {
			setIsSearchingPexelsVideo(false);
		}
	}, [pexelsVideoQuery]);

	const handlePexelsImageSearch = useCallback(async (query?: string) => {
		const searchQuery = query || pexelsImageQuery;
		if (DEBUG_LOGGING) console.log("[Pexels Image Search] Starting search for:", searchQuery);
		if (!searchQuery.trim() || !PEXELS_API_KEY) {
			const errorMsg = "Search query is empty.";
			if (DEBUG_LOGGING) console.warn("[Pexels Image Search] Aborted:", errorMsg);
			setPexelsImageError(errorMsg);
			return;
		}
		setIsSearchingPexelsImage(true);
		setPexelsImageError(null);
		setPexelsImageResults([]);
		try {
			const response = await axios.get<PexelsImageApiResponse>("https://api.pexels.com/v1/search", {
				headers: { Authorization: PEXELS_API_KEY },
				params: { query: searchQuery, per_page: 9, orientation: "landscape", size: "medium" },
			});
			if (DEBUG_LOGGING) console.log("[Pexels Image Search] API Response:", response.data);
			if (response.data?.photos?.length > 0) {
				setPexelsImageResults(response.data.photos);
			} else {
				setPexelsImageError("No images found for this query.");
			}
		} catch (error: any) {
			const message = axios.isAxiosError(error)
				? `Pexels API error: ${error.response?.status} - ${error.response?.data?.error || error.message}`
				: (error instanceof Error ? error.message : "An unknown error occurred");
			setPexelsImageError(message);
			console.error("Pexels image search error:", error);
			if (DEBUG_LOGGING) console.error("[Pexels Image Search] Error details:", error);
		} finally {
			setIsSearchingPexelsImage(false);
		}
	}, [pexelsImageQuery]);

	const getBestVideoLink = (video: PexelsVideo): string | undefined => {
		const mp4Files = video.video_files?.filter((f) => f.file_type === "video/mp4") || [];
		if (mp4Files.length === 0) return undefined;
		mp4Files.sort((a, b) => {
			const qs = (q: string) => (q === "hd" ? 2 : q === "sd" ? 1 : 0);
			const sd = qs(b.quality) - qs(a.quality);
			if (sd !== 0) return sd;
			return (b.width * b.height) - (a.width * a.height);
		});
		return mp4Files[0].link;
	};

	// Drag and Drop Handlers
	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		const currentData = active.data.current as (DraggableItemData & { isSource?: boolean }) | undefined;
		if (DEBUG_LOGGING) console.log("[Drag Start] Active:", active.id, "Data:", currentData);
		if (currentData) {
			setActiveDragData(currentData);
			setActiveDropZoneId(null);
		} else {
			setActiveDragData(null);
		}
	};

	const handleDragOver = (event: DragEndEvent) => {
		const { over } = event;
		const dropZoneId = over?.data.current?.type === "timeline_drop_zone" ? over.id : null;
		if (DEBUG_LOGGING && dropZoneId !== activeDropZoneId) console.log("[Drag Over] Over Dropzone:", dropZoneId);
		setActiveDropZoneId(dropZoneId);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (DEBUG_LOGGING) console.log("[Drag End] Active:", active.id, "Over:", over?.id, "Over Data:", over?.data.current);
		setActiveDragData(null);
		setActiveDropZoneId(null);
		if (!over) return;

		const activeData = active.data.current as (DraggableItemData & { isSource?: boolean }) | undefined;
		const overData = over.data.current as { type?: string; timelineSegmentId?: string; accepts?: string[] } | undefined;

		if (activeData?.isSource && overData?.type === "timeline_drop_zone" && overData.timelineSegmentId && overData.accepts?.includes(activeData.type)) {
			const sourceItemData = activeData;
			const targetTimelineSegmentId = overData.timelineSegmentId;
			if (DEBUG_LOGGING) console.log(`[Drag End] Dropping item ${sourceItemData.id} onto segment ${targetTimelineSegmentId}`);

			const targetTimelineSegment = timelineSegments.find(seg => seg.id === targetTimelineSegmentId);
			if (!targetTimelineSegment) {
				if (DEBUG_LOGGING) console.error(`[Drag End] Target segment ${targetTimelineSegmentId} not found!`);
				return;
			}

			const instanceId = `${sourceItemData.originalId}-instance-${uuidv4()}`;
			let itemDuration: number;

			if (sourceItemData.type === 'pexels_video' && typeof sourceItemData.duration === 'number') {
				itemDuration = sourceItemData.duration;
				if (DEBUG_LOGGING) console.log(`[Drag End] Video item duration: ${itemDuration}s`);
			} else {
				const segmentStartTime = targetTimelineSegment.type === 'group' ? targetTimelineSegment.start : targetTimelineSegment.segment.start;
				const segmentEndTime = targetTimelineSegment.type === 'group' ? targetTimelineSegment.end : targetTimelineSegment.segment.end;
				const segmentDuration = Math.max(0, segmentEndTime - segmentStartTime);
				const existingMedia = segmentMediaMap[targetTimelineSegmentId] || [];
				const currentMediaDuration = calculateMediaTotalDuration(existingMedia);
				const remainingDuration = segmentDuration - currentMediaDuration;
				itemDuration = Math.max(MIN_IMAGE_DURATION, remainingDuration > MIN_IMAGE_DURATION ? remainingDuration : DEFAULT_IMAGE_DURATION);
				itemDuration = parseFloat(itemDuration.toFixed(DURATION_DECIMAL_PLACES));
				if (DEBUG_LOGGING) console.log(`[Drag End] Image item duration calculation: segment=${segmentDuration.toFixed(1)}s, existing=${currentMediaDuration.toFixed(1)}s, remaining=${remainingDuration.toFixed(1)}s -> assigned=${itemDuration}s`);
			}

			const newItemInstance: TimelineItem = {
				...sourceItemData,
				id: sourceItemData.id,
				originalId: sourceItemData.originalId,
				instanceId: instanceId,
				duration: itemDuration,
				isSource: undefined
			};
			if (DEBUG_LOGGING) console.log("[Drag End] New timeline item instance:", newItemInstance);

			setSegmentMediaMap((prevMap) => {
				const currentItems = prevMap[targetTimelineSegmentId] || [];
				const newMap = { ...prevMap, [targetTimelineSegmentId]: [...currentItems, newItemInstance] };
				if (DEBUG_LOGGING) console.log("[Drag End] Updated segmentMediaMap:", newMap);
				return newMap;
			});
		}
	};

	// Timeline Item Media Management
	const handleRemoveMediaItem = useCallback((timelineSegmentId: string, mediaInstanceId: UniqueIdentifier) => {
		if (DEBUG_LOGGING) console.log(`[Remove Media] Removing item ${mediaInstanceId} from segment ${timelineSegmentId}`);
		setSegmentMediaMap((prevMap) => {
			const currentItems = prevMap[timelineSegmentId] || [];
			const newItems = currentItems.filter(item => item.instanceId !== mediaInstanceId);
			if (newItems.length === 0) {
				const newMap = { ...prevMap };
				delete newMap[timelineSegmentId];
				if (DEBUG_LOGGING) console.log(`[Remove Media] Segment ${timelineSegmentId} is now empty. New map:`, newMap);
				return newMap;
			} else {
				const newMap = { ...prevMap, [timelineSegmentId]: newItems };
				if (DEBUG_LOGGING) console.log(`[Remove Media] Segment ${timelineSegmentId} updated. New map:`, newMap);
				return newMap;
			}
		});
	}, []);

	const handleUpdateImageDuration = useCallback((timelineSegmentId: string, mediaInstanceId: UniqueIdentifier, newDuration: number) => {
		let validatedDuration = newDuration;
		if (isNaN(validatedDuration) || validatedDuration < MIN_IMAGE_DURATION) {
			validatedDuration = MIN_IMAGE_DURATION;
			if (DEBUG_LOGGING) console.warn(`[Update Duration] Invalid duration input (${newDuration}) for ${mediaInstanceId}. Clamped to ${MIN_IMAGE_DURATION}s`);
		}
		validatedDuration = parseFloat(validatedDuration.toFixed(DURATION_DECIMAL_PLACES));
		if (DEBUG_LOGGING) console.log(`[Update Duration] Updating item ${mediaInstanceId} in segment ${timelineSegmentId} to ${validatedDuration}s`);

		setSegmentMediaMap((prevMap) => {
			const currentItems = prevMap[timelineSegmentId] || [];
			const itemIndex = currentItems.findIndex(item => item.instanceId === mediaInstanceId);
			if (itemIndex === -1 || currentItems[itemIndex].type === 'pexels_video') {
				if (DEBUG_LOGGING) console.warn(`[Update Duration] Item ${mediaInstanceId} not found or is a video. Aborting update.`);
				return prevMap;
			}
			const newItems = [
				...currentItems.slice(0, itemIndex),
				{ ...currentItems[itemIndex], duration: validatedDuration },
				...currentItems.slice(itemIndex + 1),
			];
			const newMap = { ...prevMap, [timelineSegmentId]: newItems };
			if (DEBUG_LOGGING) console.log(`[Update Duration] Segment ${timelineSegmentId} updated. New map:`, newMap);
			return newMap;
		});
	}, []);

	// Selection and Grouping Handlers
	const toggleSegmentSelection = useCallback((index: number) => {
		if (DEBUG_LOGGING) console.log(`[Toggle Select] Toggling index ${index}`);
		setSelectedSegmentIndices((prev) => {
			const newSelection = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
			newSelection.sort((a, b) => a - b);

			if (newSelection.length > 1 && !prev.includes(index)) {
				for (let i = 1; i < newSelection.length; i++) {
					if (newSelection[i] !== newSelection[i - 1] + 1) {
						alert("Grouping Error: Please select only adjacent timeline segments.");
						if (DEBUG_LOGGING) console.warn("[Toggle Select] Non-adjacent selection attempted.");
						return prev;
					}
				}
			}
			if (DEBUG_LOGGING) console.log("[Toggle Select] New selection:", newSelection);
			return newSelection;
		});
	}, []);

	const handleGroupSelected = useCallback(() => {
		if (selectedSegmentIndices.length < 2) {
			alert("Select at least two adjacent segments.");
			return;
		}
		if (DEBUG_LOGGING) console.log("[Group] Grouping indices:", selectedSegmentIndices);

		const firstIndex = selectedSegmentIndices[0];
		const itemsToGroupData = selectedSegmentIndices.map((index) => ({
			segment: timelineSegments[index],
			media: segmentMediaMap[timelineSegments[index].id] || []
		}));

		const combinedSegments: SrtSegment[] = [];
		const combinedOriginalIndices: number[] = [];
		const combinedMedia: TimelineItem[] = itemsToGroupData.reduce((acc, data) => acc.concat(data.media), [] as TimelineItem[]);

		itemsToGroupData.forEach(({ segment }) => {
			if (segment.type === 'single') {
				combinedSegments.push(segment.segment);
				combinedOriginalIndices.push(segment.originalIndex);
			} else {
				combinedSegments.push(...segment.segments);
				combinedOriginalIndices.push(...segment.originalIndices);
			}
		});
		combinedOriginalIndices.sort((a, b) => a - b);

		if (combinedSegments.length === 0) {
			if (DEBUG_LOGGING) console.warn("[Group] No segments found to group.");
			return;
		}

		const firstOriginalIndex = combinedOriginalIndices[0];
		const lastOriginalIndex = combinedOriginalIndices[combinedOriginalIndices.length - 1];

		const newGroup: GroupedTimelineSegment = {
			type: 'group',
			id: `group-${firstOriginalIndex}-${lastOriginalIndex}-${Date.now()}`,
			originalIndices: combinedOriginalIndices,
			segments: combinedSegments,
			start: combinedSegments[0].start,
			end: combinedSegments[combinedSegments.length - 1].end,
			text: `Grouped: ${combinedSegments[0].text.substring(0, 15)}...${combinedSegments[combinedSegments.length - 1].text.slice(-15)}`,
		};
		if (DEBUG_LOGGING) console.log("[Group] Created new group:", newGroup);

		setTimelineSegments((prev) => {
			const newTimeline = [
				...prev.slice(0, firstIndex),
				newGroup,
				...prev.slice(firstIndex + selectedSegmentIndices.length),
			];
			if (DEBUG_LOGGING) console.log("[Group] New timeline segments:", newTimeline);
			return newTimeline;
		});

		setSegmentMediaMap((prevMap) => {
			const newMap = { ...prevMap };
			itemsToGroupData.forEach(({ segment }) => {
				delete newMap[segment.id];
			});
			if (combinedMedia.length > 0) {
				newMap[newGroup.id] = combinedMedia;
			}
			if (DEBUG_LOGGING) console.log("[Group] New segment media map:", newMap);
			return newMap;
		});

		setSelectedSegmentIndices([]);
	}, [selectedSegmentIndices, timelineSegments, segmentMediaMap]);

	const handleUngroup = useCallback((itemIndex: number) => {
		const itemToUngroup = timelineSegments[itemIndex];
		if (itemToUngroup.type !== 'group' || !srtJson) {
			if (DEBUG_LOGGING) console.warn(`[Ungroup] Cannot ungroup item at index ${itemIndex}. Not a group or no SRT JSON.`);
			return;
		}
		if (DEBUG_LOGGING) console.log(`[Ungroup] Ungrouping item at index ${itemIndex}:`, itemToUngroup);

		const newSingleSegments: SingleTimelineSegment[] = itemToUngroup.originalIndices
			.map(originalIndex => {
				const segment = srtJson[originalIndex];
				if (!segment) {
					if (DEBUG_LOGGING) console.warn(`[Ungroup] Original segment at index ${originalIndex} not found in srtJson.`);
					return null;
				}
				return { type: 'single', id: `single-${originalIndex}`, originalIndex, segment };
			})
			.filter((s): s is SingleTimelineSegment => s !== null);

		if (newSingleSegments.length === 0 && itemToUngroup.originalIndices.length > 0) {
			if (DEBUG_LOGGING) console.error("[Ungroup] Failed to recreate any single segments from group.");
			return;
		}
		if (DEBUG_LOGGING) console.log("[Ungroup] Recreated single segments:", newSingleSegments);

		setTimelineSegments((prev) => {
			const newTimeline = [
				...prev.slice(0, itemIndex),
				...newSingleSegments,
				...prev.slice(itemIndex + 1),
			];
			if (DEBUG_LOGGING) console.log("[Ungroup] New timeline segments:", newTimeline);
			return newTimeline;
		});

		setSegmentMediaMap((prevMap) => {
			const newMap = { ...prevMap };
			const groupMediaArray = prevMap[itemToUngroup.id] || [];
			delete newMap[itemToUngroup.id];
			if (groupMediaArray.length > 0 && newSingleSegments.length > 0) {
				newMap[newSingleSegments[0].id] = groupMediaArray;
				if (DEBUG_LOGGING) console.log(`[Ungroup] Assigned media from group ${itemToUngroup.id} to new segment ${newSingleSegments[0].id}`);
			}
			if (DEBUG_LOGGING) console.log("[Ungroup] New segment media map:", newMap);
			return newMap;
		});

		setSelectedSegmentIndices([]);
	}, [timelineSegments, srtJson, segmentMediaMap]);

	// Preview Simulation Logic

	useEffect(() => {
		activeMediaDetailsRef.current = activeMediaDetails;
	}, [activeMediaDetails]);

	const findActiveMediaDetails = useCallback((time: number): ActiveMediaDetails | null => {
		if (!srtJson || time < 0 || !timelineSegments || timelineSegments.length === 0) {
			return null;
		}

		const timeTolerance = 0.01;

		let activeSegment: TimelineSegmentData | null = null;
		for (const segment of timelineSegments) {
			const start = segment.type === 'single' ? segment.segment.start : segment.start;
			const end = segment.type === 'single' ? segment.segment.end : segment.end;
			if (time >= start - timeTolerance && time < end - timeTolerance) {
				activeSegment = segment;
				break;
			}
			if (Math.abs(time - end) < timeTolerance) {
				activeSegment = segment;
				break;
			}
		}

		if (!activeSegment && timelineSegments.length > 0) {
			const lastSegment = timelineSegments[timelineSegments.length - 1];
			const lastEnd = lastSegment.type === 'single' ? lastSegment.segment.end : lastSegment.end;
			if (time >= lastEnd - timeTolerance) {
				activeSegment = lastSegment;
			} else if (Math.abs(time - (timelineSegments[0].type === 'single' ? timelineSegments[0].segment.start : timelineSegments[0].start)) < timeTolerance) {
				activeSegment = timelineSegments[0];
			}
		}

		if (!activeSegment) {
			return null;
		}

		const mediaArray = segmentMediaMap[activeSegment.id] || [];
		if (mediaArray.length === 0) {
			return { segment: activeSegment, item: null, itemIndex: -1, timeIntoItem: 0 };
		}

		const segmentStartTime = activeSegment.type === 'single' ? activeSegment.segment.start : activeSegment.start;
		const timeIntoSegment = Math.max(0, time - segmentStartTime);

		let accumulatedDuration = 0;
		for (let i = 0; i < mediaArray.length; i++) {
			const item = mediaArray[i];
			if (!item || typeof item.duration !== 'number' || isNaN(item.duration) || item.duration <= 0) {
				console.warn(`[Find Details @ ${time.toFixed(3)}s] Invalid item/duration in segment ${activeSegment.id} at index ${i}:`, item);
				continue;
			}
			const itemDuration = item.duration;
			const itemStartTime = accumulatedDuration;
			const itemEndTime = accumulatedDuration + itemDuration;

			if (timeIntoSegment >= itemStartTime - timeTolerance && timeIntoSegment < itemEndTime - timeTolerance) {
				const timeIntoItem = timeIntoSegment - itemStartTime;
				if (DEBUG_LOGGING) console.log(`[Find Details @ ${time.toFixed(3)}s] Found Active: SegID=${activeSegment.id}, ItemIdx=${i}, ItemID=${item.instanceId}, TimeIntoItem=${timeIntoItem.toFixed(3)}`);
				return { segment: activeSegment, item: item, itemIndex: i, timeIntoItem: Math.max(0, timeIntoItem) };
			}
			accumulatedDuration = itemEndTime;
		}

		if (mediaArray.length > 0 && timeIntoSegment >= accumulatedDuration - timeTolerance) {
			const lastItem = mediaArray[mediaArray.length - 1];
			if (lastItem && typeof lastItem.duration === 'number' && !isNaN(lastItem.duration) && lastItem.duration > 0) {
				if (DEBUG_LOGGING) console.log(`[Find Details @ ${time.toFixed(3)}s] At/Past end of last item: SegID=${activeSegment.id}, ItemIdx=${mediaArray.length - 1}, ItemID=${lastItem.instanceId}`);
				return { segment: activeSegment, item: lastItem, itemIndex: mediaArray.length - 1, timeIntoItem: lastItem.duration };
			}
		}

		if (DEBUG_LOGGING) console.log(`[Find Details @ ${time.toFixed(3)}s] In media gap for segment ${activeSegment.id}.`);
		return { segment: activeSegment, item: null, itemIndex: -1, timeIntoItem: 0 };
	}, [srtJson, timelineSegments, segmentMediaMap]);

	const stopPreview = useCallback((fromError = false) => {
		if (DEBUG_LOGGING) console.log(`[Stop Preview] Called (fromError: ${fromError})`);

		if (animationFrameId.current) {
			cancelAnimationFrame(animationFrameId.current);
			animationFrameId.current = null;
			if (DEBUG_LOGGING) console.log("[Stop Preview] Animation frame cancelled.");
		}
		if (resumePlaybackTimeoutRef.current) {
			clearTimeout(resumePlaybackTimeoutRef.current);
			resumePlaybackTimeoutRef.current = null;
			if (DEBUG_LOGGING) console.log("[Stop Preview] Resume playback timeout cleared.");
		}

		if (previewAudioRef.current && !previewAudioRef.current.paused) {
			previewAudioRef.current.pause();
			if (DEBUG_LOGGING) console.log("[Stop Preview] Audio paused.");
		}
		if (previewVideoRef.current && !previewVideoRef.current.paused) {
			previewVideoRef.current.pause();
			if (DEBUG_LOGGING) console.log("[Stop Preview] Video paused.");
		}

		if (!fromError) {
			if (previewAudioRef.current) try { previewAudioRef.current.currentTime = 0; } catch (e) { console.warn("Error resetting audio time", e); }
			if (previewVideoRef.current) try { previewVideoRef.current.currentTime = 0; } catch (e) { console.warn("Error resetting video time", e); }
			setCurrentPreviewTime(0);
			const initialDetails = findActiveMediaDetails(0);
			setActiveMediaDetails(initialDetails);
			if (DEBUG_LOGGING) console.log("[Stop Preview] Time and details reset to T=0.");
		}

		setIsPreviewPlaying(false);
		isSeekingRef.current = false;
		setIsVideoBuffering(false);
	}, [findActiveMediaDetails]);

	const handlePreviewTimeUpdateCallback = useCallback(() => {
		const audio = previewAudioRef.current;
		if (isPreviewPlaying && audio && !audio.paused && !isPreviewClosing.current && !isSeekingRef.current) {
			const newTime = audio.currentTime;
			setCurrentPreviewTime(newTime);
			if (DEBUG_LOGGING) console.log(`[Time Update] Current time: ${newTime.toFixed(3)}s`);
			if (audioDuration && newTime >= audioDuration) {
				stopPreview();
			}
		}
		if (isPreviewPlaying && !isPreviewClosing.current) {
			animationFrameId.current = requestAnimationFrame(handlePreviewTimeUpdateCallback);
		}
	}, [isPreviewPlaying, audioDuration, stopPreview]);

	useEffect(() => {
		if (isPreviewPlaying && !isPreviewClosing.current) {
			animationFrameId.current = requestAnimationFrame(handlePreviewTimeUpdateCallback);
		}
		return () => {
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current);
				animationFrameId.current = null;
			}
		};
	}, [isPreviewPlaying, handlePreviewTimeUpdateCallback]);

	useEffect(() => {
		if (!isPreviewing || isSeekingRef.current) {
			return;
		}

		const currentActiveDetails = findActiveMediaDetails(currentPreviewTime);
		const previousActiveDetails = activeMediaDetailsRef.current;

		const hasChanged =
			(!previousActiveDetails && currentActiveDetails) ||
			(previousActiveDetails && !currentActiveDetails) ||
			(previousActiveDetails && currentActiveDetails &&
				(currentActiveDetails.segment.id !== previousActiveDetails.segment.id ||
					currentActiveDetails.item?.instanceId !== previousActiveDetails.item?.instanceId));

		if (hasChanged) {
			if (DEBUG_LOGGING) console.log(`%c[Details Effect @ ${currentPreviewTime.toFixed(3)}s] Details changed. Setting state. New details:`, 'color: orange', currentActiveDetails);
			setActiveMediaDetails(currentActiveDetails);
		}
	}, [currentPreviewTime, isPreviewing, findActiveMediaDetails]);

	useEffect(() => {
		if (!isPreviewing || !finalAudioUrl) {
			if (!isPreviewing && previewAudioRef.current) {
				if (DEBUG_LOGGING) console.log("[Preview Audio Effect] Cleaning up due to isPreviewing false.");
				const aud = previewAudioRef.current;
				if (!aud.paused) aud.pause();
				aud.removeAttribute('src');
				try { aud.load(); } catch (e) { }
				previewAudioRef.current = null;
			}
			return;
		}

		if (DEBUG_LOGGING) console.log("[Preview Audio Effect] Setting up audio:", finalAudioUrl);
		isPreviewClosing.current = false;
		const audio = new Audio(finalAudioUrl);
		previewAudioRef.current = audio;
		audio.preload = "auto";

		let readyHandlerUsed: 'canplay' | 'canplaythrough' | null = null;

		const handleEnded = () => {
			if (DEBUG_LOGGING) console.log("[Preview Audio] Event: Ended");
			if (isPreviewing && !isPreviewClosing.current) {
				stopPreview();
			}
		};
		const handleError = (e: Event | string) => {
			if (isPreviewing && !isPreviewClosing.current) {
				const err = audio?.error;
				const msg = err ? `Err ${err.code}: ${err.message}` : (typeof e === 'string' ? e : "Unknown preview audio error");
				console.error("[Preview Audio] Event: Error:", msg, e);
				stopPreview(true);
				alert(`Audio error during preview: ${msg}`);
				if (!isPreviewClosing.current) closePreview();
			} else if (DEBUG_LOGGING) {
				console.log("[Preview Audio] Event: Error ignored (preview not active).");
			}
		};
		const handleCanPlayThrough = () => {
			if (DEBUG_LOGGING) console.log("[Preview Audio] Event: CanPlayThrough");
			if (isPreviewing && !isPreviewClosing.current && !isPreviewReady) {
				setIsPreviewReady(true);
				readyHandlerUsed = 'canplaythrough';
				if (DEBUG_LOGGING) console.log("[Preview Audio] State: isPreviewReady set to true (via canplaythrough).");
			}
		};
		const handleCanPlay = () => {
			if (DEBUG_LOGGING) console.log("[Preview Audio] Event: CanPlay");
			if (isPreviewing && !isPreviewClosing.current && !isPreviewReady && readyHandlerUsed !== 'canplaythrough') {
				setIsPreviewReady(true);
				readyHandlerUsed = 'canplay';
				if (DEBUG_LOGGING) console.log("[Preview Audio] State: isPreviewReady set to true (via canplay fallback).");
			}
		};
		const handleStalled = () => { if (DEBUG_LOGGING) console.warn("[Preview Audio] Event: Stalled"); };
		const handleWaiting = () => { if (DEBUG_LOGGING) console.log("[Preview Audio] Event: Waiting"); };

		audio.addEventListener('ended', handleEnded);
		audio.addEventListener('error', handleError);
		audio.addEventListener('canplaythrough', handleCanPlayThrough);
		audio.addEventListener('canplay', handleCanPlay);
		audio.addEventListener('stalled', handleStalled);
		audio.addEventListener('waiting', handleWaiting);

		try {
			if (DEBUG_LOGGING) console.log("[Preview Audio Effect] Calling audio.load()");
			audio.load();
		} catch (e) {
			handleError('Preview audio load() failed');
		}

		return () => {
			if (DEBUG_LOGGING) console.log("[Preview Audio Effect] Cleaning up audio.");
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current);
				animationFrameId.current = null;
			}
			if (resumePlaybackTimeoutRef.current) {
				clearTimeout(resumePlaybackTimeoutRef.current);
				resumePlaybackTimeoutRef.current = null;
			}

			const aud = previewAudioRef.current;
			if (aud) {
				aud.removeEventListener('ended', handleEnded);
				aud.removeEventListener('error', handleError);
				aud.removeEventListener('canplaythrough', handleCanPlayThrough);
				aud.removeEventListener('canplay', handleCanPlay);
				aud.removeEventListener('stalled', handleStalled);
				aud.removeEventListener('waiting', handleWaiting);
				if (!aud.paused) aud.pause();
				aud.removeAttribute('src');
				try { aud.load(); } catch (e) { }
				previewAudioRef.current = null;
				if (DEBUG_LOGGING) console.log("[Preview Audio Cleanup] Audio element cleaned up.");
			}
			const vid = previewVideoRef.current;
			if (vid && !vid.paused) { vid.pause(); }
			setIsPreviewPlaying(false);
			setIsPreviewReady(false);
		};
	}, [isPreviewing, finalAudioUrl]);

	useEffect(() => {
		const videoElement = previewVideoRef.current;
		const audio = previewAudioRef.current;
		const activeItem = activeMediaDetails?.item;
		const timeIntoItem = activeMediaDetails?.timeIntoItem ?? 0;

		if (!videoElement || !isPreviewing || isPreviewClosing.current) {
			if (videoElement && !videoElement.paused) videoElement.pause();
			return;
		}

		const targetVideoSrc = activeItem?.type === 'pexels_video' ? activeItem.sourceUrl : null;
		const isVideoActive = !!targetVideoSrc;

		if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] ActiveItem: ${activeItem?.instanceId}, TargetSrc: ${targetVideoSrc}, IsPlaying: ${isPreviewPlaying}, IsReady: ${isPreviewReady}, TimeIntoItem: ${timeIntoItem.toFixed(3)}`, 'color: green');

		if (isVideoActive) {
			if (videoElement.currentSrc !== targetVideoSrc) {
				if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Setting video src to: ${targetVideoSrc}`, 'color: green');
				videoElement.src = targetVideoSrc;
				videoElement.load();
				setIsVideoBuffering(true);
			} else {
				if (videoElement.readyState >= 2 && !videoElement.seeking && Math.abs(videoElement.currentTime - timeIntoItem) > 0.1) {
					if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Source correct, setting time to ${timeIntoItem.toFixed(3)}`, 'color: green');
					try { videoElement.currentTime = timeIntoItem; } catch (e) { console.warn("[Video Control Effect] Error setting currentTime:", e); }
				}
				if (videoElement.readyState >= 3) {
					if (isVideoBuffering) setIsVideoBuffering(false);
				}
			}
		} else {
			setIsVideoBuffering(false);
			if (!videoElement.paused) {
				if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Pausing video (no active video item)`, 'color: green');
				videoElement.pause();
			}
			if (videoElement.getAttribute('src')) {
				if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Clearing video src`, 'color: green');
				videoElement.removeAttribute('src');
				try { videoElement.load(); } catch (e) { }
			}
		}

		if (isVideoActive) {
			if (isPreviewPlaying && isPreviewReady) {
				if (videoElement.paused && videoElement.readyState >= 3) {
					if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Attempting play (audio playing, video ready)`, 'color: green');
					videoElement.play().catch(e => console.warn(`[Video Control Effect] Play failed: ${e}`));
				}
				if (audio && !audio.paused && !videoElement.paused && Math.abs(audio.currentTime - (activeMediaDetails?.segment?.type === 'single' ? activeMediaDetails.segment.segment.start : activeMediaDetails?.segment?.start ?? 0) - videoElement.currentTime) > PREVIEW_SYNC_TOLERANCE) {
					if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Syncing video time during playback`, 'color: purple');
					try { videoElement.currentTime = timeIntoItem; } catch (e) { console.warn("[Video Control Effect] Error syncing video time:", e); }
				}
			} else {
				if (!videoElement.paused) {
					if (DEBUG_LOGGING) console.log(`%c[Video Control Effect] Pausing video (isPreviewPlaying: ${isPreviewPlaying}, isPreviewReady: ${isPreviewReady})`, 'color: green');
					videoElement.pause();
				}
			}
		}
	}, [activeMediaDetails, isPreviewPlaying, isPreviewReady, isPreviewing, isVideoBuffering]);

	const handlePreviewVideoLoadedData = useCallback(() => {
		const videoElement = previewVideoRef.current;
		const currentDetails = activeMediaDetailsRef.current;
		const expectedItem = currentDetails?.item;

		if (!videoElement || !expectedItem || expectedItem.type !== 'pexels_video' || videoElement.currentSrc !== expectedItem.sourceUrl) {
			if (DEBUG_LOGGING) console.warn(`[VideoLoadedData] Stale event or wrong item. Src: ${videoElement?.currentSrc}, Expected: ${expectedItem?.sourceUrl}`);
			return;
		}

		const expectedTimeIntoItem = Math.max(0, currentDetails?.timeIntoItem ?? 0);
		if (DEBUG_LOGGING) console.log(`%c[VideoLoadedData] Data loaded for ${expectedItem.instanceId}. ReadyState: ${videoElement.readyState}. Target time: ${expectedTimeIntoItem.toFixed(3)}, Current time: ${videoElement.currentTime.toFixed(3)}`, 'color: cyan');

		if (videoElement.readyState >= 1 && Math.abs(videoElement.currentTime - expectedTimeIntoItem) > 0.1 && !isSeekingRef.current) {
			try {
				if (DEBUG_LOGGING) console.log(`%c[VideoLoadedData] -> Setting currentTime to ${expectedTimeIntoItem.toFixed(3)}`, 'color: cyan');
				videoElement.currentTime = expectedTimeIntoItem;
			} catch (e) {
				console.error(`[VideoLoadedData] Error setting currentTime for ${expectedItem.instanceId}:`, e);
			}
		}

		if (videoElement.readyState >= 3) {
			setIsVideoBuffering(false);
		}

		if (isPreviewPlaying && isPreviewReady && videoElement.paused) {
			if (DEBUG_LOGGING) console.log(`%c[VideoLoadedData] -> Attempting play because should be playing.`, 'color: cyan');
			videoElement.play().catch(e => console.warn(`[VideoLoadedData] Play failed: ${e}`));
		}
	}, [isPreviewPlaying, isPreviewReady]);

	const handleVideoWaiting = useCallback(() => {
		if (DEBUG_LOGGING) console.warn('%c[Video Event] Waiting', 'color: red');
		if (isPreviewPlaying) setIsVideoBuffering(true);
	}, [isPreviewPlaying]);

	const handleVideoPlaying = useCallback(() => {
		if (DEBUG_LOGGING) console.log('%c[Video Event] Playing (or resumed after buffer/seek)', 'color: red');
		setIsVideoBuffering(false);
	}, []);

	const handleVideoSeeked = useCallback(() => {
		const videoElement = previewVideoRef.current;
		const currentDetails = activeMediaDetailsRef.current;
		if (DEBUG_LOGGING) console.log(`%c[Video Event] Seeked. ReadyState: ${videoElement?.readyState}`, 'color: red');
		setIsVideoBuffering(false);

		if (isPreviewPlaying && isPreviewReady && videoElement && videoElement.paused && currentDetails?.item?.type === 'pexels_video') {
			if (DEBUG_LOGGING) console.log(`%c[Video Event] Seeked -> Attempting play because should be playing.`, 'color: red');
			videoElement.play().catch(e => console.warn(`[Video Event] Seeked Play failed: ${e}`));
		}
	}, [isPreviewPlaying, isPreviewReady]);

	const playPreview = useCallback(() => {
		const audio = previewAudioRef.current;
		if (!audio || !audioDuration || !isPreviewReady || isPreviewClosing.current || isPreviewPlaying) {
			console.warn("[Play Preview] Cannot play: Conditions not met.", { audio: !!audio, audioDuration, isPreviewReady, isClosing: isPreviewClosing.current, isPlaying: isPreviewPlaying });
			return;
		}
		if (DEBUG_LOGGING) console.log("[Play Preview] Attempting to play...");
		isSeekingRef.current = false;

		audio.play().then(() => {
			if (DEBUG_LOGGING) console.log("[Play Preview] Audio play() successful.");
			setIsPreviewPlaying(true);
			if (!animationFrameId.current) {
				if (DEBUG_LOGGING) console.log("[Play Preview] Starting animation frame loop.");
				animationFrameId.current = requestAnimationFrame(handlePreviewTimeUpdateCallback);
			}
		}).catch(e => {
			console.error("[Play Preview] Error playing preview audio:", e);
			alert(`Could not play audio. ${e.message}`);
			setIsPreviewPlaying(false);
			stopPreview(true);
		});
	}, [audioDuration, isPreviewReady, isPreviewPlaying, handlePreviewTimeUpdateCallback, stopPreview]);

	const pausePreview = useCallback(() => {
		if (isPreviewClosing.current || !isPreviewPlaying) return;
		if (DEBUG_LOGGING) console.log("[Pause Preview] Pausing...");

		if (previewAudioRef.current) previewAudioRef.current.pause();
		setIsPreviewPlaying(false);

		if (animationFrameId.current) {
			cancelAnimationFrame(animationFrameId.current);
			animationFrameId.current = null;
			if (DEBUG_LOGGING) console.log("[Pause Preview] Animation frame cancelled.");
		}
		if (resumePlaybackTimeoutRef.current) {
			clearTimeout(resumePlaybackTimeoutRef.current);
			resumePlaybackTimeoutRef.current = null;
			if (DEBUG_LOGGING) console.log("[Pause Preview] Resume playback timeout cleared.");
		}
		setIsVideoBuffering(false);
	}, [isPreviewPlaying]);

	const handlePreviewSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const audio = previewAudioRef.current;
		if (!audio || isPreviewClosing.current || !audioDuration || !isPreviewReady) return;
		const newTime = parseFloat(event.target.value);
		if (isNaN(newTime)) return;

		if (DEBUG_LOGGING) console.log(`%c[Seek] Started to: ${newTime.toFixed(3)}`, 'color: brown');
		isSeekingRef.current = true;
		const wasPlaying = isPreviewPlaying;

		if (resumePlaybackTimeoutRef.current) clearTimeout(resumePlaybackTimeoutRef.current);
		if (animationFrameId.current) {
			cancelAnimationFrame(animationFrameId.current);
			animationFrameId.current = null;
		}

		if (wasPlaying) {
			if (DEBUG_LOGGING) console.log("[Seek] Pausing playback before seek.");
			audio.pause();
			setIsPreviewPlaying(false);
		}
		setIsVideoBuffering(true);

		setCurrentPreviewTime(newTime);
		const newActiveDetailsForSeek = findActiveMediaDetails(newTime);
		activeMediaDetailsRef.current = newActiveDetailsForSeek;
		setActiveMediaDetails(newActiveDetailsForSeek);
		if (DEBUG_LOGGING) console.log(`%c[Seek] Found details for seek target:`, 'color: brown', newActiveDetailsForSeek);

		try {
			audio.currentTime = newTime;
			if (DEBUG_LOGGING) console.log(`%c[Seek] Set audio currentTime to ${newTime.toFixed(3)}`, 'color: brown');
		} catch (e) {
			console.error("[Seek] Error setting audio currentTime:", e);
			isSeekingRef.current = false;
			setIsVideoBuffering(false);
			if (wasPlaying) playPreview();
			return;
		}

		const videoElement = previewVideoRef.current;
		const targetVideoItem = newActiveDetailsForSeek?.item;
		const targetTimeIntoVideo = newActiveDetailsForSeek?.timeIntoItem ?? 0;

		if (targetVideoItem?.type === 'pexels_video' && videoElement) {
			if (videoElement.currentSrc !== targetVideoItem.sourceUrl) {
				if (DEBUG_LOGGING) console.log(`%c[Seek] Video source needs to change. Control effect will handle src/load.`, 'color: brown');
			} else if (videoElement.readyState >= 1) {
				try {
					if (DEBUG_LOGGING) console.log(`%c[Seek] Setting video currentTime to ${targetTimeIntoVideo.toFixed(3)}`, 'color: brown');
					videoElement.currentTime = targetTimeIntoVideo;
				} catch (e) {
					console.warn("[Seek] Error setting video currentTime:", e);
					setIsVideoBuffering(false);
				}
			}
		} else {
			setIsVideoBuffering(false);
		}

		resumePlaybackTimeoutRef.current = setTimeout(() => {
			if (DEBUG_LOGGING) console.log(`%c[Seek] Timeout finished for time ${newTime.toFixed(3)}. Resetting seeking flag.`, 'color: brown');
			isSeekingRef.current = false;
			if (wasPlaying && !isPreviewClosing.current && previewAudioRef.current && isPreviewReady) {
				if (DEBUG_LOGGING) console.log("[Seek] Resuming playback after seek timeout.");
				playPreview();
			} else {
				setIsVideoBuffering(false);
				if (wasPlaying && DEBUG_LOGGING) {
					console.log("[Seek] Conditions not met for resuming playback after timeout", { isClosing: isPreviewClosing.current, audio: !!previewAudioRef.current, ready: isPreviewReady, playing: isPreviewPlaying });
				}
			}
		}, SEEK_DELAY);
	}, [audioDuration, isPreviewPlaying, isPreviewReady, playPreview, findActiveMediaDetails]);

	const hasOverallDurationMismatch = useMemo(() => {
		if (DEBUG_LOGGING) console.log("[Mismatch Check] Checking for overall duration mismatch based on timelineSegments and segmentMediaMap.");
		if (!timelineSegments || timelineSegments.length === 0) {
			if (DEBUG_LOGGING) console.log("[Mismatch Check] No timeline segments, so no mismatch.");
			return false;
		}

		for (const segment of timelineSegments) {
			const associatedMedia = segmentMediaMap[segment.id] || [];

			if (associatedMedia.length === 0) {
				if (DEBUG_LOGGING) console.log(`[Mismatch Check] Problem found: Segment ${segment.id} (text: "${segment.type === 'single' ? segment.segment.text.substring(0,20) : segment.text.substring(0,20)}...") has no media items.`);
				return true;
			}

			if (associatedMedia.length > 0) {
				const segmentStartTime = segment.type === 'single' ? segment.segment.start : segment.start;
				const segmentEndTime = segment.type === 'single' ? segment.segment.end : segment.end;
				const currentSegmentDuration = Math.max(0, segmentEndTime - segmentStartTime);
				const totalMediaDuration = calculateMediaTotalDuration(associatedMedia);

				if (Math.abs(totalMediaDuration - currentSegmentDuration) > 0.05) {
					if (DEBUG_LOGGING) console.log(`[Mismatch Check] Mismatch found in segment ${segment.id}: Segment duration ${currentSegmentDuration.toFixed(2)}s, Media duration ${totalMediaDuration.toFixed(2)}s`);
					return true;
				}
			}
		}
		if (DEBUG_LOGGING) console.log("[Mismatch Check] No duration mismatches found in any segment.");
		return false; // No mismatch in any segment
	}, [timelineSegments, segmentMediaMap]);

	useEffect(() => {
		if (setIsSegmentMediaDurationMismatch) {
			if (DEBUG_LOGGING) console.log(`[VideoStep Effect] Notifying parent of mismatch status: ${hasOverallDurationMismatch}`);
			setIsSegmentMediaDurationMismatch(hasOverallDurationMismatch);
		}
	}, [hasOverallDurationMismatch, setIsSegmentMediaDurationMismatch]);

	const previewButtonTitle = useMemo(() => {
		if (hasOverallDurationMismatch) return "Ensure all segments have media and that media durations match segment durations to enable preview";
		if (!finalAudioUrl) return "Audio track needed for preview";
		if (!srtJson || srtJson.length === 0) return "Timeline segments from SRT are needed for preview";
		if (audioDuration === null) return "Waiting for audio duration to load...";
		return "Open Preview";
	}, [hasOverallDurationMismatch, finalAudioUrl, srtJson, audioDuration]);

	const openPreview = useCallback(() => {
		if (!finalAudioUrl || !srtJson || srtJson.length === 0 || audioDuration === null) {
			alert("Preview requires loaded audio, SRT data, and audio duration.");
			if (DEBUG_LOGGING) console.warn("[Open Preview] Aborted: Missing prerequisites.", { finalAudioUrl: !!finalAudioUrl, srtJson: !!srtJson, srtLength: srtJson?.length, audioDuration });
			return;
		}
		if (DEBUG_LOGGING) console.log("[Open Preview] Opening preview modal.");
		isPreviewClosing.current = false;
		setCurrentPreviewTime(0);
		setIsPreviewPlaying(false);
		setIsVideoBuffering(false);
		setIsPreviewReady(false);

		const initialDetails = findActiveMediaDetails(0);
		setActiveMediaDetails(initialDetails);
		activeMediaDetailsRef.current = initialDetails;

		setIsPreviewing(true);
	}, [finalAudioUrl, srtJson, audioDuration, findActiveMediaDetails]);

	const closePreview = useCallback(() => {
		if (isPreviewClosing.current) return;
		if (DEBUG_LOGGING) console.log("[Close Preview] Closing preview modal.");
		isPreviewClosing.current = true;
		stopPreview();

		setTimeout(() => {
			setIsPreviewing(false);
			setIsPreviewReady(false);
			setActiveMediaDetails(null);
			activeMediaDetailsRef.current = null;
			if (previewVideoRef.current) {
				previewVideoRef.current.removeAttribute('src');
				try { previewVideoRef.current.load(); } catch (e) { }
				previewVideoRef.current = null;
			}
			if (DEBUG_LOGGING) console.log("[Close Preview] Preview modal hidden and state/refs reset.");
		}, 100);
	}, [stopPreview]);

	const imageAssets: DraggableItemData[] = useMemo(() => listImages.map((url, index) => ({
		id: `uploaded-image-${index}-src`, originalId: `uploaded-image-${index}`, type: "image", url: url, sourceUrl: url, duration: DEFAULT_IMAGE_DURATION
	})), [listImages]);
	const pexelsVideoAssets: DraggableItemData[] = useMemo(() => pexelsVideoResults.map((video): DraggableItemData | null => {
		const link = getBestVideoLink(video); if (!link) return null;
		return { id: `pexels-video-${video.id}-src`, originalId: `pexels-video-${video.id}`, type: "pexels_video", url: video.image, sourceUrl: link, duration: video.duration, meta: { pexelsId: video.id, user: video.user?.name, pexelsUrl: video.url } };
	}).filter((item): item is DraggableItemData => item !== null), [pexelsVideoResults]);
	const pexelsImageAssets: DraggableItemData[] = useMemo(() => pexelsImageResults.map((img): DraggableItemData => ({
		id: `pexels-image-${img.id}-src`, originalId: `pexels-image-${img.id}`, type: "pexels_image", url: img.src.medium || img.src.small || img.src.tiny, sourceUrl: img.src.large2x || img.src.original, duration: DEFAULT_IMAGE_DURATION, meta: { pexelsId: img.id, photographer: img.photographer, pexelsUrl: img.url }
	})), [pexelsImageResults]);

	const currentlyActiveMediaItem = activeMediaDetails?.item;
	const activeTimelineSegmentId = activeMediaDetails?.segment.id ?? null;
	const activeMediaItemIndex = activeMediaDetails?.itemIndex ?? null;

	if (DEBUG_LOGGING) console.log(`%c[Render] Time: ${currentPreviewTime.toFixed(3)}, Playing: ${isPreviewPlaying}, Ready: ${isPreviewReady}, ActiveItem: ${currentlyActiveMediaItem?.instanceId ?? 'none'}, VideoBuffering: ${isVideoBuffering}`, 'color: blue');

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragCancel={() => { setActiveDragData(null); setActiveDropZoneId(null); }}>
			<div className="space-y-6 md:space-y-8 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 rounded-xl">
				<div className="p-4 md:p-6 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
					<h4 className="text-lg md:text-xl font-semibold mb-3 dark:text-gray-100">Audio Track</h4>
					{isLoadingDuration && <div className="flex items-center text-sm text-gray-600 dark:text-gray-300"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading audio...</div>}
					{durationError && !isLoadingDuration && <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">Audio Error: {durationError}</div>}
					{audioDuration !== null && !isLoadingDuration && (<> <p className="text-sm mb-2 text-gray-700 dark:text-gray-200">Duration: <span className="font-semibold">{formatTime(audioDuration)}</span> ({audioDuration.toFixed(1)}s)</p> {finalAudioUrl && <audio key={finalAudioUrl} controls src={finalAudioUrl} preload="metadata" className="w-full max-w-lg h-12 rounded-md" ref={mainAudioRef} />} </>)}
					{!finalAudioUrl && !isLoadingDuration && <p className="text-sm text-gray-500 italic dark:text-gray-400">No audio track.</p>}
				</div>
				<div className="flex flex-col lg:flex-row gap-6 md:gap-8">
					<div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-5">
						<div className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
							<h5 className="font-semibold text-base md:text-lg mb-3 dark:text-gray-100 border-b dark:border-gray-600 pb-2">Your Images ({imageAssets.length})</h5>
							<div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar"> {imageAssets.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 italic p-3">No uploaded images.</p>} {imageAssets.map((item) => <DraggableAsset key={item.id} itemData={item} isSource={true} />)} </div>
						</div>
						<div className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
							<h5 className="font-semibold text-base md:text-lg mb-3 dark:text-gray-100 border-b dark:border-gray-600 pb-2">Pexels Images</h5>
							{(!PEXELS_API_KEY) && <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-200 rounded-md">Pexels API Key not configured.</div>}
							<div className="flex items-center gap-2 mb-3"> <input type="text" value={pexelsImageQuery} onChange={(e) => setPexelsImageQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && PEXELS_API_KEY && handlePexelsImageSearch()} placeholder="Search Pexels Images..." className="flex-grow text-sm p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none dark:text-gray-100" disabled={!PEXELS_API_KEY || isSearchingPexelsImage} aria-label="Pexels Image Search Query" /> <button onClick={() => handlePexelsImageSearch()} disabled={!PEXELS_API_KEY || isSearchingPexelsImage || !pexelsImageQuery.trim()} className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" aria-label="Search Pexels Images"> {isSearchingPexelsImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} </button> </div>
							{pexelsImageError && <div className="text-xs text-red-500 dark:text-red-400 mb-3 px-1">{pexelsImageError}</div>}
							<div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar"> {isSearchingPexelsImage && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>} {!isSearchingPexelsImage && pexelsImageAssets.length === 0 && !pexelsImageError && <p className="text-sm italic p-3 text-gray-400 dark:text-gray-500">No results.</p>} {pexelsImageAssets.map((item) => <DraggableAsset key={item.id} itemData={item} isSource={true} />)} </div>
						</div>
						<div className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
							<h5 className="font-semibold text-base md:text-lg mb-3 dark:text-gray-100 border-b dark:border-gray-600 pb-2">Pexels Videos</h5>
							{(!PEXELS_API_KEY) && <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-200 rounded-md">Pexels API Key not configured.</div>}
							<div className="flex items-center gap-2 mb-3"> <input type="text" value={pexelsVideoQuery} onChange={(e) => setPexelsVideoQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && PEXELS_API_KEY && handlePexelsVideoSearch()} placeholder="Search Pexels Videos..." className="flex-grow text-sm p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none dark:text-gray-100" disabled={!PEXELS_API_KEY || isSearchingPexelsVideo} aria-label="Pexels Video Search Query" /> <button onClick={() => handlePexelsVideoSearch()} disabled={!PEXELS_API_KEY || isSearchingPexelsVideo || !pexelsVideoQuery.trim()} className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" aria-label="Search Pexels Videos"> {isSearchingPexelsVideo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} </button> </div>
							{pexelsVideoError && <div className="text-xs text-red-500 dark:text-red-400 mb-3 px-1">{pexelsVideoError}</div>}
							<div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar"> {isSearchingPexelsVideo && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>} {!isSearchingPexelsVideo && pexelsVideoAssets.length === 0 && !pexelsVideoError && <p className="text-sm italic p-3 text-gray-400 dark:text-gray-500">No results.</p>} {pexelsVideoAssets.map((item) => <DraggableAsset key={item.id} itemData={item} isSource={true} />)} </div>
						</div>
					</div>
					<div className="flex-grow min-w-0">
						<div className="flex justify-between items-center mb-4 px-1 flex-wrap gap-y-3">
							<h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Segment Timeline</h4>
							<div className="flex items-center gap-2 md:gap-3"> {selectedSegmentIndices.length > 1 && (<button onClick={handleGroupSelected} className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 text-xs md:text-sm font-semibold transition-colors" title="Group selected adjacent segments" aria-label="Group selected segments"> <Link2 className="h-4 w-4 md:h-5 md:w-5" /> Group </button>)} <button title={previewButtonTitle} onClick={openPreview} disabled={!finalAudioUrl || timelineSegments.length === 0 || audioDuration === null || hasOverallDurationMismatch} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs md:text-sm font-semibold transition-colors" aria-label="Open Preview"> <Eye className="h-4 w-4 md:h-5 md:w-5" /> Preview </button> </div>
						</div>
						<div className="p-3 md:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-[75vh] overflow-y-auto custom-scrollbar relative">
							{timelineSegments.length === 0 && (<p className="p-8 text-center text-gray-500 dark:text-gray-400 italic text-base md:text-lg"> {finalAudioUrl && srtJson === null ? "Processing..." : finalAudioUrl && srtJson?.length === 0 ? "No segments." : !finalAudioUrl ? "Load audio." : "Timeline segments..."} </p>)}
							{timelineSegments.map((item, index) => (
								<div key={item.id} className="relative group">
									<TimelineSegmentDisplay
										timelineItem={item}
										itemIndex={index}
										totalItems={timelineSegments.length}
										associatedMedia={segmentMediaMap[item.id] || []}
										onRemoveMediaItem={handleRemoveMediaItem}
										onUpdateImageDuration={handleUpdateImageDuration}
										isActivePreview={isPreviewing && activeTimelineSegmentId === item.id}
										activeMediaIndexInPreview={isPreviewing && activeTimelineSegmentId === item.id ? activeMediaItemIndex : null}
										isSelected={selectedSegmentIndices.includes(index)}
										onToggleSelect={toggleSegmentSelection}
										isDroppableActive={activeDropZoneId === `timeline-dropzone-${item.id}`}
									/>
									{item.type === 'group' && (<button onClick={() => handleUngroup(index)} className="absolute top-5 right-5 p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" title="Ungroup segments" aria-label="Ungroup segments"> <Unlink2 className="h-4 w-4 md:h-5 md:w-5" /> </button>)}
								</div>
							))}
						</div>
					</div>
				</div>
				<DragOverlay dropAnimation={null}>
					{activeDragData ? (<div className="p-2 border rounded-lg bg-white dark:bg-gray-800 shadow-2xl opacity-90 cursor-grabbing w-32 h-28 flex flex-col items-center ring-2 ring-indigo-500"> <img src={activeDragData.url} alt={`Dragging ${activeDragData.type}`} className="w-full h-16 object-cover rounded-md mb-1 shrink-0 bg-gray-200 dark:bg-gray-600" onError={(e) => { e.currentTarget.src = `https://placehold.co/96x64/eee/ccc?text=Drag`; }} /> <div className="text-xs leading-tight mt-1 text-center overflow-hidden px-1 w-full"> <p className="font-semibold truncate capitalize dark:text-gray-100">{activeDragData.type.replace(/_/g, " ")}</p> {activeDragData.type === 'pexels_video' && activeDragData.duration && <p className="text-[10px] text-gray-500 dark:text-gray-400">{activeDragData.duration.toFixed(1)}s</p>} </div> </div>) : null}
				</DragOverlay>
				{isPreviewing && (
					<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 md:p-6" onClick={closePreview} role="dialog" aria-modal="true" aria-labelledby="preview-title">
						<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
							<div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 flex-shrink-0">
								<h4 id="preview-title" className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">Timeline Preview</h4>
								<button onClick={closePreview} aria-label="Close preview" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"> <XCircle className="h-6 w-6 md:h-7 md:w-7" /> </button>
							</div>
							<div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center flex-shrink-0">
								<video
									ref={previewVideoRef}
									key={currentlyActiveMediaItem?.instanceId ?? 'no-video'}
									className={clsx(
										"max-w-full max-h-full object-contain",
										currentlyActiveMediaItem?.type !== 'pexels_video' && "hidden"
									)}
									muted
									playsInline
									preload="auto"
									onLoadedData={handlePreviewVideoLoadedData}
									onError={(e) => console.error("Preview video load error:", (e.target as HTMLVideoElement).error)}
									onWaiting={handleVideoWaiting}
									onPlaying={handleVideoPlaying}
									onSeeked={handleVideoSeeked}
								> Video not supported. </video>
								{currentlyActiveMediaItem?.type !== 'pexels_video' && currentlyActiveMediaItem?.sourceUrl && (
									<img
										key={currentlyActiveMediaItem.instanceId}
										src={currentlyActiveMediaItem.sourceUrl || currentlyActiveMediaItem.url}
										alt={`Preview for ${currentlyActiveMediaItem.type}`}
										className="max-w-full max-h-full object-contain"
										onError={(e) => { e.currentTarget.src = `https://placehold.co/960x540/eee/ccc?text=Load%20Error`; }}
									/>
								)}
								{!currentlyActiveMediaItem && (
									<span className="absolute text-gray-400 text-base md:text-lg font-medium pointer-events-none z-10">
										{!isPreviewReady && audioDuration ? "Loading Audio..." : "Ready"}
										{isPreviewReady && " (No media at this time)"}
									</span>
								)}
								{isVideoBuffering && currentlyActiveMediaItem?.type === 'pexels_video' && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
										<Loader2 className="h-8 w-8 text-white animate-spin" />
									</div>
								)}
							</div>
							<div className="flex flex-col gap-3 flex-shrink-0 pt-2">
								<input type="range" min="0" max={audioDuration || 0} step="0.1"
									value={currentPreviewTime}
									onChange={handlePreviewSeek}
									className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={!isPreviewReady || !audioDuration}
									aria-label="Preview progress" />
								<div className="flex justify-between items-center">
									<button onClick={isPreviewPlaying ? pausePreview : playPreview} className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={!isPreviewReady} aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}>
										{isPreviewPlaying ? <Pause className="h-5 w-5 md:h-6 md:w-6" /> : <Play className="h-5 w-5 md:h-6 md:w-6" />}
									</button>
									<span className="text-xs md:text-sm font-mono text-gray-700 dark:text-gray-200 tabular-nums">
										{formatTime(currentPreviewTime)} / {audioDuration ? formatTime(audioDuration) : "00:00"}
									</span>
								</div>
								{!isPreviewReady && audioDuration && (
									<div className="text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
										<Loader2 className="h-3 w-3 animate-spin" /> Loading preview...
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</DndContext>
	);
});

export default VideoStep;
