<script>
    import { onDestroy } from 'svelte';
    import BfMachineState from './BfMachineState.svelte';
    import BfProgramInputBox from './BfProgramInputBox.svelte';

    export let state;
	export let program;
    export let newState;
    export let presets;

    let inputStr = "";
    const outputPlaceholder = "(stream output shows here)";
    let outputStr = outputPlaceholder;
    let showDec = false;

    let programStr = "";
    let machineInstance = {};
    let errorStr = "";
    let programIndex = 0;

    let paused = true;
    // let tickCount = 0;
    const STEP_INTERVAL_MS = 125;

    $: tapes = state.get_display_tapes(32);
    $: tapeIndex = state.get_index();
    // $: programIndex = !paused && machineInstance ? machineInstance.get_index() : 0;

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
        console.log(splitted);

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
        if (!programStr) {
            errorStr = "The program is empty!";
            return;
        }

        try {
            paused = false;
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

        console.log("running preset", preset);

        programStr = preset.program;
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
    <!-- <div id="bf-interface-input-area">
        <textarea id="bf-input-program" name="bf-program-input" bind:value={programStr}></textarea>
        <button class="bf-button-input" type="button" on:click={run}>Run</button>
        <button class="bf-button-input" type="button" on:click={reset}>Reset</button>
    </div> -->
    <BfProgramInputBox
        inputText="{programStr}"
        isRunning="{!paused}"
        curIndex="{programIndex}"
    />
    <button class="bf-button-input" type="button" on:click={run}>Run</button>
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
        /* border: 1px solid #aeaeae; */
        /* width: 30px; */
        height: 23px;
        text-align: center;
        padding-top: 7px;
        padding-left: 10px;
        /* border-right: none; */
        color: gray;
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