import React from "react";

export default function Home() {
	// TODO: aggregator
	const redirect = (form: FormData) => {
		const username = form.get("username")?.toString().toLowerCase();
		window.location.href = `/users/${username}`;
	}
	return (
		<div>
			<form action={redirect}>
				<label>
				User name
				<input type="text" name="username" placeholder="User name" />
				<button type="submit">Visit</button>
				</label>
			</form>
		</div>
	);
}
