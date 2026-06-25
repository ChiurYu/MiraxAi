<script setup lang="ts">
import { useAppSettings } from "../composables/useAppSettings.js";
import AiServicesSettings from "../components/settings/AiServicesSettings.vue";
import DataSettings from "../components/settings/DataSettings.vue";
import GeneralSettings from "../components/settings/GeneralSettings.vue";
import LocalDependenciesSettings from "../components/settings/LocalDependenciesSettings.vue";
import OutputStorageSettings from "../components/settings/OutputStorageSettings.vue";
import PromptTemplatesSettings from "../components/settings/PromptTemplatesSettings.vue";
import SettingsShell from "../components/settings/SettingsShell.vue";
import UpdatesSupportSettings from "../components/settings/UpdatesSupportSettings.vue";

const { settingsSection, saveStatus } = useAppSettings({ persistSection: true });
</script>

<template>
  <SettingsShell v-model:section="settingsSection" :save-status="saveStatus">
    <div data-settings-section="general"><GeneralSettings v-show="settingsSection === 'general'" /></div>
    <div data-settings-section="ai-services"><AiServicesSettings v-show="settingsSection === 'ai-services'" /></div>
    <div data-settings-section="local-dependencies"><LocalDependenciesSettings v-show="settingsSection === 'local-dependencies'" /></div>
    <div data-settings-section="output-storage"><OutputStorageSettings v-show="settingsSection === 'output-storage'" /></div>
    <div data-settings-section="prompt-templates"><PromptTemplatesSettings v-show="settingsSection === 'prompt-templates'" /></div>
    <div data-settings-section="data"><DataSettings v-show="settingsSection === 'data'" /></div>
    <div data-settings-section="updates-support"><UpdatesSupportSettings v-show="settingsSection === 'updates-support'" /></div>
  </SettingsShell>
</template>

<style scoped>
/* SettingsShell handles layout; section components provide their own padding/max-width. */
</style>
