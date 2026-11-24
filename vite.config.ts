import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repository is intended to be published at https://<user>.github.io/cloudfile/
export default defineConfig({ base: '/cloudfile/', plugins: [react()] })
