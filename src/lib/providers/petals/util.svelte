<script context="module" lang="ts">
    import { globalStorage } from '../../Storage.svelte'
    import { get } from 'svelte/store'
    import type { ModelDetail } from '../../Types.svelte'

export const set = (opt: Record<string, any>) => {
  //
}

export const checkModel = async (modelDetail: ModelDetail) => {
  if (modelDetail.type === 'chat' || modelDetail.type === 'instruct') {
        modelDetail.enabled = get(globalStorage).enablePetals
  }
}

</script>