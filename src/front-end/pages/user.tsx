import { useAgent } from "agents/react";
import type { Kudo, KudosState } from "../../agents/kudos";
import { useState, useRef } from "react";

const STICKY_COLORS = ['sticky-note', 'sticky-note-blue', 'sticky-note-green', 'sticky-note-pink'];

export default function User({username}: {username: string}) {
	const [kudos, setKudos] = useState<Kudo[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [youtubeVideoCount, setYoutubeVideoCount] = useState(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	
	const agent = useAgent({
		agent: "kudos-agent",
		name: username,
		onStateUpdate: (state: KudosState) => {
			setKudos(state.latest);
			setYoutubeVideoCount(state.youtubeVideoWatchCount);
		}
	});
	
	const addKudo = async (form: FormData) => {
		const text = form.get("kudo");
		// Store in cookie?
		const author = form.get("author");
		const url = form.get("url") || "";
		const urlTitle = form.get("urlTitle") || "";
		await agent.call("addKudo", [text, author, url, urlTitle]);
	}
	
	const addYoutubeVideo = async (form: FormData) => {
		const youtubeUrl = form.get("youtubeUrl");
		if (youtubeUrl) {
			await agent.call("addYouTubeVideo", [youtubeUrl]);
		}
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
					<div>
						<h1 className="text-4xl font-bold">{username}'s Kudos Board</h1>
						{youtubeVideoCount > 0 && (
							<p className="text-lg mt-2">Watching {youtubeVideoCount} YouTube video{youtubeVideoCount !== 1 ? 's' : ''} for comments</p>
						)}
					</div>
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
							<div className="flex-grow">
								<p className="text-lg font-medium mb-2">{kudo.text}</p>
								{kudo.url && kudo.urlTitle && (
									<a 
										href={kudo.url} 
										target="_blank" 
										rel="noopener noreferrer"
										className="block mb-2 text-blue-500 hover:underline"
									>
										{kudo.urlTitle}
									</a>
								)}
							</div>
							<div className="flex justify-between items-center mt-auto">
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
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
							<div className="space-y-2">
								<label className="block font-medium">
									Link URL (optional)
								</label>
								<input 
									type="url" 
									name="url" 
									className="whiteboard-input"
									placeholder="https://example.com" 
								/>
							</div>
							<div className="space-y-2">
								<label className="block font-medium">
									Link Title (optional)
								</label>
								<input 
									type="text" 
									name="urlTitle" 
									className="whiteboard-input"
									placeholder="Visit this site" 
								/>
							</div>
							<button type="submit" className="marker-button w-full">
								Add Kudo!
							</button>
						</form>
					</div>
					
					<div className="bg-white p-6 rounded-lg shadow-md">
						<h2 className="text-2xl font-bold mb-4">Add YouTube Video</h2>
						<p className="mb-4 text-gray-600">Add a YouTube video to monitor for compliments in the comments</p>
						<form action={addYoutubeVideo} className="space-y-4">
							<div className="space-y-2">
								<label className="block font-medium">
									YouTube Video URL
								</label>
								<input 
									type="url" 
									name="youtubeUrl" 
									className="whiteboard-input"
									required
									placeholder="https://www.youtube.com/watch?v=..." 
								/>
							</div>
							<button type="submit" className="marker-button w-full">
								Monitor Video
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}