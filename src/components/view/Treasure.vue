<style scoped>
.treasure-slot {
  touch-action: none;
}
</style>

<template>
  <v-row no-gutters>
    <v-col :class="{'scroll-container': $vuetify.breakpoint.mdAndUp}" cols="12" md="8" lg="9">
      <chance-list></chance-list>
      <div class="d-flex flex-wrap justify-center align-center ma-1">
        <div class="d-flex flex-wrap justify-center align-center">
          <currency class="ma-1" name="treasure_fragment"></currency>
          <gb-tooltip :min-width="0">
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-btn small class="ma-1 pa-1" data-cy="treasure-buy-fragment" color="success" min-width="32" min-height="32" :disabled="!canBuyFragments" @click="buyFragments"><v-icon>mdi-plus</v-icon></v-btn>
              </div>
            </template>
            <div class="mt-0">
              <span>{{ $vuetify.lang.t(`$vuetify.treasure.buyFragment.0`) }}</span>
              <price-tag class="ml-1" currency="treasure_fragment" :amount="fragmentGain" add></price-tag>
              <span>&nbsp;{{ $vuetify.lang.t(`$vuetify.treasure.buyFragment.1`) }}</span>
              <price-tag class="ml-1" currency="gem_emerald" :amount="fragmentPrice"></price-tag>
            </div>
          </gb-tooltip>
        </div>
        <div v-if="store.state.system.settings.mods_qol.items.showMoreQOLData.value">
          <v-btn small class="ma-1 pa-1" color="primary" min-width="32" min-height="32" @click="sortBy('correct')">The Only Correct Way<v-icon>mdi-sort</v-icon></v-btn>
          <v-btn small class="ma-1 pa-1" color="primary" min-width="32" min-height="32" @click="sortBy('tier')">Level<v-icon>mdi-sort-descending</v-icon></v-btn>
          <v-btn small class="ma-1 pa-1" color="primary" min-width="32" min-height="32" @click="sortBy('type')">Type<v-icon>mdi-sort-descending</v-icon></v-btn>
          <v-btn small class="ma-1 pa-1" color="primary" min-width="32" min-height="32" @click="sortBy('effect')">Type<v-icon>mdi-sort-descending</v-icon></v-btn>
        </div>
        <v-spacer v-if="$vuetify.breakpoint.smAndUp"></v-spacer>
        <div class="d-flex flex-wrap justify-center align-center">
          <item-slot
            class="ma-1 treasure-slot"
            id="treasure_-1"
            :slot-id="-1"
            :draggable="newItem !== null"
            @dragstart="drag($event, -1)"
            @touchend="touchdrop($event, -1)"
          ></item-slot>
          <buy-item class="ma-1" name="regular"></buy-item>
          <buy-item v-if="unlock.treasureDual.see" class="ma-1" name="dual"></buy-item>
        </div>
        <div class="d-flex flex-wrap justify-center align-center">
          <gb-tooltip :min-width="0">
            <template v-slot:activator="{ on, attrs }">
              <v-btn data-cy="treasure-upgrade-button" class="ma-1" :color="upgrading ? 'warning' : 'secondary'" @click="toggleUpgrading" v-bind="attrs" v-on="on">{{ $vuetify.lang.t('$vuetify.gooboo.upgradeVerb') }}</v-btn>
            </template>
            <div class="mt-0">{{ $vuetify.lang.t(`$vuetify.treasure.upgradeDescription`) }}</div>
          </gb-tooltip>
          <gb-tooltip :min-width="0">
            <template v-slot:activator="{ on, attrs }">
              <v-btn data-cy="treasure-delete-button" class="ma-1" :color="deleting ? 'error' : 'secondary'" @click="toggleDeleting" v-bind="attrs" v-on="on"><v-icon>mdi-delete</v-icon></v-btn>
            </template>
            <div class="mt-0">{{ $vuetify.lang.t(`$vuetify.treasure.destroyDescription`) }}</div>
          </gb-tooltip>
        </div>
      </div>
      <div class="d-flex flex-wrap ma-1">
        <item-slot
          class="ma-1 treasure-slot"
          v-for="i in treasureSlots"
          :key="i"
          :id="'treasure_' + (i - 1)"
          :slot-id="i - 1"
          :draggable="(i - 1) < items.length && items[i - 1] !== null"
          @dragstart="drag($event, i - 1)"
          @drop="drop($event, i - 1)"
          @dragover="allowDrop"
          @touchend="touchdrop($event, i - 1)"
        ></item-slot>
      </div>
    </v-col>
    <v-col :class="{'scroll-container': $vuetify.breakpoint.mdAndUp}" cols="12" md="4" lg="3">
      <stat-list></stat-list>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapState } from 'vuex';
import { TREASURE_FRAGMENT_BUY_COST } from '../../js/constants';
import BuyItem from '../partial/treasure/BuyItem.vue';
import ChanceList from '../partial/treasure/ChanceList.vue';
import ItemSlot from '../partial/treasure/ItemSlot.vue';
import StatList from '../partial/treasure/StatList.vue';
import Currency from '../render/Currency.vue';
import PriceTag from '../render/PriceTag.vue';
import store from "@/store";

export default {
  components: { ChanceList, Currency, ItemSlot, StatList, BuyItem, PriceTag },
  computed: {
    store() {
      return store
    },
    ...mapState({
      upgrading: state => state.treasure.upgrading,
      deleting: state => state.treasure.deleting,
      treasureType: state => state.treasure.type,
      unlock: state => state.unlock,
      newItem : state => state.treasure.newItem,
      items: state => state.treasure.items
    }),
    ...mapGetters({
      fragmentGain: 'treasure/fragmentGain'
    }),
    treasureSlots() {
      return this.$store.getters['mult/get']('treasureSlots');
    },
    canBuyFragments() {
      return this.$store.getters['currency/value']('gem_emerald') >= TREASURE_FRAGMENT_BUY_COST;
    },
    fragmentPrice() {
      return TREASURE_FRAGMENT_BUY_COST;
    }
  },
  methods: {
    drag(ev, id) {
      ev.dataTransfer.setData("text", id);
    },
    drop(ev, id) {
      ev.preventDefault();
      const startId = parseInt(ev.dataTransfer.getData("text"));
      const endId = parseInt(id);
      if (startId !== endId) {
        this.$store.dispatch('treasure/moveItem', {from: startId, to: endId});
      }
    },
    allowDrop(ev) {
      ev.preventDefault();
    },
    touchdrop(ev, draggedId) {
      const elemList = document.elementsFromPoint(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
      if (elemList) {
        const endElem = elemList.find(el => el.id.slice(0, 9) === 'treasure_');
        if (endElem) {
          const startId = parseInt(draggedId);
          const endId = parseInt(endElem.id.slice(9));
          if (startId !== endId && endId !== -1) {
            this.$store.dispatch('treasure/moveItem', {from: startId, to: endId});
          }
        }
      }
    },
    buyFragments() {
      if (this.$store.state.system.settings.confirm.items.gem.value) {
        this.$store.commit('system/updateKey', {key: 'confirm', value: {
          type: 'treasureFragment',
          price: {gem_emerald: TREASURE_FRAGMENT_BUY_COST},
          gain: {treasure_fragment: this.fragmentGain},
        }});
      } else {
        this.$store.dispatch('treasure/buyFragments');
      }
    },
    sortBy(sortByThis) {

      function sortObjectWithoutDeletingDuplicates(items, key, customSequence = null) {
        return items.slice().sort((a, b) => {
          let aValue = a[key];
          let bValue = b[key];
          if (key === "effect" && Array.isArray(aValue)) {
            aValue = aValue[0];
          }
          if (key === "effect" && Array.isArray(bValue)) {
            bValue = bValue[0];
          }
          if (customSequence) {
            const aIndex = customSequence.indexOf(aValue);
            const bIndex = customSequence.indexOf(bValue);
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
          }
          if (typeof aValue === "number" && typeof bValue === "number") {
            return bValue - aValue;
          } else if (typeof aValue === "string" && typeof bValue === "string") {
            return bValue.localeCompare(aValue);
          }
          return 0;
        })
      }

      switch (sortByThis){
        case 'type': {
          store.state.treasure.items = sortObjectWithoutDeletingDuplicates(store.state.treasure.items, 'type', ['ancient', 'empowered', 'dual', 'regular']);
          break;
        }
        case 'tier': {
          store.state.treasure.items = sortObjectWithoutDeletingDuplicates(store.state.treasure.items, 'tier');
          break;
        }
        case 'effect': {
          store.state.treasure.items = sortObjectWithoutDeletingDuplicates(store.state.treasure.items, 'effect', ['miningDamage', 'currencyMiningScrapGain', 'miningOreGain', 'miningSmelterySpeed', 'currencyMiningSmokeGain', 'currencyMiningCrystalGreenGain', 'currencyMiningCrystalYellowGain', 'queueSpeedVillageBuilding', 'villageMaterialGain', 'currencyVillageCoinGain', 'villageMentalGain', 'currencyVillageFaithGain', 'currencyVillageSharesGain', 'hordeAttack', 'currencyHordeBoneGain', 'currencyHordeMonsterPartGain', 'hordeItemMasteryGain', 'currencyHordeSoulCorruptedGain', 'currencyFarmVegetableGain', 'currencyFarmBerryGain', 'currencyFarmGrainGain', 'currencyFarmFlowerGain', 'farmExperience', 'currencyGalleryBeautyGain', 'currencyGalleryConverterGain', 'currencyGalleryPackageGain', 'currencyGalleryCashGain']);
          break;
        }
        case 'correct': {
          store.state.treasure.items = sortObjectWithoutDeletingDuplicates(store.state.treasure.items, 'type', ['ancient', 'empowered', 'dual', 'regular']);
          store.state.treasure.items = sortObjectWithoutDeletingDuplicates(store.state.treasure.items, 'tier');
          store.state.treasure.items = sortObjectWithoutDeletingDuplicates(store.state.treasure.items, 'effect', ['miningDamage', 'currencyMiningScrapGain', 'miningOreGain', 'miningSmelterySpeed', 'currencyMiningSmokeGain', 'currencyMiningCrystalGreenGain', 'currencyMiningCrystalYellowGain', 'queueSpeedVillageBuilding', 'villageMaterialGain', 'currencyVillageCoinGain', 'villageMentalGain', 'currencyVillageFaithGain', 'currencyVillageSharesGain', 'hordeAttack', 'currencyHordeBoneGain', 'currencyHordeMonsterPartGain', 'hordeItemMasteryGain', 'currencyHordeSoulCorruptedGain', 'currencyFarmVegetableGain', 'currencyFarmBerryGain', 'currencyFarmGrainGain', 'currencyFarmFlowerGain', 'farmExperience', 'currencyGalleryBeautyGain', 'currencyGalleryConverterGain', 'currencyGalleryPackageGain', 'currencyGalleryCashGain']);
          break;
        }
        default:
          break;
      }
    },
    toggleUpgrading() {
      this.$store.commit('treasure/updateKey', {key: 'deleting', value: false});
      this.$store.commit('treasure/updateKey', {key: 'upgrading', value: !this.$store.state.treasure.upgrading});
    },
    toggleDeleting() {
      this.$store.commit('treasure/updateKey', {key: 'upgrading', value: false});
      this.$store.commit('treasure/updateKey', {key: 'deleting', value: !this.$store.state.treasure.deleting});
    }
  }
}
</script>
