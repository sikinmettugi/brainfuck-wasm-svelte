<script>
    import BfMachineState from './BfMachineState.svelte';

    export let state;
	export let program;
    export let newState;

    let programIndex = 0;
    let tapeIndex = 0;
    const outputPlaceholder = "(stream output shows here)";
    let outputStr = outputPlaceholder;
    let switch1 = false;

    let programStr = "";
    let machineInstance = {};
    let errorStr = "";

    function run() {
        console.log("button clicked, running");
        outputStr = switch1 ? outputPlaceholder : "updated";
        switch1 = !switch1;

        if (!programStr) {
            errorStr = "The program is empty!";
            return;
        }
        try {
            state = newState();
            machineInstance = program.parse(programStr);
            machineInstance.execute(state);
            outputStr = state.output();
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
    <!-- <div id="bf-machine-state-area">
        <p>(current machine state here)</p>
        <p>
            program index: {programIndex}<br>
            tape index: {state.get_index()}
        </p>
    </div> -->
    <section class="bf-interface-io">
        <div id="bf-interface-output-area">
            Input:
            <textarea id="bf-input-stream"></textarea>
            Output:
            <textarea id="bf-output-stream" name="bf-output-stream" readonly>{outputStr}</textarea>
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