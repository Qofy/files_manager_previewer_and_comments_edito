// Authentication utilities
export const Auth = {
	token: () => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem("token");
		}
		return null;
	},
	set: (t) => {
		if (typeof window !== 'undefined') {
			localStorage.setItem("token", t);
		}
	},
	clear: () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem("token");
		}
	},
};
