import React, { useState, useEffect } from "react";
import { Card, Form, Button, Dropdown, message, Typography } from "antd";
import { FileTextOutlined, StarOutlined, StarFilled, ClockCircleOutlined } from "@ant-design/icons";
import DocumentService from "@/services/document/DocumentService";
import { BaseDocument, DocumentUpdate } from "@/interfaces/document/DocumentInterface";
import { FormatRelativeTime } from "@/utils/FormatRelativeTime";
import PageLayout from "@/layouts/PageLayout";
import ItemGrid from "@/components/grid/ItemGrid";
import ItemModal from "@/components/modal/ItemModal";
import TextFileIcon from "@/components/icon/TextFileIcon";

const DocumentPage = () => {
	const [files, setFiles] = useState<BaseDocument[]>([]);
	const [selectedFile, setSelectedFile] = useState<BaseDocument | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [searchText, setSearchText] = useState("");
	const [sortOption, setSortOption] = useState<string>("date-new");
	const [filterOption, setFilterOption] = useState<string>("all");
	const [form] = Form.useForm();

	useEffect(() => {
		const fetchDocuments = async () => {
			try {
				const documents = await DocumentService.getDocuments();
				setFiles(documents);
				setLoading(false);
			} catch (error) {
				console.error("Error fetching documents:", error);
				message.error("Failed to load documents");
				setLoading(false);
			}
		};
		fetchDocuments();
	}, []);

	const openFile = (file: BaseDocument) => {
		setSelectedFile(file);
		setIsEditing(false);
		form.setFieldsValue({ title: file.title, content: file.content });
	};

	const closeFile = () => {
		setSelectedFile(null);
		setIsEditing(false);
	};

	const toggleEdit = () => {
		setIsEditing(!isEditing);
		if (selectedFile) form.setFieldsValue({ title: selectedFile.title, content: selectedFile.content });
	};

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			if (!selectedFile) return;

			const updatedDocument: DocumentUpdate = {
				title: values.title,
				content: values.content,
				starred: selectedFile.starred,
			};

			await DocumentService.updateDocument(selectedFile.id, updatedDocument);
			const updatedFiles = files.map((file) =>
				file.id === selectedFile.id ? { ...file, ...updatedDocument, updated_at: new Date().toISOString() } : file
			);
			setFiles(updatedFiles);
			setSelectedFile({ ...selectedFile, ...updatedDocument, updated_at: new Date().toISOString() });
			setIsEditing(false);
			message.success("Document saved successfully!");
		} catch (error) {
			console.error("Error saving document:", error);
			message.error("Failed to save document");
		}
	};

	const toggleStar = async (fileId: string, event: React.MouseEvent) => {
		event.stopPropagation();
		try {
			const fileToUpdate = files.find((file) => file.id === fileId);
			if (!fileToUpdate) return;

			const updatedStarred = !fileToUpdate.starred;
			await DocumentService.updateDocument(fileId, { starred: updatedStarred });

			const updatedFiles = files.map((file) =>
				file.id === fileId ? { ...file, starred: updatedStarred } : file
			);
			setFiles(updatedFiles);
			if (selectedFile && selectedFile.id === fileId) {
				setSelectedFile({ ...selectedFile, starred: updatedStarred });
			}
		} catch (error) {
			console.error("Error updating starred status:", error);
			message.error("Failed to update starred status");
		}
	};

	const filteredAndSortedFiles = () => {
		const filtered = files.filter((file) => {
			const matchesSearch =
				(file.title?.toLowerCase().includes(searchText.toLowerCase()) || false) ||
				(file.content?.toLowerCase().includes(searchText.toLowerCase()) || false);
			const matchesStarred = filterOption === "starred" ? file.starred : true;
			return matchesSearch && matchesStarred;
		});

		switch (sortOption) {
			case "name-asc":
				filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
				break;
			case "name-desc":
				filtered.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
				break;
			case "date-new":
				filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
				break;
			case "date-old":
				filtered.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
				break;
		}
		return filtered;
	};

	const filterComponent = (
		<Dropdown
			menu={{
				items: [
					{ key: "all", label: "All" },
					{ key: "starred", label: "Starred" },
				],
				onClick: ({ key }) => setFilterOption(key),
			}}
		>
			<Button style={{ borderRadius: 6 }}>
				Filter: {filterOption === "all" ? "All" : "Starred"}
			</Button>
		</Dropdown>
	);

	const sortComponent = (
		<Dropdown
			menu={{
				items: [
					{ key: "name-asc", label: "Name (A-Z)" },
					{ key: "name-desc", label: "Name (Z-A)" },
					{ key: "date-new", label: "Date (Newest)" },
					{ key: "date-old", label: "Date (Oldest)" },
				],
				onClick: ({ key }) => setSortOption(key),
			}}
		>
			<Button style={{ borderRadius: 6 }}>
				Sort:{" "}
				{sortOption === "name-asc"
					? "Name (A-Z)"
					: sortOption === "name-desc"
						? "Name (Z-A)"
						: sortOption === "date-new"
							? "Date (Newest)"
							: "Date (Oldest)"}
			</Button>
		</Dropdown>
	);

	return (
		<PageLayout
			title="Documents"
			description="Manage and organize your text documents"
			searchText={searchText}
			onSearchChange={setSearchText}
			filterComponent={filterComponent}
			sortComponent={sortComponent}
			totalItems={filteredAndSortedFiles().length}
		>
			<ItemGrid
				items={filteredAndSortedFiles()}
				loading={loading}
				searchText={searchText}
				renderItem={(file) => (
					<Card
						hoverable
						style={{ borderRadius: 8, overflow: "hidden", height: "100%" }}
						styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}
						onClick={() => openFile(file)}
					>
						<TextFileIcon content={file.content} />
						<div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flexGrow: 1 }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
								<Typography.Text
									strong
									style={{
										fontSize: 15,
										lineHeight: 1.4,
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
								/>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
								<ClockCircleOutlined style={{ fontSize: 12, color: "#8c8c8c" }} />
								<Typography.Text type="secondary" style={{ fontSize: 12 }}>
									{FormatRelativeTime(file.updated_at)}
								</Typography.Text>
							</div>
						</div>
					</Card>
				)}
			/>
			<ItemModal
				item={selectedFile}
				isEditing={isEditing}
				onClose={closeFile}
				onEditToggle={toggleEdit}
				onSave={handleSave}
				form={form}
				renderTitle={(file) => (
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
						{file.title || "Untitled"}
						<Button
							type="text"
							size="small"
							icon={file.starred ? <StarFilled style={{ color: "#fadb14" }} /> : <StarOutlined />}
							onClick={(e) => toggleStar(file.id, e)}
						/>
					</div>
				)}
				renderContent={(file) => file.content || "No content"}
			/>
		</PageLayout>
	);
};

export default DocumentPage;
