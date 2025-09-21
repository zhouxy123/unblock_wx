mod utils;

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

fn format_moves_json(moves: &Vec<MoveRecord>) -> String {
    serde_json::to_string(moves).unwrap_or("[]".to_string())
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
pub fn solve(input: &str) -> String{
    match parse_blocks(input) {
        Some(blocks) => {
            match solve_puzzle(&blocks) {
                Some(moves) => format_moves_json(&moves),
                None => "".to_string(), // 无解返回空字符串
            }
        },
        None => "invalid input".to_string(),
    }
}