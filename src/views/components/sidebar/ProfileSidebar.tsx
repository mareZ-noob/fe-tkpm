import React from "react";
import { Avatar, Button, Card, Divider, Typography } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import type { BaseUser } from "@/interfaces/user/UserInterface";

const { Title, Text } = Typography;

interface ProfileSidebarProps {
	user: BaseUser | null;
	isEditing: boolean;
	onAvatarChangeClick: () => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ user, isEditing, onAvatarChangeClick }) => {
	return (
		<Card
			className="mb-6 text-center bg-white dark:bg-gray-800 0dark:border-gray-600 rounded-lg shadow-lg"
			style={{ marginBottom: 24, textAlign: "center" }}
			styles={{
				body: {
					padding: 24,
				}
			}}>
			<div style={{ position: "relative", display: "inline-block" }}>
				<Avatar
					className="relative inline-block mb-4"
					size={120}
					src={
						user?.avatar ||
						"https://res.cloudinary.com/ds9macgdo/image/upload/v1744097997/tkpm/avatar/default_lcih6i.png"
					}
					style={{ border: "4px solid #f0f0f0" }}
				/>
				{isEditing && (
					<Button
						type="primary"
						shape="circle"
						icon={<CameraOutlined />}
						size="small"
						style={{
							position: "absolute",
							bottom: 0,
							right: 0,
							boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
						}}
						onClick={onAvatarChangeClick}
					/>
				)}
			</div>

			<Title className="text-gray-900 dark:text-gray-100" level={4} style={{ marginTop: 16, marginBottom: 4 }}>
				@{user?.username}
			</Title>
			<Text type="secondary" className="text-gray-600 dark:text-gray-300">
				{user?.first_name} {user?.last_name}
			</Text>

			<Divider style={{ margin: "16px 0" }} className="border-gray-200 dark:border-gray-600" />

			<div style={{ textAlign: "left" }}>
				<div style={{ marginBottom: 12 }}>
					<Text type="secondary" style={{ fontSize: 13 }} className="text-gray-500 dark:text-gray-400">
						Email
					</Text>
					<div className="text-gray-900 dark:text-gray-200">
						{user?.email || "No email provided"}
					</div>
				</div>

				<div>
					<Text type="secondary" style={{ fontSize: 13 }} className="text-gray-500 dark:text-gray-400">
						Member since
					</Text>
					<div className="text-gray-900 dark:text-gray-200">
						{new Date().getFullYear()}
					</div>
				</div>
			</div>
		</Card>
	);
};

export default ProfileSidebar;
