import VideoEditor from "@/components/form/VideoEditor"
import { useLocation } from 'react-router-dom';

const CreatePage = () => {
	const location = useLocation();
    const initialContent = location.state?.initialContent ?? "";
    const initialStep = location.state?.initialStep ?? 1;

	return (
		<div className="bg-purple-50 dark:bg-slate-900 min-h-full p-4 md:p-6">
			<VideoEditor
                initialContent={initialContent}
                initialStep={initialStep}
            />
		</div>
	)
};

export default CreatePage;
