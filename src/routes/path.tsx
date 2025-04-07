export const Path = {
	root: {
		index: "/",
	},
	login: {
		index: "/login",
	},
	register: {
		index: "/register",
	},
	user: {
		index: "/",
		outlets: {
			dashboard: "/dashboard",
			documents: "/documents",
			videos: "/videos",
			profile: "/profile",
			create: "/create",
		},
	},
};
