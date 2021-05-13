<script>
    import BfMachineState from './BfMachineState.svelte';
    import BfProgramInputBox from './BfProgramInputBox.svelte';
    import { programInput } from './inputStore';

    export let state;
	export let program;
    export let newState;
    export let presets;

    let inputStr = "";
    const outputPlaceholder = "(stream output shows here)";
    let outputStr = outputPlaceholder;
    let showDec = false;

    let machineInstance = {};
    let errorStr = "";
    let programIndex = 0;

    let paused = true;
    const STEP_INTERVAL_MS = 125;

    $: tapes = state.get_display_tapes(32);
    $: tapeIndex = state.get_index();

    function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isU8(ch) {
        return !isNaN(ch)
            && !isNaN(parseFloat(ch))
            && parseInt(ch) >= 0
            && parseInt(ch) < 256;
    }

    function pushInput(machine) {
        let splitted = inputStr.split(/[\s,]+/);
        // console.log(splitted);

        if (!splitted.every((n) => isU8(n))) {
            return false;
        }

        machine.push_input(splitted.map(n => parseInt(n)));
        return true;
    }

    async function step() {
        try {
            machineInstance.step(state);
            outputStr = showDec ? state.output_dec() : state.output();
            errorStr = "";
            state = state;
            programIndex = machineInstance.get_index();
            await sleep(STEP_INTERVAL_MS);
        } catch (ex) {
            console.error(ex);
            errorStr = ex.toString();
        }
    }

    async function run() {
        if (!$programInput) {
            errorStr = "The program is empty!";
            return;
        }

        try {
            paused = false;
            state = newState();
            machineInstance = program.parse($programInput);
            if (machineInstance.needs_input()) {
                if (!inputStr) {
                    throw new Error("The input is empty!");
                }

                if (!pushInput(state)) {
                    throw new Error("Invalid input: should be a space/comma separated unsigned 8-bit integers!");
                }

            }

            // push input box update first
            state = state;
            await sleep(STEP_INTERVAL_MS);
            
            while (!paused && machineInstance.can_execute(state)) {
                await step();
            }

            paused = true;
            programIndex = 0;
        } catch (ex) {
            console.error(ex);
            errorStr = ex.toString();
        }
    }

    function runPresets(preset) {
        if (!preset) {
            return;
        }

        $programInput = preset.program;
        showDec = preset.outputAsDec;
        if (preset.inputs) {
            inputStr = preset.inputs;
        }
    }

    function reset() {
        paused = true;
        machineInstance.reset();
        state.reset();
        state = state;
    }
</script>

<div id="bf-interface">
    <BfProgramInputBox
        isRunning="{!paused}"
        curIndex="{programIndex}"
    />
    <button class="bf-button-input" type="button" on:click={run} disabled={!paused}>
        {#if paused} Run {:else} Running... {/if}
    </button>
    <button class="bf-button-input" type="button" on:click={reset}>Reset</button>
    <BfMachineState 
        tapes={tapes}
        tapeIndex={tapeIndex}
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
            <input type="checkbox" id="bf-output-print-hex" bind:checked={showDec}/><label for="bf-output-print-hex">Print in dec</label>
        </div>
        <div id="bf-interface-errors">
            {#if errorStr}
            <div id="bf-interface-error-box">{errorStr}</div>
            {/if}
        </div>
    </section>
    <section class="bf-interface-preset">
        <div id="bf-interface-presets">
            <ul class="presets">
                {#each presets as ps}
                    <li>
                        <button on:click={runPresets(ps)}>{ps.description}</button>
                    </li>
                {/each}
            </ul>

        </div>
    </section>
</div>

<style>
    section {
        display: block;
    }

    ul.presets li {
        display: inline-block;
        list-style-type: none;
        height: 23px;
        text-align: center;
        padding-top: 7px;
        padding-left: 10px;
        color: gray;
    }

	#bf-interface {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}

    #bf-interface-error-box {
        background-color: #ff3e00;
        color: beige;
        padding: 1em;
		margin: 0 auto;
    }
</style>