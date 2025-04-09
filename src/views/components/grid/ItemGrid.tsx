import React from "react";
import { Row, Col, Spin, Empty } from "antd";

interface ItemGridProps<T> {
	items: T[];
	loading: boolean;
	searchText: string;
	renderItem: (item: T) => React.ReactNode;
}

const ItemGrid = <T,>({ items, loading, searchText, renderItem }: ItemGridProps<T>) => {
	if (loading) {
		return (
			<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
				<Spin size="large" />
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<Empty
				description={searchText ? "No items match your search" : "No items yet"}
				style={{ margin: "80px 0" }}
			/>
		);
	}

	return (
		<Row gutter={[20, 20]}>
			{items.map((item, index) => (
				<Col key={index} xs={24} sm={12} md={8} lg={6} xl={4}>
					{renderItem(item)}
				</Col>
			))}
		</Row>
	);
};

export default ItemGrid;
