import React from "react";
import { Layout, Space, Typography, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface PageLayoutProps {
	title: string;
	description: string;
	searchText?: string; // Optional
	onSearchChange?: (value: string) => void; // Optional
	filterComponent?: React.ReactNode;
	sortComponent?: React.ReactNode;
	totalItems?: number; // Optional
	headerActions?: React.ReactNode; // Custom header actions
	children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({
	title,
	description,
	searchText,
	onSearchChange,
	filterComponent,
	sortComponent,
	totalItems,
	headerActions,
	children,
}) => {
	return (
		<Layout style={{ minHeight: "100vh" }} className=" dark:bg-gray-900">
			{/* Header */}
			<Header
				className="sticky top-0 z-20 p-6 bg-white shadow-sm dark:bg-gray-800 dark:border-b dark:border-gray-700 flex flex-col gap-4"
				style={{
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
						<Title level={3} style={{ margin: 0, fontWeight: 600 }} className="dark:text-white">
							{title}
						</Title>
						<Text type="secondary" style={{ fontSize: 14 }} className="dark:text-gray-400">
							{description}
						</Text>
					</div>
					<Space size="middle">
						{searchText !== undefined && onSearchChange && (
							<Input
								placeholder={`Search ${title.toLowerCase()}...`}
								prefix={<SearchOutlined className="text-gray-500 dark:text-gray-300" />}
								className="w-60 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-600 rounded-md"
								value={searchText}
								onChange={(e) => onSearchChange(e.target.value)}
								allowClear
							/>
						)}
						{headerActions}
					</Space>
				</div>
				{(filterComponent || sortComponent || totalItems !== undefined) && (
					<div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700"
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							borderTop: "1px solid #f0f0f0",
							paddingTop: 16,
						}}
					>
						<Space size="middle">
							{filterComponent}
							{sortComponent}
						</Space>
						{totalItems !== undefined && (
							<Text className="text-sm dark:text-gray-400" style={{ fontSize: 14 }}>
								{totalItems} {totalItems === 1 ? title.slice(0, -1) : title.toLowerCase()}
							</Text>
						)}
					</div>
				)}
			</Header>
			<Content
				className="dark:bg-slate-900 rounded-lg shadow dark:text-white bg-gray-50 p-6"
			>
				{children}
			</Content>
		</Layout>
	);
};

export default PageLayout;
