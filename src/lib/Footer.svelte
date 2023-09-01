<script lang="ts">
  import Fa from 'svelte-fa/src/fa.svelte'
  import {
    faGithub
  } from '@fortawesome/free-brands-svg-icons/index'

  let classes = ''
export { classes as class }
  export let pin: boolean = false
  export let strongMask: boolean = false
</script>

<div class="lower-mask section-footer-mask" class:pin-footer={pin}/>
<div class="lower-mask2" class:strong-mask={strongMask} />
<div class="section-footer {classes}" class:pin-footer={pin}>
  <slot />
  <div class="is-size-8 content has-text-centered credit-footer">
    <p>
      <strong>ChatGPT</strong> may produce inaccurate information about people, places, or facts.
      <span style="display:inline-block;width:30px;height:20px;"></span>
    </p>
  </div>
</div>
