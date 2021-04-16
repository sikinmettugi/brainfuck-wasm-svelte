use wasm_bindgen_test::*;

extern crate svelte_wasm_brainf_greeting;
use svelte_wasm_brainf_greeting::{ BfInstruction, BfMachineState, BfProgram };

#[wasm_bindgen_test]
fn it_works() {
    println!("Test OK");
}

#[wasm_bindgen_test]
fn program_with_empty_str() {
    let empty: String = String::from("");
    let program_res = BfProgram::parse(empty);
    let mut initial_state = BfMachineState::new();

    assert_eq!(program_res.is_ok(), true);

    let mut program = program_res.unwrap();
    program.execute(&mut initial_state);

    assert_eq!(initial_state.get_index(), 0);
    assert_eq!(initial_state.get_tape_value(0), Some(0));
}

#[wasm_bindgen_test]
fn program_with_valid_crochets() {
    let print_zero: String = String::from("++++++++[>++++++<-]>.");
    let program_res = BfProgram::parse(print_zero);
    let mut state = BfMachineState::new();

    assert_eq!(program_res.is_ok(), true);

    let mut program = program_res.unwrap();

    // check the jumps are correctly pointing


    program.execute(&mut state);

    assert_eq!(state.get_index(), 1);
    assert_eq!(state.get_tape_value(0), Some(0));
    assert_eq!(state.get_tape_value(1).is_some(), true);

    let tape_zero = state.get_tape_value(1).unwrap();
    assert_eq!(tape_zero.is_ascii_alphanumeric(), true);
    assert_eq!(tape_zero as char, '0');

}

#[wasm_bindgen_test]
fn program_with_invalid_crochets() {
    let print_zero: String = String::from("++++++++[>++++++<-");
    let program_res = BfProgram::parse(print_zero);

    assert_eq!(program_res.is_err(), true);
}

#[wasm_bindgen_test]
fn state_with_inputs() {
    let mut state = BfMachineState::new();
    state.push_input(&[5, 6]);

    assert_eq!(state.get_input(), Some(5));
    assert_eq!(state.get_input(), Some(6));
    assert_eq!(state.get_input(), None);
}

#[wasm_bindgen_test]
fn program_with_input_valid_counts() {
    let input_then_sum: String = String::from(",[[>+>+<<-]>-[<+>-]<]>>.");
    let program_res = BfProgram::parse(input_then_sum);
    let mut state = BfMachineState::new();
    state.push_input(&[5]);

    assert_eq!(program_res.is_ok(), true);
    assert_eq!(state.log_input(), Some(5));
    let mut program = program_res.unwrap();
    program.execute(&mut state);

    assert_eq!(state.get_index(), 2);
}
