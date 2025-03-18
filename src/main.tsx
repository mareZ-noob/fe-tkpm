import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from './hooks/useTheme/ThemeProvider.tsx';

createRoot(document.getElementById('root')!).render(
	// <StrictMode>
	<BrowserRouter>
		<ThemeProvider defaultTheme="dark" storageKey="theme">
			<App />
		</ThemeProvider>
	</BrowserRouter>
	// </StrictMode>,
)
