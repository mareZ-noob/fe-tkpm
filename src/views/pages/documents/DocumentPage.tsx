"use client"

import React, { useState, useEffect } from "react"
import {
	Card,
	Modal,
	Typography,
	Row,
	Col,
	Form,
	Input,
	Button,
	message,
	Layout,
	Space,
	Spin,
	Empty,
	Dropdown,
} from "antd"
import {
	FileTextOutlined,
	EditOutlined,
	SaveOutlined,
	SearchOutlined,
	SortAscendingOutlined,
	EllipsisOutlined,
	StarOutlined,
	StarFilled,
	ClockCircleOutlined,
	FilterOutlined,
} from "@ant-design/icons"
import DocumentService from "@/services/document/DocumentService" // Adjust the import path
import { BaseDocument, DocumentUpdate } from "@/interfaces/document/DocumentInterface"
import { FormatRelativeTime } from "@/utils/FormatRelativeTime"

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Header, Content } = Layout

// Component to render a text file icon with blurred text inside
const TextFileIcon = ({ content }: { content?: string }) => {
	const defaultColor = "#1677ff"

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
					position: "absolute",
					inset: 0,
					padding: 12,
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
						{content || "No content"}
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
						<FileTextOutlined style={{ fontSize: 28, color: defaultColor }} />
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
}

const DocumentPage = () => {
	const [files, setFiles] = useState<BaseDocument[]>([])
	const [selectedFile, setSelectedFile] = useState<BaseDocument | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState("")
	const [sortOption, setSortOption] = useState<string>("date-new") // Default sort by newest date
	const [form] = Form.useForm()
	const [filterOption, setFilterOption] = useState<string>("all")

	// Fetch documents from the API
	useEffect(() => {
		const fetchDocuments = async () => {
			try {
				const documents = await DocumentService.getDocuments()
				setFiles(documents)
				setLoading(false)
			} catch (error) {
				console.error("Error fetching documents:", error)
				message.error("Failed to load documents")
				setLoading(false)
			}
		}
		fetchDocuments()
	}, [])

	const openFile = (file: BaseDocument) => {
		setSelectedFile(file)
		setIsEditing(false)
		form.setFieldsValue({
			title: file.title,
			content: file.content,
		})
	}

	const closeFile = () => {
		setSelectedFile(null)
		setIsEditing(false)
	}

	const toggleEdit = () => {
		setIsEditing(!isEditing)
		if (selectedFile) {
			form.setFieldsValue({
				title: selectedFile.title,
				content: selectedFile.content,
			})
		}
	}

	const handleSave = async () => {
		try {
			const values = await form.validateFields()
			if (!selectedFile) return

			const updatedDocument: DocumentUpdate = {
				title: values.title,
				content: values.content,
				starred: selectedFile.starred,
			}

			await DocumentService.updateDocument(selectedFile.id, updatedDocument)
			const updatedFiles = files.map((file) =>
				file.id === selectedFile.id
					? { ...file, ...updatedDocument, updated_at: new Date().toISOString() }
					: file,
			)

			setFiles(updatedFiles)
			setSelectedFile({
				...selectedFile,
				...updatedDocument,
				updated_at: new Date().toISOString(),
			})
			setIsEditing(false)
			message.success("Document saved successfully!")
		} catch (error) {
			console.error("Error saving document:", error)
			message.error("Failed to save document")
		}
	}

	const toggleStar = async (fileId: string, event: React.MouseEvent) => {
		event.stopPropagation()
		try {
			const fileToUpdate = files.find((file) => file.id === fileId)
			if (!fileToUpdate) return

			const updatedStarred = !fileToUpdate.starred
			await DocumentService.updateDocument(fileId, { starred: updatedStarred })

			const updatedFiles = files.map((file) =>
				file.id === fileId ? { ...file, starred: updatedStarred } : file,
			)
			setFiles(updatedFiles)

			if (selectedFile && selectedFile.id === fileId) {
				setSelectedFile({ ...selectedFile, starred: updatedStarred })
			}
		} catch (error) {
			console.error("Error updating starred status:", error)
			message.error("Failed to update starred status")
		}
	}

	// Filter and sort files
	const filteredAndSortedFiles = () => {
		const filtered = files.filter((file) => {
			const matchesSearch =
				(file.title?.toLowerCase().includes(searchText.toLowerCase()) || false) ||
				(file.content?.toLowerCase().includes(searchText.toLowerCase()) || false)
			const matchesStarred = filterOption === "starred" ? file.starred : true
			return matchesSearch && matchesStarred
		})

		// Sort files based on sortOption
		switch (sortOption) {
			case "name-asc":
				filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
				break
			case "name-desc":
				filtered.sort((a, b) => (b.title || "").localeCompare(a.title || ""))
				break
			case "date-new":
				filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
				break
			case "date-old":
				filtered.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
				break
			default:
				break
		}

		return filtered
	}

	const handleSortChange = (key: string) => {
		setSortOption(key)
	}

	const handleFilterChange = (key: string) => {
		setFilterOption(key)
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
		<Layout style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
			<Header
				style={{
					backgroundColor: "#fff",
					padding: "24px",
					height: "auto",
					boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)",
					position: "sticky",
					top: 0,
					zIndex: 20,
					display: "flex",
					flexDirection: "column",
					gap: "16px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "16px",
					}}
				>
					<div>
						<Title level={3} style={{ margin: 0, fontWeight: 600 }}>
							Documents
						</Title>
						<Text type="secondary" style={{ fontSize: 14 }}>
							Manage and organize your text documents
						</Text>
					</div>
					<Space size="middle">
						<Input
							placeholder="Search documents..."
							prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
							style={{ width: 240, borderRadius: 6 }}
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
							allowClear
						/>
					</Space>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderTop: "1px solid #f0f0f0",
						paddingTop: 16,
					}}
				>
					<Space size="middle">
						<Dropdown
							menu={{
								items: [
									{ key: "all", label: "All" },
									{ key: "starred", label: "Starred" },
								],
								onClick: ({ key }) => handleFilterChange(key),
							}}
						>
							<Button icon={<FilterOutlined />} style={{ borderRadius: 6 }}>
								Filter: {filterOption === "all" ? "All" : "Starred"}
							</Button>
						</Dropdown>
						<Dropdown
							menu={{
								items: [
									{ key: "name-asc", label: "Name (A-Z)" },
									{ key: "name-desc", label: "Name (Z-A)" },
									{ key: "date-new", label: "Date (Newest)" },
									{ key: "date-old", label: "Date (Oldest)" },
								],
								onClick: ({ key }) => handleSortChange(key),
							}}
						>
							<Button icon={<SortAscendingOutlined />} style={{ borderRadius: 6 }}>
								Sort: {sortOption === "name-asc" ? "Name (A-Z)" :
									sortOption === "name-desc" ? "Name (Z-A)" :
										sortOption === "date-new" ? "Date (Newest)" : "Date (Oldest)"}
							</Button>
						</Dropdown>
					</Space>
					<Text style={{ fontSize: 14 }}>
						{filteredAndSortedFiles().length} {filteredAndSortedFiles().length === 1 ? "document" : "documents"}
					</Text>
				</div>
			</Header>

			<Content style={{ padding: "0 24px 24px 24px", backgroundColor: "#fff" }}>
				{loading ? (
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							height: 400,
						}}
					>
						<Spin size="large" />
					</div>
				) : filteredAndSortedFiles().length === 0 ? (
					<Empty
						description={searchText ? "No documents match your search" : "No documents yet"}
						style={{ margin: "80px 0" }}
					/>
				) : (
					<Row gutter={[20, 20]}>
						{filteredAndSortedFiles().map((file) => (
							<Col key={file.id} xs={24} sm={12} md={8} lg={6} xl={4}>
								<Card
									hoverable
									style={{
										borderRadius: 8,
										overflow: "hidden",
										transition: "all 0.2s ease",
										height: "100%",
									}}
									styles={{
										body: {
											padding: 0,
											height: "100%",
											display: "flex",
											flexDirection: "column",
										},
									}}
									onClick={() => openFile(file)}
								>
									<TextFileIcon content={file.content} />
									<div
										style={{
											padding: "12px 16px",
											display: "flex",
											flexDirection: "column",
											gap: 8,
											flexGrow: 1,
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "flex-start",
											}}
										>
											<Typography.Text
												strong
												style={{
													fontSize: 15,
													lineHeight: 1.4,
													display: "block",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													maxWidth: "calc(100% - 24px)",
												}}
											>
												{file.title || "Untitled"}
											</Typography.Text>
											<Button
												type="text"
												size="small"
												icon={file.starred ? <StarFilled style={{ color: "#fadb14" }} /> : <StarOutlined />}
												onClick={(e) => toggleStar(file.id, e)}
												style={{ marginRight: -8, marginTop: -4 }}
											/>
										</div>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												marginTop: "auto",
											}}
										>
											<ClockCircleOutlined style={{ fontSize: 12, color: "#8c8c8c" }} />
											<Text type="secondary" style={{ fontSize: 12 }}>
												{FormatRelativeTime(file.updated_at)}
											</Text>
										</div>
									</div>
								</Card>
							</Col>
						))}
					</Row>
				)}
			</Content>

			<Modal
				title={
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						{!isEditing && selectedFile && (
							<>
								<div
									style={{
										width: 24,
										height: 24,
										borderRadius: "50%",
										backgroundColor: "#1677ff15",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<FileTextOutlined style={{ fontSize: 14, color: "#1677ff" }} />
								</div>
								{selectedFile.title || "Untitled"}
								<Button
									type="text"
									size="small"
									icon={selectedFile.starred ? <StarFilled style={{ color: "#fadb14" }} /> : <StarOutlined />}
									onClick={(e) => toggleStar(selectedFile.id, e)}
								/>
							</>
						)}
						{isEditing && "Edit Document"}
					</div>
				}
				open={selectedFile !== null}
				onCancel={closeFile}
				footer={modalFooter}
				width={700}
				style={{ justifyContent: "center" }}
				styles={{
					body: {
						padding: isEditing ? "16px 24px" : 0,
					},
				}}
			>
				{selectedFile && (
					<Form form={form} layout="vertical" style={{ marginTop: isEditing ? 8 : 0 }}>
						{isEditing ? (
							<>
								<Form.Item
									name="title"
									label="Document Title"
									rules={[{ required: true, message: "Title cannot be empty" }]}
								>
									<Input placeholder="Enter document title" />
								</Form.Item>
								<Form.Item
									name="content"
									label="Document Content"
									rules={[{ required: true, message: "Content cannot be empty" }]}
								>
									<TextArea rows={12} placeholder="Enter document content" style={{ resize: "none" }} />
								</Form.Item>
							</>
						) : (
							<>
								<div
									style={{
										padding: "16px 24px",
										borderBottom: "1px solid #f0f0f0",
										display: "flex",
										justifyContent: "space-between",
										// alignsupplyItems: "center",
									}}
								>
									<Text type="secondary" style={{ fontSize: 13 }}>
										<ClockCircleOutlined style={{ marginRight: 4 }} />
										Last modified: {new Date(selectedFile.updated_at).toLocaleString()}
									</Text>
									<Dropdown
										menu={{
											items: [
												{ key: "rename", label: "Rename" },
												{ key: "duplicate", label: "Duplicate" },
												{ key: "delete", label: "Delete", danger: true },
											],
										}}
									>
										<Button type="text" icon={<EllipsisOutlined />} />
									</Dropdown>
								</div>
								<div
									style={{
										maxHeight: "60vh",
										overflowY: "auto",
										padding: "24px",
									}}
								>
									<Paragraph
										style={{
											whiteSpace: "pre-wrap",
											fontSize: 15,
											lineHeight: 1.6,
										}}
									>
										{selectedFile.content || "No content"}
									</Paragraph>
								</div>
							</>
						)}
					</Form>
				)}
			</Modal>
		</Layout>
	)
}

export default DocumentPage;
