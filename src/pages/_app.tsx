import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import Navigation from "@/components/ui/Navigation";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Advanced Panorama Viewer</title>
        <meta name="description" content="Interactive 3D panorama tour with floor navigation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="data:," />
      </Head>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <Component {...pageProps} />
        <Navigation />
      </div>
    </>
  );
}
