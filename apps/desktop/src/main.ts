import { createApp } from "vue";
import { initLocalStore } from "./localStore/index.js";
import "./styles.css";

async function bootstrap() {
  await initLocalStore();

  const { default: App } = await import("./App.vue");
  const app = createApp(App);
  app.mount("#app");
}

bootstrap();
