import { useEffect, useState } from "react";

export const useExternalScript = (url: string | null): 'idle' | 'loading' | 'ready' | 'error' => {
  let [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>(url ? "loading" : "idle");

  useEffect(() => {
    if (!url) {
      setState("idle");
      return;
     }

    let script = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement;

    const handleScript = (e: Event) => {
      setState(e.type === "load" ? "ready" : "error");
    };

    if (!script) {
      script = document.createElement("script");
      script.type = "application/javascript";
      script.src = url;
      script.async = true;
      document.head.appendChild(script);
      script.addEventListener("load", handleScript);
      script.addEventListener("error", handleScript);
    }

   script.addEventListener("load", handleScript);
   script.addEventListener("error", handleScript);

   return () => {
     script.removeEventListener("load", handleScript);
     script.removeEventListener("error", handleScript);
   };
  }, [url]);

  return state;
};
