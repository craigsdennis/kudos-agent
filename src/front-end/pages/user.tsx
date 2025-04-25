import { useAgent } from "agents/react";
import type { Kudo, KudosState, ScreenshotParseVerification } from "../../agents/kudos";
import { useState, useRef, useCallback, useEffect } from "react";

const STICKY_COLORS = ['sticky-note', 'sticky-note-blue', 'sticky-note-green', 'sticky-note-pink'];

export default function User({username}: {username: string}) {
	const [kudos, setKudos] = useState<Kudo[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [youtubeVideoCount, setYoutubeVideoCount] = useState(0);
	const [verifications, setVerifications] = useState<ScreenshotParseVerification[]>([]);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [modalImage, setModalImage] = useState<string | null>(null);

	const agent = useAgent({
		agent: "kudos-agent",
		name: username,
		onStateUpdate: (state: KudosState) => {
			setKudos(state.latest);
			setYoutubeVideoCount(state.youtubeVideoWatchCount);
			if (state.verifications) {
				setVerifications(state.verifications);
			}
		}
	});

	const addKudo = async (form: FormData) => {
		const text = form.get("kudo") as string;
		// Store in cookie?
		const author = form.get("author") as string;
		const url = form.get("url") as string || undefined;
		const urlTitle = form.get("urlTitle") as string || undefined;
		const kudo: Kudo = {
			hearted: 0,
			text,
			author,
			url,
			urlTitle,
		}
		await agent.call("addKudo", [kudo]);
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

	const [isDragging, setIsDragging] = useState(false);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];
			handleFile(file);
		}
	}, []);

	const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const file = e.target.files[0];
			handleFile(file);
		}
	}, []);

	const handleFile = (file: File) => {
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			if (e.target && typeof e.target.result === 'string') {
				setPreviewImage(e.target.result);
			}
		};
		reader.readAsDataURL(file);
	};

	const clearPreview = () => {
		setPreviewImage(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const submitScreenshot = async () => {
		if (!previewImage) return;

		try {
			setIsUploading(true);
			await agent.call("addScreenshot", [previewImage]);
			setPreviewImage(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}

			// Show success message and clear it after 3 seconds
			setUploadSuccess(true);
			setTimeout(() => {
				setUploadSuccess(false);
			}, 3000);
		} catch (error) {
			console.error('Error submitting screenshot:', error);
			alert('Failed to submit screenshot');
		} finally {
			setIsUploading(false);
		}
	};

	const handleVerification = async (workflowId: string, isApproved: boolean) => {
		try {
			await agent.call("handleVerification", [workflowId, isApproved]);
			// The agent state will be updated, which will trigger a UI refresh
		} catch (error) {
			console.error('Error handling verification request:', error);
		}
	};

	const handleOpenScreenshot = (url: string) => {
		if (url.startsWith('/screenshots/')) {
			setModalImage(url);
		}
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && modalImage) {
				setModalImage(null);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [modalImage]);

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
										target={kudo.url.startsWith('/screenshots/') ? "_self" : "_blank"}
										rel="noopener noreferrer"
										className="block mb-2 text-blue-500 hover:underline"
										onClick={(e) => {
											if (kudo.url && kudo.url.startsWith('/screenshots/')) {
												e.preventDefault();
												handleOpenScreenshot(kudo.url);
											}
										}}
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

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

					<div className="bg-white p-6 rounded-lg shadow-md">
						<h2 className="text-2xl font-bold mb-4">Upload Screenshot</h2>
						<p className="mb-4 text-gray-600">Drag and drop a screenshot or use the file picker</p>

						{uploadSuccess ? (
							<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative flex items-center justify-between">
								<div>
									<span className="font-medium">Success!</span> Screenshot submitted for approval.
								</div>
								<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
								</svg>
							</div>
						) : (
							<div
								className={`border-2 border-dashed p-4 rounded-md mb-4 transition-colors ${
									isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
								}`}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								{!previewImage ? (
									<div className="text-center py-8">
										<p className="text-gray-500 mb-4">Drag and drop an image here or click to select</p>
										<input
											type="file"
											ref={fileInputRef}
											accept="image/*"
											className="hidden"
											onChange={handleFileSelect}
										/>
										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="marker-button"
										>
											Select Image
										</button>
									</div>
								) : (
									<div className="text-center">
										<img
											src={previewImage}
											alt="Preview"
											className="max-h-48 mx-auto mb-4 rounded-md"
										/>
										<div className="flex justify-center gap-4">
											<button
												type="button"
												onClick={clearPreview}
												className="marker-button bg-gray-500"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={submitScreenshot}
												className="marker-button"
												disabled={isUploading}
											>
												{isUploading ? 'Uploading...' : 'Upload Screenshot'}
											</button>
										</div>
									</div>
								)}
							</div>
						)}

						<p className="text-sm text-gray-500 mt-2">
							After uploading, screenshots will be processed and appear in the admin section for approval.
						</p>
					</div>
				</div>

				{verifications && verifications.length > 0 && (
					<div className="bg-white p-6 rounded-lg shadow-md mb-8">
						<h2 className="text-2xl font-bold mb-4">Admin: Approval Requests ({verifications.length})</h2>
						<div className="space-y-4">
							{verifications.map((verification) => (
								<div key={verification.workflowId} className="border p-4 rounded-md flex items-start gap-4">
									{verification.screenshotDataUrl && (
										<img
											src={verification.screenshotDataUrl}
											alt="Screenshot"
											className="w-24 h-24 object-cover rounded-md"
										/>
									)}
									<div className="flex-1">
										<p className="font-medium">{verification.compliment}</p>
										<p className="text-sm text-gray-600">From: {verification.complimenter}</p>
									</div>
									<div className="flex gap-2">
										<button
											onClick={() => handleVerification(verification.workflowId, true)}
											className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
											title="Approve"
										>
											✓
										</button>
										<button
											onClick={() => handleVerification(verification.workflowId, false)}
											className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
											title="Reject"
										>
											✕
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Screenshot Modal */}
				{modalImage && (
					<div className="screenshot-modal">
						<div className="screenshot-modal-content">
							<button
								onClick={() => setModalImage(null)}
								className="screenshot-modal-close"
							>
								✕
							</button>
							<img
								src={modalImage}
								alt="Screenshot"
								className="max-w-full max-h-[90vh]"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
