import { _decorator, Component, instantiate, Label, Node, Prefab, TextAsset, Scene, sys } from 'cc';
import { ConfettiController } from './ConfettiController';
import "miniprogram-api-typings";

// initWasm: 从../resources/wasm/solver.js中默认导出，对应export default function  
// {solve}: 必须与solver.js中对应函数名一致
import initWasm, {solve} from "../resources/wasm/solver.js";

const { ccclass, property } = _decorator;

enum GameState {
    STATE_INIT,
    STATE_PLAYING,
    STATE_END,
    STATE_GUIDE,
};

let blocks: number[][] = [];
let total_state: number[][] = 
    [[0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0]];
let block_state: number[][] = [];
let abs_coords: number[][] = [];
let victory: number = 0;
let level_id = 1;
let steps : number = 0;
let if_first: number = 1; // 是否刚进入游戏？是：加载进度
let new_level : number = 0;
let pack_id: number = 0; // 难度等级
let game_process: number[] = [1, 1, 1, 1, 1]; // 对应入门、简单、中等、困难、专家五种难度
let help_open: number = 0;
let confetti: number = 0;


// const LEVEL_ID: number = 3; 
const BLOCK_SIZE: number = 180;
const LEFT_BORDER: number = 90;
const UP_BORDER: number = 890;

window["blocks"] = blocks; // 目的：把blocks弄成全局变量
window["total_state"] = total_state;
window["block_state"] = block_state;
window["abs_coords"] = abs_coords;
window["victory"] = victory;
window["steps"] = steps;
window["id"] = level_id;
window["game_process"] = game_process;
window["new_level"] = new_level;
window["if_first"] = if_first;
window["pack_id"] = pack_id;
window["confetti"] = confetti;

@ccclass('GameManager')
export class GameManager extends Component {

    @property({ type: Node })
    public mainMenu : Node | null = null;
    
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

    @property({ type: Node })
    public choosePackMenu: Node | null = null;

    @property({ type: Node })
    public helpMenu: Node | null = null;

    @property({ type: Node })
    public victoryMenu: Node | null = null;

    @property({ type: Label })
    public levelLabel: Label | null = null;

    @property({ type: Label })
    public stepLabel: Label | null = null;

    @property({ type: Node })
    public chooseLevel: Node | null = null;

    @property({ type: Node })
    public controlTable: Node | null = null;

    @property({ type: Node })
    public LevelTable: Node | null = null;

    @property({ type: Label })
    public levelIdLabel: Label | null = null;

    @property({type: Prefab})
    public confettiPrefab: Prefab|null = null;

    @property({ type: Node })
    public upperNode: Node | null = null;


    // 声明属性 ‘itemGiftText‘ 的类型为 TextAsset
    @property(TextAsset)
    itemGiftText: TextAsset = null!;

    @property(TextAsset)
    processText: TextAsset = null!;

    //private wasmExports: any = null;  // 保存 wasm 导出的对象

    async start() {
        this.displayMainMenu();
        // 授权显示菜单
        
        wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      });

        // 初始化wasm
        try {
            await initWasm();
            console.log("[OK] wasm init successful");
        } catch (e) {
            console.error("[ERR] wasm init failed:", e);
        }
    }

    init() {
        
        if(window["if_first"] == 1) {
            this.getProcess();
            window["if_first"] = 0;
        }
        //window["id"] = 4800;

        if(this.victoryMenu) {
            this.victoryMenu.active = false;
        } // 初始化不显示胜利界面

        if(this.helpMenu) {
            this.helpMenu.active = false; 
            help_open = 0;
        }

        if(this.levelLabel) {
            if(window["id"] <= 1000) {
                this.levelLabel.string = "关卡：1-" + window["id"];
            }
            else if(window["id"] <= 2000) {
                this.levelLabel.string = "关卡：2-" + (window["id"] - 1000);
            }
            else if(window["id"] <= 3000) {
                this.levelLabel.string = "关卡：3-" + (window["id"] - 2000);
            }
            else if(window["id"] <= 4000) {
                this.levelLabel.string = "关卡：4-" + (window["id"] - 3000);
            }
            else {
                this.levelLabel.string = "关卡：5-" + (window["id"] - 4000);
            }
            
        }

        if(this.stepLabel) {
            this.stepLabel.string = "步数：0";
        }

        if(this.controlTable) {
            this.controlTable.active = true;
        }

        if(this.LevelTable) {
            this.LevelTable.active = true;
        }

        victory = 0;
        window["steps"] = 0;

        this.generate(window["id"]);
        // level_id = level_id % 1000 + 1;
        console.log(window["blocks"]);
        this.setCurState(GameState.STATE_PLAYING);
    }

    update(deltaTime: number) {
        if(window["confetti"] == 1) {
            this.schedule(this.spawnConfetti, 0.1); // 每隔0.1s生成一个彩纸屑动画
            this.scheduleOnce(() => {
                this.unschedule(this.spawnConfetti);
            }, 3); // 3s后停止生成
            window["confetti"] = 0;
        }

        if(window["victory"] == 1)
        {
            this.setCurState(GameState.STATE_END);
            if(this.victoryMenu) {
                this.victoryMenu.active = true;
            }
        }

        if(this.stepLabel) {
            this.stepLabel.string = "步数：" + window["steps"];
        }

        if(window["new_level"] != 0)
        {
            window["id"] = window["new_level"];
            this.setCurState(GameState.STATE_INIT);
            if(this.chooseLevel) {
                this.chooseLevel.active = false;
            }
            if(this.choosePackMenu) {
                this.choosePackMenu.active = false; 
            }
            window["new_level"] = 0;

        }
    }

    setCurState(value: GameState) {
        switch(value) {
            case GameState.STATE_INIT:
                this.init();
                break;
            case GameState.STATE_PLAYING:  
                //this.checkVictory();
                break;
            case GameState.STATE_END:
                // 待添加：点击next level按钮，进入init状态
                break;
            case GameState.STATE_GUIDE:
                // 进入引导模式
                console.log("guide mode");
                break;
        }
    }

    getProcess() {
        // 分别处理五种难度
        if(sys.localStorage.getItem('starter_process') >= 1)
        {
            window["game_process"][0] = parseInt(sys.localStorage.getItem('starter_process'));
        }

        if(sys.localStorage.getItem('beginner_process') >= 1)
        {
            window["game_process"][1] = parseInt(sys.localStorage.getItem('beginner_process'));
        }
        
        if(sys.localStorage.getItem('intermediate_process') >= 1)
        {
            window["game_process"][2] = parseInt(sys.localStorage.getItem('intermediate_process'));
        }
    
        if(sys.localStorage.getItem('advanced_process') >= 1)
        {
            window["game_process"][3] = parseInt(sys.localStorage.getItem('advanced_process'));
        }
        
        if(sys.localStorage.getItem('expert_process') >= 1)
        {
            window["game_process"][4] = parseInt(sys.localStorage.getItem('expert_process'));
        }

        window["id"] = window["game_process"][0];
        console.log("level id = " + window["id"]);
        console.log("Process:" + window["game_process"])
    }

    generate(level: number) {
        const data: string = this.itemGiftText.text;
        let i = 0;
        let j = (level - 1) * 64;

        this.node.destroyAllChildren();

        window["blocks"] = [];
        window["block_state"] = [];
        window["abs_coords"] = [];
        window["total_state"] = 
            [[0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0],
            [0,0,0,0,0,0]];
        window["victory"] = 0;

        while(data[j] != '*' && i < 16) {
            window["blocks"][i] = [];
            window["blocks"][i][0] = parseInt(data[j]);   // x
            window["blocks"][i][1] = parseInt(data[j + 1]);   // y
            window["blocks"][i][2] = parseInt(data[j + 2]);   // block length
            window["blocks"][i][3] = parseInt(data[j + 3]);   // block direction

            window["block_state"][i] = [];

            let dir = window["blocks"][i][3];
            let len = window["blocks"][i][2];
            window["block_state"][i][0] = dir; // 方向 0:横 1:竖
            window["block_state"][i][1] = window["blocks"][i][1-dir]; // 不动方向的坐标 横:y 竖:x （横块y不动，竖块x不动）
            window["block_state"][i][2] = window["blocks"][i][dir]; // 可动方向的坐标（范围）
            window["block_state"][i][3] = window["blocks"][i][dir] + len - 1;

            i++;
            j += 4;
        }
        

        for(i = 0; i < window["blocks"].length; i++) {
            let block: Node|null = null;
            let x = window["blocks"][i][0];
            let y = window["blocks"][i][1];
            let len = window["blocks"][i][2];
            let dir = window["blocks"][i][3];

            let abs_x = 0;
            let abs_y = 0;
            window["abs_coords"][i] = [];

            if(i == 0) {
                block = instantiate(this.mainBlock);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER;
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 2;
                window["total_state"][y][x + 1] = 2;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 2 && dir == 0) // 横2
            {
                block = instantiate(this.rowBlock2);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER;
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;
                block.setPosition(BLOCK_SIZE * x + LEFT_BORDER, -1 * BLOCK_SIZE * y + UP_BORDER, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y][x + 1] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 2 && dir == 1) // 竖2
            {
                block = instantiate(this.colBlock2);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER - (BLOCK_SIZE / 2);
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y + 1][x] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 3 && dir == 0) // 横3
            {
                block = instantiate(this.rowBlock3);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER + (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER;
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y][x + 1] = 1;
                window["total_state"][y][x + 2] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
            else if(len == 3 && dir == 1) // 竖3
            {
                block = instantiate(this.colBlock3);
                this.node.addChild(block);
                abs_x = BLOCK_SIZE * x + LEFT_BORDER - (BLOCK_SIZE / 2);
                abs_y = -1 * BLOCK_SIZE * y + UP_BORDER - BLOCK_SIZE;
                block.setPosition(abs_x, abs_y, 0);

                window["total_state"][y][x] = 1;
                window["total_state"][y + 1][x] = 1;
                window["total_state"][y + 2][x] = 1;

                window["abs_coords"][i][0] = abs_x;
                window["abs_coords"][i][1] = abs_y;
            }
        }
    }

    displayMainMenu() {
        if(this.mainMenu) {
            this.mainMenu.active = true;
        }
        if(this.choosePackMenu) {
            this.choosePackMenu.active = false; 
        }
        if(this.helpMenu) {
            this.helpMenu.active = false; 
        }
        if(this.victoryMenu) {
            this.victoryMenu.active = false;
        }
        if(this.controlTable) {
            this.controlTable.active = false;
        }
        if(this.LevelTable) {
            this.LevelTable.active = false;
        }
    }

    displayChoosePackMenu() {
        if(this.mainMenu) {
            this.mainMenu.active = false;
        }
        if(this.choosePackMenu) {
            this.choosePackMenu.active = true; 
        }
        if(this.helpMenu) {
            this.helpMenu.active = false; 
        }
        if(this.victoryMenu) {
            this.victoryMenu.active = false;
        }
        if(this.controlTable) {
            this.controlTable.active = false;
        }
        if(this.LevelTable) {
            this.LevelTable.active = false;
        }
    }

    onStartButtonClicked() {   
        if(help_open == 0) {
            if(this.mainMenu) {
                this.mainMenu.active = false;
            }
            this.setCurState(GameState.STATE_INIT);
        }
    }

    onChoosePackButtonClicked() {
        if (window["victory"] == 0) {
            if(this.victoryMenu) {
                this.victoryMenu.active = false;
            }
            if(help_open == 0) { 
                this.displayChoosePackMenu();
            }
        }
    }

    onNextButtonClicked() {   
        //window["id"] = window["id"] % 1000 + 1;
        this.setCurState(GameState.STATE_INIT);
        this.unschedule(this.spawnConfetti);
        window["confetti"] = 0;
    }

    onHomeButtonClicked() {
        if(window["victory"] == 0) {
            if(this.victoryMenu) {
                this.victoryMenu.active = false;
            }
            if(help_open == 0) {
                this.displayMainMenu();
            }
        }
    }

    onRestartButtonClicked() {   
        if(window["victory"] == 0 && help_open == 0)
        {
            this.setCurState(GameState.STATE_INIT);
        }
    }

    onHelpButtonClicked() { 
        if(window["victory"] == 0)  
        {
            if(this.helpMenu) {
                this.helpMenu.active = true;
            }
            help_open = 1;
        }
    }

    onCloseHelpButtonClicked() {
        if(this.helpMenu) {
            this.helpMenu.active = false;
            help_open = 0;
        }
    }

    
    async solve(blockStr: string): Promise<void> {
        //const result: string = solve("022022214121102104213430");
        const result: string = solve(blockStr);
        console.log('结果:', result);
    }

    /*async runSolver() {
        
        console.log("Result:", result);
    }*/
    blocksToStr(arr: number[][]) {
        const blockStr = arr.map(row => row.join("")).join("");
        return blockStr;
    }

    // 结合wasm，生成当前布局解法
    onSolveButtonClicked() {
        // 获取当前布局并适配rust求解器要求的输入格式
        console.log("solving...");
        console.log(window["blocks"]);
        let blockStr = this.blocksToStr(window["blocks"]);
        console.log(blockStr);
        this.solve(blockStr);
        // 进入引导模式
        this.setCurState(GameState.STATE_GUIDE);
    }

    spawnConfetti() {
        const confettiRoot = instantiate(this.confettiPrefab); // 预制体
        this.victoryMenu.addChild(confettiRoot); // 挂载到当前 UI/游戏场景
        confettiRoot.setSiblingIndex(this.node.children.length - 1);// 将 confettiRoot 移动到父节点的最高层，保证显示在最上方
        confettiRoot.getComponent(ConfettiController).startConfettiAnimation(); // 开始彩纸屑动画

        setTimeout(() => {
            confettiRoot.destroy();
        }, 2000); // 2秒后销毁
    }
}

