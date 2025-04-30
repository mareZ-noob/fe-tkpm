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
	CheckCircleFilled,
	CloseCircleFilled,
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
	Progress,
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

interface PasswordStrength {
	score: number;
	hasMinLength: boolean;
	hasNumber: boolean;
	hasSpecialChar: boolean;
	hasUppercase: boolean;
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
	const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
		score: 0,
		hasMinLength: false,
		hasNumber: false,
		hasSpecialChar: false,
		hasUppercase: false,
	});
	const [newPassword, setNewPassword] = useState("");

	useEffect(() => {
		const hasMinLength = newPassword.length >= 8;
		const hasNumber = /\d/.test(newPassword);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
		const hasUppercase = /[A-Z]/.test(newPassword);

		let score = 0;
		if (hasMinLength) score++;
		if (hasNumber) score++;
		if (hasSpecialChar) score++;
		if (hasUppercase) score++;

		setPasswordStrength({
			score,
			hasMinLength,
			hasNumber,
			hasSpecialChar,
			hasUppercase,
		});
	}, [newPassword]);

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
		// Validate password strength before submission
		const minimumRequiredScore = 2; // Require at least a "medium" strength password
		if (passwordStrength.score < minimumRequiredScore) {
			setError("Your password is too weak. Please choose a stronger password.");
			return;
		}

		setLoading(true);
		try {
			console.log("Changing password with values:", values);
			await AuthService.changePassword(values.current_password, values.new_password);
			setSuccess("Password changed successfully");
			setError(null);
			passwordForm.resetFields();
			setNewPassword("");
		} catch (error) {
			console.error("Password change failed:", error);
			setError("Failed to change password. Your current password may be incorrect.");
			message.error("Failed to change password");
		} finally {
			setLoading(false);
		}
	};

	const getStrengthColor = () => {
		switch (passwordStrength.score) {
			case 0: return "#f5222d";
			case 1: return "#fa8c16";
			case 2: return "#faad14";
			case 3: return "#52c41a";
			case 4: return "#237804";
			default: return "#f5222d";
		}
	};

	const getStrengthText = () => {
		if (!newPassword) return "";
		switch (passwordStrength.score) {
			case 0: return "Very Weak";
			case 1: return "Weak";
			case 2: return "Medium";
			case 3: return "Strong";
			case 4: return "Very Strong";
			default: return "Very Weak";
		}
	};

	const tabItems: TabsProps["items"] = [
		{
			key: "1",
			label: (
				<span className="text-gray-900 dark:text-gray-100">
					<UserOutlined style={{ marginRight: 8 }} />
					Personal Information
				</span>
			),
			children: (
				<div className="p-4" style={{ padding: "16px 0" }}>
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
						<div className="flex gap-4 mb-6 flex-wrap" style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
							<Form.Item
								name="first_name"
								label={<span className="text-gray-700 dark:text-gray-300">First Name</span>}
								className="flex-1 min-w-[200px]"
								style={{ flex: 1, minWidth: 200 }}
								rules={[{ required: true, message: "Please enter your first name" }]}
							>
								<Input
									className="bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
									placeholder="Enter your first name"
								/>
							</Form.Item>
							<Form.Item
								name="last_name"
								label={<span className="text-gray-700 dark:text-gray-300">Last Name</span>}
								className="flex-1 min-w-[200px]"
								style={{ flex: 1, minWidth: 200 }}
								rules={[{ required: true, message: "Please enter your last name" }]}
							>
								<Input
									className="bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
									placeholder="Enter your last name"
								/>
							</Form.Item>
						</div>
						<Form.Item
							name="date_of_birth"
							label={<span className="text-gray-700 dark:text-gray-300">Date of Birth</span>}
							rules={[{ required: true, message: "Please select your date of birth" }]}
						>
							<DatePicker
								className="w-full bg-white dark:bg-gray-700 dark:text-gray-100" style={{ width: "100%" }}
								placeholder="Select date of birth"
							/>
						</Form.Item>
						<Form.Item
							name="description"
							label={<span className="text-gray-700 dark:text-gray-300">About Me</span>}
							rules={[{ required: false }]}
						>
							<TextArea
								className="bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
								placeholder="Tell us about yourself..."
								rows={4}
								style={{ resize: "none" }}
							/>
						</Form.Item>
						<Form.Item
							label={<span className="text-gray-700 dark:text-gray-300">Email Address</span>}
						>
							<Input
								className="bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
								value={user?.email || ""}
								disabled
								placeholder="Email address"
							/>
							<div style={{ marginTop: 4 }} className="mt-1">
								<Text
									className="text-gray-500 dark:text-gray-400"
									type="secondary"
									style={{ fontSize: 12 }}
								>
									Email address cannot be changed
								</Text>
							</div>
						</Form.Item>
						<Form.Item
							label={<span className="text-gray-700 dark:text-gray-300">Username</span>}
						>
							<Input
								className="bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
								value={user?.username || ""}
								disabled
								placeholder="Username"
							/>
							<div className="mt-1" style={{ marginTop: 4 }}>
								<Text
									className="text-gray-500 dark:text-gray-400"
									type="secondary"
									style={{ fontSize: 12 }}
								>
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
				<span className="text-gray-900 dark:text-gray-100">
					<KeyOutlined style={{ marginRight: 8 }} />
					Password
				</span>
			),
			children: (
				<div className="p-4" style={{ padding: "16px 0" }}>
					<Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
						<Form.Item
							name="current_password"
							label={<span className="text-gray-700 dark:text-gray-300">Current Password</span>}
							rules={[{ required: true, message: "Please enter your current password" }]}
						>
							<Password
								placeholder="Enter your current password"
								className="bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
								iconRender={(visible) =>
									visible ? (
										<EyeOutlined className="text-gray-600 dark:text-gray-300" />
									) : (
										<EyeInvisibleOutlined className="text-gray-600 dark:text-gray-300" />
									)
								}
							/>
						</Form.Item>
						<Form.Item
							name="new_password"
							label={<span className="text-gray-700 dark:text-gray-300">New Password</span>}
							rules={[{ required: true, message: "Please enter your new password" }]}
						>
							<Password
								placeholder="Enter your new password"
								className="bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
								iconRender={(visible) =>
									visible ? (
										<EyeOutlined className="text-gray-600 dark:text-gray-300" />
									) : (
										<EyeInvisibleOutlined className="text-gray-600 dark:text-gray-300" />
									)
								}
								onChange={(e) => setNewPassword(e.target.value)}
							/>
						</Form.Item>

						{/* Password Strength Indicator */}
						{newPassword && (
							<Form.Item label=" " colon={false}>
								<div>
									<div className="flex items-center mb-2" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
										<div className="flex-1 mr-2" style={{ flex: 1, marginRight: 8 }}>
											<Progress
												percent={Math.min(100, (passwordStrength.score / 4) * 100)}
												showInfo={false}
												strokeColor={getStrengthColor()}
												size="small"
											/>
										</div>
										<Text className="w-[90px]" style={{ width: 90, color: getStrengthColor(), fontWeight: 'bold' }}>
											{getStrengthText()}
										</Text>
									</div>
									<div className="mt-2" style={{ marginTop: 8 }}>
										<ul className="list-none p-0 m-0" style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
											<li
												className="my-1 flex items-center"
												style={{
													margin: '4px 0',
													color: passwordStrength.hasMinLength ? '#52c41a' : '#bfbfbf',
													display: 'flex',
													alignItems: 'center'
												}}>
												{passwordStrength.hasMinLength ?
													<CheckCircleFilled className="mr-2" style={{ marginRight: 8 }} /> :
													<CloseCircleFilled className="mr-2" style={{ marginRight: 8 }} />}
												At least 8 characters
											</li>
											<li
												className="my-1 flex items-center"
												style={{
													margin: '4px 0',
													color: passwordStrength.hasNumber ? '#52c41a' : '#bfbfbf',
													display: 'flex',
													alignItems: 'center'
												}}>
												{passwordStrength.hasNumber ?
													<CheckCircleFilled className="mr-2" style={{ marginRight: 8 }} /> :
													<CloseCircleFilled className="mr-2" style={{ marginRight: 8 }} />}
												At least 1 number
											</li>
											<li
												className="my-1 flex items-center"
												style={{
													margin: '4px 0',
													color: passwordStrength.hasSpecialChar ? '#52c41a' : '#bfbfbf',
													display: 'flex',
													alignItems: 'center'
												}}>
												{passwordStrength.hasSpecialChar ?
													<CheckCircleFilled className="mr-2" style={{ marginRight: 8 }} /> :
													<CloseCircleFilled className="mr-2" style={{ marginRight: 8 }} />}
												At least 1 special character (!@#$%^&*(),.?":{ }|&lt;&gt;)
											</li>
											<li
												className="my-1 flex items-center"
												style={{
													margin: '4px 0',
													color: passwordStrength.hasUppercase ? '#52c41a' : '#bfbfbf',
													display: 'flex',
													alignItems: 'center'
												}}>
												{passwordStrength.hasUppercase ?
													<CheckCircleFilled style={{ marginRight: 8 }} /> :
													<CloseCircleFilled style={{ marginRight: 8 }} />}
												At least 1 uppercase letter
											</li>
										</ul>
									</div>
								</div>
							</Form.Item>
						)}

						<Form.Item
							name="confirm_password"
							label={<span className="text-gray-700 dark:text-gray-300">Confirm New Password</span>}
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
								className="bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
								placeholder="Confirm your new password"
								iconRender={(visible) =>
									visible ? (
										<EyeOutlined className="text-gray-600 dark:text-gray-300" />
									) : (
										<EyeInvisibleOutlined className="text-gray-600 dark:text-gray-300" />
									)
								}
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
			<div
				className="h-screen flex justify-center items-center bg-gray-100 dark:bg-gray-900"
				style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
			>
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
					className="mb-6 bg-red-50 dark:bg-red-900/50 dark:text-red-200"
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
					className="mb-6 bg-green-50 dark:bg-green-900/50 dark:text-green-200"
				/>
			)}
			<div className="flex flex-col md:items-center items-center lg:flex-row lg:items-start gap-6" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
				<div className="w-full lg:w-auto lg:min-w-[250px] lg:max-w-[300px] lg:flex-shrink-0" style={{ minWidth: 250, maxWidth: 300 }}>
					<ProfileSidebar
						user={user}
						isEditing={isEditing}
						onAvatarChangeClick={() => setAvatarModalVisible(true)}
					/>
				</div>
				<div className="w-full md:flex-1 md:min-w-0" style={{ flex: 1, minWidth: 0 }}>
					<Card className="bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg">
						<Tabs
							className="text-gray-900 dark:text-gray-100"
							activeKey={activeTab}
							onChange={setActiveTab}
							items={tabItems}
							style={{ minHeight: 400 }}
						/>
					</Card>
				</div>
			</div>
			<Modal
				title="Change Profile Picture"
				open={avatarModalVisible}
				onCancel={() => setAvatarModalVisible(false)}
				footer={null}
				destroyOnClose
				className="bg-white dark:bg-gray-800"
			>
				<Upload.Dragger
					name="avatar"
					accept="image/jpeg,image/png,image/jpg"
					showUploadList={false}
					beforeUpload={(file) => handleFileChange(file)}
					style={{ padding: 20 }}
					className="p-5 bg-gray-50 dark:bg-gray-700"
				>
					<p className="ant-upload-drag-icon">
						<CameraOutlined style={{ fontSize: 48, color: "#1677ff" }} />
					</p>
					<p className="ant-upload-text text-gray-900 dark:text-gray-100">Click or drag an image to this area to upload</p>
					<p className="ant-upload-hint text-gray-600 dark:text-gray-400">
						{/* Support for a single image upload. Please use an image that is at least 300x300 pixels. */}
						Supports JPG, JPEG, PNG. Max file size 2MB recommended.
					</p>
				</Upload.Dragger>
			</Modal>
		</PageLayout>
	);
};

export default ProfilePage;
