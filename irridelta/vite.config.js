import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.js",
    include: ["test/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/hooks/useAuth.js",
        "src/pages/Login.jsx",
        "src/pages/Register.jsx",
        "src/pages/ForgotPassword.jsx",
        "src/pages/ResetPassword.jsx",
      ],
      exclude: ["test/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
})
