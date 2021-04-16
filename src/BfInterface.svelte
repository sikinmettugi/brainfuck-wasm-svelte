<script>
    import BfMachineState from './BfMachineState.svelte';

    export let state;
	export let program;
    export let newState;

    let inputStr = "";
    const outputPlaceholder = "(stream output shows here)";
    let outputStr = outputPlaceholder;
    let showHex = false;

    let programStr = "";
    let machineInstance = {};
    let errorStr = "";

    function isU8(ch) {
        return !isNaN(ch)
            && !isNaN(parseFloat(ch))
            && parseInt(ch) >= 0
            && parseInt(ch) < 256;
    }

    function pushInput(machine) {
        let splitted = inputStr.split(/[\s,]+/);
        console.log(splitted);

        if (!splitted.every((n) => isU8(n))) {
            return false;
        }

        machine.push_input(splitted.map(n => parseInt(n)));
        return true;
    }

    function run() {
        if (!programStr) {
            errorStr = "The program is empty!";
            return;
        }

        try {
            state = newState();
            machineInstance = program.parse(programStr);
            console.log(typeof machineInstance, machineInstance);
            if (machineInstance.needs_input()) {
                if (!inputStr) {
                    throw new Error("The input is empty!");
                }

                if (!pushInput(state)) {
                    throw new Error("Invalid input: should be a space/comma separated unsigned 8-bit integers!");
                }

            }
            
            machineInstance.execute(state);
            outputStr = showHex ? state.output_dec() : state.output();
            errorStr = "";
        } catch (ex) {
            console.error(ex);
            errorStr = ex.toString();
        }
    }
</script>

<div id="bf-interface">
    <div id="bf-interface-input-area">
        <textarea id="bf-input-program" name="bf-program-input" bind:value={programStr}></textarea>
        <button class="bf-button-input" type="button" on:click={run}>Run</button>
    </div>
    <BfMachineState 
        tapes={state.get_display_tapes(32)}
        tapeIndex={state.get_index()}
    />
    <section class="bf-interface-io">
        <div id="bf-interface-input-area">
            Input:
            <textarea id="bf-input-stream" bind:value={inputStr}></textarea>
        </div>
        <div id="bf-interface-output-area">
            Output:
            <textarea id="bf-output-stream" name="bf-output-stream" readonly>{outputStr}</textarea>
            <br>
            <input type="checkbox" id="bf-output-print-hex" bind:checked={showHex}/><label for="bf-output-print-hex">Print in dec</label>
        </div>
        <div id="bf-interface-errors">
            {#if errorStr}
            <div id="bf-interface-error-box">{errorStr}</div>
            {/if}
        </div>
    </section>
</div>

<style>
    section {
        display: block;
    }
	#bf-interface {
		text-align: center;
		padding: 1em;
		/* max-width: 480px; */
		margin: 0 auto;
	}

    #bf-interface-error-box {
        background-color: #ff3e00;
        color: beige;
        padding: 1em;
		margin: 0 auto;
    }
</style>