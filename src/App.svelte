<script>
	import BfInterface from './BfInterface.svelte';
	export let state;
	export let program;
	export let newState;
</script>

<main>
	<h1>brainf-wasm</h1>
	<p>A BrainF*ck Interpreter compiled into WASM loaded on Svelte</p>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
	<BfInterface state={state} program={program} newState={newState} />
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		/* max-width: 240px; */
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>