"use client";

import { createContext, useContext } from 'react';

export type ImageMetadataMap = Record<string, { alt_text: string | null; title: string }>;
const Context = createContext<ImageMetadataMap>({});
export function ImageMetadataProvider({ images, children }: { images: ImageMetadataMap; children: React.ReactNode }) {
  const parent = useContext(Context);
  return <Context.Provider value={{ ...parent, ...images }}>{children}</Context.Provider>;
}
export function useImageMetadata(src: string) {
  const images = useContext(Context);
  let original = src;
  try {
    const u = new URL(src);
    if (u.pathname.includes('/storage/v1/render/image/public/')) {
      u.pathname = u.pathname.replace('/render/image/public/', '/object/public/');
      u.search = '';
      original = u.toString();
    }
  } catch { /* Relative, entitled proxy paths keep the page's existing alt. */ }
  return images[src] ?? images[original];
}

/** Logos and entitled posters stay plain images, with catalogue metadata. */
export function MetadataImage({ src, alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const metadata = useImageMetadata(src);
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={src} alt={metadata?.alt_text ?? alt} title={metadata?.title || props.title} />;
}
