import { useAgent } from "agents/react";
import type { Kudo, KudosState } from "../../agents/kudos";
import { useState } from "react";

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
		await agent.call("addKudo", [text, author]);
	}
	return (
		<div>
			<h1>{username}</h1>
			<ul>
			{kudos.map((kudo) => (
				<li>{kudo.text}</li>
			))}
			</ul>
			<form action={addKudo}>
				<label>
					Kudo
					<textarea name="kudo" />
				</label>
				<label>
					Your username
					<input type="text" name="author" />
				</label>
				<button type="submit">Add Kudo!</button>
			</form>
		</div>
	)
}
