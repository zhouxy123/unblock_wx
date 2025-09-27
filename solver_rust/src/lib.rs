mod utils;

use std::cell::RefCell;
use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet, VecDeque};
use std::io::{self, Write};
use std::cmp::Ordering;
use serde::Serialize;

#[derive(Clone, Debug)]
struct Block {
    id: i32,
    x: i32,
    y: i32,
    length: i32,
    direction: char, // 'h' or 'v'
}

#[derive(Clone, Debug, Serialize)]
struct MoveRecord {
    block_id: i32,
    delta: i32,
}

thread_local! {
    // 输入/输出缓冲区，放在线程本地，便于长生命周期管理
    static IN_BUF:  RefCell<Vec<u8>> = RefCell::new(Vec::new());
    static OUT_BUF: RefCell<Vec<i8>> = RefCell::new(Vec::new());
}

// 为 JS 准备一块大小为len的可写的连续内存，返回指针
#[wasm_bindgen]
pub fn alloc_input(len: usize) -> *mut u8 {
    IN_BUF.with(|b| {
        let mut v = b.borrow_mut();
        v.clear();
        v.resize(len, 0); // 分配并填 0，返回可写指针
        v.as_mut_ptr()
    })
}

#[wasm_bindgen]
pub fn input_len() -> usize {
    IN_BUF.with(|b| b.borrow().len())
}

#[wasm_bindgen]
pub fn output_ptr() -> *const i8 {
    OUT_BUF.with(|b| b.borrow().as_ptr())
}

#[wasm_bindgen]
pub fn output_len() -> usize {
    OUT_BUF.with(|b| b.borrow().len())
}

#[wasm_bindgen]
pub fn take_output_i8() -> Vec<i8> {
    OUT_BUF.with(|b| b.replace(Vec::new()))
}

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

pub fn parse_blocks(input: &str) -> Option<Vec<Block>> {
    if input.len() % 4 != 0 {
        return None;
    }

    let mut blocks = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    
    for i in 0..(input.len() / 4) {
        let id = i as i32;
        let x = chars[i * 4].to_digit(10)? as i32;
        let y = chars[i * 4 + 1].to_digit(10)? as i32;
        let length = chars[i * 4 + 2].to_digit(10)? as i32;
        let direction = if chars[i * 4 + 3] == '0' { 'h' } else { 'v' };

        blocks.push(Block { id, x, y, length, direction });
    }

    Some(blocks)
}

pub fn parse_blocks_from_inbuf() -> Option<Vec<Block>> {
    IN_BUF.with(|buf| {
        let buf = buf.borrow();
        if buf.len() % 4 != 0 {
            return None;
        }

        let mut blocks = Vec::new();
        for i in 0..(buf.len() / 4) {
            let id = i as i32;
            let x = buf[i * 4] as i32;
            let y = buf[i * 4 + 1] as i32;
            let length = buf[i * 4 + 2] as i32;
            let direction = if buf[i * 4 + 3] == 0 { 'h' } else { 'v' };

            blocks.push(Block { id, x, y, length, direction });
        }

        Some(blocks)
    })
}

fn format_moves_json(moves: &Vec<MoveRecord>) -> String {
    serde_json::to_string(moves).unwrap_or("[]".to_string())
}

fn write_moves_to_outbuf_i8(moves: &[MoveRecord]) -> (*const i8, usize) {
    OUT_BUF.with(|out| {
        let mut o = out.borrow_mut();
        o.clear();
        o.reserve(moves.len() * 2);
        for m in moves {
            // 可改为：let bid: i8 = m.block_id.try_into().expect("block_id out of i8");
            //        let d  : i8 = m.delta   .try_into().expect("delta out of i8");
            let bid = m.block_id as i8;
            let d   = m.delta    as i8;
            o.push(bid);
            o.push(d);
        }
        (o.as_ptr(), o.len())
    })
}

fn encode_state(blocks: &Vec<Block>) -> String {
    let mut s = String::new();
    for b in blocks {
        s.push_str(&format!("{},{};", b.x, b.y));
    }
    s
}

fn fill_grid(blocks: &Vec<Block>) -> [[i32; 6]; 6] {
    let mut grid = [[-1; 6]; 6];
    for b in blocks {
        match b.direction {
            'h' => {
                for dx in 0..b.length {
                    grid[b.y as usize][(b.x + dx) as usize] = b.id;
                }
            }
            'v' => {
                for dy in 0..b.length {
                    grid[(b.y + dy) as usize][b.x as usize] = b.id;
                }
            }
            _ => {}
        }
    }
    grid
}

fn is_solved(blocks: &Vec<Block>) -> bool {
    for b in blocks {
        if b.id == 0 && b.x == 4 && b.y == 2 {
            return true;
        }
    }
    false
}

fn solve_puzzle(init_blocks: &Vec<Block>) -> Option<Vec<MoveRecord>> {
    let mut blocks = init_blocks.clone();
    blocks.sort_by(|a, b| a.id.cmp(&b.id));

    let mut visited = HashSet::new();
    let mut parent: HashMap<String, (String, MoveRecord)> = HashMap::new();
    let mut q = VecDeque::new();

    let init_key = encode_state(&blocks);
    q.push_back(blocks.clone());
    visited.insert(init_key.clone());
    parent.insert(init_key.clone(), (String::new(), MoveRecord { block_id: -1, delta: 0 }));

    let mut found = false;
    let mut goal_key = String::new();

    while let Some(state) = q.pop_front() {
        if is_solved(&state) {
            found = true;
            goal_key = encode_state(&state);
            break;
        }

        let grid = fill_grid(&state);

        for i in 0..state.len() {
            let b = &state[i];
            let mut steps = 1;
            match b.direction {
                'h' => {
                    // 向左
                    while b.x - steps >= 0 && grid[b.y as usize][(b.x - steps) as usize] == -1 {
                        let mut new_state = state.clone();
                        new_state[i].x = b.x - steps;
                        let key = encode_state(&new_state);
                        if !visited.contains(&key) {
                            visited.insert(key.clone());
                            parent.insert(key.clone(), (encode_state(&state), MoveRecord { block_id: b.id, delta: -steps }));
                            q.push_back(new_state);
                        }
                        steps += 1;
                    }
                    // 向右
                    steps = 1;
                    while b.x + b.length - 1 + steps < 6 && grid[b.y as usize][(b.x + b.length - 1 + steps) as usize] == -1 {
                        let mut new_state = state.clone();
                        new_state[i].x = b.x + steps;
                        let key = encode_state(&new_state);
                        if !visited.contains(&key) {
                            visited.insert(key.clone());
                            parent.insert(key.clone(), (encode_state(&state), MoveRecord { block_id: b.id, delta: steps }));
                            q.push_back(new_state);
                        }
                        steps += 1;
                    }
                }
                'v' => {
                    // 向上
                    while b.y - steps >= 0 && grid[(b.y - steps) as usize][b.x as usize] == -1 {
                        let mut new_state = state.clone();
                        new_state[i].y = b.y - steps;
                        let key = encode_state(&new_state);
                        if !visited.contains(&key) {
                            visited.insert(key.clone());
                            parent.insert(key.clone(), (encode_state(&state), MoveRecord { block_id: b.id, delta: -steps }));
                            q.push_back(new_state);
                        }
                        steps += 1;
                    }
                    // 向下
                    steps = 1;
                    while b.y + b.length - 1 + steps < 6 && grid[(b.y + b.length - 1 + steps) as usize][b.x as usize] == -1 {
                        let mut new_state = state.clone();
                        new_state[i].y = b.y + steps;
                        let key = encode_state(&new_state);
                        if !visited.contains(&key) {
                            visited.insert(key.clone());
                            parent.insert(key.clone(), (encode_state(&state), MoveRecord { block_id: b.id, delta: steps }));
                            q.push_back(new_state);
                        }
                        steps += 1;
                    }
                }
                _ => {}
            }
        }
    }

    if found {
        let mut moves = Vec::new();
        let mut cur_key = goal_key;
        while let Some((prev, m)) = parent.get(&cur_key) {
            if prev.is_empty() { break; }
            moves.push(m.clone());
            cur_key = prev.clone();
        }
        moves.reverse();
        Some(moves)
    } else {
        None
    }
}

#[wasm_bindgen]
//pub fn solve() -> String{
pub fn solve() -> bool {
    // 目标：改成输入输出都是数组，从而在wasm中调用
    /*
    1. 将parse_blocks改为读取从IN_BUF中读取数组，再转成blocks，此时不需要input: &str参数
    2. 将format_moves_json(&moves)改为将得出的求解步骤转成i8数组，之后写入OUT_BUF
    */
    //match parse_blocks(input) {
    if let Some(blocks) = parse_blocks_from_inbuf() {
        if let Some(moves) = solve_puzzle(&blocks) {
            write_moves_to_outbuf_i8(&moves); // 忽略返回也行
            return true;
        }
    }
    false
}

#[wasm_bindgen]
pub fn process_to_i8() -> *const i8 {
    OUT_BUF.with(|out| {
        IN_BUF.with(|inp| {
            let inp = inp.borrow();
            let mut o = out.borrow_mut();
            o.clear();
            o.reserve(inp.len());
            for &x in inp.iter() {
                // 这里换成你的真实算法：把 u8 转换/映射到 i8
                let val: i8 = (x as i16 - 128) as i8; // 示例：中心化
                o.push(val);
            }
            o.as_ptr()
        })
    })
}
