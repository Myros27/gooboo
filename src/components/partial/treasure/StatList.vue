<style scoped>
.unowned-treasure-bonus {
  opacity: 0.25;
}
</style>

<template>
  <div class="ma-2 pa-2">
    <div v-if="qol.items.showMoreQOLData.value">
      <v-btn small class="ma-1 pa-1" color="error" min-width="32" min-height="32" @click="toggleIframe"><v-icon>mdi-firefox</v-icon></v-btn>
      <v-btn v-if="showIframe" id="reloadGooberer" small class="ma-1 pa-1" color="error" min-width="32" min-height="32" @click="refreshIframe"><v-icon>mdi-refresh</v-icon></v-btn>
      <div v-if="showIframe">
        <iframe ref="treasuresIframe" src="https://myros27.github.io/gooberer/1.5/treasure/treasure.html?=test" width="100%" height="900rem" style="border: none;" ></iframe>
      </div>
    </div>
    <div v-if="!showIframe">
      <h3 class="text-center mb-2">{{ $vuetify.lang.t(`$vuetify.treasure.effectSummary`) }}</h3>
      <div v-for="(item, key) in effectSummary" :key="key">
        <div class="ma-1 text-center"><v-icon class="mr-2">{{ features[key].icon }}</v-icon>{{ $vuetify.lang.t(`$vuetify.feature.${key}`) }}</div>
        <display-row v-for="(subitem, subkey) in item" :key="key + '-' + subkey" :class="{'unowned-treasure-bonus': subitem.value === 1}" :name="subkey" type="mult" :after="subitem.value" :show-star="subitem.special"></display-row>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import DisplayRow from '../upgrade/DisplayRow.vue';
import { getSavefile } from '../../../js/savefile.js';

export default {
  components: { DisplayRow },
  data() {
    return {
      showIframe: false,
    };
  },
  computed: {
    ...mapState({
      unlock: state => state.unlock,
      features: state => state.system.features,
      effectList: state => state.treasure.effect,
      effectCache: state => state.treasure.effectCache,
      qol: state => state.system.settings.mods_qol,
    }),
    effectSummary() {
      let obj = {};
      for (const [key, elem] of Object.entries(this.effectList)) {
        if (key === 'mining' || this.unlock[`${key}Feature`].see) {
          obj[key] = {};
          for (const [subkey, subelem] of Object.entries(elem)) {
            if ((subelem.unlock === null || this.unlock[subelem.unlock].see) && (subelem.type !== 'special' || this.unlock.treasureSpecialEffect.see)) {
              obj[key][subkey] = {value: (this.effectCache[key] !== undefined && this.effectCache[key][subkey] !== undefined) ? this.effectCache[key][subkey] : 1, special: subelem.type === 'special'};
            }
          }
        }
      }
      return obj;
    },
  },
  methods: {
    toggleIframe() {
      this.showIframe = !this.showIframe;

      if (this.showIframe) {
        this.$nextTick(() => {
          const iframe = this.$refs.treasuresIframe;
          if (iframe && iframe.contentWindow) {
            iframe.addEventListener('load', () => {
              const saveFileData = getSavefile();
              iframe.contentWindow.postMessage(saveFileData, '*');
            });
          }
        });
      }
    },
    refreshIframe() {
      if (this.showIframe) {
        this.$nextTick(() => {
          const iframe = this.$refs.treasuresIframe;
          let test = iframe.src
          iframe.src = test
          if (iframe && iframe.contentWindow) {
            iframe.addEventListener('load', () => {
              const saveFileData = getSavefile();
              iframe.contentWindow.postMessage(saveFileData, '*');
            });
          }
        });
      }
    },
  }
}
</script>
