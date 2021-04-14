<script>
    export let state;
	export let program;

    let programIndex = 0;
    let tapeIndex = 0;
    const outputPlaceholder = "(stream output shows here)";
    let outputStr = outputPlaceholder;
    let switch1 = false;

    let programStr = "";
    let machineInstance = {};

    function run() {
        console.log("button clicked, running");
        outputStr = switch1 ? outputPlaceholder : "updated";
        switch1 = !switch1;

        if (!programStr) {
            console.log("invalid program:", programStr);
            return;
        }

        machineInstance = program.parse(programStr);
        machineInstance.execute(state);
        outputStr = state.output();
    }
</script>

<div id="bf-interface">
    <div id="bf-interface-input-area">
        <textarea id="bf-input-program" name="bf-program-input" bind:value={programStr}></textarea>
        <button class="bf-button-input" type="button" on:click={run}>Run</button>
    </div>
    <div id="bf-machine-state-area">
        <p>(current machine state here)</p>
        <p>
            program index: {programIndex}<br>
            tape index: {tapeIndex}
        </p>
    </div>
    <div id="bf-interface-output-area">
        <textarea id="bf-output-stream" name="bf-output-stream" readonly>{outputStr}</textarea>
    </div>
</div>

<style>
	#bf-interface {
		text-align: center;
		padding: 1em;
		max-width: 480px;
		margin: 0 auto;
	}
</style>