/* Web Worker dedicado ao WebLLM. A inferência nunca roda no thread da interface.
 * Mantenha a versão idêntica à utilizada em assets/pmdf-webllm.js.
 */
import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm@0.2.87";
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = message => handler.onmessage(message);
