import { FINBOARD_STORAGE_KEY } from '@/lib/constants';

/**
 * Blocking inline script that applies the persisted theme before first
 * paint. Server component — the script lives in the initial HTML only,
 * so React never tries to execute it on the client.
 */
export function ThemeScript() {
  const code = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(FINBOARD_STORAGE_KEY)}));var d=!!(p&&p.state&&p.state.theme==='dark');var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(x){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
