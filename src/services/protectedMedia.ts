import { api, API_BASE_URL } from './api';

function normalizeProtectedResourceUrl(resourceUrl: string): string {
  const value = resourceUrl.trim();

  if (!value) {
    throw new Error('La URL del archivo está vacía.');
  }

  /*
    Las URLs relativas son las esperadas por SMART RH:
    /uploads/profiles/...
    /uploads/contratos/...
    /uploads/credenciales/...
  */
  if (!/^https?:\/\//i.test(value)) {
    return value.startsWith('/') ? value : `/${value}`;
  }

  /*
    Si el backend llegara a devolver una URL absoluta,
    solo permitimos enviar el JWT si pertenece al mismo
    origen configurado para la API.

    Esto evita filtrar Authorization a dominios externos.
  */
  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  const resource = new URL(value);

  if (resource.origin !== apiUrl.origin) {
    throw new Error('El archivo solicitado no pertenece al servidor autorizado de SMART RH.');
  }

  return resource.toString();
}

export async function getProtectedBlob(resourceUrl: string): Promise<Blob> {
  const requestUrl = normalizeProtectedResourceUrl(resourceUrl);

  const response = await api.get<Blob>(requestUrl, {
    responseType: 'blob',
  });

  return response.data;
}

export async function createProtectedObjectUrl(resourceUrl: string): Promise<string> {
  const blob = await getProtectedBlob(resourceUrl);
  return URL.createObjectURL(blob);
}

export async function openProtectedResource(resourceUrl: string): Promise<void> {
  /*
    Abrimos la pestaña inmediatamente para evitar que el navegador
    considere la apertura posterior como un popup no solicitado.
  */
  const previewWindow = window.open('about:blank', '_blank');

  if (previewWindow) {
    previewWindow.opener = null;

    try {
      previewWindow.document.title = 'SMART RH';
      previewWindow.document.body.textContent = 'Cargando archivo protegido...';
    } catch {
      // La pestaña seguirá funcionando aunque no podamos escribir el mensaje.
    }
  }

  try {
    const objectUrl = await createProtectedObjectUrl(resourceUrl);

    if (previewWindow) {
      previewWindow.location.replace(objectUrl);
    } else {
      const link = document.createElement('a');

      link.href = objectUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    /*
      Damos tiempo suficiente para que el navegador consuma el Blob.
      Después liberamos memoria.
    */
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 5 * 60 * 1000);
  } catch (error) {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }

    throw error;
  }
}
