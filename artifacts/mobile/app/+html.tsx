import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="el">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <style dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @font-face { font-family: 'Inter_400Regular'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 400; font-display: swap; }
            @font-face { font-family: 'Inter_500Medium'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 500; font-display: swap; }
            @font-face { font-family: 'Inter_600SemiBold'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 600; font-display: swap; }
            @font-face { font-family: 'Inter_700Bold'; src: local('Inter'), local('Helvetica Neue'), local('Arial'); font-weight: 700; font-display: swap; }
          `
        }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
