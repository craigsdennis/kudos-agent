import { useAgent } from "agents/react";
import type { Kudo, KudosState } from "../../agents/kudos";
import { useState, useRef } from "react";

const STICKY_COLORS = ['sticky-note', 'sticky-note-blue', 'sticky-note-green', 'sticky-note-pink'];

export default function User({username}: {username: string}) {
	const [kudos, setKudos] = useState<Kudo[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	
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
	
	const heartKudo = async (id: number) => {
		await agent.call("heartKudo", [id]);
	}
	
	const playCompliment = async () => {
		try {
			setIsPlaying(true);
			const audioData = await agent.call("getSpokenCompliment", []);
			if (audioData) {
				const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
				audioRef.current = audio;
				
				audio.onended = () => {
					setIsPlaying(false);
				};
				
				await audio.play();
			}
		} catch (error) {
			console.error("Error playing compliment:", error);
			setIsPlaying(false);
		}
	}
	
	return (
		<div className="whiteboard p-6 min-h-screen">
			<div className="max-w-4xl mx-auto">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-4xl font-bold">{username}'s Kudos Board</h1>
					<div className="flex gap-4">
						<button
							onClick={playCompliment}
							disabled={isPlaying}
							className="marker-button flex items-center"
						>
							<span className="mr-2">{isPlaying ? '🔊' : '🔈'}</span>
							{isPlaying ? 'Playing...' : 'Give me a compliment'}
						</button>
						<a href="/" className="marker-button">Back to Home</a>
					</div>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					{kudos.map((kudo, index) => (
						<div key={index} className="sticky-note">
							<p className="text-lg font-medium mb-2">{kudo.text}</p>
							<div className="flex justify-between items-center">
								<p className="text-sm text-gray-600">From: {kudo.author}</p>
								<button 
									onClick={() => heartKudo(kudo.id)}
									className="flex items-center text-sm text-gray-600 hover:text-red-500"
								>
									<span className="mr-1">❤️</span> {kudo.hearted}
								</button>
							</div>
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