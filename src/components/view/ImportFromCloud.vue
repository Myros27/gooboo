<template>
  <div :class="$vuetify.breakpoint.mdAndUp ? 'scroll-container' : ''">
    <div class="mx-auto" style="max-width: 1000px;">
      <div class="text-center mt-12" style="font-size: 150%;">{{ $vuetify.lang.t('$vuetify.cloudImport.title') }}</div>
      <alert-text class="mx-2 mt-12" type="error">{{ $vuetify.lang.t('$vuetify.cloudImport.warning') }}</alert-text>
      <div v-if="saves.length" class="save-select mt-4">
        <v-card v-for="(save, index) in saves" :key="index" class="ma-2 save-card">
          <v-card-text>
            <p>{{ $vuetify.lang.t('$vuetify.cloudImport.ident') }}: {{ save.ident || save.playerId }}</p>
            <p>{{ $vuetify.lang.t('$vuetify.cloudImport.os') }}: {{ getOs(save.deviceDescription) }}</p>
            <p>{{ $vuetify.lang.t('$vuetify.cloudImport.browser') }}: {{ getBrowser(save.deviceDescription) }}</p>
            <p>{{ $vuetify.lang.t('$vuetify.cloudImport.saveTime') }}: {{ new Date(save.timeStamp).toLocaleString() }}</p>
            <v-btn color="primary" @click="loadSave(save.saveData)">{{ $vuetify.lang.t('$vuetify.cloudImport.loadSave') }}</v-btn>
          </v-card-text>
        </v-card>
      </div>
      <div v-else-if="resultMessage" class="text-center mt-4">{{ resultMessage }}</div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import AlertText from '../partial/render/AlertText.vue';
import {cleanStore, decodeFile} from "@/js/savefile";
import {loadGame} from "@/js/init";

export default {
  components: { AlertText },
  data: () => ({
    saves: [],
    resultMessage: '',
  }),
  computed: {
    ...mapState({
      playerId: state => state.system.playerId
    })
  },
  mounted() {
    this.loadWithPlayerId();
  },
  methods: {
    async loadWithPlayerId() {
      // eslint-disable-next-line no-debugger
      debugger;
      const apiUrl = 'https://gooberer.glitch.me';
      this.resultMessage = 'Loading data, please hold on...';
      try {
        const response = await fetch(`${apiUrl}/getSavesByPlayerId/${this.playerId}`);
        const result = await response.json();
        this.showSavesAndSelect(result);
      } catch (error) {
        this.resultMessage = 'Error fetching save: ' + error;
        console.error('Error fetching saves by playerId:', error);
      }
    },
    showSavesAndSelect(allSaves) {
      if (!(allSaves.lastSlots && allSaves.lastSlots.length)) {
        this.resultMessage = 'No saves found.';
        return;
      }
      this.saves = allSaves.lastSlots.reverse().concat(allSaves.historySlots.reverse());
    },
    getOs(deviceDescription) {
      const osMatch = deviceDescription.match(/\(([^)]+)\)/);
      return osMatch ? osMatch[1] : 'Unknown OS';
    },
    getBrowser(deviceDescription) {
      return deviceDescription.split(' ').pop();
    },
    loadSave(saveData) {
      const decodedData = decodeFile(saveData);
      if (decodedData) {
        let that = this;
        cleanStore();
        if (loadGame(saveData)) {
          ['light', 'dark'].forEach(brightness => {
            for (const [key, elem] of Object.entries({...this.$store.state.system.themes.default[brightness], ...this.$store.state.system.themes[decodedData.theme][brightness]})) {
              that.$vuetify.theme.themes[brightness][key] = elem;
            }
          });
        }
      }
    },
  }
}
</script>

<style scoped>
.save-select {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.save-card {
  width: 250px;
}
</style>
