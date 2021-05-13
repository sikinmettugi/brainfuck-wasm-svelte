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

#[wasm_bindgen]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct BfMachineState {
    tape: Vec<u8>,
    index: usize,
    inputs: Vec<u8>,
    input_idx: usize,
    out_str: String,
}

#[wasm_bindgen]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct BfProgram {
    instructions: Vec<BfInstruction>,
    index: usize,
    needs_input: bool,
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
            inputs: Vec::new(),
            input_idx: 0,
            out_str: String::new(),
        }
    }

    pub fn reset(&mut self) {
        self.tape = vec![0; 3000];
        self.index = 0;
        self.input_idx = 0;
        self.out_str = String::new();
    }

    pub fn output(&self) -> String {
        self.out_str.as_str().into()
    }

    pub fn output_dec(&self) -> String {
        let hex_str: String = self.out_str.chars().map(|c| {
            let mut c_u8 = c as u8;
            let mut cur_hex: Vec<char> = Vec::new();
            while c_u8 > 0 {
                cur_hex.push(((c_u8 % 10) + ('0' as u8)) as char);
                c_u8 /= 10;
            }
            // log!("{:?}", &cur_hex);
            cur_hex.reverse();
            cur_hex.into_iter().collect()
        }).collect::<Vec<String>>().join(" ");

        hex_str
    }

    pub fn get_index(&self) -> usize {
        self.index
    }

    pub fn push_input(&mut self, inputs: &[u8]) {
        // self.inputs.copy_from_slice(inputs);
        self.inputs = Vec::from(inputs);
        self.input_idx = 0;
    }

    pub fn get_input(&mut self) -> Option<u8> {
        if self.input_idx >= self.inputs.len() {
            None
        } else {
            let idx = self.input_idx;
            self.input_idx += 1;
            Some(self.inputs[idx])
        }
    }

    pub fn log_input(&self) -> Option<u8> {
        log!("input: {:?}, idx: {:?}", self.inputs, self.input_idx);

        if self.input_idx >= self.inputs.len() {
            None
        } else {
            Some(self.inputs[self.input_idx])
        }
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
        let mut needs_input = false;

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
                            return Err(JsValue::from("invalid crotchet pairs: no [ matched"));
                        }
                    }
                }
                BfInstruction::Input => {
                    needs_input = true;
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
            Ok(BfProgram {
                instructions: instructions,
                index: 0,
                needs_input: needs_input,
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
                log!("inputs: {:?}", state.log_input());
                match state.get_input() {
                    Some(i) => state.tape[state.index] = i,
                    None => {
                        // err
                        log!("Warning: no more inputs!");
                    },
                }
                // possible implementation: early return if input is empty, otherwise try to process it
            },
            BfInstruction::JumpOpen(offset) => self.index =
                if state.tape[state.index] == 0 { self.index + offset } else { self.index },
            BfInstruction::JumpClose(offset) => self.index =
                if state.tape[state.index] != 0 { self.index - offset - 1 } else { self.index },
            BfInstruction::Comment(_) => { },
            BfInstruction::End => return,
        }

        self.index += 1;

        // log!("tape: {:?}", &state.tape[0..32]);
        // log!("index: {:?}, instruction: {:?}, input: {:?}, output: {:?}", 
        //     &state.index, self.instructions[self.index], &state.log_input(), &state.output());
    }

    pub fn execute(&mut self, mut state: &mut BfMachineState) {
        while self.can_execute(state) {
            self.step(&mut state);
        }

    }

    pub fn reset(&mut self) {
        self.index = 0;
    }

    pub fn needs_input(&self) -> bool {
        self.needs_input
    }

    pub fn get_index(&self) -> usize {
        self.index
    }

    pub fn can_execute(&self, state: &mut BfMachineState) -> bool {
        self.index < self.instructions.len()
            && self.instructions[self.index] != BfInstruction::End
            && !(self.instructions[self.index] == BfInstruction::Input && state.log_input().is_none())
    }
}
