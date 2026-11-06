import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Dev roda com Webpack (`next dev --webpack`), mais estável com Tailwind CSS v4.
    // Raiz fixa: existe um package-lock.json na pasta pessoal que confundia a detecção do workspace.
    turbopack: {
        root: path.resolve(__dirname),
    },
};

export default nextConfig;
