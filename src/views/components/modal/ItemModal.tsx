import React from "react";
import { Modal, Form, Input, Button, Typography, FormInstance, Dropdown, Space } from "antd";
import { EditOutlined, SaveOutlined, EllipsisOutlined, DeleteOutlined, CopyOutlined, ClockCircleOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

interface ItemModalProps<T extends { updated_at: string }> {
	item: T | null;
	isEditing: boolean;
	onClose: () => void;
	onEditToggle: () => void;
	onSave: () => void;
	onDelete?: (item: T) => void;
	onDuplicate?: (item: T) => void;
	form: FormInstance;
	renderTitle: (item: T) => React.ReactNode;
	renderContent: (item: T) => React.ReactNode;
	hideEditButton?: boolean;
	actionName?: string;
	hideContentField?: boolean;
	onActionClick?: () => void;
}

const ItemModal = <T extends { updated_at: string },>({
	item,
	isEditing,
	onClose,
	onEditToggle,
	onSave,
	onDelete,
	onDuplicate,
	form,
	renderTitle,
	renderContent,
	hideEditButton = false,
	actionName = "Continue",
	hideContentField = false,
	onActionClick,
}: ItemModalProps<T>) => {
	const footer = [
		!hideEditButton && (
			<Button
				key="edit"
				icon={<EditOutlined />}
				onClick={onEditToggle}
				style={{ display: isEditing ? "none" : "inline-flex" }}
				className="items-center dark:text-gray-200 dark:bg-slate-700 dark:hover:bg-gray-700 dark:hover:text-white"
			>
				Edit
			</Button>
		),
		<Button
			key="continue"
			type="primary"
			onClick={onActionClick ? onActionClick : () => console.log("Action clicked - no handler provided")}
			style={{ display: isEditing ? "none" : "inline-flex" }}
		>
			{actionName}
		</Button>,
		<Button
			key="cancel"
			onClick={() => onEditToggle()}
			style={{ display: !isEditing ? "none" : "inline-flex" }}
		>
			Cancel
		</Button>,
		<Button
			key="save"
			type="primary"
			icon={<SaveOutlined />}
			onClick={onSave}
			style={{ display: !isEditing ? "none" : "inline-flex" }}
		>
			Save Changes
		</Button>,
	].filter(Boolean);

	const renderHeader = () => (
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
			<div style={{ flex: 1 }}>{item && !isEditing ? renderTitle(item) : "Edit Item"}</div>
		</div>
	);

	return (
		<Modal
			title={renderHeader()}
			open={item !== null}
			onCancel={onClose}
			footer={footer}
			width={700}
			styles={{ body: { padding: isEditing ? "16px 24px" : 0 } }}
			destroyOnClose
		>
			{item && (
				<>
					{!isEditing && (
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							padding: '0 24px 12px',
							borderBottom: '1px solid #f0f0f0'
						}}>
						</div>
					)}
					<Form form={form} layout="vertical" style={{ marginTop: isEditing ? 8 : 0 }}>
						{isEditing ? (
							<>
								<Form.Item name="title" label="Title" rules={[{ required: true, message: "Title cannot be empty" }]}>
									<Input placeholder="Enter title" />
								</Form.Item>
								{!hideContentField && (
									<Form.Item
										name="content"
										label="Content"
										rules={[{ required: true, message: "Content cannot be empty" }]}
									>
										<TextArea rows={12} placeholder="Enter content" style={{ resize: "none" }} />
									</Form.Item>
								)}
							</>
						) : (
							<>
								<div
									style={{
										padding: "16px 24px",
										borderBottom: "1px solid #f0f0f0",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<Space>
										<Text type="secondary" style={{ fontSize: 13 }} className="dark:text-gray-400">
											<ClockCircleOutlined style={{ marginRight: 4 }} />
											Last modified: {new Date(item.updated_at).toLocaleString()}
										</Text>
									</Space>
									<Dropdown
										menu={{
											items: [
												{
													key: "duplicate",
													label: "Duplicate",
													icon: <CopyOutlined />,
													onClick: () => item && onDuplicate && onDuplicate(item)
												},
												{
													key: "delete",
													label: "Delete",
													danger: true,
													icon: <DeleteOutlined />,
													onClick: () => item && onDelete && onDelete(item)
												},
											],
											className: "bg-white dark:bg-gray-800 dark:border-gray-600",
										}}
										overlayClassName="rounded-md shadow-lg [&_.ant-dropdown-menu-item]:text-gray-900 [&_.ant-dropdown-menu-item]:dark:text-gray-100 [&_.ant-dropdown-menu-item:hover]:bg-gray-100 [&_.ant-dropdown-menu-item:hover]:dark:bg-gray-700 [&_.ant-dropdown-menu-item:focus]:bg-gray-100 [&_.ant-dropdown-menu-item:focus]:dark:bg-gray-700 [&_.ant-dropdown-menu-item:focus]:ring-2 [&_.ant-dropdown-menu-item:focus]:ring-blue-500 [&_.ant-dropdown-menu-item:focus]:dark:ring-blue-400 [&_.ant-dropdown-menu-item-selected]:bg-blue-50 [&_.ant-dropdown-menu-item-selected]:dark:bg-blue-900/50 [&_.ant-dropdown-menu-item-selected]:text-blue-600 [&_.ant-dropdown-menu-item-selected]:dark:text-blue-300"
									>
										<Button
											className="bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
											type="text"
											icon={<EllipsisOutlined />}
										/>
									</Dropdown>
								</div>
								<div style={{ maxHeight: "60vh", overflowY: "auto", padding: "24px" }}>
									<Paragraph style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.6 }}>
										{renderContent(item)}
									</Paragraph>
								</div>
							</>
						)}
					</Form>
				</>
			)}
		</Modal>
	);
};

export default ItemModal;
