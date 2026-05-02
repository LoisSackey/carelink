// Import createRoot function from React DOM client library - used to render React components into the DOM
import { createRoot } from "react-dom/client";
// Import the main App component that contains all routes and application logic
import App from "./App.tsx";
// Import the global CSS styles that apply to the entire application
import "./index.css";

// Find the HTML element with id="root" in index.html and create a React root
// render(<App />) mounts the entire React application into the DOM root element
createRoot(document.getElementById("root")!).render(<App />);
