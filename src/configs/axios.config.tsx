import axios, { AxiosRequestConfig, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './apiConfig';

const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
});

api.interceptors.request.use(
	(config: InternalAxiosRequestConfig<unknown>): InternalAxiosRequestConfig<unknown> => {
		const token = localStorage.getItem('access_token');
		if (token) {
			(config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
		}
		return config;
	},
	(error) => Promise.reject(error)
);

interface RetryQueueItem {
	resolve: (value: unknown) => void;
	reject: (error: unknown) => void;
	config: AxiosRequestConfig;
}
const refreshAndRetryQueue: RetryQueueItem[] = [];
let isRefreshing = false;

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
	_retry?: boolean;
}

const processQueue = (error: unknown, token: string | null = null) => {
	refreshAndRetryQueue.forEach((request) => {
		if (error) {
			request.reject(error);
		} else if (token) {
			if (!request.config.headers) {
				request.config.headers = {};
			}
			request.config.headers['Authorization'] = `Bearer ${token}`;
			request.resolve(api(request.config));
		}
	});

	refreshAndRetryQueue.length = 0;
};

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config as RetryableAxiosRequestConfig;

		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					refreshAndRetryQueue.push({
						resolve,
						reject,
						config: originalRequest
					});
				});
			}

			isRefreshing = true;

			try {
				const response = await api.post('/auth/refresh', {}, { withCredentials: true });
				const { access_token } = response.data;

				localStorage.setItem('access_token', access_token);

				if (!originalRequest.headers) {
					originalRequest.headers = {};
				}
				originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

				processQueue(null, access_token);

				return api(originalRequest);
			} catch (refreshError) {
				localStorage.removeItem('access_token');

				processQueue(refreshError);

				window.location.href = '/login';
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	}
);

export default api;
