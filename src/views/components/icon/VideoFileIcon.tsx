import { VideoCameraOutlined } from "@ant-design/icons";

const VideoFileIcon = () => {
	const colors = ["#1677ff", "#52c41a", "#722ed1", "#fa8c16", "#eb2f96"]
	const defaultColor = colors[0];

	return (
		<div
			style={{
				position: "relative",
				height: 140,
				width: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "hidden",
				borderRadius: 8,
				backgroundColor: "#f9f9f9",
				transition: "all 0.2s ease",
			}}
		>
			<div
				style={{
					position: "relative",
					zIndex: 10,
					display: "flex",
					height: "100%",
					width: "100%",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "rgba(255, 255, 255, 0.85)",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 8,
					}}
				>
					<div
						style={{
							width: 60,
							height: 60,
							borderRadius: "50%",
							backgroundColor: `${defaultColor}15`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<VideoCameraOutlined style={{ fontSize: 28, color: defaultColor }} />
					</div>
					<div
						style={{
							width: 20,
							height: 4,
							backgroundColor: defaultColor,
							borderRadius: 2,
						}}
					/>
				</div>
			</div>
		</div>
	)
};

export default VideoFileIcon;
