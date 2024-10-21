<template>
  <div>
    <div v-if="qol.items.showGooberer.value">
      <v-btn small class="ma-1 pa-1" color="error" min-width="32" min-height="32" @click="toggleIframe"><v-icon>mdi-firefox</v-icon></v-btn>
      <div v-if="showIframe">
        <iframe ref="relicIframe" src="https://myros27.github.io/gooberer/1.5/relics/relics.html?=test" width="100%" height="800rem" style="border: none;" ></iframe>
      </div>
    </div>
    <div class="d-flex flex-wrap ma-1 pb-2">
      <item class="ma-1" v-for="(item, key) in owned" :key="key" :name="item"></item>
    </div>
  </div>
</template>

<script>
import {mapGetters, mapState} from 'vuex';
import Item from './Item.vue';
import {getSavefile} from "@/js/savefile";

export default {
  components: { Item },
  data() {
    return {
      showIframe: false,
    };
  },
  computed: {
    ...mapGetters({
      owned: 'relic/owned',
    }),
    ...mapState({
      qol: state => state.system.settings.mods_qol,
    })
  },
  methods: {
    toggleIframe() {
      this.showIframe = !this.showIframe;
      if (this.showIframe) {
        this.$nextTick(() => {
          const iframe = this.$refs.relicIframe;
          if (iframe && iframe.contentWindow) {
            iframe.addEventListener('load', () => {
              const saveFileData = getSavefile();
              let sendData = {
                action: 'initData',
                save: JSON.parse(atob(saveFileData))
              }
              iframe.contentWindow.postMessage(btoa(JSON.stringify(sendData)), '*');
            });
          }
        });
      }
    }
  }
}
</script>
