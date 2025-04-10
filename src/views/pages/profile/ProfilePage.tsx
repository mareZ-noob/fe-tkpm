import React, { useEffect, useState } from "react";
import {
	UserOutlined,
	KeyOutlined,
	SaveOutlined,
	CloseOutlined,
	EditOutlined,
	EyeOutlined,
	EyeInvisibleOutlined,
	CameraOutlined,
} from "@ant-design/icons";
import {
	Typography,
	Form,
	Input,
	Button,
	Space,
	DatePicker,
	message,
	Spin,
	Card,
	Tabs,
	Alert,
	Upload,
	Modal,
} from "antd";
import type { TabsProps } from "antd";
import dayjs from "dayjs";
import type { BaseUser, UserUpdate } from "@/interfaces/user/UserInterface";
import UserService from "@/services/user/UserService";
import PageLayout from "@/layouts/PageLayout";
import ProfileSidebar from "@/components/sidebar/ProfileSidebar";
import UploadService from "@/services/upload/UploadService";
import AuthService from "@/services/auth/AuthService";

const { Text } = Typography;
const { TextArea, Password } = Input;

interface PasswordFormValues {
	current_password: string;
	new_password: string;
	confirm_password: string;
}

const ProfilePage: React.FC = () => {
	const [user, setUser] = useState<BaseUser | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("1");
	const [avatarModalVisible, setAvatarModalVisible] = useState(false);
	const [passwordForm] = Form.useForm();
	const [profileForm] = Form.useForm();

	useEffect(() => {
		const fetchUserProfile = async (retryCount = 0) => {
			try {
				setLoading(true);
				const userData = await UserService.getUserProfile();
				setUser(userData);
				profileForm.setFieldsValue({
					first_name: userData.first_name,
					last_name: userData.last_name,
					date_of_birth: userData.date_of_birth ? dayjs(userData.date_of_birth) : undefined,
					description: userData.description,
				});
			} catch (err) {
				console.error("Error fetching user profile:", err);

				if (retryCount < 3) {
					setTimeout(() => fetchUserProfile(retryCount + 1), 1000);
					return;
				}

				message.error("Failed to load profile data");
			} finally {
				if (retryCount === 0 || retryCount === 3) {
					setLoading(false);
				}
			}
		};

		fetchUserProfile();
	}, [profileForm]);

	const handleFileChange = async (file: File) => {
		if (!file) return false;

		const validExtensions = ["jpg", "jpeg", "png"];
		const fileExtension = file.name.split(".").pop()?.toLowerCase();

		if (!fileExtension || !validExtensions.includes(fileExtension)) {
			message.error("Please upload a valid image file (jpg, jpeg, or png)");
			return false;
		}

		try {
			setAvatarModalVisible(false);
			setError(null);
			setSuccess(null);
			setLoading(true);

			const response = await UploadService.uploadAvatar(file);

			if (response && user) {
				setUser({
					...user,
					avatar: URL.createObjectURL(file),
				});
				setSuccess("Avatar updated successfully");
			} else {
				setError("Failed to upload avatar");
				message.error("Failed to upload avatar");
			}
		} catch (error) {
			console.error("Error uploading avatar:", error);
			setError("Failed to upload avatar");
			message.error("Failed to upload avatar");
		} finally {
			setLoading(false);
		}

		return false;
	};

	const toggleEdit = () => {
		if (isEditing) {
			profileForm
				.validateFields()
				.then((values) => {
					if (!user) {
						setError("User data is not available.");
						return;
					}

					const userUpdateData: UserUpdate = {
						first_name: values.first_name,
						last_name: values.last_name,
						description: values.description,
						date_of_birth: values.date_of_birth ? values.date_of_birth.format("YYYY-MM-DD") : undefined,
						avatar: user.avatar,
					};

					setLoading(true);
					UserService.updateUserProfile(userUpdateData)
						.then((response) => {
							setUser(response);
							setIsEditing(false);
							setSuccess("Profile updated successfully");
							setError(null);
						})
						.catch(() => {
							setError("Failed to update user profile");
							message.error("Failed to update profile");
						})
						.finally(() => setLoading(false));
				})
				.catch(() => message.error("Please check the form for errors"));
		} else {
			setIsEditing(true);
		}
	};

	const handleDiscard = () => {
		profileForm.setFieldsValue({
			first_name: user?.first_name,
			last_name: user?.last_name,
			date_of_birth: user?.date_of_birth ? dayjs(user.date_of_birth) : undefined,
			description: user?.description,
		});
		setIsEditing(false);
		message.info("Changes discarded");
	};

	const handlePasswordChange = async (values: PasswordFormValues) => {
		setLoading(true);
		try {
			console.log("Changing password with values:", values);
			await AuthService.changePassword(values.current_password, values.new_password);
			setSuccess("Password changed successfully");
			setError(null);
			passwordForm.resetFields();
		} catch (error) {
			console.error("Password change failed:", error);
			setError("Failed to change password. Your current password may be incorrect.");
			message.error("Failed to change password");
		} finally {
			setLoading(false);
		}
	};

	const tabItems: TabsProps["items"] = [
		{
			key: "1",
			label: (
				<span>
					<UserOutlined style={{ marginRight: 8 }} />
					Personal Information
				</span>
			),
			children: (
				<div style={{ padding: "16px 0" }}>
					<Form
						form={profileForm}
						layout="vertical"
						disabled={!isEditing || loading}
						initialValues={{
							first_name: user?.first_name || "",
							last_name: user?.last_name || "",
							date_of_birth: user?.date_of_birth ? dayjs(user.date_of_birth) : undefined,
							description: user?.description || "",
						}}
					>
						<div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
							<Form.Item
								name="first_name"
								label="First Name"
								style={{ flex: 1, minWidth: 200 }}
								rules={[{ required: true, message: "Please enter your first name" }]}
							>
								<Input placeholder="Enter your first name" />
							</Form.Item>
							<Form.Item
								name="last_name"
								label="Last Name"
								style={{ flex: 1, minWidth: 200 }}
								rules={[{ required: true, message: "Please enter your last name" }]}
							>
								<Input placeholder="Enter your last name" />
							</Form.Item>
						</div>
						<Form.Item
							name="date_of_birth"
							label="Date of Birth"
							rules={[{ required: true, message: "Please select your date of birth" }]}
						>
							<DatePicker style={{ width: "100%" }} placeholder="Select date of birth" />
						</Form.Item>
						<Form.Item name="description" label="About Me" rules={[{ required: false }]}>
							<TextArea placeholder="Tell us about yourself..." rows={4} style={{ resize: "none" }} />
						</Form.Item>
						<Form.Item label="Email Address">
							<Input value={user?.email || ""} disabled placeholder="Email address" />
							<div style={{ marginTop: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>
									Email address cannot be changed
								</Text>
							</div>
						</Form.Item>
						<Form.Item label="Username">
							<Input value={user?.username || ""} disabled placeholder="Username" />
							<div style={{ marginTop: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>
									Username cannot be changed
								</Text>
							</div>
						</Form.Item>
					</Form>
				</div>
			),
		},
		{
			key: "2",
			label: (
				<span>
					<KeyOutlined style={{ marginRight: 8 }} />
					Password
				</span>
			),
			children: (
				<div style={{ padding: "16px 0" }}>
					<Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
						<Form.Item
							name="current_password"
							label="Current Password"
							rules={[{ required: true, message: "Please enter your current password" }]}
						>
							<Password
								placeholder="Enter your current password"
								iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
							/>
						</Form.Item>
						<Form.Item
							name="new_password"
							label="New Password"
						// rules={[
						//   { required: true, message: "Please enter your new password" },
						//   { min: 8, message: "Password must be at least 8 characters" },
						//   {
						//     pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
						//     message: "Password must contain at least one letter and one number",
						//   },
						// ]}
						>
							<Password
								placeholder="Enter your new password"
								iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
							/>
						</Form.Item>
						<Form.Item
							name="confirm_password"
							label="Confirm New Password"
							dependencies={["new_password"]}
							rules={[
								{ required: true, message: "Please confirm your new password" },
								({ getFieldValue }) => ({
									validator(_, value) {
										if (!value || getFieldValue("new_password") === value) {
											return Promise.resolve();
										}
										return Promise.reject(new Error("The two passwords do not match"));
									},
								}),
							]}
						>
							<Password
								placeholder="Confirm your new password"
								iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
							/>
						</Form.Item>
						<Form.Item>
							<Button type="primary" htmlType="submit" loading={loading} disabled={loading}>
								Change Password
							</Button>
						</Form.Item>
					</Form>
				</div>
			),
		},
	];

	if (loading && !user) {
		return (
			<div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
				<Spin size="large" />
			</div>
		);
	}

	return (
		<PageLayout
			title="Profile Settings"
			description="Manage your personal information and account security"
			headerActions={
				<Space size="middle">
					{isEditing ? (
						<>
							<Button icon={<CloseOutlined />} onClick={handleDiscard}>
								Discard
							</Button>
							<Button type="primary" icon={<SaveOutlined />} onClick={toggleEdit}>
								Save Changes
							</Button>
						</>
					) : (
						<Button type="primary" icon={<EditOutlined />} onClick={toggleEdit}>
							Edit Profile
						</Button>
					)}
				</Space>
			}
		>
			{error && (
				<Alert
					message="Error"
					description={error}
					type="error"
					showIcon
					closable
					onClose={() => setError(null)}
					style={{ marginBottom: 24 }}
				/>
			)}
			{success && (
				<Alert
					message="Success"
					description={success}
					type="success"
					showIcon
					closable
					onClose={() => setSuccess(null)}
					style={{ marginBottom: 24 }}
				/>
			)}
			<div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
				<div style={{ minWidth: 250, maxWidth: 300 }}>
					<ProfileSidebar
						user={user}
						isEditing={isEditing}
						onAvatarChangeClick={() => setAvatarModalVisible(true)}
					/>
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<Card>
						<Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ minHeight: 400 }} />
					</Card>
				</div>
			</div>
			<Modal
				title="Change Profile Picture"
				open={avatarModalVisible}
				onCancel={() => setAvatarModalVisible(false)}
				footer={null}
			>
				<Upload.Dragger
					name="avatar"
					accept="image/jpeg,image/png,image/jpg"
					showUploadList={false}
					beforeUpload={(file) => handleFileChange(file)}
					style={{ padding: 20 }}
				>
					<p className="ant-upload-drag-icon">
						<CameraOutlined style={{ fontSize: 48, color: "#1677ff" }} />
					</p>
					<p className="ant-upload-text">Click or drag an image to this area to upload</p>
					<p className="ant-upload-hint">
						Support for a single image upload. Please use an image that is at least 300x300 pixels.
					</p>
				</Upload.Dragger>
			</Modal>
		</PageLayout>
	);
};

export default ProfilePage;
