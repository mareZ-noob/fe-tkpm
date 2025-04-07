"use client"

import { useState } from "react"
import { Card, Modal, Typography, Row, Col, Form, Input, Button, message } from "antd"
import { FileTextOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons"

const { Title, Paragraph } = Typography
const { TextArea } = Input

// Sample text file data
const textFiles = [
	{
		id: 1,
		title: "Project Proposal",
		content:
			"This is a project proposal document with important details about the upcoming project.\n\nIt includes:\n- Objectives\n- Timeline\n- Resource requirements",
		category: "Work",
		lastModified: "2023-04-15T10:30:00Z",
		starred: true,
	},
	{
		id: 2,
		title: "Meeting Notes",
		content:
			"Meeting notes from the team discussion on product roadmap.\n\nKey decisions:\n1. Launch date moved to Q3\n2. New features prioritized for mobile version",
		category: "Work",
		lastModified: "2023-04-12T14:45:00Z",
		starred: false,
	},
	{
		id: 3,
		title: "Research Summary",
		content:
			"Summary of research findings on user behavior.\n\nData shows:\n- 65% of users prefer dark mode\n- 78% use the search feature within the first minute",
		category: "Research",
		lastModified: "2023-04-10T09:15:00Z",
		starred: true,
	},
	{
		id: 4,
		title: "Product Requirements",
		content:
			"Detailed requirements for the new product version.\n\nMust include:\n- Single sign-on\n- Export to PDF functionality\n- Customizable dashboard widgets",
		category: "Work",
		lastModified: "2023-04-08T16:20:00Z",
		starred: false,
	},
	{
		id: 5,
		title: "Weekly Update",
		content:
			"Weekly team update for stakeholders.\n\nStatus:\n- Development is on track\n- QA found 3 minor bugs that will be fixed by Thursday\n- Customer feedback has been positive",
		category: "Updates",
		lastModified: "2023-04-05T11:10:00Z",
		starred: false,
	},
	{
		id: 6,
		title: "API Documentation",
		content:
			"Documentation for REST API endpoints.\n\nDetails:\n- Authentication requires Bearer token\n- Rate limiting is set to 100 requests per minute\n- Responses are in JSON format",
		category: "Technical",
		lastModified: "2023-04-01T15:30:00Z",
		starred: false,
	},
]

// Component to render a text file icon with blurred text inside
const TextFileIcon = ({ content }: { content: string }) => {
	return (
		<div
			style={{
				position: "relative",
				height: 120,
				width: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					padding: 8,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
					<div
						style={{
							fontSize: 12,
							color: "#999",
							filter: "blur(2px)",
						}}
					>
						{content}
					</div>
				</div>
			</div>
			<div
				style={{
					position: "relative",
					zIndex: 10,
					display: "flex",
					height: "100%",
					width: "100%",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "rgba(255, 255, 255, 0.8)",
				}}
			>
				<FileTextOutlined style={{ fontSize: 36, color: "#666" }} />
			</div>
		</div>
	)
}

const DocumentPage = () => {
	const [files, setFiles] = useState(textFiles)
	const [selectedFile, setSelectedFile] = useState<(typeof textFiles)[0] | null>(null)
	const [editedContent, setEditedContent] = useState("")
	const [isEditing, setIsEditing] = useState(false)
	const [form] = Form.useForm()

	const openFile = (file: (typeof textFiles)[0]) => {
		setSelectedFile(file)
		setEditedContent(file.content)
		setIsEditing(false)
		form.setFieldsValue({ content: file.content })
	}

	const closeFile = () => {
		setSelectedFile(null)
		setIsEditing(false)
	}

	const toggleEdit = () => {
		setIsEditing(!isEditing)
	}

	const handleSave = () => {
		form.validateFields().then((values) => {
			const updatedFiles = files.map((file) => {
				if (file.id === selectedFile?.id) {
					return { ...file, content: values.content }
				}
				return file
			})

			setFiles(updatedFiles)
			setSelectedFile(selectedFile ? { ...selectedFile, content: values.content } : null)
			setIsEditing(false)
			message.success("File saved successfully!")
		})
	}

	const modalFooter = [
		<Button
			key="edit"
			icon={<EditOutlined />}
			onClick={toggleEdit}
			style={{ display: isEditing ? "none" : "inline-flex" }}
		>
			Edit
		</Button>,
		<Button key="cancel" onClick={() => setIsEditing(false)} style={{ display: !isEditing ? "none" : "inline-flex" }}>
			Cancel
		</Button>,
		<Button
			key="save"
			type="primary"
			icon={<SaveOutlined />}
			onClick={handleSave}
			style={{ display: !isEditing ? "none" : "inline-flex" }}
		>
			Save Changes
		</Button>,
	]

	return (
		<div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
			<Title level={2} style={{ marginBottom: 24 }}>
				Text Files
			</Title>

			<Row gutter={[16, 16]}>
				{files.map((file) => (
					<Col key={file.id} xs={12} sm={8} md={6} lg={4} xl={4}>
						<Card hoverable style={{ textAlign: "center" }} bodyStyle={{ padding: 12 }} onClick={() => openFile(file)}>
							<TextFileIcon content={file.content} />
							<Typography.Text strong style={{ display: "block", marginTop: 8 }}>
								{file.title}
							</Typography.Text>
						</Card>
					</Col>
				))}
			</Row>

			{/* File Viewer/Editor Modal */}
			<Modal
				title={selectedFile?.title}
				open={selectedFile !== null}
				onCancel={closeFile}
				footer={modalFooter}
				width={600}
			>
				<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
					{isEditing ? (
						<Form.Item name="content" rules={[{ required: true, message: "Content cannot be empty" }]}>
							<TextArea rows={12} placeholder="Enter file content" style={{ resize: "none" }} />
						</Form.Item>
					) : (
						<div
							style={{
								maxHeight: "60vh",
								overflowY: "auto",
								border: "1px solid #f0f0f0",
								borderRadius: 4,
								padding: 16,
							}}
						>
							<Paragraph>{selectedFile?.content}</Paragraph>
						</div>
					)}
				</Form>
			</Modal>
		</div>
	)
}

export default DocumentPage;

