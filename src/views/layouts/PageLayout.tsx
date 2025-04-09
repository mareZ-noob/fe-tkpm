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
							{title}
						</Title>
						<Text type="secondary" style={{ fontSize: 14 }}>
							{description}
						</Text>
					</div>
					<Space size="middle">
						{searchText !== undefined && onSearchChange && (
							<Input
								placeholder={`Search ${title.toLowerCase()}...`}
								prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
								style={{ width: 240, borderRadius: 6 }}
								value={searchText}
								onChange={(e) => onSearchChange(e.target.value)}
								allowClear
							/>
						)}
						{headerActions}
					</Space>
				</div>
				{(filterComponent || sortComponent || totalItems !== undefined) && (
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
							{filterComponent}
							{sortComponent}
						</Space>
						{totalItems !== undefined && (
							<Text style={{ fontSize: 14 }}>
								{totalItems} {totalItems === 1 ? title.slice(0, -1) : title.toLowerCase()}
							</Text>
						)}
					</div>
				)}
			</Header>
			<Content style={{ padding: "0 24px 24px 24px", backgroundColor: "#fff" }}>{children}</Content>
		</Layout>
	);
};

export default PageLayout;
