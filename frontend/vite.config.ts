import { defineConfig } from "vite";

export default defineConfig({
  root: "public", // Définit le dossier où se trouve index.html
  server: {
    port: 8080, // Le frontend tourne sur ce port
    strictPort: true,
    host: "0.0.0.0", // Permet d'exposer le serveur dans Docker
    hmr: {
      // Ajoutez cette configuration HMR
      clientPort: 8443, // Port que le client doit utiliser pour se connecter
      host: 'localhost', // Hôte pour les connexions WebSocket
    },
  },
  build: {
    outDir: "dist", // Dossier de build
    emptyOutDir: true,
  },
});
