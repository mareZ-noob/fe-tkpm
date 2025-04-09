// components/ItemModal.tsx
import React from "react";
import { Modal, Form, Input, Button, Typography, FormInstance } from "antd";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Paragraph } = Typography;

interface ItemModalProps<T> {
	item: T | null;
	isEditing: boolean;
	onClose: () => void;
	onEditToggle: () => void;
	onSave: () => void;
	form: FormInstance;
	renderTitle: (item: T) => React.ReactNode;
	renderContent: (item: T) => React.ReactNode;
}

const ItemModal = <T,>({
	item,
	isEditing,
	onClose,
	onEditToggle,
	onSave,
	form,
	renderTitle,
	renderContent,
}: ItemModalProps<T>) => {
	const footer = [
		<Button
			key="edit"
			icon={<EditOutlined />}
			onClick={onEditToggle}
			style={{ display: isEditing ? "none" : "inline-flex" }}
		>
			Edit
		</Button>,
		<Button
			key="continue"
			type="primary"
			onClick={() => {
				console.log("Continue clicked")
			}}
			style={{ display: isEditing ? "none" : "inline-flex" }}
		>
			Continue
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
	];

	return (
		<Modal
			title={item && (isEditing ? "Edit Item" : renderTitle(item))}
			open={item !== null}
			onCancel={onClose}
			footer={footer}
			width={700}
			styles={{ body: { padding: isEditing ? "16px 24px" : 0 } }}
		>
			{item && (
				<Form form={form} layout="vertical" style={{ marginTop: isEditing ? 8 : 0 }}>
					{isEditing ? (
						<>
							<Form.Item name="title" label="Title" rules={[{ required: true, message: "Title cannot be empty" }]}>
								<Input placeholder="Enter title" />
							</Form.Item>
							<Form.Item
								name="content"
								label="Content"
								rules={[{ required: true, message: "Content cannot be empty" }]}
							>
								<TextArea rows={12} placeholder="Enter content" style={{ resize: "none" }} />
							</Form.Item>
						</>
					) : (
						<div style={{ maxHeight: "60vh", overflowY: "auto", padding: "24px" }}>
							<Paragraph style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.6 }}>
								{renderContent(item)}
							</Paragraph>
						</div>
					)}
				</Form>
			)}
		</Modal>
	);
};

export default ItemModal;
