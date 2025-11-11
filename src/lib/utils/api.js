import { Auth } from './auth.js';
import { goto } from '$app/navigation';

export async function Api(path, { method = "GET", body, headers = {} } = {}) {
	const h = {
		...(Auth.token() ? { Authorization: "Bearer " + Auth.token() } : {}),
		...(body ? { "Content-Type": "application/json" } : {}),
		...headers,
	};
	const res = await fetch(path, {
		method,
		headers: h,
		body: body ? JSON.stringify(body) : undefined,
	});
	if (res.status === 401 || res.status === 403) {
		Auth.clear();
		if (typeof window !== 'undefined' && !window.location.pathname.endsWith("/login")) {
			goto("/login");
		}
		throw new Error("Unauthorized");
	}
	if (!res.ok) {
		let msg = "";
		try {
			msg = await res.text();
		} catch {}
		throw new Error(msg || res.statusText);
	}
	const ct = res.headers.get("content-type") || "";
	return ct.includes("application/json") ? res.json() : res.text();
}
