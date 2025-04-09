import { type AppType } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { api } from '@/utils/api';

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Grey Literature Search App</title>
        <meta name="description" content="Search and tag grey literature with AI assistance" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
};

export default api.withTRPC(MyApp); 