import { useAgent } from "agents/react";
import type { Kudo, KudosState } from "../../agents/kudos";
import { useState } from "react";

const STICKY_COLORS = ['sticky-note', 'sticky-note-blue', 'sticky-note-green', 'sticky-note-pink'];

export default function User({username}: {username: string}) {
	const [kudos, setKudos] = useState<Kudo[]>([]);
	const agent = useAgent({
		agent: "kudos-agent",
		name: username,
		onStateUpdate: (state: KudosState) => {
			setKudos(state.latest)
		}
	});
	
	const addKudo = async (form: FormData) => {
		const text = form.get("kudo");
		// Store in cookie?
		const author = form.get("author");
		await agent.call("addKudo", [text, author, ""]);
	}
	
	const getRandomStickyClass = () => {
		return STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
	}
	
	return (
		<div className="whiteboard p-6 min-h-screen">
			<div className="max-w-4xl mx-auto">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-4xl font-bold">{username}'s Kudos Board</h1>
					<a href="/" className="marker-button">Back to Home</a>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					{kudos.map((kudo, index) => (
						<div key={index} className={`${getRandomStickyClass()}`}>
							<p className="text-lg font-medium mb-2">{kudo.text}</p>
							<p className="text-sm text-gray-600">From: {kudo.author}</p>
						</div>
					))}
				</div>
				
				<div className="bg-white p-6 rounded-lg shadow-md">
					<h2 className="text-2xl font-bold mb-4">Add a Kudo</h2>
					<form action={addKudo} className="space-y-4">
						<div className="space-y-2">
							<label className="block font-medium">
								Your message
							</label>
							<textarea 
								name="kudo" 
								className="whiteboard-input min-h-32"
								required
								placeholder="Write your kudos here..."
							/>
						</div>
						<div className="space-y-2">
							<label className="block font-medium">
								Your name
							</label>
							<input 
								type="text" 
								name="author" 
								className="whiteboard-input"
								required
								placeholder="Your name" 
							/>
						</div>
						<button type="submit" className="marker-button w-full">
							Add Kudo!
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}
