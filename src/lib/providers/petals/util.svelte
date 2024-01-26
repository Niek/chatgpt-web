<script context="module" lang="ts">
  import { globalStorage } from '../../Storage.svelte'
  import { get } from 'svelte/store'
  import type { ModelDetail } from '../../Types.svelte'

  export const checkModel = async (modelDetail: ModelDetail) => {
    if (modelDetail.type === 'chat' || modelDetail.type === 'instruct') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      modelDetail.enabled = get(globalStorage).enablePetals
    }
  }
</script>
