export interface SegmentData {
    type: 'tts' | 'upload';
    text?: string;
    engine?: string;
    voice_id?: string;
    speed?: number;
    temporary_id?: string;
}

export interface AudioStepRef {
    getAudioSegmentsData: () => Promise<SegmentData[]>;
}
