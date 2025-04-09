import api from "@/configs/axios.config";
import { DocumentCreate, DocumentList, DocumentUpdate } from "@/interfaces/document/DocumentInterface";

class DocumentService {
	getDocuments = async (): Promise<DocumentList> => {
		try {
			const response = await api.get(`/documents`);
			return response.data;
		} catch (error) {
			console.error("Error fetching documents:", error);
			throw error;
		}
	};

	createDocument = async (
		documentData: DocumentCreate
	): Promise<DocumentCreate> => {
		try {
			const response = await api.post(`/documents`, documentData);
			console.log("Document created successfully:", response.data);
			return response.data;
		} catch (error) {
			console.error("Error creating document:", error);
			throw error;
		}
	};

	updateDocument = async (
		documentId: string,
		documentData: DocumentUpdate
	): Promise<DocumentUpdate> => {
		try {
			const response = await api.put(`/documents/${documentId}`, documentData);
			console.log("Document updated successfully:", response.data);
			return response.data;
		} catch (error) {
			console.error("Error updating document:", error);
			throw error;
		}
	};
}

export default new DocumentService();
