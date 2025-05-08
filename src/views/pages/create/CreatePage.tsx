import VideoEditor from "@/components/form/VideoEditor"
import PageLayout from "@/layouts/PageLayout";
import { useLocation } from 'react-router-dom';

const CreatePage = () => {
	const location = useLocation();
	const initialContent = location.state?.initialContent ?? "";
	const initialStep = location.state?.initialStep ?? 1;

	// const tempInitialStep = 6;

	return (
		<PageLayout
			title="Video"
			description="Turn your text into compelling videos and publish directly to YouTube"
		>
			<div className="bg-purple-50 dark:bg-slate-900 min-h-full">
				<VideoEditor
					// initialContent={initialContent}
					// initialStep={initialStep}
					initialContent={initialContent}
					initialStep={initialStep}
				/>
			</div>
		</PageLayout>
	)
};

export default CreatePage;
