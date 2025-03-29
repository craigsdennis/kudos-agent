import React from "react";

export default function Home() {
	// TODO: aggregator
	const redirect = (form: FormData) => {
		const username = form.get("username")?.toString().toLowerCase();
		window.location.href = `/users/${username}`;
	}
	return (
		<div className="whiteboard flex flex-col items-center justify-center h-screen">
			<div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
				<h1 className="text-3xl font-bold mb-6 text-center">Kudos Board</h1>
				<form action={redirect} className="space-y-4">
					<div className="space-y-2">
						<label className="block">
							User name
						</label>
						<input 
							type="text" 
							name="username" 
							placeholder="Enter username" 
							className="whiteboard-input"
							required 
						/>
					</div>
					<button type="submit" className="marker-button w-full">
						Visit Board
					</button>
				</form>
			</div>
		</div>
	);
}
