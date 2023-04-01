<script lang="ts">
  import logo from '../assets/logo.svg'
  import { Navbar, NavBrand } from 'flowbite-svelte'
</script>

<Navbar navDivClass="py-2 mx-0" navClass="bg-gray-900"   color="form">
  <NavBrand href="/">
    <img src={logo} class="ml-4 mr-3 h-6 sm:h-9" alt="Flowbite Logo"/><span class="font-bold text-gray-200">ChatGPT web</span>
  </NavBrand>
</Navbar>