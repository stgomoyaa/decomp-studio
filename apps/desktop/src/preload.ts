import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("hackromStudio", {
  pickProjectDirectory: async (): Promise<string | null> => {
    const result: unknown = await ipcRenderer.invoke("project:pick-directory");
    return typeof result === "string" ? result : null;
  },
});
