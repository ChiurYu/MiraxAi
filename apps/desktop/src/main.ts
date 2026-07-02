import { createApp } from "vue";
import App from "./App.vue";
import { initLocalStore } from "./localStore/index.js";
import "./styles.css";

async function bootstrap() {
  await initLocalStore();

  const app = createApp(App);
  app.mount("#app");
}

bootstrap();
