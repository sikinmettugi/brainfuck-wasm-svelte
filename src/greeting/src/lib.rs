use wasm_bindgen::prelude::*;

extern crate web_sys;
// use std::fmt;
use phf::{ phf_map };

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub fn greet() -> String {
    "Hello SVELTE from RUST".into()
}


// TODO: WASM does not support non-C-style enums. Look for an alternative impl.
// #[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BfInstruction {
    Right,
    Left,
    Increment,
    Decrement,
    Output,
    Input,
    JumpOpen(usize),
    JumpClose(usize),
    Comment(char),
    End,
}

// pub trait BfInterpretable {
//     fn run(step_by_step: bool);
//     fn inspect();
// }

#[wasm_bindgen]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct BfMachineState {
    tape: Vec<u8>,
    index: usize,
    out_str: String,
}

#[wasm_bindgen]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct BfProgram {
    instructions: Vec<BfInstruction>,
    index: usize,
}

static CHAR_TO_INST_MAP: phf::Map<char, BfInstruction> = phf_map! {
    '>' => BfInstruction::Right,
    '<' => BfInstruction::Left,
    '+' => BfInstruction::Increment,
    '-' => BfInstruction::Decrement,
    '.' => BfInstruction::Output,
    ',' => BfInstruction::Input,
    '[' => BfInstruction::JumpOpen(0),
    ']' => BfInstruction::JumpClose(0),
};

#[wasm_bindgen]
impl BfMachineState {
    pub fn new() -> BfMachineState {
        BfMachineState {
            tape: vec![0; 3000],
            index: 0,
            out_str: String::new(),
        }
    }

    pub fn output(&self) -> String {
        self.out_str.as_str().into()
    }

    pub fn get_index(&self) -> usize {
        self.index
    }

    pub fn get_tape_value(&self, i: usize) -> Option<u8> {
        if i < self.tape.len() { Some(self.tape[i]) } else { None }
    }

    pub fn get_display_tapes(&self, i: usize) -> Vec<u8> {
        if i < self.tape.len() { self.tape[0..i].iter().cloned().collect() } else { self.tape.clone() }
    }
}

#[wasm_bindgen]
impl BfProgram {
    pub fn parse(prg: String) -> Result<BfProgram, JsValue> {
        set_panic_hook();
        // let implicit = "++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.";

        let mut instructions : Vec<BfInstruction> = Vec::new();
        // stack for "[" and "]"
        let mut crotchets: Vec<usize> = Vec::new();

        // TODO: how to check if the program is valid?
        // how to alert the frontend that the input program is invald?
        for (i, c) in prg.chars().enumerate() {
            let mut cur_inst = if CHAR_TO_INST_MAP.contains_key(&c) {
                CHAR_TO_INST_MAP[&c]
            } else {
                BfInstruction::Comment(c)
            };

            match cur_inst {
                BfInstruction::Comment(_) => {
                    // TODO: file a warning. It's silently set as a comment for now
                },
                BfInstruction::JumpOpen(_) => {
                    crotchets.push(i);
                },
                BfInstruction::JumpClose(_) => {
                    match crotchets.pop() {
                        Some(idx) => {
                            instructions[idx] = BfInstruction::JumpOpen(i - idx);
                            cur_inst = BfInstruction::JumpClose(i - idx);
                        },
                        None => {
                            // TODO: what if the crotches are not in pair?
                            return Err(JsValue::from("invalid crotchet pairs: no [ matched"));
                        }
                    }
                }
                _ => {},
            }
            instructions.push(cur_inst);
        }

        instructions.push(BfInstruction::End);

        // invalid crotchets throws error
        if !crotchets.is_empty() {
            Err(JsValue::from("invalid crotchet pairs: no ] matched"))
        } else {
            Ok(BfProgram{
                instructions: instructions,
                index: 0,
            })
        }
    }

    pub fn step(&mut self, state: &mut BfMachineState) {
        // log!("state: {:?}", &state);
        match self.instructions[self.index] {
            BfInstruction::Right => {
                state.index += 1;
                let len = state.tape.len();
                if state.index >= len {
                    state.tape.extend(vec![0u8; len]);
                }
            },
            BfInstruction::Left => state.index -= 1,
            BfInstruction::Increment => state.tape[state.index] = state.tape[state.index].wrapping_add(1),
            BfInstruction::Decrement => state.tape[state.index] = state.tape[state.index].wrapping_sub(1),
            BfInstruction::Output => state.out_str.push(state.tape[state.index] as char),
            BfInstruction::Input => {
                // TODO

                // possible implementation: early return if input is empty, otherwise try to process it
            },
            BfInstruction::JumpOpen(offset) => self.index = if state.tape[state.index] == 0 { self.index + offset } else { self.index },
            BfInstruction::JumpClose(offset) => self.index = if state.tape[state.index] != 0 { self.index - offset - 1 } else { self.index },
            BfInstruction::Comment(_) => { },
            BfInstruction::End => return,
        }

        self.index += 1;
    }

    pub fn execute(&mut self, mut state: &mut BfMachineState) {
        while self.index < self.instructions.len() && self.instructions[self.index] != BfInstruction::End {
            log!("tape: {:?}", &state.tape[0..32]);
            log!("index: {:?}, instruction: {:?}, output: {:?}", &state.index, self.instructions[self.index], &state.output());
            self.step(&mut state);
        }

        log!("tape: {:?}", &state.get_display_tapes(32));
        log!("index: {:?}, instruction: {:?}, output: {:?}", &state.index, self.instructions[self.index], &state.output());
    }
}
