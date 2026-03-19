import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="el">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Map Expo font family names to system fonts so fontfaceobserver resolves instantly */
            @font-face { font-family: 'Inter_400Regular'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 400; }
            @font-face { font-family: 'Inter_500Medium'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 500; }
            @font-face { font-family: 'Inter_600SemiBold'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 600; }
            @font-face { font-family: 'Inter_700Bold'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 700; }
            /* Preload icon fonts to prevent fontfaceobserver timeout */
            @font-face { font-family: 'Ionicons'; src: url('https://cdn.jsdelivr.net/npm/ionicons@7/dist/fonts/ionicons.woff2') format('woff2'); font-display: swap; }
            @font-face { font-family: 'MaterialCommunityIcons'; src: url('https://cdn.jsdelivr.net/npm/@mdi/font@7/fonts/materialdesignicons-webfont.woff2') format('woff2'); font-display: swap; }
          `
        }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
