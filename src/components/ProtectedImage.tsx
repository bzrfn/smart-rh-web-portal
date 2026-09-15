import {
  type ImgHTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import { createProtectedObjectUrl } from '../services/protectedMedia';

type ProtectedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallback?: ReactNode;
};

export default function ProtectedImage({
  src,
  fallback = null,
  ...imgProps
}: ProtectedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let generatedObjectUrl: string | null = null;

    setObjectUrl(null);
    setFailed(false);

    if (!src) {
      return;
    }

    createProtectedObjectUrl(src)
      .then((url) => {
        generatedObjectUrl = url;

        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }

        setObjectUrl(url);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;

      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl);
      }
    };
  }, [src]);

  if (!src || failed || !objectUrl) {
    return <>{fallback}</>;
  }

  return <img {...imgProps} src={objectUrl} />;
}
