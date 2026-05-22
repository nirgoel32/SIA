import { Html, Head, Main, NextScript } from "next/document";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Apply the user's theme before paint to avoid flash of wrong mode. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </Head>
      <body className="antialiased bg-museum-bg text-museum-text">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
