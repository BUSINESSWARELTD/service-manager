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
            @font-face { font-family: 'Inter_400Regular'; src: local('Inter'), local('Inter-Regular'); font-weight: 400; }
            @font-face { font-family: 'Inter_500Medium'; src: local('Inter'), local('Inter-Medium'); font-weight: 500; }
            @font-face { font-family: 'Inter_600SemiBold'; src: local('Inter'), local('Inter-SemiBold'); font-weight: 600; }
            @font-face { font-family: 'Inter_700Bold'; src: local('Inter'), local('Inter-Bold'); font-weight: 700; }
          `
        }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
