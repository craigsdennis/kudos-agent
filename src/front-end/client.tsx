import React from "react";
import { createRoot } from "react-dom/client";
import Home from "./pages/home";
import User from "./pages/user";

const url = new URL(window.location.href);
const root = createRoot(document.getElementById("app")!);

if (url.pathname.startsWith("/users/")) {
	const username = url.pathname.split("/").at(-1) as string;
	root.render(<User username={username} />)
} else {
	root.render(<Home />);
}

