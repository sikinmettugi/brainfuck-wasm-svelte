import App from './App.svelte';
import wasm from './greeting/Cargo.toml';

const init = async() => {
	const greet = await wasm();

	console.log(greet);
	const bfState = greet.BfMachineState;
	const initialState = bfState.new();
	const app = new App({
		target: document.body,
		props: {
			newState: bfState.new,
			state: initialState,
			program: greet.BfProgram,
		}
	});
};

init();