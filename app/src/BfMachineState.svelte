<script>
    export let tapes;
    export let tapeIndex;
    const tapeSize = 32;
    $: indexPositionStyle = `margin-left: ${6 + tapeIndex * tapeSize}px`;
</script>

<section id="bf-interface-machine-state">
    <div id="bf-interface-state-block" style="display: inline-block">
        <ul class="tape">
            {#each tapes as tp}
            <li>
                {tp}
            </li>
            {/each}
            <li class="tape-elem-rightmost">(...)</li>
        </ul>
        <div class="tape-pointer" style={indexPositionStyle}>
            <em>
            </em>
        </div>
    </div>

</section>

<style>

    section {
        /* justify-content: center; */
        margin-top: 40px;
        margin-left: 20px;
    }

    #bf-interface-state-block {
        width: 720px;
        text-align: center;
    }

    div.tape-pointer {
        width: 31px;
    }

    div.tape-pointer em {
        background-color: #ff3e00;
        display: block;
        width: 10px;
        height: 15px;
        margin-top: 6px;
        margin-left: 10px;

    }

    div.tape-pointer em::before {
        content: "";
        background-color: #ff3e00;
        display: block;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 5px solid #ff3e00;
        margin-top: -5px;

    }

    ul.tape {
        display: block;
        list-style-type: disc;
        overflow: hidden;
        /* margin: 0; */
        padding: 0;
        height: 32px;
    }
    ul {
        display: block;
        list-style-type: disc;
        /* margin-block-start: 1em;
        margin-block-end: 1em; */
        margin-inline-start: 0px;
        margin-inline-end: 0px;
        padding-inline-start: 40px;
    }

    ul.tape li {
        display: inline-block;
        list-style-type: none;
        border: 1px solid #aeaeae;
        width: 30px;
        height: 23px;
        text-align: center;
        padding-top: 7px;
        /* border-right: none; */
        color: gray;
    }

</style>
