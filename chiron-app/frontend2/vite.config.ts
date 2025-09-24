import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return {
    plugins: [react()],
    server: {
          port: 3000,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          proxy: {
            "/api": "http://api:8000",
            "/admin": "http://api:8000",
            "/backend": "http://api:8000",
          },
          
        host: true, // Allow access from other containers in the Docker network
        },
    optimizeDeps: {
      include: [
        "@mui/icons-material",
        "@mui/material",
        "@emotion/react",
        "@emotion/styled",
      ],
    },
  };
});
