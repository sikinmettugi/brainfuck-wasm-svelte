<script>
    import { programInput } from './inputStore';

    export let isRunning;
    export let curIndex;

    let inputText = "";
    let displayElem = "";
    $: {
        inputText = $programInput;
        console.log(`input: ${inputText}`);
    }
    $: if (isRunning && (curIndex >= 0 && curIndex < inputText.length)) {
        let head = inputText.slice(0, curIndex);
        let caratChar = inputText[curIndex];
        let tail = inputText.slice(curIndex + 1);
        displayElem = head + `<span id="bf-program-caret" class="carat">${caratChar}</span>` + tail;
    }
</script>

<div id="bf-interface-input-area">
    {#if !isRunning}
    <textarea id="bf-input-program" name="bf-program-input" bind:value={$programInput} ></textarea>
    {:else}
    <div id="bf-interface-program-preview">
        {@html displayElem}
    </div>
    <span id="bf-program-caret" class="caret" style="display: none"></span>
    {/if}
</div>

<style>
    #bf-interface-program-preview, #bf-input-program {
        display: block;
        background-color: beige;
        font-family: monospace;
		margin: 0 auto;
        padding: 0.4em;
        width: 480px;
        height: 400px;
        border: 3px solid #3e3e3e;
        font-size: 16px;
        text-align: start;
        word-break: break-all;
    }
    :global(#bf-program-caret) {
        border-radius: 4px;
        background-color: rgb(243, 89, 243);
        color: black;
    }
</style>