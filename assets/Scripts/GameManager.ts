import { _decorator, Component, instantiate, Node, Prefab, TextAsset } from 'cc';
const { ccclass, property } = _decorator;

let blocks: number[][] = [];
let total_state: number[][] = [[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]];
let block_state: number[][] = [];
let abs_coords: number[][] = [];

const LEVEL_ID: number = 3; 
const BLOCK_SIZE: number = 80;
window["blocks"] = blocks; // 目的：把blocks弄成全局变量
window["total_state"] = total_state;
window["block_state"] = block_state;
window["abs_coords"] = abs_coords;

@ccclass('GameManager')
export class GameManager extends Component {
    
    // 实例化多种prefab
    @property({type: Prefab})
    public mainBlock: Prefab|null = null;

    @property({type: Prefab})
    public rowBlock2: Prefab|null = null;

    @property({type: Prefab})
    public colBlock2: Prefab|null = null;

    @property({type: Prefab})
    public rowBlock3: Prefab|null = null;

    @property({type: Prefab})
    public colBlock3: Prefab|null = null;

    // 声明属性 ‘itemGiftText‘ 的类型为 TextAsset
    @property(TextAsset)
    itemGiftText: TextAsset = null!;

    

    start() {
        this.generate(LEVEL_ID);
    }

    update(deltaTime: number) {
        
    }

    generate(level: number) {
        const data: string = this.itemGiftText.text;
        let i = 0;
        let j = (level - 1) * 60;
        while(data[j] != '*') {
            blocks[i] = [];
            blocks[i][0] = parseInt(data[j]);   // x
            blocks[i][1] = parseInt(data[j + 1]);   // y
            blocks[i][2] = parseInt(data[j + 2]);   // block length
            blocks[i][3] = parseInt(data[j + 3]);   // block direction

            block_state[i] = [];

            let dir = blocks[i][3];
            let len = blocks[i][2];
            block_state[i][0] = dir; // 方向 0:横 1:竖
            block_state[i][1] = blocks[i][1-dir]; // 不动方向的坐标 横:y 竖:x （横块y不动，竖块x不动）
            block_state[i][2] = blocks[i][dir]; // 可动方向的坐标（范围）
            block_state[i][3] = blocks[i][dir] + len - 1;

            i++;
            j += 4;
        }
        

        for(i = 0; i < blocks.length; i++) {
            let block: Node|null = null;
            let x = blocks[i][0];
            let y = blocks[i][1];
            let len = blocks[i][2];
            let dir = blocks[i][3];

            let abs_x = 0;
            let abs_y = 0;
            abs_coords[i] = [];

            if(i == 0) {
                block = instantiate(this.mainBlock);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + 500;
                abs_y = -1 * BLOCK_SIZE * y + 800;
                block.setPosition(abs_x, abs_y, 0);

                total_state[y][x] = 2;
                total_state[y][x + 1] = 2;

                abs_coords[i][0] = abs_x;
                abs_coords[i][1] = abs_y;
            }
            else if(len == 2 && dir == 0) // 横2
            {
                block = instantiate(this.rowBlock2);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + 500;
                abs_y = -1 * BLOCK_SIZE * y + 800;
                block.setPosition(BLOCK_SIZE * x + 500, -1 * BLOCK_SIZE * y + 800, 0);

                total_state[y][x] = 1;
                total_state[y][x + 1] = 1;

                abs_coords[i][0] = abs_x;
                abs_coords[i][1] = abs_y;
            }
            else if(len == 2 && dir == 1) // 竖2
            {
                block = instantiate(this.colBlock2);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + 500 - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + 800 - (BLOCK_SIZE / 2);
                block.setPosition(abs_x, abs_y, 0);

                total_state[y][x] = 1;
                total_state[y + 1][x] = 1;

                abs_coords[i][0] = abs_x;
                abs_coords[i][1] = abs_y;
            }
            else if(len == 3 && dir == 0) // 横3
            {
                block = instantiate(this.rowBlock3);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + 500 + (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + 800;
                block.setPosition(abs_x, abs_y, 0);

                total_state[y][x] = 1;
                total_state[y][x + 1] = 1;
                total_state[y][x + 2] = 1;

                abs_coords[i][0] = abs_x;
                abs_coords[i][1] = abs_y;
            }
            else if(len == 3 && dir == 1) // 竖3
            {
                block = instantiate(this.colBlock3);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + 500 - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + 800 - BLOCK_SIZE;
                block.setPosition(abs_x, abs_y, 0);

                total_state[y][x] = 1;
                total_state[y + 1][x] = 1;
                total_state[y + 2][x] = 1;

                abs_coords[i][0] = abs_x;
                abs_coords[i][1] = abs_y;
            }
        }

        /*for(i = 0; i < blocks.length; i++) {
            console.log("" + i + ":" + abs_coords[i][0] + " " + abs_coords[i][1]);
        }*/
    }
}

